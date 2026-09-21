/**
 * VORLÄUFIGE Vorschau-Ansicht (Phase 1).
 *
 * Diese Datei wird in Phase 2 durch die echte App-Shell mit Lernpfad, Lektions-Runner
 * und Bottom-Navigation ersetzt. Bis dahin erfüllt sie einen konkreten Zweck: Sie macht
 * die fertige Datenschicht auf dem Gerät überprüfbar – Schriftdarstellung, RTL,
 * Buchstabenformen, Hervorhebung im Wort und die Sprachausgabe.
 */

import { useState } from 'react';
import { LETTERS } from './data/letters.ts';
import { HARAKAT } from './data/harakat.ts';
import { LESSONS } from './data/lessons.ts';
import { ArabicText, LetterGlyph } from './components/arabic/ArabicText.tsx';
import { FormsTable } from './components/arabic/FormsTable.tsx';
import { WordWithHighlight } from './components/arabic/WordWithHighlight.tsx';
import type { Letter } from './domain/types.ts';

/**
 * Spricht einen arabischen Text über die Web Speech API.
 * Der vollständige Audio-Service mit Stimmenauswahl folgt in Phase 2 (Task 11).
 */
function speak(text: string): void {
  if (typeof speechSynthesis === 'undefined') return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.8;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

/** Detailansicht eines Buchstaben. */
function LetterDetail({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-lg px-4 pb-16 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="mb-4 min-h-[44px] rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm dark:bg-slate-900"
        >
          ← Zurück
        </button>

        {/* Kopf: Zeichen, Name, Umschrift, Audio */}
        <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <LetterGlyph char={letter.arabic} size="lg" />
          <h2 className="mt-2 text-2xl font-semibold">{letter.nameGerman}</h2>
          <ArabicText className="text-xl text-slate-500 dark:text-slate-400">
            {letter.nameArabic}
          </ArabicText>
          <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
            {letter.translit}
          </p>
          <button
            type="button"
            onClick={() => speak(letter.nameArabic)}
            className="mt-4 min-h-[44px] rounded-full bg-brand-600 px-6 py-2 font-medium text-white active:bg-brand-700"
          >
            🔊 Anhören
          </button>
        </div>

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Aussprache
          </h3>
          <p className="rounded-xl bg-white p-4 text-sm leading-relaxed shadow-sm dark:bg-slate-900">
            {letter.pronunciation}
          </p>
        </section>

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Die vier Formen
          </h3>
          <FormsTable letter={letter} />
        </section>

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Beispielwörter
          </h3>
          <ul className="space-y-2">
            {letter.examples.map((example) => (
              <li
                key={example.arabic}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <WordWithHighlight
                    word={example.arabic}
                    highlightIndex={example.highlightIndex}
                    className="text-3xl"
                  />
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {example.translit} — {example.german}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => speak(example.arabic)}
                  aria-label={`${example.german} anhören`}
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-full bg-slate-100 text-lg dark:bg-slate-800"
                >
                  🔊
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Merkhilfe
          </h3>
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-100">
            {letter.mnemonic}
          </p>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState<Letter | null>(null);

  return (
    <div className="min-h-full pb-12 pt-safe">
      <div className="mx-auto max-w-lg px-4">
        <header className="py-4">
          <h1 className="text-2xl font-bold">Arabisch lernen</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phase 1 – Datenvorschau. Tippe auf einen Buchstaben.
          </p>
        </header>

        {/* Kennzahlen als schnelle Sichtprüfung der Datenschicht */}
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Buchstaben', value: LETTERS.length },
            { label: 'Lektionen', value: LESSONS.length },
            { label: 'Vokalzeichen', value: HARAKAT.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="text-xl font-bold text-brand-600 dark:text-brand-300">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Das 28er-Raster – Vorlage für das spätere Fortschrittsraster */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {LETTERS.map((letter) => (
            <button
              key={letter.id}
              type="button"
              onClick={() => setSelected(letter)}
              className="flex min-h-[72px] flex-col items-center justify-center rounded-xl bg-white shadow-sm active:bg-brand-50 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <ArabicText className="text-3xl">{letter.arabic}</ArabicText>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {letter.nameGerman}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && <LetterDetail letter={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
