/**
 * Arabische Schrift: Formen erzeugen, Wörter verbinden, Buchstaben hervorheben.
 *
 * Hintergrund: Arabische Buchstaben wechseln ihre Gestalt je nach Position im Wort.
 * Statt die 112 Unicode-Präsentationsformen (U+FE80–FEFC) von Hand einzutragen –
 * fehleranfällig und typografisch schlechter, weil Ligaturen verloren gehen –
 * erzeugen wir die Formen mit dem Zero-Width Joiner (U+200D). Die Font-Engine des
 * Browsers wählt dann selbst die richtige Glyphe.
 */

import type { LetterForms } from './types.ts';

/** Zero-Width Joiner: erzwingt eine Verbindung, ohne ein Zeichen zu zeigen. */
export const ZWJ = '\u200D';

/** Zero-Width Non-Joiner: verhindert eine Verbindung. */
export const ZWNJ = '\u200C';

/** Tatweel/Kashida: neutraler Verbindungsstrich, U+0640. */
export const TATWEEL = '\u0640';

/**
 * Buchstaben, die nicht nach links verbinden. Der folgende Buchstabe beginnt
 * deshalb wieder in seiner Anfangs- bzw. isolierten Form.
 */
const NON_CONNECTING = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'أ', 'إ', 'آ', 'ؤ', 'ة']);

/** Verbindet dieser Buchstabe nach links (zum folgenden Buchstaben)? */
export function connectsForward(char: string): boolean {
  return !NON_CONNECTING.has(char);
}

/**
 * Erzeugt die vier Kontextformen eines Buchstaben.
 *
 * Bei nicht nach links verbindenden Buchstaben (ا د ذ ر ز و) ist die Anfangsform
 * identisch mit der isolierten und die Mittelform identisch mit der Endform –
 * genau so, wie es die Schrift tatsächlich vorsieht.
 *
 * @param letter Der Grundbuchstabe, z. B. "ب".
 * @param forward Überschreibt die automatische Erkennung (optional).
 */
export function buildForms(letter: string, forward?: boolean): LetterForms {
  const linksLeft = forward ?? connectsForward(letter);
  return {
    isolated: letter,
    // Anfang: verbindet nach links zum nächsten Buchstaben
    initial: linksLeft ? letter + ZWJ : letter,
    // Mitte: beidseitig verbunden
    medial: linksLeft ? ZWJ + letter + ZWJ : ZWJ + letter,
    // Ende: verbindet nach rechts zum vorangehenden Buchstaben
    final: ZWJ + letter,
  };
}

/**
 * Zeigt eine Form mit einem neutralen Verbindungsstrich (Tatweel), damit die
 * Verbindungsstellen sichtbar werden, ohne einen fremden Buchstaben einzuführen.
 * Nützlich für die Formen-Tabelle auf der Lernkarte.
 */
export function withTatweel(letter: string, form: keyof LetterForms): string {
  const linksLeft = connectsForward(letter);
  switch (form) {
    case 'isolated':
      return letter;
    case 'initial':
      // Links ein Strich – nur sinnvoll, wenn der Buchstabe überhaupt verbindet.
      return linksLeft ? letter + TATWEEL : letter;
    case 'medial':
      return linksLeft ? TATWEEL + letter + TATWEEL : TATWEEL + letter;
    case 'final':
      return TATWEEL + letter;
  }
}

/**
 * Setzt Buchstaben zu einem Wort zusammen. Das Shaping übernimmt der Browser –
 * einfaches Aneinanderhängen genügt und liefert automatisch die korrekten Formen,
 * inklusive der Lām-Alif-Ligatur (لا).
 *
 * @param chars Buchstaben in Lesereihenfolge (rechts → links gelesen, also erstes
 *              Element = erster gesprochener Buchstabe).
 */
export function joinLetters(chars: string[]): string {
  return chars.join('');
}

/**
 * Teilt ein Wort für die farbliche Hervorhebung eines Buchstaben in drei Segmente.
 *
 * Problem: Werden die Segmente in getrennte Elemente gerendert, bricht die
 * Shaping-Verbindung auf – die Buchstaben stünden plötzlich isoliert da. Lösung:
 * An den Schnittstellen wird ein ZWJ ergänzt. Dadurch behalten alle drei Segmente
 * ihre verbundene Gestalt, und das mittlere Segment ist einzeln einfärbbar.
 *
 * @param word Das arabische Wort.
 * @param index Position des hervorzuhebenden Zeichens.
 */
export function splitForHighlight(
  word: string,
  index: number,
): { before: string; highlight: string; after: string } {
  const chars = Array.from(word);
  if (index < 0 || index >= chars.length) {
    // Defensive: ungültiger Index → nichts hervorheben, Wort bleibt intakt.
    return { before: word, highlight: '', after: '' };
  }

  const target = chars[index] as string;
  const beforeChars = chars.slice(0, index);
  const afterChars = chars.slice(index + 1);

  const before = beforeChars.join('');
  const after = afterChars.join('');

  // Verbindet das Zeichen links vom Ziel (also das vorangehende) nach links?
  const prevChar = index > 0 ? (chars[index - 1] as string) : null;
  const prevLinks = prevChar !== null && connectsForward(prevChar);
  // Verbindet das Ziel selbst nach links zum nächsten Zeichen?
  const targetLinks = connectsForward(target);
  const hasAfter = afterChars.length > 0;

  return {
    // Das vorangehende Segment muss nach links offen bleiben.
    before: before.length > 0 && prevLinks ? before + ZWJ : before,
    // Das Ziel übernimmt beide offenen Enden.
    highlight:
      (prevLinks ? ZWJ : '') + target + (hasAfter && targetLinks ? ZWJ : ''),
    // Das Folgesegment muss nach rechts offen bleiben.
    after: hasAfter && targetLinks ? ZWJ + after : after,
  };
}

/**
 * Entfernt Steuerzeichen (ZWJ/ZWNJ/Tatweel) aus einem String. Nötig, wenn ein Text
 * an die Sprachausgabe geht – TTS-Engines stolpern über diese Zeichen.
 */
export function stripJoiners(text: string): string {
  return text.replace(/[\u200C\u200D\u0640]/g, '');
}

/** Kombinierende Vokalzeichen entfernen – z. B. für Vergleiche. */
export function stripHarakat(text: string): string {
  return text.replace(/[\u064B-\u0652\u0670]/g, '');
}

/**
 * Setzt ein Vokalzeichen auf einen Buchstaben. Die Reihenfolge ist wichtig: Das
 * kombinierende Zeichen folgt dem Buchstaben, auch wenn es optisch darüber oder
 * darunter erscheint.
 */
export function applyHarakat(letter: string, mark: string): string {
  return letter + mark;
}

/**
 * Enthält der Text arabische Zeichen? Wird genutzt, um Antwortoptionen automatisch
 * RTL zu rendern.
 */
export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}
