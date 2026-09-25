/**
 * Die spielbare Quiz-Ansicht.
 *
 * Rein präsentativ plus Tastatursteuerung: Der Ablauf steckt in `useQuizRunner`, die
 * Buchung von Fortschritt/XP/SRS in `AppState`. Diese Komponente rendert die aktuelle
 * Aufgabe, das Herzen-Display, das Feedback und die Abschluss-Ansicht.
 *
 * Arabische Optionen laufen über <ArabicText> (RTL + Font); die deutsche UI bleibt LTR.
 */

import { useEffect } from 'react';
import { ArabicText } from '../arabic/ArabicText.tsx';
import { Confetti } from './Confetti.tsx';
import { useQuizRunner } from './useQuizRunner.ts';
import { useAppState } from '../../state/AppState.tsx';
import { speak } from '../../domain/audio.ts';
import { XP_PERFECT_LESSON_BONUS } from '../../domain/gamification.ts';
import type { ChoiceExercise } from '../../domain/types.ts';

interface QuizScreenProps {
  /** Titel der Runde (deutsch). */
  title: string;
  /** Die zu spielenden Aufgaben – Identität dient als Rundenschlüssel. */
  exercises: ChoiceExercise[];
  /** Zurück zur Startansicht. */
  onExit: () => void;
  /** Startet eine frische Runde (neue Aufgaben). */
  onRestart: () => void;
}

/** Herzen-Leiste: gefüllte und verbrauchte Herzen. */
function Hearts({ hearts, max }: { hearts: number; max: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${hearts} von ${max} Herzen übrig`}>
      {Array.from({ length: max }).map((_, index) => (
        <span key={index} className={index < hearts ? '' : 'opacity-25 grayscale'}>
          ❤️
        </span>
      ))}
    </div>
  );
}

/** Zeigt die Frage je nach Modus (Ton, arabischer Text oder lateinisch). */
function Prompt({ exercise, audioEnabled }: { exercise: ChoiceExercise; audioEnabled: boolean }) {
  return (
    <div className="text-center">
      <p className="mb-4 text-lg font-medium text-slate-700 dark:text-slate-200">
        {exercise.prompt}
      </p>

      {exercise.promptMode === 'arabic' && exercise.promptArabic && (
        <ArabicText block className="text-glyph">
          {exercise.promptArabic}
        </ArabicText>
      )}

      {exercise.promptMode === 'audio' && (
        <button
          type="button"
          onClick={() => audioEnabled && speak(exercise.ttsText ?? '')}
          disabled={!audioEnabled}
          className="mx-auto flex min-h-[72px] min-w-[72px] items-center justify-center rounded-full bg-brand-600 text-3xl text-white active:bg-brand-700 disabled:opacity-40"
          aria-label="Ton abspielen"
        >
          🔊
        </button>
      )}
    </div>
  );
}

export function QuizScreen({ title, exercises, onExit, onRestart }: QuizScreenProps) {
  const { dispatch } = useAppState();
  const runner = useQuizRunner(exercises);
  const { state, currentExercise, perfect } = runner;

  const audioEnabled = typeof speechSynthesis !== 'undefined';

  // Bei Audio-Aufgaben den Ton automatisch abspielen, sobald die Frage erscheint.
  useEffect(() => {
    if (
      state.phase === 'question' &&
      currentExercise?.promptMode === 'audio' &&
      audioEnabled &&
      currentExercise.ttsText
    ) {
      speak(currentExercise.ttsText);
    }
  }, [state.phase, currentExercise, audioEnabled]);

  /** Eine Option wählen: Antwort buchen (Runner + App-State). */
  const handleAnswer = (optionId: string): void => {
    const info = runner.answer(optionId);
    if (info) {
      dispatch({
        type: 'answer',
        itemId: info.itemId,
        exerciseType: info.exerciseType,
        correct: info.correct,
        wasFirstTry: info.wasFirstTry,
        now: Date.now(),
      });
    }
  };

  /** Nächste Frage bzw. beim Wechsel nach „finished" die Runde abschließen. */
  const handleNext = (): void => {
    runner.next();
  };

  // Beim Übergang in die Abschluss-Phase die Runde buchen (Streak + evtl. Bonus).
  // Bewusst nur an `state.phase` gebunden: Streak und Bonus dürfen pro Runde genau
  // einmal gutgeschrieben werden, nicht bei jedem Re-Render.
  useEffect(() => {
    if (state.phase !== 'finished') return;
    const bonus = perfect ? XP_PERFECT_LESSON_BONUS : 0;
    dispatch({ type: 'completeLesson', bonusXp: bonus, now: Date.now() });
  }, [state.phase, perfect, dispatch]);

  // Tastatursteuerung: 1–4 wählt eine Option, Enter/Leertaste geht weiter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (state.phase === 'question' && currentExercise) {
        const index = Number.parseInt(event.key, 10) - 1;
        const option = currentExercise.options[index];
        if (option) {
          event.preventDefault();
          handleAnswer(option.id);
        }
      } else if (state.phase === 'feedback' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // -------------------------------------------------------------------------
  // Abschluss-Ansicht
  // -------------------------------------------------------------------------
  if (state.phase === 'finished') {
    const outOfHearts = state.hearts <= 0;
    const accuracyPct = Math.round(runner.accuracy * 100);
    const good = !outOfHearts && runner.accuracy >= 0.8;

    return (
      <div className="relative mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-4 pt-safe pb-safe text-center">
        {good && <Confetti />}
        <div className="text-6xl">{outOfHearts ? '💔' : good ? '🎉' : '👍'}</div>
        <h2 className="mt-4 text-2xl font-bold">
          {outOfHearts ? 'Keine Herzen mehr' : 'Runde geschafft!'}
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {outOfHearts
            ? 'Kein Problem – versuch es gleich noch einmal.'
            : runner.perfect
              ? 'Fehlerfrei! Stark gemacht.'
              : 'Weiter so.'}
        </p>

        <dl className="mt-6 grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Genauigkeit</dt>
            <dd className="text-2xl font-bold text-brand-600 dark:text-brand-300">
              {accuracyPct}%
            </dd>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Herzen übrig</dt>
            <dd className="text-2xl font-bold text-rose-500">{Math.max(0, state.hearts)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[52px] rounded-2xl bg-brand-600 font-semibold text-white active:bg-brand-700"
          >
            Nochmal
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[52px] rounded-2xl bg-white font-semibold shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            Zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Frage- und Feedback-Ansicht
  // -------------------------------------------------------------------------
  if (!currentExercise) return null;

  const answered = state.phase === 'feedback';

  /** Farbliche Kennzeichnung einer Option nach der Antwort. */
  const optionClass = (optionId: string): string => {
    if (!answered) {
      return 'bg-white shadow-sm active:bg-brand-50 dark:bg-slate-900 dark:active:bg-slate-800';
    }
    if (optionId === currentExercise.correctOptionId) {
      return 'bg-mastery-mastered/20 ring-2 ring-mastery-mastered';
    }
    if (optionId === state.selectedOptionId) {
      return 'bg-rose-500/20 ring-2 ring-rose-500 animate-shake';
    }
    return 'bg-white opacity-60 dark:bg-slate-900';
  };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pt-safe">
      {/* Kopfzeile: Abbrechen, Fortschritt, Herzen */}
      <header className="flex items-center gap-3 py-3">
        <button
          type="button"
          onClick={onExit}
          className="min-h-[44px] min-w-[44px] rounded-full text-xl text-slate-400"
          aria-label="Quiz beenden"
        >
          ✕
        </button>
        <h1 className="flex-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </h1>
        <Hearts hearts={state.hearts} max={5} />
      </header>

      {/* Frage */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <Prompt exercise={currentExercise} audioEnabled={audioEnabled} />
      </div>

      {/* Antwortoptionen */}
      <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2">
        {currentExercise.options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            disabled={answered}
            onClick={() => handleAnswer(option.id)}
            className={`flex min-h-[64px] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-lg font-medium transition-colors ${optionClass(
              option.id,
            )}`}
          >
            {/* Ziffernkürzel für die Tastaturbedienung */}
            <span className="hidden text-xs text-slate-400 sm:inline">{index + 1}</span>
            {option.isArabic ? (
              <ArabicText className="text-3xl">{option.label}</ArabicText>
            ) : (
              <span>{option.label}</span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback-Leiste */}
      {answered && (
        <div
          className={`animate-slide-up sticky bottom-0 -mx-4 rounded-t-3xl p-4 pb-safe ${
            state.lastCorrect
              ? 'bg-mastery-mastered/20'
              : 'bg-rose-500/15'
          }`}
        >
          <p className="mb-3 font-semibold">
            {state.lastCorrect ? '✅ Richtig!' : '❌ Nicht ganz'}
          </p>
          {!state.lastCorrect && (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {currentExercise.explanation}
            </p>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[52px] w-full rounded-2xl bg-brand-600 font-semibold text-white active:bg-brand-700"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
