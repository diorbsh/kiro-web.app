/**
 * Der Zustandsautomat einer Quiz-Runde – ohne React, damit er testbar ist.
 *
 * Ablauf: question → feedback → (nächste Frage | Ende). Falsche Antworten kosten ein
 * Herz und schieben die Frage ans Ende der Warteschlange, damit sie in derselben Runde
 * noch einmal drankommt (Duolingo-Prinzip). Bei 0 Herzen endet die Runde.
 *
 * Die Buchung von Fortschritt/XP/SRS passiert außerhalb (im App-State) – dieser
 * Automat kümmert sich nur um den Spielablauf.
 */

import { HEARTS_PER_LESSON } from '../../domain/gamification.ts';
import type { ChoiceExercise, ExerciseType } from '../../domain/types.ts';

/** Phasen einer Runde. */
export type QuizPhase = 'question' | 'feedback' | 'finished';

export interface QuizRunnerState {
  phase: QuizPhase;
  /** Verbleibende Aufgaben-Warteschlange (erste = aktuelle). */
  queue: ChoiceExercise[];
  hearts: number;
  /** Gewählte Option in der Feedback-Phase (null = noch keine Wahl). */
  selectedOptionId: string | null;
  /** War die letzte Antwort richtig? Nur in der Feedback-Phase aussagekräftig. */
  lastCorrect: boolean;
  /** Erste, richtig gelöste Antworten – Grundlage der Genauigkeit. */
  answeredCorrectly: number;
  /** Wie oft insgesamt geantwortet wurde (inkl. Wiederholungen). */
  totalAnswers: number;
  /** Erste Fehler – nur wer nie falsch lag, bekommt den „fehlerfrei"-Bonus. */
  mistakes: number;
  /** Item-IDs, die in dieser Runde bereits einmal falsch waren (für „erster Versuch"). */
  triedItemIds: string[];
}

interface AnswerEvent {
  type: 'answer';
  optionId: string;
}

interface NextEvent {
  type: 'next';
}

export type QuizEvent = AnswerEvent | NextEvent;

/** Aktuelle Aufgabe = Kopf der Warteschlange. */
export function currentExerciseOf(state: QuizRunnerState): ChoiceExercise | undefined {
  return state.queue[0];
}

/** Reiner Reducer der Quiz-Runde. */
export function quizReducer(state: QuizRunnerState, event: QuizEvent): QuizRunnerState {
  switch (event.type) {
    case 'answer': {
      const exercise = currentExerciseOf(state);
      // Nur in der Frage-Phase mit vorhandener Aufgabe antworten.
      if (state.phase !== 'question' || !exercise) return state;

      const correct = event.optionId === exercise.correctOptionId;
      const firstTry = !state.triedItemIds.includes(exercise.itemId);

      return {
        ...state,
        phase: 'feedback',
        selectedOptionId: event.optionId,
        lastCorrect: correct,
        answeredCorrectly: state.answeredCorrectly + (correct && firstTry ? 1 : 0),
        totalAnswers: state.totalAnswers + 1,
        hearts: correct ? state.hearts : state.hearts - 1,
        mistakes: state.mistakes + (correct ? 0 : 1),
        // Beim ersten Fehlversuch das Item merken, damit spätere Versuche nicht
        // als „erster Versuch" zählen.
        triedItemIds:
          correct || !firstTry ? state.triedItemIds : [...state.triedItemIds, exercise.itemId],
      };
    }

    case 'next': {
      if (state.phase !== 'feedback') return state;

      // Herzen aufgebraucht → Runde vorbei.
      if (state.hearts <= 0) {
        return { ...state, phase: 'finished', queue: [], selectedOptionId: null };
      }

      const [answered, ...rest] = state.queue;
      // Falsch beantwortete Aufgaben wandern ans Ende und kommen erneut dran.
      const nextQueue = !state.lastCorrect && answered ? [...rest, answered] : rest;

      if (nextQueue.length === 0) {
        return { ...state, phase: 'finished', queue: [], selectedOptionId: null };
      }

      return {
        ...state,
        phase: 'question',
        queue: nextQueue,
        selectedOptionId: null,
        lastCorrect: false,
      };
    }

    default:
      return state;
  }
}

/** Erststand einer Runde aus den erzeugten Aufgaben. */
export function createInitialState(exercises: ChoiceExercise[]): QuizRunnerState {
  return {
    phase: exercises.length === 0 ? 'finished' : 'question',
    queue: exercises,
    hearts: HEARTS_PER_LESSON,
    selectedOptionId: null,
    lastCorrect: false,
    answeredCorrectly: 0,
    totalAnswers: 0,
    mistakes: 0,
    triedItemIds: [],
  };
}

export interface QuizAnswerInfo {
  itemId: string;
  exerciseType: ExerciseType;
  correct: boolean;
  wasFirstTry: boolean;
}

/** Genauigkeit über die ersten Versuche (0–1), bezogen auf die eindeutigen Items. */
export function accuracyOf(exercises: ChoiceExercise[], answeredCorrectly: number): number {
  const distinct = new Set(exercises.map((exercise) => exercise.itemId)).size;
  if (distinct === 0) return 0;
  return Math.min(1, answeredCorrectly / distinct);
}
