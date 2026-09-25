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
  generateLetterQuiz,
  generateVocabExercises,
  type LetterQuizMode,
} from './domain/exercises.ts';
import { arabicVoiceAvailable } from './domain/audio.ts';
import { knownLetterIds } from './domain/progress.ts';
import { LETTERS } from './data/letters.ts';
import { VOCAB_ITEMS } from './data/vocab.ts';
import type { AppStateShape, ChoiceExercise } from './domain/types.ts';

/** Anzahl Aufgaben pro Runde. */
const LETTER_QUIZ_LENGTH = 10;
const VOCAB_QUIZ_LENGTH = 10;

/**
 * Welche Ansicht ist gerade aktiv?
 *
 * Das Buchstaben-Quiz gibt es in zwei getrennten Varianten:
 *   - 'lettersScript' → nur Schrift/Form, ohne jeden Ton (läuft immer)
 *   - 'lettersAudio'  → mit Hören (nur bei verfügbarer arabischer Stimme)
 */
type View = 'home' | 'lettersScript' | 'lettersAudio' | 'vocab';

/**
 * Erzeugt die Buchstaben-Aufgaben einer Runde in der gewünschten Variante.
 *
 * Distraktoren werden bevorzugt aus bereits gesehenen Buchstaben gezogen; solange
 * noch nichts gelernt ist, dienen alle 28 Buchstaben als Quelle. `generateLetterQuiz`
 * garantiert bei `mode:'script'`, dass keine Audio-Aufgaben entstehen – diese Variante
 * ist damit auf jedem Gerät spielbar.
 */
function buildLetterExercises(state: AppStateShape, mode: LetterQuizMode): ChoiceExercise[] {
  const known = knownLetterIds(state);
  const pool = known.length > 0 ? known : LETTERS.map((letter) => letter.id);
  const ctx = defaultContext({
    knownItemIds: pool,
    audioAvailable: arabicVoiceAvailable(),
  });
  // Alle Buchstaben-Aufgaben sind Auswahlaufgaben – der Cast ist damit sicher.
  return generateLetterQuiz(
    LETTERS.map((letter) => letter.id),
    LETTER_QUIZ_LENGTH,
    ctx,
    { mode },
  ) as ChoiceExercise[];
}

/** Erzeugt die Wörter-Aufgaben einer Runde. */
function buildVocabExercises(): ChoiceExercise[] {
  const ctx = defaultContext({ audioAvailable: arabicVoiceAvailable() });
  return generateVocabExercises(VOCAB_ITEMS, VOCAB_QUIZ_LENGTH, ctx);
}

/** Deutscher Titel je Ansicht – auch als Kopfzeile im Quiz. */
const VIEW_TITLES: Record<Exclude<View, 'home'>, string> = {
  lettersScript: 'Buchstaben (Schrift)',
  lettersAudio: 'Buchstaben (Hören)',
  vocab: 'Wörter',
};

/** Innere Shell – braucht den App-State und darf ihn deshalb lesen. */
function Shell() {
  const { state } = useAppState();
  const [view, setView] = useState<View>('home');
  // Die Aufgaben einer Runde: als State gehalten, damit „Nochmal" neu würfeln kann.
  const [exercises, setExercises] = useState<ChoiceExercise[]>([]);

  /** Baut die passenden Aufgaben zur gewählten Ansicht. */
  const buildFor = (target: Exclude<View, 'home'>): ChoiceExercise[] => {
    if (target === 'vocab') return buildVocabExercises();
    return buildLetterExercises(state, target === 'lettersAudio' ? 'audio' : 'script');
  };

  const start = (target: Exclude<View, 'home'>): void => {
    setExercises(buildFor(target));
    setView(target);
  };

  const restart = (): void => {
    if (view === 'home') return;
    setExercises(buildFor(view));
  };

  const exit = (): void => setView('home');

  if (view === 'home') {
    return (
      <HomeScreen
        onStartLettersScript={() => start('lettersScript')}
        onStartLettersAudio={() => start('lettersAudio')}
        onStartVocab={() => start('vocab')}
        audioAvailable={arabicVoiceAvailable()}
      />
    );
  }

  return (
    <QuizScreen
      // key erzwingt eine frische Runde, wenn ein neuer Aufgaben-Array kommt.
      key={exercises[0]?.id ?? view}
      title={VIEW_TITLES[view]}
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
