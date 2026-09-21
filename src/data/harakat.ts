/**
 * Die vier Kurzvokalzeichen (Harakat).
 *
 * Harakat sind kombinierende Zeichen: sie stehen in der Zeichenkette **nach** dem
 * Buchstaben, erscheinen optisch aber darüber oder darunter. Die Items werden aus
 * Buchstabe + Zeichen erzeugt und nutzen dieselbe Fortschritts- und
 * Gamification-Logik wie die Buchstaben selbst.
 */

import { applyHarakat } from '../domain/arabic.ts';
import type { HarakatItem, HarakatKind, HarakatMark } from '../domain/types.ts';
import { LETTER_BY_ID, LETTERS } from './letters.ts';

/** Beschreibung der vier Vokalzeichen, in Lernreihenfolge. */
export const HARAKAT: HarakatMark[] = [
  {
    kind: 'fatha',
    mark: '\u064E', // ARABIC FATHA – kleiner Strich über dem Buchstaben
    nameArabic: 'فَتْحَة',
    nameGerman: 'Fatha',
    vowelSound: 'a',
    description:
      'Ein kleiner Schrägstrich **über** dem Buchstaben. Er erzeugt ein kurzes „a": بَ = „ba".',
  },
  {
    kind: 'kasra',
    mark: '\u0650', // ARABIC KASRA – kleiner Strich unter dem Buchstaben
    nameArabic: 'كَسْرَة',
    nameGerman: 'Kasra',
    vowelSound: 'i',
    description:
      'Ein kleiner Schrägstrich **unter** dem Buchstaben. Er erzeugt ein kurzes „i": بِ = „bi".',
  },
  {
    kind: 'damma',
    mark: '\u064F', // ARABIC DAMMA – kleines Wāw über dem Buchstaben
    nameArabic: 'ضَمَّة',
    nameGerman: 'Damma',
    vowelSound: 'u',
    description:
      'Ein kleines Wāw **über** dem Buchstaben. Es erzeugt ein kurzes „u": بُ = „bu".',
  },
  {
    kind: 'sukun',
    mark: '\u0652', // ARABIC SUKUN – kleiner Kreis über dem Buchstaben
    nameArabic: 'سُكُون',
    nameGerman: 'Sukun',
    vowelSound: '',
    description:
      'Ein kleiner Kreis **über** dem Buchstaben. Er bedeutet: **kein** Vokal – der Buchstabe wird nur als Konsonant gesprochen.',
  },
];

/** Schnellzugriff per Art. */
export const HARAKAT_BY_KIND: Record<HarakatKind, HarakatMark> = Object.fromEntries(
  HARAKAT.map((mark) => [mark.kind, mark]),
) as Record<HarakatKind, HarakatMark>;

/** Erzeugt die ID einer Buchstabe-Vokalzeichen-Kombination. */
export function harakatItemId(letterSlug: string, kind: HarakatKind): string {
  return `harakat:${letterSlug}+${kind}`;
}

/**
 * Buchstaben, mit denen die Vokalzeichen geübt werden. Bewusst eine kleine,
 * klangreine Auswahl – Ziel ist das Vokalzeichen, nicht der Buchstabe.
 */
const PRACTICE_LETTER_SLUGS = ['baa', 'taa', 'dal', 'ra', 'sin', 'kaf', 'lam', 'mim', 'nun'];

/**
 * Erzeugt die lernbaren Kombinationen für ein Vokalzeichen.
 *
 * Beispiel: Fatha + Bā ergibt بَ mit der Umschrift „ba".
 */
export function harakatItemsFor(kind: HarakatKind): HarakatItem[] {
  const mark = HARAKAT_BY_KIND[kind];

  return PRACTICE_LETTER_SLUGS.flatMap((slug) => {
    const letter = LETTER_BY_ID[`letter:${slug}`];
    if (!letter) return [];

    const combined = applyHarakat(letter.arabic, mark.mark);
    // Bei Sukun entsteht kein Vokal – der Konsonant steht für sich.
    const translit =
      kind === 'sukun' ? letter.translit : `${letter.translit}${mark.vowelSound}`;

    const item: HarakatItem = {
      id: harakatItemId(slug, kind),
      kind: 'harakat',
      arabic: combined,
      translit,
      german: `${letter.nameGerman} mit ${mark.nameGerman} → „${translit}"`,
      // Für die Sprachausgabe: der Laut selbst, nicht der Buchstabenname.
      ttsText: combined,
      letterId: letter.id,
      harakat: kind,
    };
    return [item];
  });
}

/** Alle Harakat-Items über alle vier Vokalzeichen. */
export const HARAKAT_ITEMS: HarakatItem[] = HARAKAT.flatMap((mark) =>
  harakatItemsFor(mark.kind),
);

/**
 * Beispielwörter mit vollständiger Vokalisierung – zeigen die Zeichen im echten
 * Schriftbild. Werden auf den Harakat-Lernkarten gezeigt.
 */
export const HARAKAT_EXAMPLES: { arabic: string; translit: string; german: string }[] = [
  { arabic: 'كَتَبَ', translit: 'kataba', german: 'er schrieb' },
  { arabic: 'بِنْت', translit: 'bint', german: 'Mädchen' },
  { arabic: 'كُتُب', translit: 'kutub', german: 'Bücher' },
  { arabic: 'مَدْرَسَة', translit: 'madrasa', german: 'Schule' },
];

/** Prüfsumme für Tests: wie viele Kombinationen erwarten wir? */
export const HARAKAT_ITEM_COUNT = HARAKAT.length * PRACTICE_LETTER_SLUGS.length;

/** Wird nur für Tests benötigt – stellt sicher, dass die Auswahl gültig ist. */
export const HARAKAT_PRACTICE_LETTERS = PRACTICE_LETTER_SLUGS.map(
  (slug) => LETTERS.find((letter) => letter.id === `letter:${slug}`)?.id ?? null,
);
