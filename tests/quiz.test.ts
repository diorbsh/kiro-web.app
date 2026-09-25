/**
 * Tests des Quiz-Automaten.
 *
 * Hier wird der Spielablauf abgesichert: Herzen bei Fehlern, Wiederholung falscher
 * Fragen in derselben Runde, Ende bei 0 Herzen bzw. leerer Warteschlange und die
 * Zählung für Genauigkeit und „fehlerfrei".
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  accuracyOf,
  createInitialState,
  currentExerciseOf,
  quizReducer,
  type QuizRunnerState,
} from '../src/components/quiz/quizMachine.ts';
import { HEARTS_PER_LESSON } from '../src/domain/gamification.ts';
import type { ChoiceExercise } from '../src/domain/types.ts';

/** Baut eine einfache Auswahlaufgabe mit einer bekannten richtigen Option. */
function exercise(itemId: string): ChoiceExercise {
  return {
    id: `ex#${itemId}`,
    type: 'arToDe',
    itemId,
    prompt: 'Test',
    promptMode: 'latin',
    options: [
      { id: itemId, label: 'richtig', isArabic: false },
      { id: `${itemId}-x`, label: 'falsch', isArabic: false },
    ],
    correctOptionId: itemId,
    explanation: 'Erklärung.',
  };
}

/** Beantwortet die aktuelle Aufgabe und geht direkt zur nächsten Phase. */
function answerCurrent(state: QuizRunnerState, correct: boolean): QuizRunnerState {
  const exercise = currentExerciseOf(state);
  assert.ok(exercise, 'es gibt eine aktuelle Aufgabe');
  const optionId = correct ? exercise.correctOptionId : `${exercise.itemId}-x`;
  const afterAnswer = quizReducer(state, { type: 'answer', optionId });
  return quizReducer(afterAnswer, { type: 'next' });
}

test('eine Runde startet in der Frage-Phase mit vollen Herzen', () => {
  const state = createInitialState([exercise('a'), exercise('b')]);
  assert.equal(state.phase, 'question');
  assert.equal(state.hearts, HEARTS_PER_LESSON);
  assert.equal(currentExerciseOf(state)?.itemId, 'a');
});

test('eine leere Aufgabenliste ergibt sofort eine beendete Runde', () => {
  const state = createInitialState([]);
  assert.equal(state.phase, 'finished');
});

test('eine richtige Antwort führt ins Feedback und dann zur nächsten Frage', () => {
  const start = createInitialState([exercise('a'), exercise('b')]);
  const afterAnswer = quizReducer(start, { type: 'answer', optionId: 'a' });
  assert.equal(afterAnswer.phase, 'feedback');
  assert.equal(afterAnswer.lastCorrect, true);
  assert.equal(afterAnswer.hearts, HEARTS_PER_LESSON, 'richtige Antwort kostet kein Herz');

  const afterNext = quizReducer(afterAnswer, { type: 'next' });
  assert.equal(afterNext.phase, 'question');
  assert.equal(currentExerciseOf(afterNext)?.itemId, 'b');
});

test('eine falsche Antwort kostet ein Herz und wiederholt die Frage später', () => {
  const start = createInitialState([exercise('a'), exercise('b')]);
  const afterAnswer = quizReducer(start, { type: 'answer', optionId: 'a-x' });
  assert.equal(afterAnswer.lastCorrect, false);
  assert.equal(afterAnswer.hearts, HEARTS_PER_LESSON - 1);
  assert.equal(afterAnswer.mistakes, 1);

  const afterNext = quizReducer(afterAnswer, { type: 'next' });
  // 'a' war falsch → 'b' kommt jetzt dran, 'a' wandert ans Ende.
  assert.equal(currentExerciseOf(afterNext)?.itemId, 'b');
  assert.equal(afterNext.queue.length, 2, 'die falsche Frage bleibt in der Runde');
  assert.equal(afterNext.queue[afterNext.queue.length - 1]?.itemId, 'a');
});

test('ein späterer Versuch derselben Frage zählt nicht mehr als erster Versuch', () => {
  let state = createInitialState([exercise('a'), exercise('b')]);
  // 'a' falsch beantworten.
  state = answerCurrent(state, false);
  // 'b' richtig.
  state = answerCurrent(state, true);
  // Jetzt wieder 'a', diesmal richtig – aber kein erster Versuch mehr.
  assert.equal(currentExerciseOf(state)?.itemId, 'a');
  const before = state.answeredCorrectly;
  state = answerCurrent(state, true);
  assert.equal(
    state.answeredCorrectly,
    before,
    'ein wiederholter Treffer erhöht die Erst-Treffer nicht',
  );
});

test('die Runde endet, sobald alle Fragen richtig beantwortet sind', () => {
  let state = createInitialState([exercise('a'), exercise('b')]);
  state = answerCurrent(state, true);
  state = answerCurrent(state, true);
  assert.equal(state.phase, 'finished');
  assert.equal(state.mistakes, 0, 'fehlerfreie Runde');
});

test('bei null Herzen ist die Runde vorbei', () => {
  let state = createInitialState([exercise('a'), exercise('b'), exercise('c')]);
  // Fünf Fehler aufbrauchen (mit Wiederholungen kommen immer wieder Fragen).
  for (let i = 0; i < HEARTS_PER_LESSON; i += 1) {
    if (state.phase !== 'question') break;
    state = answerCurrent(state, false);
  }
  assert.equal(state.hearts, 0);
  assert.equal(state.phase, 'finished');
});

test('die Genauigkeit bezieht sich auf die eindeutigen Items der Runde', () => {
  const exercises = [exercise('a'), exercise('b'), exercise('a')];
  // Zwei eindeutige Items, ein Erst-Treffer → 50 %.
  assert.equal(accuracyOf(exercises, 1), 0.5);
  // Mehr Treffer als Items werden auf 1 gedeckelt.
  assert.equal(accuracyOf(exercises, 5), 1);
  assert.equal(accuracyOf([], 0), 0);
});
