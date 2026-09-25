/**
 * React-Anbindung des Quiz-Automaten.
 *
 * Die Ablauflogik lebt framework-frei in `quizMachine.ts` (und ist dort testbar).
 * Dieser Hook verdrahtet sie mit `useReducer` und liefert der UI bequeme Ableitungen
 * (aktuelle Aufgabe, Genauigkeit, „fehlerfrei"). Die Buchung von Fortschritt/XP/SRS
 * geschieht außerhalb über den `answer`-Rückgabewert.
 */

import { useCallback, useMemo, useReducer } from 'react';
import {
  accuracyOf,
  createInitialState,
  quizReducer,
  type QuizAnswerInfo,
  type QuizRunnerState,
} from './quizMachine.ts';
import type { ChoiceExercise } from '../../domain/types.ts';

export type { QuizAnswerInfo, QuizPhase, QuizRunnerState } from './quizMachine.ts';

export interface QuizRunner {
  state: QuizRunnerState;
  /** Die aktuell zu lösende Aufgabe (undefined, wenn die Runde vorbei ist). */
  currentExercise: ChoiceExercise | undefined;
  /** Anzahl Aufgaben insgesamt in dieser Runde. */
  total: number;
  /** Genauigkeit über die ersten Versuche (0–1). */
  accuracy: number;
  /** Wurde die Runde fehlerfrei gelöst? */
  perfect: boolean;
  /** Beantwortet die aktuelle Aufgabe; liefert die Buchungsdaten zurück. */
  answer: (optionId: string) => QuizAnswerInfo | null;
  /** Geht zur nächsten Frage bzw. beendet die Runde. */
  next: () => void;
}

/**
 * Steuert eine Quiz-Runde für die übergebenen Aufgaben.
 * `exercises` dient über die Identität als Rundenschlüssel – ein neuer Array
 * (z. B. „Nochmal") startet eine frische Runde.
 */
export function useQuizRunner(exercises: ChoiceExercise[]): QuizRunner {
  const [state, dispatch] = useReducer(quizReducer, exercises, createInitialState);

  const currentExercise = state.queue[0];

  const answer = useCallback(
    (optionId: string): QuizAnswerInfo | null => {
      // Nur in der Frage-Phase zählt eine Antwort.
      if (state.phase !== 'question' || !currentExercise) return null;
      const correct = optionId === currentExercise.correctOptionId;
      const wasFirstTry = !state.triedItemIds.includes(currentExercise.itemId);
      dispatch({ type: 'answer', optionId });
      return {
        itemId: currentExercise.itemId,
        exerciseType: currentExercise.type,
        correct,
        wasFirstTry,
      };
    },
    [state.phase, state.triedItemIds, currentExercise],
  );

  const next = useCallback(() => dispatch({ type: 'next' }), []);

  const accuracy = useMemo(
    () => accuracyOf(exercises, state.answeredCorrectly),
    [exercises, state.answeredCorrectly],
  );

  return {
    state,
    currentExercise,
    total: exercises.length,
    accuracy,
    perfect: state.mistakes === 0 && state.totalAnswers > 0,
    answer,
    next,
  };
}
