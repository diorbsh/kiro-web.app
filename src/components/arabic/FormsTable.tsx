/**
 * Die vier Kontextformen eines Buchstaben mit deutscher Beschriftung.
 *
 * Gezeigt werden die Formen mit Tatweel (Verbindungsstrich), damit sichtbar wird, wo
 * der Buchstabe andockt – ohne einen fremden Buchstaben einzuführen, der vom Lernziel
 * ablenken würde.
 */

import { withTatweel } from '../../domain/arabic.ts';
import type { FormName, Letter } from '../../domain/types.ts';
import { ArabicText } from './ArabicText.tsx';

/** Deutsche Beschriftung der Formen, in Lernreihenfolge. */
const FORM_LABELS: { form: FormName; label: string }[] = [
  { form: 'isolated', label: 'isoliert' },
  { form: 'initial', label: 'Anfang' },
  { form: 'medial', label: 'Mitte' },
  { form: 'final', label: 'Ende' },
];

interface FormsTableProps {
  letter: Letter;
}

export function FormsTable({ letter }: FormsTableProps) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {FORM_LABELS.map(({ form, label }) => (
          <div
            key={form}
            className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900"
          >
            <ArabicText className="text-4xl">{withTatweel(letter.arabic, form)}</ArabicText>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Hinweis bei den sechs Buchstaben, die nicht nach links verbinden –
          sonst wirken zwei identisch aussehende Formen wie ein Darstellungsfehler. */}
      {!letter.connectsForward && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {letter.nameGerman} verbindet sich <strong>nicht</strong> mit dem folgenden
          Buchstaben. Deshalb sehen „isoliert" und „Anfang" gleich aus – ebenso „Mitte"
          und „Ende".
        </p>
      )}
    </div>
  );
}
