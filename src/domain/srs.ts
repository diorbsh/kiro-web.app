/**
 * Spaced Repetition, angelehnt an SM-2.
 *
 * Unterschied zum Original: Der Nutzer bewertet sich **nicht selbst**. Die Note wird
 * aus dem Antwortverhalten abgeleitet (`gradeFromAnswer`) – das passt zu einer
 * Duolingo-artigen App, in der der Lernfluss nicht unterbrochen werden soll.
 *
 * Framework-frei und deterministisch: alle Zeitangaben kommen als Parameter herein,
 * damit das Verhalten testbar ist.
 */

import type { Grade, ItemProgress } from './types.ts';

/** Untere Grenze des Leichtigkeitsfaktors – darunter wird es zur Endlosschleife. */
export const MIN_EASINESS = 1.3;

/** Obere Grenze – darüber werden die Intervalle unrealistisch lang. */
export const MAX_EASINESS = 2.8;

/** Wartezeit, bis ein falsch beantwortetes Item wieder fällig wird. */
export const RELEARN_DELAY_MS = 10 * 60_000;

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Leitet die SRS-Note aus dem Antwortverhalten ab.
 *
 * @param correct Wurde die Aufgabe letztlich richtig gelöst?
 * @param wasFirstTry Beim ersten Versuch innerhalb der Lektion?
 * @param hintUsed Wurde ein Hinweis genutzt bzw. die Aufgabe übersprungen?
 */
export function gradeFromAnswer(
  correct: boolean,
  wasFirstTry: boolean,
  hintUsed = false,
): Grade {
  if (!correct) return 'again';
  if (!wasFirstTry) return 'hard';
  return hintUsed ? 'good' : 'easy';
}

/**
 * Berechnet den neuen SRS-Zustand eines Items.
 *
 * Intervall-Verlauf bei durchgehend richtigen Antworten:
 * 1 Tag → 3 Tage → ×easiness (also ca. 7–8 Tage) → …
 */
export function schedule(progress: ItemProgress, grade: Grade, now: number): ItemProgress {
  if (grade === 'again') {
    // Fehler: Intervall verfällt, Item kommt in wenigen Minuten wieder.
    return {
      ...progress,
      streak: 0,
      easiness: clamp(progress.easiness - 0.2, MIN_EASINESS, MAX_EASINESS),
      intervalDays: 0,
      dueAt: now + RELEARN_DELAY_MS,
      lastReviewedAt: now,
    };
  }

  // SM-2-Qualitätsstufen: hard = 3, good = 4, easy = 5
  const quality = grade === 'hard' ? 3 : grade === 'good' ? 4 : 5;
  const easiness = clamp(
    progress.easiness + (0.1 - (5 - quality) * 0.08),
    MIN_EASINESS,
    MAX_EASINESS,
  );

  const streak = progress.streak + 1;
  let intervalDays: number;
  if (streak === 1) {
    intervalDays = 1;
  } else if (streak === 2) {
    intervalDays = 3;
  } else {
    // Ab der dritten richtigen Antwort wächst das Intervall multiplikativ.
    intervalDays = Math.max(1, Math.round(progress.intervalDays * easiness));
  }

  return {
    ...progress,
    streak,
    easiness,
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}

/** Ist das Item jetzt fällig? */
export function isDue(progress: ItemProgress, now: number): boolean {
  return progress.dueAt <= now;
}

/**
 * Sortiert Items für den Wiederholen-Modus.
 *
 * Priorität: zuerst am längsten überfällig, bei Gleichstand die fehleranfälligeren.
 * So kommen die wackeligen Buchstaben zuerst dran.
 */
export function sortForReview(items: ItemProgress[], now: number): ItemProgress[] {
  return [...items].sort((a, b) => {
    const overdueA = now - a.dueAt;
    const overdueB = now - b.dueAt;
    if (overdueA !== overdueB) return overdueB - overdueA;
    return errorRate(b) - errorRate(a);
  });
}

/** Fehlerquote eines Items (0 = fehlerfrei). */
export function errorRate(progress: ItemProgress): number {
  const total = progress.correct + progress.wrong;
  return total === 0 ? 0 : progress.wrong / total;
}

/**
 * Wählt die Items für einen Wiederholen-Lauf aus.
 * Fällige Items haben Vorrang; ist zu wenig fällig, wird mit den fehleranfälligsten
 * Items aufgefüllt, damit der Lauf nicht leer bleibt.
 */
export function selectReviewItems(
  all: ItemProgress[],
  now: number,
  limit: number,
): ItemProgress[] {
  const seen = all.filter((progress) => progress.seen || progress.correct + progress.wrong > 0);
  const due = sortForReview(
    seen.filter((progress) => isDue(progress, now)),
    now,
  );

  if (due.length >= limit) return due.slice(0, limit);

  const dueIds = new Set(due.map((progress) => progress.itemId));
  const filler = seen
    .filter((progress) => !dueIds.has(progress.itemId))
    .sort((a, b) => errorRate(b) - errorRate(a))
    .slice(0, limit - due.length);

  return [...due, ...filler];
}
