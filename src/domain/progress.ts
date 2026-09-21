/**
 * Lernstand und Freischaltung.
 *
 * Der Lernstand (`Mastery`) wird **abgeleitet** und nicht gespeichert. Dadurch lässt
 * sich die Regel an einer einzigen Stelle ändern, ohne gespeicherte Daten zu migrieren.
 */

import { LESSON_BY_ID, LESSONS } from '../data/lessons.ts';
import { LETTERS } from '../data/letters.ts';
import { createItemProgress } from './storage.ts';
import type { AppStateShape, ExerciseType, ItemProgress, Lesson, Mastery } from './types.ts';

// ---------------------------------------------------------------------------
// Lernstand
// ---------------------------------------------------------------------------

/** Korrekte Antworten für „geübt". */
export const PRACTICED_THRESHOLD = 3;

/** Korrekte Antworten für „gemeistert". */
export const MASTERED_THRESHOLD = 5;

/** Mindest-Genauigkeit für „gemeistert". */
export const MASTERED_ACCURACY = 0.8;

/** Verschiedene Übungsarten, die für „gemeistert" bestanden sein müssen. */
export const MASTERED_EXERCISE_VARIETY = 2;

/**
 * Leitet den Lernstand eines Items ab.
 *
 * „Gemeistert" verlangt bewusst **mehrere Übungsarten**: Wer einen Buchstaben nur
 * per Multiple-Choice wiedererkennt, kann ihn noch nicht schreiben oder hören.
 */
export function masteryOf(progress: ItemProgress | undefined): Mastery {
  if (!progress) return 'unknown';

  const attempts = progress.correct + progress.wrong;
  if (attempts === 0) return progress.seen ? 'seen' : 'unknown';

  const accuracy = progress.correct / attempts;
  const variety = new Set(progress.clearedExercises).size;

  if (
    progress.correct >= MASTERED_THRESHOLD &&
    accuracy >= MASTERED_ACCURACY &&
    variety >= MASTERED_EXERCISE_VARIETY
  ) {
    return 'mastered';
  }
  if (progress.correct >= PRACTICED_THRESHOLD) return 'practiced';
  return 'seen';
}

/** Lernstand eines Items anhand des Gesamtzustands. */
export function masteryOfItem(state: AppStateShape, itemId: string): Mastery {
  return masteryOf(state.items[itemId]);
}

/** Holt den Fortschritt eines Items oder erzeugt einen frischen Eintrag. */
export function progressFor(state: AppStateShape, itemId: string): ItemProgress {
  return state.items[itemId] ?? createItemProgress(itemId);
}

// ---------------------------------------------------------------------------
// Buchungen
// ---------------------------------------------------------------------------

/** Markiert ein Item als gesehen (Lernkarte geöffnet). */
export function markSeen(progress: ItemProgress): ItemProgress {
  return progress.seen ? progress : { ...progress, seen: true };
}

/**
 * Bucht eine Antwort auf den Zähler eines Items.
 * Die SRS-Felder werden separat von `schedule()` aktualisiert.
 */
export function recordAnswer(
  progress: ItemProgress,
  correct: boolean,
  exerciseType: ExerciseType,
): ItemProgress {
  const cleared = new Set(progress.clearedExercises);
  // Eine Übungsart gilt als bestanden, sobald sie einmal richtig gelöst wurde.
  if (correct) cleared.add(exerciseType);

  return {
    ...progress,
    seen: true,
    correct: progress.correct + (correct ? 1 : 0),
    wrong: progress.wrong + (correct ? 0 : 1),
    clearedExercises: Array.from(cleared),
  };
}

/** Speichert die beste Trefferquote der Schreibübung. */
export function recordWritingScore(progress: ItemProgress, score: number): ItemProgress {
  const clamped = Math.min(1, Math.max(0, score));
  const best = Math.max(progress.writingScore ?? 0, clamped);
  return { ...progress, writingScore: best };
}

// ---------------------------------------------------------------------------
// Freischaltung
// ---------------------------------------------------------------------------

/** Status einer Lektion im Lernpfad. */
export type LessonStatus = 'locked' | 'open' | 'completed';

/** Status einer Lektion bestimmen. */
export function lessonStatus(state: AppStateShape, lesson: Lesson): LessonStatus {
  if (state.completedLessonIds.includes(lesson.id)) return 'completed';
  // Offen, sobald alle Voraussetzungen abgeschlossen sind.
  const ready = lesson.requires.every((id) => state.completedLessonIds.includes(id));
  return ready ? 'open' : 'locked';
}

/** Alle Lektionen mit ihrem Status – Grundlage der Startseite. */
export function lessonsWithStatus(
  state: AppStateShape,
): { lesson: Lesson; status: LessonStatus }[] {
  return LESSONS.map((lesson) => ({ lesson, status: lessonStatus(state, lesson) }));
}

/** Die nächste noch nicht abgeschlossene, offene Lektion. */
export function nextOpenLesson(state: AppStateShape): Lesson | null {
  for (const lesson of LESSONS) {
    if (lessonStatus(state, lesson) === 'open') return lesson;
  }
  return null;
}

/** Ist diese Lektion spielbar? */
export function isLessonPlayable(state: AppStateShape, lessonId: string): boolean {
  const lesson = LESSON_BY_ID[lessonId];
  if (!lesson) return false;
  return lessonStatus(state, lesson) !== 'locked';
}

// ---------------------------------------------------------------------------
// Auswertungen
// ---------------------------------------------------------------------------

/** IDs aller Buchstaben, die mindestens einmal geübt wurden. */
export function learnedLetterIds(state: AppStateShape): string[] {
  return LETTERS.filter((letter) => {
    const mastery = masteryOfItem(state, letter.id);
    return mastery !== 'unknown';
  }).map((letter) => letter.id);
}

/** Zusammenfassung für das Fortschrittsraster und die Statistik. */
export interface AlphabetStats {
  total: number;
  counts: Record<Mastery, number>;
  /** Anteil gemeisterter Buchstaben (0–1). */
  masteredRatio: number;
}

/** Statistik über alle 28 Buchstaben. */
export function alphabetStats(state: AppStateShape): AlphabetStats {
  const counts: Record<Mastery, number> = {
    unknown: 0,
    seen: 0,
    practiced: 0,
    mastered: 0,
  };

  for (const letter of LETTERS) {
    counts[masteryOfItem(state, letter.id)] += 1;
  }

  return {
    total: LETTERS.length,
    counts,
    masteredRatio: LETTERS.length === 0 ? 0 : counts.mastered / LETTERS.length,
  };
}

/** Gesamt-Genauigkeit über alle Items (0–1). */
export function overallAccuracy(state: AppStateShape): number {
  let correct = 0;
  let total = 0;
  for (const progress of Object.values(state.items)) {
    correct += progress.correct;
    total += progress.correct + progress.wrong;
  }
  return total === 0 ? 0 : correct / total;
}

/**
 * Items, die der Nutzer bereits kennt – Quelle für Distraktoren in Übungen.
 * Fällt auf alle Buchstaben der aktuellen Lektion zurück, wenn noch nichts gelernt ist.
 */
export function knownLetterIds(state: AppStateShape): string[] {
  const known = LETTERS.filter((letter) => state.items[letter.id]?.seen === true).map(
    (letter) => letter.id,
  );
  return known;
}
