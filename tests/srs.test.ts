/**
 * Tests des Spaced-Repetition-Verfahrens und der Fortschritts-Ableitung.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_EASINESS,
  MIN_EASINESS,
  RELEARN_DELAY_MS,
  errorRate,
  gradeFromAnswer,
  isDue,
  schedule,
  selectReviewItems,
  sortForReview,
} from '../src/domain/srs.ts';
import { createItemProgress } from '../src/domain/storage.ts';
import {
  MASTERED_THRESHOLD,
  masteryOf,
  recordAnswer,
  recordWritingScore,
  markSeen,
} from '../src/domain/progress.ts';
import type { ItemProgress } from '../src/domain/types.ts';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Notenableitung
// ---------------------------------------------------------------------------

test('die Note ergibt sich aus dem Antwortverhalten', () => {
  assert.equal(gradeFromAnswer(false, true), 'again', 'falsch → again');
  assert.equal(gradeFromAnswer(false, false), 'again');
  assert.equal(gradeFromAnswer(true, false), 'hard', 'richtig nach Fehler → hard');
  assert.equal(gradeFromAnswer(true, true), 'easy', 'direkt richtig → easy');
  assert.equal(gradeFromAnswer(true, true, true), 'good', 'mit Hinweis → good');
});

// ---------------------------------------------------------------------------
// Intervalle
// ---------------------------------------------------------------------------

test('ein Fehler setzt das Intervall zurück und macht das Item bald wieder fällig', () => {
  const progress: ItemProgress = {
    ...createItemProgress('letter:baa'),
    streak: 4,
    intervalDays: 21,
    easiness: 2.5,
  };

  const next = schedule(progress, 'again', NOW);
  assert.equal(next.streak, 0, 'Serie reißt');
  assert.equal(next.intervalDays, 0, 'Intervall verfällt');
  assert.equal(next.dueAt, NOW + RELEARN_DELAY_MS, 'in wenigen Minuten wieder fällig');
  assert.ok(next.easiness < progress.easiness, 'Leichtigkeit sinkt');
});

test('die Intervalle wachsen 1 → 3 → multiplikativ', () => {
  let progress = createItemProgress('letter:baa');

  progress = schedule(progress, 'good', NOW);
  assert.equal(progress.streak, 1);
  assert.equal(progress.intervalDays, 1, 'erste Wiederholung nach einem Tag');
  assert.equal(progress.dueAt, NOW + DAY);

  progress = schedule(progress, 'good', NOW + DAY);
  assert.equal(progress.streak, 2);
  assert.equal(progress.intervalDays, 3, 'dann nach drei Tagen');

  progress = schedule(progress, 'good', NOW + 4 * DAY);
  assert.equal(progress.streak, 3);
  // 3 Tage × easiness (≈2.5) ≈ 7–8 Tage
  assert.ok(
    progress.intervalDays >= 7 && progress.intervalDays <= 8,
    `erwartete 7–8 Tage, war ${progress.intervalDays}`,
  );
});

test('die Leichtigkeit bleibt in ihren Grenzen', () => {
  // Viele Fehler dürfen den Faktor nicht unter das Minimum drücken.
  let progress = createItemProgress('letter:baa');
  for (let i = 0; i < 30; i += 1) {
    progress = schedule(progress, 'again', NOW);
  }
  assert.equal(progress.easiness, MIN_EASINESS);

  // Viele perfekte Antworten nicht über das Maximum.
  progress = createItemProgress('letter:taa');
  for (let i = 0; i < 30; i += 1) {
    progress = schedule(progress, 'easy', NOW + i * DAY);
  }
  assert.equal(progress.easiness, MAX_EASINESS);
});

test('„easy" erhöht die Leichtigkeit, „hard" senkt sie', () => {
  const base = createItemProgress('letter:baa');
  assert.ok(schedule(base, 'easy', NOW).easiness > base.easiness);
  assert.ok(schedule(base, 'hard', NOW).easiness < base.easiness);
  // "good" ist neutral bis leicht positiv.
  assert.ok(schedule(base, 'good', NOW).easiness >= base.easiness - 0.01);
});

test('das Intervall ist nie kürzer als ein Tag bei richtiger Antwort', () => {
  const progress: ItemProgress = {
    ...createItemProgress('letter:baa'),
    streak: 5,
    intervalDays: 0,
    easiness: MIN_EASINESS,
  };
  const next = schedule(progress, 'hard', NOW);
  assert.ok(next.intervalDays >= 1, `Intervall war ${next.intervalDays}`);
});

test('isDue vergleicht gegen den Fälligkeitszeitpunkt', () => {
  const progress = { ...createItemProgress('letter:baa'), dueAt: NOW };
  assert.equal(isDue(progress, NOW), true);
  assert.equal(isDue(progress, NOW + 1), true);
  assert.equal(isDue(progress, NOW - 1), false);
});

// ---------------------------------------------------------------------------
// Auswahl für den Wiederholen-Modus
// ---------------------------------------------------------------------------

test('errorRate berechnet die Fehlerquote', () => {
  const clean = { ...createItemProgress('a'), correct: 5, wrong: 0 };
  const half = { ...createItemProgress('b'), correct: 2, wrong: 2 };
  const fresh = createItemProgress('c');
  assert.equal(errorRate(clean), 0);
  assert.equal(errorRate(half), 0.5);
  assert.equal(errorRate(fresh), 0, 'ohne Versuche keine Division durch 0');
});

test('sortForReview stellt die am längsten überfälligen Items nach vorne', () => {
  const items: ItemProgress[] = [
    { ...createItemProgress('a'), dueAt: NOW - 1 * DAY },
    { ...createItemProgress('b'), dueAt: NOW - 5 * DAY },
    { ...createItemProgress('c'), dueAt: NOW - 3 * DAY },
  ];
  const sorted = sortForReview(items, NOW).map((entry) => entry.itemId);
  assert.deepEqual(sorted, ['b', 'c', 'a']);
});

test('bei gleicher Fälligkeit kommen fehleranfällige Items zuerst', () => {
  const items: ItemProgress[] = [
    { ...createItemProgress('gut'), dueAt: NOW, correct: 10, wrong: 0 },
    { ...createItemProgress('wackelig'), dueAt: NOW, correct: 2, wrong: 6 },
  ];
  const sorted = sortForReview(items, NOW).map((entry) => entry.itemId);
  assert.deepEqual(sorted, ['wackelig', 'gut']);
});

test('selectReviewItems bevorzugt fällige Items', () => {
  const items: ItemProgress[] = [
    { ...createItemProgress('fällig1'), seen: true, dueAt: NOW - DAY },
    { ...createItemProgress('fällig2'), seen: true, dueAt: NOW - 2 * DAY },
    { ...createItemProgress('später'), seen: true, dueAt: NOW + 10 * DAY },
  ];
  const selected = selectReviewItems(items, NOW, 2).map((entry) => entry.itemId);
  assert.deepEqual(selected, ['fällig2', 'fällig1']);
});

test('selectReviewItems füllt auf, wenn zu wenig fällig ist', () => {
  const items: ItemProgress[] = [
    { ...createItemProgress('fällig'), seen: true, dueAt: NOW - DAY },
    { ...createItemProgress('später-schwach'), seen: true, dueAt: NOW + 5 * DAY, correct: 1, wrong: 4 },
    { ...createItemProgress('später-stark'), seen: true, dueAt: NOW + 5 * DAY, correct: 9, wrong: 0 },
  ];
  const selected = selectReviewItems(items, NOW, 3).map((entry) => entry.itemId);
  // Erst das fällige, dann das schwächere der beiden Nicht-Fälligen.
  assert.equal(selected[0], 'fällig');
  assert.equal(selected[1], 'später-schwach');
  assert.equal(selected.length, 3);
});

test('selectReviewItems ignoriert nie angefasste Items', () => {
  const items: ItemProgress[] = [
    createItemProgress('nie-gesehen'),
    { ...createItemProgress('gesehen'), seen: true, dueAt: NOW - DAY },
  ];
  const selected = selectReviewItems(items, NOW, 5).map((entry) => entry.itemId);
  assert.deepEqual(selected, ['gesehen']);
});

// ---------------------------------------------------------------------------
// Lernstand
// ---------------------------------------------------------------------------

test('unbekannte Items haben den Status "unknown"', () => {
  assert.equal(masteryOf(undefined), 'unknown');
  assert.equal(masteryOf(createItemProgress('letter:baa')), 'unknown');
});

test('eine angesehene Lernkarte ergibt "seen"', () => {
  const progress = markSeen(createItemProgress('letter:baa'));
  assert.equal(masteryOf(progress), 'seen');
});

test('drei richtige Antworten ergeben "practiced"', () => {
  let progress = createItemProgress('letter:baa');
  for (let i = 0; i < 3; i += 1) {
    progress = recordAnswer(progress, true, 'letterToTranslit');
  }
  assert.equal(masteryOf(progress), 'practiced');
});

test('"mastered" verlangt mehrere Übungsarten', () => {
  let progress = createItemProgress('letter:baa');
  // Fünf richtige Antworten, aber nur EINE Übungsart.
  for (let i = 0; i < MASTERED_THRESHOLD; i += 1) {
    progress = recordAnswer(progress, true, 'letterToTranslit');
  }
  assert.equal(masteryOf(progress), 'practiced', 'eine Übungsart genügt nicht');

  // Eine zweite Übungsart schaltet "mastered" frei.
  progress = recordAnswer(progress, true, 'audioToLetter');
  assert.equal(masteryOf(progress), 'mastered');
});

test('"mastered" verlangt ausreichende Genauigkeit', () => {
  let progress = createItemProgress('letter:baa');
  for (let i = 0; i < 5; i += 1) {
    progress = recordAnswer(progress, true, 'letterToTranslit');
  }
  progress = recordAnswer(progress, true, 'audioToLetter');
  assert.equal(masteryOf(progress), 'mastered');

  // Viele Fehler drücken die Genauigkeit unter 80 %.
  for (let i = 0; i < 5; i += 1) {
    progress = recordAnswer(progress, false, 'letterToTranslit');
  }
  assert.equal(masteryOf(progress), 'practiced', 'zu viele Fehler → kein "mastered"');
});

test('recordAnswer zählt richtig und merkt die Übungsart nur bei Erfolg', () => {
  let progress = createItemProgress('letter:baa');
  progress = recordAnswer(progress, false, 'audioToLetter');
  assert.equal(progress.wrong, 1);
  assert.equal(progress.correct, 0);
  assert.deepEqual(progress.clearedExercises, [], 'falsche Antwort schaltet nichts frei');
  assert.equal(progress.seen, true, 'eine Aufgabe zu sehen zählt als "gesehen"');

  progress = recordAnswer(progress, true, 'audioToLetter');
  assert.equal(progress.correct, 1);
  assert.deepEqual(progress.clearedExercises, ['audioToLetter']);

  // Dieselbe Art zweimal darf nicht doppelt gezählt werden.
  progress = recordAnswer(progress, true, 'audioToLetter');
  assert.equal(new Set(progress.clearedExercises).size, 1);
});

test('recordWritingScore behält den besten Wert und begrenzt ihn', () => {
  let progress = createItemProgress('letter:baa');
  progress = recordWritingScore(progress, 0.4);
  assert.equal(progress.writingScore, 0.4);

  progress = recordWritingScore(progress, 0.8);
  assert.equal(progress.writingScore, 0.8);

  progress = recordWritingScore(progress, 0.2);
  assert.equal(progress.writingScore, 0.8, 'ein schlechterer Versuch verschlechtert nichts');

  progress = recordWritingScore(progress, 5);
  assert.equal(progress.writingScore, 1, 'Werte werden auf 1 begrenzt');
});
