/**
 * Tests der Persistenz.
 *
 * Wichtigste Eigenschaft: Die App darf an keinem defekten oder fremden Zustand
 * scheitern – ein kaputter Speicher kostet höchstens den Fortschritt, niemals die
 * Benutzbarkeit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CORRUPT_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  clearState,
  createDebouncedSaver,
  createDefaultState,
  createItemProgress,
  createMemoryStore,
  exportStateToJson,
  importStateFromJson,
  loadState,
  sanitizeState,
  saveStateNow,
} from '../src/domain/storage.ts';
import { lessonStatus, progressFor } from '../src/domain/progress.ts';
import { LESSONS } from '../src/data/lessons.ts';

// ---------------------------------------------------------------------------
// Standardzustand
// ---------------------------------------------------------------------------

test('der Standardzustand ist leer und trägt die aktuelle Schema-Version', () => {
  const state = createDefaultState();
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.xp, 0);
  assert.equal(state.streakDays, 0);
  assert.equal(state.lastLessonDay, null);
  assert.deepEqual(state.completedLessonIds, []);
  assert.deepEqual(state.items, {});
  assert.equal(state.settings.theme, 'system');
});

test('ein neuer Zustand kann nur die erste Lektion spielen', () => {
  const state = createDefaultState();
  const first = LESSONS[0];
  const second = LESSONS[1];
  assert.ok(first && second);
  assert.equal(lessonStatus(state, first), 'open');
  assert.equal(lessonStatus(state, second), 'locked');
});

// ---------------------------------------------------------------------------
// Round-Trip
// ---------------------------------------------------------------------------

test('Speichern und Laden erhält den Zustand unverändert', () => {
  const store = createMemoryStore();
  const state = createDefaultState();
  state.xp = 340;
  state.streakDays = 7;
  state.longestStreak = 9;
  state.lastLessonDay = '2025-05-10';
  state.completedLessonIds = ['lesson:letters:1', 'lesson:writing:1'];
  state.items['letter:baa'] = {
    ...createItemProgress('letter:baa'),
    correct: 6,
    wrong: 1,
    seen: true,
    clearedExercises: ['audioToLetter', 'formToLetter'],
    writingScore: 0.72,
    easiness: 2.4,
    intervalDays: 6,
    dueAt: 1_700_000_000_000,
  };

  assert.equal(saveStateNow(store, state), true);
  const loaded = loadState(store);
  assert.deepEqual(loaded, state);
});

test('ein leerer Speicher ergibt den Standardzustand', () => {
  const store = createMemoryStore();
  assert.deepEqual(loadState(store), createDefaultState());
});

// ---------------------------------------------------------------------------
// Fehlerfälle
// ---------------------------------------------------------------------------

test('defektes JSON führt zum Standardzustand und wird gesichert', () => {
  const store = createMemoryStore();
  store.setItem(STORAGE_KEY, '{ das ist kein JSON');

  const loaded = loadState(store);
  assert.deepEqual(loaded, createDefaultState(), 'App startet trotzdem');
  // Der Rohwert darf nicht einfach verschwinden.
  assert.equal(store.getItem(CORRUPT_KEY), '{ das ist kein JSON');
});

test('ein fremdartiger Zustand wird auf gültige Werte zurechtgebogen', () => {
  const messy = {
    schemaVersion: SCHEMA_VERSION,
    xp: -50, // negativ
    streakDays: 'sieben', // falscher Typ
    lastLessonDay: '10.05.2025', // falsches Format
    completedLessonIds: ['a', 'a', 42, null], // Duplikate und Müll
    items: {
      'letter:baa': { correct: 'viele', easiness: 99, writingScore: 5 },
    },
    settings: { theme: 'neon', ttsRate: 12, dailyGoalXp: -3 },
  };

  const state = sanitizeState(messy);
  assert.equal(state.xp, 0, 'negative XP werden auf 0 gehoben');
  assert.equal(state.streakDays, 0, 'falscher Typ → Standardwert');
  assert.equal(state.lastLessonDay, null, 'ungültiges Datumsformat wird verworfen');
  assert.deepEqual(state.completedLessonIds, ['a'], 'nur gültige, eindeutige IDs');
  assert.equal(state.settings.theme, 'system', 'unbekanntes Theme → System');
  assert.ok(state.settings.ttsRate <= 1.5, 'Sprechtempo wird begrenzt');
  assert.ok(state.settings.dailyGoalXp >= 10, 'Tagesziel hat eine Untergrenze');

  const item = state.items['letter:baa'];
  assert.ok(item);
  assert.equal(item.correct, 0, 'unbrauchbarer Zähler → 0');
  assert.ok(item.easiness <= 2.8, 'Leichtigkeit wird begrenzt');
  assert.equal(item.writingScore, 1, 'Trefferquote wird auf 1 begrenzt');
  assert.equal(item.itemId, 'letter:baa', 'die ID kommt aus dem Schlüssel');
});

test('null und primitive Werte ergeben den Standardzustand', () => {
  assert.deepEqual(sanitizeState(null), createDefaultState());
  assert.deepEqual(sanitizeState(42), createDefaultState());
  assert.deepEqual(sanitizeState('text'), createDefaultState());
  assert.deepEqual(sanitizeState([1, 2, 3]), createDefaultState());
});

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

test('ein Zustand ohne Schema-Version wird migriert', () => {
  // So sähe ein sehr früher Zustand aus: nur XP, keine neuen Felder.
  const legacy = { xp: 120, items: { 'letter:baa': { correct: 3, seen: true } } };

  const state = sanitizeState(legacy);
  assert.equal(state.schemaVersion, SCHEMA_VERSION, 'Version wird angehoben');
  assert.equal(state.xp, 120, 'vorhandene Daten bleiben erhalten');
  // Neue Felder sind mit Standardwerten gefüllt.
  assert.equal(state.longestStreak, 0);
  assert.equal(state.xpToday, 0);
  assert.equal(state.settings.dailyGoalXp, 50);
  assert.equal(state.items['letter:baa']?.correct, 3);
});

test('ein Zustand aus der Zukunft wird nicht zerstört', () => {
  const future = { schemaVersion: 99, xp: 500, items: {} };
  const state = sanitizeState(future);
  // Wir können nicht rückwärts migrieren, aber die XP dürfen nicht verloren gehen.
  assert.equal(state.xp, 500);
});

// ---------------------------------------------------------------------------
// Gebündeltes Schreiben
// ---------------------------------------------------------------------------

test('der Saver bündelt mehrere Aufrufe zu einem Schreibvorgang', async () => {
  const store = createMemoryStore();
  let writes = 0;
  const counting = {
    getItem: (key: string) => store.getItem(key),
    setItem: (key: string, value: string) => {
      writes += 1;
      store.setItem(key, value);
    },
    removeItem: (key: string) => store.removeItem(key),
  };

  const saver = createDebouncedSaver(counting, 20);
  const state = createDefaultState();

  // Fünf schnelle Änderungen hintereinander.
  for (let i = 1; i <= 5; i += 1) {
    saver.save({ ...state, xp: i * 10 });
  }
  assert.equal(writes, 0, 'noch nichts geschrieben');

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(writes, 1, 'nur ein Schreibvorgang');
  assert.equal(loadState(counting).xp, 50, 'der letzte Wert gewinnt');
});

test('flush schreibt sofort – wichtig beim Wegwischen der App', () => {
  const store = createMemoryStore();
  const saver = createDebouncedSaver(store, 5000);
  saver.save({ ...createDefaultState(), xp: 77 });

  saver.flush();
  assert.equal(loadState(store).xp, 77);
});

test('cancel verwirft ausstehende Schreibvorgänge', async () => {
  const store = createMemoryStore();
  const saver = createDebouncedSaver(store, 10);
  saver.save({ ...createDefaultState(), xp: 99 });
  saver.cancel();

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(store.getItem(STORAGE_KEY), null, 'nichts geschrieben');
});

test('ein blockierter Speicher lässt die App nicht abstürzen', () => {
  const blocked = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => undefined,
  };
  // Darf nicht werfen, sondern nur false melden.
  assert.equal(saveStateNow(blocked, createDefaultState()), false);
  assert.doesNotThrow(() => loadState(blocked));
});

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

test('Export und Import erhalten den Fortschritt', () => {
  const state = createDefaultState();
  state.xp = 210;
  state.completedLessonIds = ['lesson:letters:1'];
  state.items['letter:taa'] = { ...createItemProgress('letter:taa'), correct: 4, seen: true };

  const json = exportStateToJson(state);
  assert.match(json, /"exportedAt"/, 'Export trägt einen Zeitstempel');

  const imported = importStateFromJson(json);
  assert.ok(imported);
  assert.equal(imported.xp, 210);
  assert.deepEqual(imported.completedLessonIds, ['lesson:letters:1']);
  assert.equal(imported.items['letter:taa']?.correct, 4);
});

test('der Import lehnt fremde Dateien ab', () => {
  assert.equal(importStateFromJson('kein json'), null);
  assert.equal(importStateFromJson('{"foo":"bar"}'), null, 'kein Zustand erkennbar');
  assert.equal(importStateFromJson('[]'), null);
  // Ein Objekt mit Zustandsfeldern wird akzeptiert.
  assert.ok(importStateFromJson('{"xp":10}'));
});

test('clearState löscht den Fortschritt', () => {
  const store = createMemoryStore();
  saveStateNow(store, { ...createDefaultState(), xp: 500 });
  clearState(store);
  assert.deepEqual(loadState(store), createDefaultState());
});

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------

test('progressFor liefert immer einen Eintrag', () => {
  const state = createDefaultState();
  const fresh = progressFor(state, 'letter:baa');
  assert.equal(fresh.itemId, 'letter:baa');
  assert.equal(fresh.correct, 0);
  // Der Zustand selbst wird dabei nicht verändert.
  assert.equal(Object.keys(state.items).length, 0);
});
