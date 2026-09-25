/**
 * App-Shell mit Quiz-Modus.
 *
 * Navigation ohne Router: ein schlanker View-State entscheidet, ob die Startansicht,
 * das Buchstaben- oder das Wörter-Quiz gezeigt wird. Die Aufgaben werden beim Start
 * einer Runde einmal erzeugt (und beim „Nochmal" neu), damit die Runde stabil bleibt.
 *
 * Der frühere Datenvorschau-Screen (Phase 1) ist entfallen – die Datenschicht ist
 * inzwischen über den echten Quiz sichtbar.
 */

import { useState } from 'react';
import { AppStateProvider, useAppState } from './state/AppState.tsx';
import { HomeScreen } from './components/quiz/HomeScreen.tsx';
import { QuizScreen } from './components/quiz/QuizScreen.tsx';
import {
  defaultContext,
  generateReviewExercises,
  generateVocabExercises,
} from './domain/exercises.ts';
import { arabicVoiceAvailable } from './domain/audio.ts';
import { knownLetterIds } from './domain/progress.ts';
import { LETTERS } from './data/letters.ts';
import { VOCAB_ITEMS } from './data/vocab.ts';
import type { AppStateShape, ChoiceExercise } from './domain/types.ts';

/** Anzahl Aufgaben pro Runde. */
const LETTER_QUIZ_LENGTH = 10;
const VOCAB_QUIZ_LENGTH = 10;

/** Welche Ansicht ist gerade aktiv? */
type View = 'home' | 'letters' | 'vocab';

/**
 * Erzeugt die Buchstaben-Aufgaben einer Runde.
 *
 * Distraktoren werden bevorzugt aus bereits gesehenen Buchstaben gezogen; solange
 * noch nichts gelernt ist, dienen alle 28 Buchstaben als Quelle. `generateReviewExercises`
 * liefert die vier Buchstaben-Auswahltypen und lässt Audio-Aufgaben weg, wenn keine
 * arabische Stimme verfügbar ist.
 */
function buildLetterExercises(state: AppStateShape): ChoiceExercise[] {
  const known = knownLetterIds(state);
  const pool = known.length > 0 ? known : LETTERS.map((letter) => letter.id);
  const ctx = defaultContext({
    knownItemIds: pool,
    audioAvailable: arabicVoiceAvailable(),
  });
  // Alle Buchstaben-Aufgaben sind Auswahlaufgaben – der Cast ist damit sicher.
  return generateReviewExercises(
    LETTERS.map((letter) => letter.id),
    LETTER_QUIZ_LENGTH,
    ctx,
  ) as ChoiceExercise[];
}

/** Erzeugt die Wörter-Aufgaben einer Runde. */
function buildVocabExercises(): ChoiceExercise[] {
  const ctx = defaultContext({ audioAvailable: arabicVoiceAvailable() });
  return generateVocabExercises(VOCAB_ITEMS, VOCAB_QUIZ_LENGTH, ctx);
}

/** Innere Shell – braucht den App-State und darf ihn deshalb lesen. */
function Shell() {
  const { state } = useAppState();
  const [view, setView] = useState<View>('home');
  // Die Aufgaben einer Runde: als State gehalten, damit „Nochmal" neu würfeln kann.
  const [exercises, setExercises] = useState<ChoiceExercise[]>([]);

  const startLetters = (): void => {
    setExercises(buildLetterExercises(state));
    setView('letters');
  };

  const startVocab = (): void => {
    setExercises(buildVocabExercises());
    setView('vocab');
  };

  const restart = (): void => {
    setExercises(view === 'vocab' ? buildVocabExercises() : buildLetterExercises(state));
  };

  const exit = (): void => setView('home');

  if (view === 'home') {
    return <HomeScreen onStartLetters={startLetters} onStartVocab={startVocab} />;
  }

  return (
    <QuizScreen
      // key erzwingt eine frische Runde, wenn ein neuer Aufgaben-Array kommt.
      key={exercises[0]?.id ?? view}
      title={view === 'vocab' ? 'Wörter-Quiz' : 'Buchstaben-Quiz'}
      exercises={exercises}
      onExit={exit}
      onRestart={restart}
    />
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <AppStateProvider>
        <Shell />
      </AppStateProvider>
    </div>
  );
}
