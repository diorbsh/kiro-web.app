/**
 * Persistenz des Lernfortschritts.
 *
 * Bewusste Entscheidungen:
 * - **localStorage statt IndexedDB**: Der Zustand ist klein (wenige KB) und wird
 *   immer als Ganzes gelesen. IndexedDB würde nur Komplexität ohne Nutzen bringen.
 * - **Schema-Version + Migrationskette**: Damit Phase 2 Felder ergänzen kann, ohne
 *   den Fortschritt bestehender Nutzer zu zerstören.
 * - **Gebündeltes Schreiben**: Ein Debounce verhindert, dass jede einzelne Antwort
 *   einen synchronen Schreibvorgang auslöst und die Animationen ruckeln lässt.
 * - **Kein Absturz bei defekten Daten**: Fehler führen zum Standardzustand, der
 *   Rohwert wird zur Diagnose beiseitegelegt.
 *
 * Diese Datei ist framework-frei und arbeitet gegen eine minimale Storage-Schnittstelle,
 * damit sie in Node getestet werden kann.
 */

import type { AppStateShape, ExerciseType, ItemProgress, Settings } from './types.ts';

/** Aktuelle Version des Speicherformats. */
export const SCHEMA_VERSION = 1;

/** Schlüssel im Storage. */
export const STORAGE_KEY = 'arabisch-trainer:state';

/** Hierhin wird ein unlesbarer Zustand gesichert, statt ihn zu verwerfen. */
export const CORRUPT_KEY = 'arabisch-trainer:state:corrupt';

/**
 * Minimale Schnittstelle, die wir von einem Speicher brauchen.
 * `localStorage` erfüllt sie; für Tests genügt eine Map.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Standardeinstellungen. */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  ttsEnabled: true,
  ttsRate: 0.8, // etwas langsamer als normal – hilft beim Nachsprechen
  dailyGoalXp: 50,
};

/** Frischer Zustand für neue Nutzer. */
export function createDefaultState(): AppStateShape {
  return {
    schemaVersion: SCHEMA_VERSION,
    xp: 0,
    streakDays: 0,
    longestStreak: 0,
    lastLessonDay: null,
    xpToday: 0,
    completedLessonIds: [],
    items: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Frischer Lernstand für ein Item. */
export function createItemProgress(itemId: string): ItemProgress {
  return {
    itemId,
    seen: false,
    correct: 0,
    wrong: 0,
    streak: 0,
    clearedExercises: [],
    // SM-2-Startwerte: sofort fällig, damit das Item in Übungen auftauchen darf.
    easiness: 2.5,
    intervalDays: 0,
    dueAt: 0,
  };
}

// ---------------------------------------------------------------------------
// In-Memory-Fallback
// ---------------------------------------------------------------------------

/** Speicher, der nur im Arbeitsspeicher lebt – Fallback im Privatmodus. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * Liefert den nutzbaren Speicher.
 *
 * Safari im Privatmodus wirft beim Schreiben eine Ausnahme, obwohl `localStorage`
 * existiert – deshalb wird die Verfügbarkeit mit einem echten Schreibversuch geprüft.
 */
export function resolveStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    if (typeof localStorage === 'undefined') {
      return { store: createMemoryStore(), persistent: false };
    }
    const probe = '__probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return { store: localStorage, persistent: true };
  } catch {
    return { store: createMemoryStore(), persistent: false };
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Migrationen von einer Version zur nächsten.
 *
 * Schlüssel = Ausgangsversion. Die Kette wird so lange durchlaufen, bis
 * `SCHEMA_VERSION` erreicht ist. Version 0 steht für „Feld fehlte noch" – so können
 * auch sehr alte Zustände aufgefüllt werden.
 */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {
  0: (state) => ({
    // Felder, die es in v0 noch nicht gab, mit sinnvollen Werten auffüllen.
    ...createDefaultState(),
    ...state,
    schemaVersion: 1,
  }),
};

/** Führt alle nötigen Migrationen aus. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let state = raw;
  let version = typeof state['schemaVersion'] === 'number' ? (state['schemaVersion'] as number) : 0;

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      // Keine Migration hinterlegt → Version anheben und Standardwerte auffüllen.
      state = { ...createDefaultState(), ...state, schemaVersion: version + 1 };
    } else {
      state = step(state);
    }
    version += 1;
  }

  return state;
}

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Säubert einen einzelnen Item-Fortschritt. */
function sanitizeItemProgress(itemId: string, value: unknown): ItemProgress {
  const base = createItemProgress(itemId);
  if (!isRecord(value)) return base;

  const cleared = Array.isArray(value['clearedExercises'])
    ? (value['clearedExercises'].filter((entry) => typeof entry === 'string') as ExerciseType[])
    : [];

  const writingScore = value['writingScore'];
  const lastReviewedAt = value['lastReviewedAt'];

  return {
    itemId,
    seen: bool(value['seen'], base.seen),
    correct: Math.max(0, num(value['correct'], 0)),
    wrong: Math.max(0, num(value['wrong'], 0)),
    streak: Math.max(0, num(value['streak'], 0)),
    clearedExercises: cleared,
    // Nur setzen, wenn ein gültiger Wert vorliegt – das Feld ist optional.
    ...(typeof writingScore === 'number' && Number.isFinite(writingScore)
      ? { writingScore: Math.min(1, Math.max(0, writingScore)) }
      : {}),
    easiness: Math.min(2.8, Math.max(1.3, num(value['easiness'], base.easiness))),
    intervalDays: Math.max(0, num(value['intervalDays'], 0)),
    dueAt: Math.max(0, num(value['dueAt'], 0)),
    ...(typeof lastReviewedAt === 'number' && Number.isFinite(lastReviewedAt)
      ? { lastReviewedAt }
      : {}),
  };
}

/**
 * Bringt einen beliebigen geparsten Wert in die Form von `AppStateShape`.
 *
 * Fremde oder beschädigte Felder werden durch Standardwerte ersetzt, statt die App
 * scheitern zu lassen. Das ist wichtig, weil der Zustand auch aus einer
 * Import-Datei stammen kann.
 */
export function sanitizeState(value: unknown): AppStateShape {
  const defaults = createDefaultState();
  if (!isRecord(value)) return defaults;

  const migrated = migrate(value);

  const settingsRaw = isRecord(migrated['settings']) ? migrated['settings'] : {};
  const theme = str(settingsRaw['theme'], DEFAULT_SETTINGS.theme);

  const itemsRaw = isRecord(migrated['items']) ? migrated['items'] : {};
  const items: Record<string, ItemProgress> = {};
  for (const [itemId, entry] of Object.entries(itemsRaw)) {
    items[itemId] = sanitizeItemProgress(itemId, entry);
  }

  const completed = Array.isArray(migrated['completedLessonIds'])
    ? migrated['completedLessonIds'].filter((entry): entry is string => typeof entry === 'string')
    : [];

  const lastLessonDay = migrated['lastLessonDay'];

  return {
    schemaVersion: SCHEMA_VERSION,
    xp: Math.max(0, num(migrated['xp'], 0)),
    streakDays: Math.max(0, num(migrated['streakDays'], 0)),
    longestStreak: Math.max(0, num(migrated['longestStreak'], 0)),
    lastLessonDay:
      typeof lastLessonDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastLessonDay)
        ? lastLessonDay
        : null,
    xpToday: Math.max(0, num(migrated['xpToday'], 0)),
    // Duplikate entfernen – ein Abschluss zählt einmal.
    completedLessonIds: Array.from(new Set(completed)),
    items,
    settings: {
      theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
      ttsEnabled: bool(settingsRaw['ttsEnabled'], DEFAULT_SETTINGS.ttsEnabled),
      // Außerhalb dieses Bereichs klingt TTS unbrauchbar.
      ttsRate: Math.min(1.5, Math.max(0.5, num(settingsRaw['ttsRate'], DEFAULT_SETTINGS.ttsRate))),
      dailyGoalXp: Math.max(10, num(settingsRaw['dailyGoalXp'], DEFAULT_SETTINGS.dailyGoalXp)),
    },
  };
}

// ---------------------------------------------------------------------------
// Laden und Speichern
// ---------------------------------------------------------------------------

/**
 * Lädt den Zustand.
 * Bei defekten Daten wird der Rohwert gesichert und ein Standardzustand geliefert.
 */
export function loadState(store: KeyValueStore): AppStateShape {
  let raw: string | null = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return createDefaultState();
  }

  if (raw === null || raw === '') return createDefaultState();

  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    // Unlesbar: beiseitelegen, damit nichts verloren geht, und neu starten.
    try {
      store.setItem(CORRUPT_KEY, raw);
    } catch {
      /* Sicherung ist optional – niemals der Grund für einen Absturz. */
    }
    return createDefaultState();
  }
}

/** Schreibt den Zustand sofort. */
export function saveStateNow(store: KeyValueStore, state: AppStateShape): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Speicher voll oder gesperrt – die App läuft weiter, nur ohne Persistenz.
    return false;
  }
}

/**
 * Erzeugt eine gebündelte Speicherfunktion.
 *
 * Aufrufe innerhalb von `delayMs` werden zu einem Schreibvorgang zusammengefasst.
 * `flush()` schreibt sofort – gedacht für `pagehide`/`visibilitychange`, damit beim
 * Wegwischen der App nichts verloren geht.
 */
export function createDebouncedSaver(
  store: KeyValueStore,
  delayMs = 300,
): { save(state: AppStateShape): void; flush(): void; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: AppStateShape | null = null;

  const write = (): void => {
    if (pending !== null) {
      saveStateNow(store, pending);
      pending = null;
    }
    timer = null;
  };

  return {
    save(state) {
      pending = state;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(write, delayMs);
    },
    flush() {
      if (timer !== null) clearTimeout(timer);
      write();
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

/** Setzt den Fortschritt zurück. */
export function clearState(store: KeyValueStore): void {
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* nicht kritisch */
  }
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/** Serialisiert den Zustand für den Datei-Export (eingerückt, gut lesbar). */
export function exportStateToJson(state: AppStateShape): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

/**
 * Liest einen importierten Zustand.
 * Gibt `null` zurück, wenn der Inhalt kein brauchbarer Zustand ist – die aufrufende
 * Stelle kann dann eine verständliche Meldung zeigen.
 */
export function importStateFromJson(json: string): AppStateShape | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return null;
    // Ein Zustand muss mindestens eines dieser Felder mitbringen.
    const looksLikeState =
      'items' in parsed || 'xp' in parsed || 'completedLessonIds' in parsed;
    if (!looksLikeState) return null;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
}
