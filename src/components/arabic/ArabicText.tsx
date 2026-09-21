/**
 * Bausteine für arabische Textdarstellung.
 *
 * Alle arabischen Inhalte laufen über diese Komponenten. Dadurch sind `dir="rtl"`,
 * `lang="ar"` und die Schriftart an **einer** Stelle gesetzt – und nicht über Dutzende
 * Komponenten verstreut, wo eines davon garantiert vergessen würde.
 *
 * `lang="ar"` ist nicht Kosmetik: Screenreader wählen danach die Stimme, und der
 * Browser wählt danach die passende Schrift aus der Font-Kette.
 */

import type { ReactNode } from 'react';

interface ArabicTextProps {
  children: ReactNode;
  /** Zusätzliche Klassen (z. B. Schriftgröße). */
  className?: string;
  /** Als Blockelement rendern statt inline. */
  block?: boolean;
}

/** Container für arabischen Text in korrekter Leserichtung. */
export function ArabicText({ children, className = '', block = false }: ArabicTextProps) {
  const Tag = block ? 'div' : 'span';
  return (
    <Tag dir="rtl" lang="ar" className={`arabic ${className}`}>
      {children}
    </Tag>
  );
}

interface LetterGlyphProps {
  /** Das darzustellende Zeichen bzw. die Form. */
  char: string;
  /** Größe der Darstellung. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Ein großes, gut lesbares Schriftzeichen. */
export function LetterGlyph({ char, size = 'md', className = '' }: LetterGlyphProps) {
  const sizeClass =
    size === 'lg' ? 'text-glyph-lg' : size === 'sm' ? 'text-glyph-sm' : 'text-glyph';
  return (
    <ArabicText className={`${sizeClass} leading-none ${className}`}>{char}</ArabicText>
  );
}
