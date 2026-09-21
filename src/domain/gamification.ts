/**
 * Gamification: XP, Level, Tages-Streak, Herzen und Tagesziel.
 *
 * Wichtig bei der Streak-Logik: Verglichen werden **lokale Kalendertage**, nicht
 * UTC-Zeitstempel. Sonst würde ein Nutzer in Europa, der abends um 23:30 lernt, je
 * nach Sommerzeit auf den „falschen" Tag gebucht und verlöre seine Serie.
 */

import type { AppStateShape } from './types.ts';

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

/** XP für eine im ersten Versuch richtige Antwort. */
export const XP_CORRECT_FIRST_TRY = 10;

/** XP für eine Antwort, die erst nach einem Fehler richtig war. */
export const XP_CORRECT_AFTER_ERROR = 4;

/** Zusatz-XP für eine fehlerfreie Lektion. */
export const XP_PERFECT_LESSON_BONUS = 20;

/** Herzen pro Lektionslauf. */
export const HEARTS_PER_LESSON = 5;

/**
 * XP für eine Antwort.
 * @param wasFirstTry War es der erste Versuch bei diesem Item in der Lektion?
 */
export function xpForAnswer(correct: boolean, wasFirstTry: boolean): number {
  if (!correct) return 0;
  return wasFirstTry ? XP_CORRECT_FIRST_TRY : XP_CORRECT_AFTER_ERROR;
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

/** XP, die für Level 2 nötig sind – bestimmt die Steigung der Kurve. */
const LEVEL_BASE_XP = 50;

/**
 * Level aus XP: `level = floor(sqrt(xp / 50)) + 1`.
 *
 * Die Wurzel sorgt dafür, dass die ersten Level schnell kommen und spätere
 * angenehm länger dauern – ohne dass eine Schwellenwerttabelle gepflegt werden muss.
 */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / LEVEL_BASE_XP)) + 1;
}

/** XP-Schwelle, ab der ein Level erreicht ist. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * LEVEL_BASE_XP;
}

/** Fortschritt innerhalb des aktuellen Levels – für den Fortschrittsbalken. */
export function levelProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  ratio: number;
} {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - start);
  const into = Math.max(0, xp - start);
  return {
    level,
    xpIntoLevel: into,
    xpNeededForLevel: span,
    ratio: Math.min(1, into / span),
  };
}

// ---------------------------------------------------------------------------
// Kalendertage
// ---------------------------------------------------------------------------

/**
 * Lokaler Kalendertag als "YYYY-MM-DD".
 *
 * Absichtlich **nicht** `toISOString()`: das würde nach UTC umrechnen und den Tag
 * je nach Zeitzone verschieben.
 */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Tagesschlüssel für „heute minus n Tage". */
export function dayKeyOffset(days: number, from: Date = new Date()): string {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** Differenz in Kalendertagen zwischen zwei Tagesschlüsseln (b − a). */
export function daysBetween(a: string, b: string): number {
  const parse = (key: string): Date => {
    const [y, m, d] = key.split('-').map((part) => Number.parseInt(part, 10));
    // Mittags ansetzen, damit Sommerzeitwechsel (±1 h) das Ergebnis nicht kippen.
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  };
  const diffMs = parse(b).getTime() - parse(a).getTime();
  return Math.round(diffMs / 86_400_000);
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export interface StreakResult {
  streakDays: number;
  longestStreak: number;
  lastLessonDay: string;
  /** Ist der Streak durch diesen Abschluss gewachsen? Steuert die Animation. */
  increased: boolean;
}

/**
 * Bucht einen Lektionsabschluss auf den Tages-Streak.
 *
 * - gleicher Tag  → Serie bleibt (mehrmals am Tag lernen verlängert sie nicht)
 * - Vortag        → Serie +1
 * - länger her    → Serie beginnt neu bei 1
 */
export function registerLessonCompletion(
  state: Pick<AppStateShape, 'streakDays' | 'longestStreak' | 'lastLessonDay'>,
  now: Date = new Date(),
): StreakResult {
  const today = dayKey(now);
  const last = state.lastLessonDay;

  let streakDays: number;
  let increased: boolean;

  if (last === null) {
    streakDays = 1;
    increased = true;
  } else if (last === today) {
    // Heute schon gelernt – Serie unverändert.
    streakDays = Math.max(1, state.streakDays);
    increased = false;
  } else if (daysBetween(last, today) === 1) {
    streakDays = state.streakDays + 1;
    increased = true;
  } else {
    // Lücke von mindestens einem Tag → Serie reißt.
    streakDays = 1;
    increased = true;
  }

  return {
    streakDays,
    longestStreak: Math.max(state.longestStreak, streakDays),
    lastLessonDay: today,
    increased,
  };
}

/**
 * Der Streak, wie er dem Nutzer **angezeigt** werden soll.
 *
 * Der gespeicherte Wert bleibt bestehen, bis wieder gelernt wird. Wurde aber weder
 * heute noch gestern gelernt, ist die Serie faktisch gerissen – dann zeigen wir 0
 * an, statt eine Serie zu suggerieren, die es nicht mehr gibt.
 */
export function displayedStreak(
  state: Pick<AppStateShape, 'streakDays' | 'lastLessonDay'>,
  now: Date = new Date(),
): number {
  if (state.lastLessonDay === null) return 0;
  const gap = daysBetween(state.lastLessonDay, dayKey(now));
  return gap <= 1 ? state.streakDays : 0;
}

/** Wurde heute schon gelernt? */
export function practicedToday(
  state: Pick<AppStateShape, 'lastLessonDay'>,
  now: Date = new Date(),
): boolean {
  return state.lastLessonDay === dayKey(now);
}

// ---------------------------------------------------------------------------
// Tagesziel
// ---------------------------------------------------------------------------

export interface DailyGoalStatus {
  xpToday: number;
  goal: number;
  ratio: number;
  reached: boolean;
}

/** Status des Tagesziels. */
export function dailyGoalStatus(state: AppStateShape): DailyGoalStatus {
  const goal = Math.max(10, state.settings.dailyGoalXp);
  const xpToday = Math.max(0, state.xpToday);
  return {
    xpToday,
    goal,
    ratio: Math.min(1, xpToday / goal),
    reached: xpToday >= goal,
  };
}

/**
 * Setzt den Tageszähler zurück, wenn seit dem letzten Lernen ein neuer Tag begonnen hat.
 * Wird beim Laden der App und beim Start einer Lektion aufgerufen.
 */
export function resetDailyXpIfNewDay(
  state: AppStateShape,
  now: Date = new Date(),
): AppStateShape {
  if (state.lastLessonDay !== null && state.lastLessonDay !== dayKey(now)) {
    return { ...state, xpToday: 0 };
  }
  return state;
}
