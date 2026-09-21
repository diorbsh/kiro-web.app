/**
 * Zeigt ein arabisches Wort und hebt einen einzelnen Buchstaben farblich hervor.
 *
 * Der Trick steckt in `splitForHighlight()`: Würde man das Wort einfach in drei
 * `<span>` zerschneiden, bräche die Schrift-Verbindung auf und die Buchstaben stünden
 * plötzlich isoliert – das Wort wäre unlesbar. Deshalb werden an den Schnittstellen
 * Zero-Width Joiner eingefügt, sodass jedes Segment seine verbundene Gestalt behält.
 */

import { splitForHighlight } from '../../domain/arabic.ts';
import { ArabicText } from './ArabicText.tsx';

interface WordWithHighlightProps {
  /** Das arabische Wort. */
  word: string;
  /** Position des hervorzuhebenden Zeichens (0 = ganz rechts). */
  highlightIndex: number;
  className?: string;
}

export function WordWithHighlight({
  word,
  highlightIndex,
  className = '',
}: WordWithHighlightProps) {
  const { before, highlight, after } = splitForHighlight(word, highlightIndex);

  return (
    <ArabicText className={className}>
      {/* Reihenfolge im Markup = logische Textreihenfolge; die RTL-Anordnung
          übernimmt der Browser. */}
      {before}
      <span className="text-brand-600 dark:text-brand-300">{highlight}</span>
      {after}
    </ArabicText>
  );
}
