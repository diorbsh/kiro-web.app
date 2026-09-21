/**
 * Vokabeln und Sätze – Phase 2.
 *
 * Die Struktur steht bereits, damit das Modul später nur gefüllt und nicht umgebaut
 * werden muss. Die hier enthaltenen Einheiten sind ein erster Startbestand und nutzen
 * ausschließlich Buchstaben, die im Alphabet-Trainer vorkommen.
 */

import type { VocabItem } from '../domain/types.ts';

/** Eine Lerneinheit fasst thematisch zusammengehörige Vokabeln und Sätze zusammen. */
export interface VocabUnit {
  id: string;
  title: string;
  description: string;
  /** Kurzer Grammatikhinweis, der zur Einheit gehört. */
  grammarNote?: string;
}

export const VOCAB_UNITS: VocabUnit[] = [
  {
    id: 'unit:greetings',
    title: 'Begrüßung',
    description: 'Die wichtigsten Floskeln für den ersten Kontakt.',
  },
  {
    id: 'unit:basics',
    title: 'Erste Wörter',
    description: 'Alltagsgegenstände, die du schon lesen kannst.',
  },
  {
    id: 'unit:sentences',
    title: 'Erste Sätze',
    description: 'Kurze Aussagesätze ohne Verb.',
    grammarNote:
      'Im Arabischen braucht ein einfacher Aussagesatz kein „ist": هذا بيت heißt wörtlich „dies Haus" – also „Das ist ein Haus".',
  },
];

export const VOCAB_ITEMS: VocabItem[] = [
  // --- Begrüßung ---
  {
    id: 'vocab:salam',
    kind: 'vocab',
    unitId: 'unit:greetings',
    arabic: 'السَّلامُ عَلَيْكُم',
    translit: 'as-salāmu ʿalaykum',
    german: 'Friede sei mit dir (Hallo)',
  },
  {
    id: 'vocab:shukran',
    kind: 'vocab',
    unitId: 'unit:greetings',
    arabic: 'شُكْراً',
    translit: 'šukran',
    german: 'Danke',
  },
  {
    id: 'vocab:sabah-al-khayr',
    kind: 'vocab',
    unitId: 'unit:greetings',
    arabic: 'صَباحُ الخَيْر',
    translit: 'ṣabāḥu l-ḫayr',
    german: 'Guten Morgen',
  },

  // --- Erste Wörter ---
  {
    id: 'vocab:bayt',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'بَيْت',
    translit: 'bayt',
    german: 'Haus',
  },
  {
    id: 'vocab:kitab',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'كِتاب',
    translit: 'kitāb',
    german: 'Buch',
  },
  {
    id: 'vocab:qalam',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'قَلَم',
    translit: 'qalam',
    german: 'Stift',
  },
  {
    id: 'vocab:maa',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'ماء',
    translit: 'māʾ',
    german: 'Wasser',
  },
  {
    id: 'vocab:shams',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'شَمْس',
    translit: 'šams',
    german: 'Sonne',
  },
  {
    id: 'vocab:madina',
    kind: 'vocab',
    unitId: 'unit:basics',
    arabic: 'مَدينَة',
    translit: 'madīna',
    german: 'Stadt',
  },

  // --- Erste Sätze ---
  {
    id: 'sentence:hadha-bayt',
    kind: 'sentence',
    unitId: 'unit:sentences',
    arabic: 'هَذا بَيْت',
    translit: 'hāḏā bayt',
    german: 'Das ist ein Haus.',
    wordParts: ['هَذا', 'بَيْت'],
    grammarNote: 'هذا = „dies" (männlich). Ein „ist" gibt es nicht.',
  },
  {
    id: 'sentence:al-bayt-kabir',
    kind: 'sentence',
    unitId: 'unit:sentences',
    arabic: 'البَيْتُ كَبير',
    translit: 'al-baytu kabīr',
    german: 'Das Haus ist groß.',
    wordParts: ['البَيْتُ', 'كَبير'],
    grammarNote: 'ال am Wortanfang ist der bestimmte Artikel („der/die/das").',
  },
  {
    id: 'sentence:hadha-kitabi',
    kind: 'sentence',
    unitId: 'unit:sentences',
    arabic: 'هَذا كِتابي',
    translit: 'hāḏā kitābī',
    german: 'Das ist mein Buch.',
    wordParts: ['هَذا', 'كِتابي'],
    grammarNote: 'Das angehängte ي bedeutet „mein".',
  },
];

/** Schnellzugriff per ID. */
export const VOCAB_BY_ID: Record<string, VocabItem> = Object.fromEntries(
  VOCAB_ITEMS.map((item) => [item.id, item]),
);

/** Alle Items einer Einheit. */
export function vocabInUnit(unitId: string): VocabItem[] {
  return VOCAB_ITEMS.filter((item) => item.unitId === unitId);
}
