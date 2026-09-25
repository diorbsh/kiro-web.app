/**
 * Startansicht des Quiz-Modus.
 *
 * Zeigt die Kennzahlen aus der Gamification (XP, Level, Tages-Serie) und bietet die
 * zwei spielbaren Quizze an: Buchstaben und Wörter. Bewusst ohne Router – ein
 * einfacher View-State in der App-Shell genügt.
 */

import { useAppState } from '../../state/AppState.tsx';
import { displayedStreak, levelProgress } from '../../domain/gamification.ts';

interface HomeScreenProps {
  onStartLetters: () => void;
  onStartVocab: () => void;
}

/** Eine große, gut tappbare Quiz-Kachel. */
function QuizCard({
  emoji,
  title,
  description,
  onClick,
}: {
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm active:bg-brand-50 dark:bg-slate-900 dark:active:bg-slate-800"
    >
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </button>
  );
}

export function HomeScreen({ onStartLetters, onStartVocab }: HomeScreenProps) {
  const { state, persistent } = useAppState();
  const level = levelProgress(state.xp);
  const streak = displayedStreak(state);

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe pb-nav">
      <header className="py-4">
        <h1 className="text-2xl font-bold">Arabisch üben</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Wähle ein Quiz und sammle XP.
        </p>
      </header>

      {/* Kennzahlen */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
          <div className="text-xl font-bold text-brand-600 dark:text-brand-300">
            {level.level}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Level</div>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
          <div className="text-xl font-bold text-brand-600 dark:text-brand-300">{state.xp}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">XP</div>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
          <div className="text-xl font-bold text-amber-500">🔥 {streak}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Tage-Serie</div>
        </div>
      </div>

      {/* Level-Fortschritt */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Level {level.level}</span>
          <span>
            {level.xpIntoLevel} / {level.xpNeededForLevel} XP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width]"
            style={{ width: `${Math.round(level.ratio * 100)}%` }}
          />
        </div>
      </div>

      {/* Quizze */}
      <div className="space-y-3">
        <QuizCard
          emoji="🔤"
          title="Buchstaben-Quiz"
          description="Erkenne die Buchstaben des Alphabets."
          onClick={onStartLetters}
        />
        <QuizCard
          emoji="📖"
          title="Wörter-Quiz"
          description="Übe die Bedeutung erster Vokabeln."
          onClick={onStartVocab}
        />
      </div>

      {!persistent && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Hinweis: Dein Fortschritt kann in diesem Browser nicht dauerhaft gespeichert werden
          (z. B. privater Modus).
        </p>
      )}
    </div>
  );
}
