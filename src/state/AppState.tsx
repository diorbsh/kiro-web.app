/**
 * Globaler Anwendungszustand: Fortschritt, XP, Streak und Einstellungen.
 *
 * Bewusste Entscheidungen:
 * - **Context + useReducer statt eines State-Pakets**: Der Zustand ist überschaubar
 *   und die Domänenlogik lebt bereits framework-frei in `src/domain`. Der Reducer
 *   ruft nur diese Funktionen auf – die heikle Logik bleibt damit testbar, ohne React.
 * - **Persistenz als Nebeneffekt**: Geladen wird einmalig beim Start (`resolveStore` +
 *   `loadState`), geschrieben gebündelt über den Debounced-Saver. `pagehide` und
 *   `visibilitychange` erzwingen ein sofortiges Speichern, damit beim Wegwischen der
 *   App auf dem Handy nichts verloren geht.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  createDebouncedSaver,
  createDefaultState,
  loadState,
  resolveStore,
  type KeyValueStore,
} from '../domain/storage.ts';
import { progressFor, recordAnswer } from '../domain/progress.ts';
import { schedule, gradeFromAnswer } from '../domain/srs.ts';
import { xpForAnswer, registerLessonCompletion, resetDailyXpIfNewDay } from '../domain/gamification.ts';
import type { AppStateShape, ExerciseType } from '../domain/types.ts';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Bucht eine einzelne Antwort.
 * Fortschritt (`recordAnswer`), SRS (`schedule`) und XP (`xpForAnswer`) werden
 * gemeinsam aktualisiert, damit der Zustand nie halbfertig ist.
 */
interface RecordAnswerAction {
  type: 'answer';
  itemId: string;
  exerciseType: ExerciseType;
  correct: boolean;
  /** Erster Versuch bei diesem Item in der laufenden Runde? Steuert XP und SRS-Note. */
  wasFirstTry: boolean;
  /** Zeitpunkt der Buchung (Epoch ms) – als Parameter, damit Tests bestimmbar bleiben. */
  now: number;
}

/** Schließt eine Runde ab: Streak fortschreiben, Bonus-XP gutschreiben. */
interface CompleteLessonAction {
  type: 'completeLesson';
  /** ID der abgeschlossenen Lektion – wird als „geschafft" vermerkt (leer = Quiz-Runde). */
  lessonId?: string;
  /** Zusatz-XP, z. B. der Bonus für eine fehlerfreie Runde. */
  bonusXp: number;
  now: number;
}

/** Setzt den gesamten Fortschritt zurück. */
interface ResetAction {
  type: 'reset';
}

/** Ersetzt den Zustand vollständig (z. B. nach einem Import). */
interface HydrateAction {
  type: 'hydrate';
  state: AppStateShape;
}

export type AppAction =
  | RecordAnswerAction
  | CompleteLessonAction
  | ResetAction
  | HydrateAction;

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Reiner Reducer – keine Seiteneffekte. Er delegiert an die Domänenfunktionen und
 * setzt deren Ergebnisse zu einem neuen, unveränderlichen Zustand zusammen.
 */
export function appReducer(state: AppStateShape, action: AppAction): AppStateShape {
  switch (action.type) {
    case 'answer': {
      const before = progressFor(state, action.itemId);
      // 1. Zähler und bestandene Übungsarten fortschreiben.
      const counted = recordAnswer(before, action.correct, action.exerciseType);
      // 2. SRS-Termin neu berechnen; die Note leitet sich aus dem Antwortverhalten ab.
      const grade = gradeFromAnswer(action.correct, action.wasFirstTry);
      const scheduled = schedule(counted, grade, action.now);
      // 3. XP nur für richtige Antworten; der erste Versuch zählt mehr.
      const gainedXp = xpForAnswer(action.correct, action.wasFirstTry);

      return {
        ...state,
        xp: state.xp + gainedXp,
        xpToday: state.xpToday + gainedXp,
        items: { ...state.items, [action.itemId]: scheduled },
      };
    }

    case 'completeLesson': {
      const streak = registerLessonCompletion(state, new Date(action.now));
      const completed =
        action.lessonId && !state.completedLessonIds.includes(action.lessonId)
          ? [...state.completedLessonIds, action.lessonId]
          : state.completedLessonIds;

      return {
        ...state,
        xp: state.xp + action.bonusXp,
        xpToday: state.xpToday + action.bonusXp,
        streakDays: streak.streakDays,
        longestStreak: streak.longestStreak,
        lastLessonDay: streak.lastLessonDay,
        completedLessonIds: completed,
      };
    }

    case 'reset':
      return createDefaultState();

    case 'hydrate':
      return action.state;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppStateContextValue {
  state: AppStateShape;
  dispatch: (action: AppAction) => void;
  /** true, wenn der Fortschritt dauerhaft gespeichert wird (kein Privatmodus). */
  persistent: boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

/**
 * Lädt den Anfangszustand aus dem Speicher.
 * Der Store wird gemerkt (Ref), damit der Saver dieselbe Instanz nutzt.
 */
function initState(store: KeyValueStore): AppStateShape {
  // Beim Laden prüfen, ob ein neuer Kalendertag begonnen hat (Tages-XP zurücksetzen).
  return resetDailyXpIfNewDay(loadState(store));
}

interface AppStateProviderProps {
  children: ReactNode;
  /** Store-Override für Tests; im Betrieb wird `resolveStore()` genutzt. */
  store?: KeyValueStore;
  persistent?: boolean;
}

export function AppStateProvider({ children, store, persistent }: AppStateProviderProps) {
  // Store einmalig auflösen – im Privatmodus fällt er auf einen In-Memory-Speicher zurück.
  const resolved = useRef<{ store: KeyValueStore; persistent: boolean } | null>(null);
  if (resolved.current === null) {
    resolved.current =
      store !== undefined
        ? { store, persistent: persistent ?? true }
        : resolveStore();
  }
  const { store: activeStore, persistent: isPersistent } = resolved.current;

  const [state, dispatch] = useReducer(appReducer, activeStore, initState);

  // Gebündeltes Speichern: ein Saver für die Lebensdauer des Providers.
  const saver = useRef(createDebouncedSaver(activeStore)).current;

  // Bei jeder Zustandsänderung gebündelt speichern.
  useEffect(() => {
    saver.save(state);
  }, [state, saver]);

  // Beim Wegwischen/Verstecken der App sofort schreiben, damit nichts verloren geht.
  useEffect(() => {
    const flush = (): void => saver.flush();
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') saver.flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      // Beim Aufräumen den letzten Stand noch sichern.
      saver.flush();
    };
  }, [saver]);

  const value = useMemo<AppStateContextValue>(
    () => ({ state, dispatch, persistent: isPersistent }),
    [state, isPersistent],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Zugriff auf den Anwendungszustand. Wirft außerhalb des Providers. */
export function useAppState(): AppStateContextValue {
  const value = useContext(AppStateContext);
  if (value === null) {
    throw new Error('useAppState muss innerhalb von <AppStateProvider> genutzt werden.');
  }
  return value;
}
