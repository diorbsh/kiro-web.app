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
  /** Buchstaben-Quiz nur mit Schrift/Form – ohne Ton, läuft immer. */
  onStartLettersScript: () => void;
  /** Buchstaben-Quiz mit Hören – nur bei verfügbarer arabischer Stimme sinnvoll. */
  onStartLettersAudio: () => void;
  onStartVocab: () => void;
  /** Steht eine arabische Stimme zur Verfügung? Steuert die Hören-Kachel. */
  audioAvailable: boolean;
}

/**
 * Eine große, gut tappbare Quiz-Kachel.
 *
 * `disabled` grau­t die Kachel aus und zeigt einen kurzen Hinweis statt der
 * Beschreibung – so bleibt sichtbar, dass es die Variante gibt, sie aber gerade
 * nicht spielbar ist (z. B. „Buchstaben (Hören)" ohne arabische Stimme).
 */
function QuizCard({
  emoji,
  title,
  description,
  onClick,
  disabled = false,
  disabledHint,
}: {
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm active:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:bg-white dark:bg-slate-900 dark:active:bg-slate-800 dark:disabled:active:bg-slate-900"
    >
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-slate-500 dark:text-slate-400">
          {disabled && disabledHint ? disabledHint : description}
        </span>
      </span>
    </button>
  );
}

export function HomeScreen({
  onStartLettersScript,
  onStartLettersAudio,
  onStartVocab,
  audioAvailable,
}: HomeScreenProps) {
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
          title="Buchstaben (Schrift)"
          description="Buchstaben am Schriftbild erkennen – ohne Ton."
          onClick={onStartLettersScript}
        />
        <QuizCard
          emoji="🔊"
          title="Buchstaben (Hören)"
          description="Buchstaben am Klang erkennen – mit Ton."
          onClick={onStartLettersAudio}
          disabled={!audioAvailable}
          disabledHint="Auf diesem Gerät ist keine arabische Sprachausgabe verfügbar."
        />
        <QuizCard
          emoji="📖"
          title="Wörter"
          description="Umschrift → arabische Schrift und mehr."
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
