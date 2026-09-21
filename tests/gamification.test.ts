/**
 * Tests der Gamification-Logik.
 *
 * Schwerpunkt: der Tages-Streak. Fehler an Tages-, Monats- und Jahresgrenzen sind der
 * klassische Bug in solchen Apps – und besonders ärgerlich, weil sie eine mühsam
 * aufgebaute Serie vernichten.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEARTS_PER_LESSON,
  XP_CORRECT_AFTER_ERROR,
  XP_CORRECT_FIRST_TRY,
  dailyGoalStatus,
  dayKey,
  daysBetween,
  displayedStreak,
  levelFromXp,
  levelProgress,
  practicedToday,
  registerLessonCompletion,
  resetDailyXpIfNewDay,
  xpForAnswer,
  xpForLevel,
} from '../src/domain/gamification.ts';
import { createDefaultState } from '../src/domain/storage.ts';

// ---------------------------------------------------------------------------
// XP und Level
// ---------------------------------------------------------------------------

test('XP werden nur für richtige Antworten vergeben', () => {
  assert.equal(xpForAnswer(true, true), XP_CORRECT_FIRST_TRY);
  assert.equal(xpForAnswer(true, false), XP_CORRECT_AFTER_ERROR);
  assert.equal(xpForAnswer(false, true), 0);
  assert.equal(xpForAnswer(false, false), 0);
});

test('die erste Antwort bringt mehr XP als die Korrektur', () => {
  assert.ok(XP_CORRECT_FIRST_TRY > XP_CORRECT_AFTER_ERROR);
});

test('Level beginnt bei 1 und steigt mit der Wurzel der XP', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(-10), 1, 'negative XP dürfen kein Level unter 1 ergeben');
  assert.equal(levelFromXp(49), 1);
  assert.equal(levelFromXp(50), 2);
  assert.equal(levelFromXp(199), 2);
  assert.equal(levelFromXp(200), 3);
  assert.equal(levelFromXp(450), 4);
});

test('xpForLevel ist die Umkehrung von levelFromXp', () => {
  for (let level = 1; level <= 12; level += 1) {
    const threshold = xpForLevel(level);
    assert.equal(levelFromXp(threshold), level, `Schwelle für Level ${level}`);
    if (level > 1) {
      // Ein XP weniger muss noch das vorige Level ergeben.
      assert.equal(levelFromXp(threshold - 1), level - 1);
    }
  }
});

test('levelProgress liefert einen Anteil zwischen 0 und 1', () => {
  const atStart = levelProgress(50);
  assert.equal(atStart.level, 2);
  assert.equal(atStart.xpIntoLevel, 0);
  assert.equal(atStart.ratio, 0);

  const middle = levelProgress(125);
  assert.equal(middle.level, 2);
  assert.ok(middle.ratio > 0 && middle.ratio < 1);

  // Niemals über 1, egal wie viel XP.
  assert.ok(levelProgress(999_999).ratio <= 1);
});

test('es gibt fünf Herzen pro Lektion', () => {
  assert.equal(HEARTS_PER_LESSON, 5);
});

// ---------------------------------------------------------------------------
// Kalendertage
// ---------------------------------------------------------------------------

test('dayKey nutzt die lokale Zeitzone, nicht UTC', () => {
  // 31.12. um 23:00 Ortszeit: in UTC wäre das je nach Zone schon der 1.1.
  const local = new Date(2025, 11, 31, 23, 0, 0);
  assert.equal(dayKey(local), '2025-12-31');
  // 1.1. um 00:30 Ortszeit
  const newYear = new Date(2026, 0, 1, 0, 30, 0);
  assert.equal(dayKey(newYear), '2026-01-01');
});

test('daysBetween zählt Kalendertage über Monats- und Jahresgrenzen', () => {
  assert.equal(daysBetween('2025-03-10', '2025-03-11'), 1);
  assert.equal(daysBetween('2025-01-31', '2025-02-01'), 1, 'Monatswechsel');
  assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1, 'Jahreswechsel');
  assert.equal(daysBetween('2024-02-28', '2024-02-29'), 1, 'Schaltjahr');
  assert.equal(daysBetween('2025-03-10', '2025-03-10'), 0);
  assert.equal(daysBetween('2025-03-10', '2025-03-20'), 10);
  assert.equal(daysBetween('2025-03-20', '2025-03-10'), -10);
});

test('daysBetween übersteht die Sommerzeitumstellung', () => {
  // In Europa wird in der Nacht zum 30.03.2025 auf Sommerzeit gestellt.
  assert.equal(daysBetween('2025-03-29', '2025-03-30'), 1);
  assert.equal(daysBetween('2025-03-30', '2025-03-31'), 1);
  // Und im Herbst zurück.
  assert.equal(daysBetween('2025-10-25', '2025-10-26'), 1);
  assert.equal(daysBetween('2025-10-26', '2025-10-27'), 1);
});

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

test('die erste Lektion startet den Streak bei 1', () => {
  const now = new Date(2025, 4, 10, 18, 0, 0);
  const result = registerLessonCompletion(
    { streakDays: 0, longestStreak: 0, lastLessonDay: null },
    now,
  );
  assert.equal(result.streakDays, 1);
  assert.equal(result.longestStreak, 1);
  assert.equal(result.lastLessonDay, '2025-05-10');
  assert.equal(result.increased, true);
});

test('eine zweite Lektion am selben Tag verlängert den Streak nicht', () => {
  const now = new Date(2025, 4, 10, 20, 0, 0);
  const result = registerLessonCompletion(
    { streakDays: 3, longestStreak: 5, lastLessonDay: '2025-05-10' },
    now,
  );
  assert.equal(result.streakDays, 3, 'Serie bleibt gleich');
  assert.equal(result.increased, false, 'keine Animation auslösen');
  assert.equal(result.longestStreak, 5);
});

test('Lernen am Folgetag erhöht den Streak', () => {
  const now = new Date(2025, 4, 11, 9, 0, 0);
  const result = registerLessonCompletion(
    { streakDays: 3, longestStreak: 3, lastLessonDay: '2025-05-10' },
    now,
  );
  assert.equal(result.streakDays, 4);
  assert.equal(result.longestStreak, 4);
  assert.equal(result.increased, true);
});

test('eine Lücke von einem Tag setzt den Streak zurück', () => {
  const now = new Date(2025, 4, 12, 9, 0, 0);
  const result = registerLessonCompletion(
    { streakDays: 9, longestStreak: 9, lastLessonDay: '2025-05-10' },
    now,
  );
  assert.equal(result.streakDays, 1, 'Serie beginnt neu');
  // Der Rekord bleibt erhalten – das ist Motivation, nicht Strafe.
  assert.equal(result.longestStreak, 9);
});

test('der Streak wächst über den Monatswechsel hinweg', () => {
  const result = registerLessonCompletion(
    { streakDays: 6, longestStreak: 6, lastLessonDay: '2025-01-31' },
    new Date(2025, 1, 1, 10, 0, 0),
  );
  assert.equal(result.streakDays, 7);
});

test('der Streak wächst über den Jahreswechsel hinweg', () => {
  const result = registerLessonCompletion(
    { streakDays: 40, longestStreak: 40, lastLessonDay: '2025-12-31' },
    new Date(2026, 0, 1, 1, 0, 0),
  );
  assert.equal(result.streakDays, 41);
  assert.equal(result.lastLessonDay, '2026-01-01');
});

test('displayedStreak zeigt 0, wenn die Serie faktisch gerissen ist', () => {
  const now = new Date(2025, 4, 15, 9, 0, 0);
  // Heute gelernt → Serie zählt.
  assert.equal(displayedStreak({ streakDays: 4, lastLessonDay: '2025-05-15' }, now), 4);
  // Gestern gelernt → Serie lebt noch (heute ist noch Zeit).
  assert.equal(displayedStreak({ streakDays: 4, lastLessonDay: '2025-05-14' }, now), 4);
  // Vorgestern → Serie ist vorbei.
  assert.equal(displayedStreak({ streakDays: 4, lastLessonDay: '2025-05-13' }, now), 0);
  // Noch nie gelernt.
  assert.equal(displayedStreak({ streakDays: 0, lastLessonDay: null }, now), 0);
});

test('practicedToday erkennt den heutigen Abschluss', () => {
  const now = new Date(2025, 4, 15, 9, 0, 0);
  assert.equal(practicedToday({ lastLessonDay: '2025-05-15' }, now), true);
  assert.equal(practicedToday({ lastLessonDay: '2025-05-14' }, now), false);
  assert.equal(practicedToday({ lastLessonDay: null }, now), false);
});

// ---------------------------------------------------------------------------
// Tagesziel
// ---------------------------------------------------------------------------

test('das Tagesziel wird ab dem Zielwert als erreicht gemeldet', () => {
  const state = createDefaultState();
  state.settings.dailyGoalXp = 50;

  state.xpToday = 0;
  assert.equal(dailyGoalStatus(state).reached, false);
  assert.equal(dailyGoalStatus(state).ratio, 0);

  state.xpToday = 25;
  assert.equal(dailyGoalStatus(state).ratio, 0.5);
  assert.equal(dailyGoalStatus(state).reached, false);

  state.xpToday = 50;
  assert.equal(dailyGoalStatus(state).reached, true);

  // Über dem Ziel darf der Balken nicht überlaufen.
  state.xpToday = 500;
  assert.equal(dailyGoalStatus(state).ratio, 1);
});

test('der Tageszähler wird an einem neuen Tag zurückgesetzt', () => {
  const state = createDefaultState();
  state.xpToday = 80;
  state.lastLessonDay = '2025-05-14';

  const sameDay = resetDailyXpIfNewDay(state, new Date(2025, 4, 14, 22, 0, 0));
  assert.equal(sameDay.xpToday, 80, 'am selben Tag bleibt der Zähler');

  const nextDay = resetDailyXpIfNewDay(state, new Date(2025, 4, 15, 7, 0, 0));
  assert.equal(nextDay.xpToday, 0, 'am neuen Tag beginnt der Zähler bei 0');
});
