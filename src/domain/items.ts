/**
 * Zentrale Registry aller lernbaren Items.
 *
 * Fortschritt, SRS und Gamification arbeiten nur gegen diese Abstraktion. Ein neues
 * Inhaltsmodul (z. B. weitere Vokabeleinheiten) muss deshalb lediglich seine Items
 * hier beisteuern – die restliche Logik bleibt unverändert.
 */

import { HARAKAT_ITEMS } from '../data/harakat.ts';
import { LETTERS } from '../data/letters.ts';
import { VOCAB_ITEMS } from '../data/vocab.ts';
import type { ItemKind, LearnItem, Letter } from './types.ts';

/** Alle Items über alle Inhaltsarten. */
export const ALL_ITEMS: LearnItem[] = [...LETTERS, ...HARAKAT_ITEMS, ...VOCAB_ITEMS];

/** Schnellzugriff per ID. */
const ITEM_BY_ID: Record<string, LearnItem> = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item]),
);

/** Item per ID, oder `undefined` wenn unbekannt. */
export function getItem(id: string): LearnItem | undefined {
  return ITEM_BY_ID[id];
}

/**
 * Item per ID – wirft, wenn es nicht existiert.
 * Für Stellen, an denen eine fehlende ID ein Programmierfehler wäre.
 */
export function requireItem(id: string): LearnItem {
  const item = ITEM_BY_ID[id];
  if (!item) throw new Error(`Unbekanntes Item: ${id}`);
  return item;
}

/** Alle Items einer Art. */
export function getItemsByKind(kind: ItemKind): LearnItem[] {
  return ALL_ITEMS.filter((item) => item.kind === kind);
}

/** Type-Guard: ist das Item ein Buchstabe? */
export function isLetter(item: LearnItem | undefined): item is Letter {
  return item?.kind === 'letter';
}

/** Buchstabe per ID – oder `undefined`, wenn die ID kein Buchstabe ist. */
export function getLetter(id: string): Letter | undefined {
  const item = getItem(id);
  return isLetter(item) ? item : undefined;
}

/**
 * Text, der für dieses Item gesprochen werden soll.
 * Fällt auf den arabischen Text zurück, wenn kein eigener TTS-Text hinterlegt ist.
 */
export function ttsTextFor(item: LearnItem): string {
  return item.ttsText ?? item.arabic;
}

/** Die Anzeige unter dem arabischen Text (Umschrift + Bedeutung). */
export function subtitleFor(item: LearnItem): string {
  return item.kind === 'letter' ? item.nameGerman : item.german;
}
