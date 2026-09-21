/**
 * Der Lernpfad: eine lineare Kette von Lektionen.
 *
 * Aufbau pro Buchstabengruppe (4 Buchstaben):
 *   1. `letters`  – Lernkarten ansehen und Erkennungsübungen
 *   2. `writing`  – die Buchstaben auf dem Canvas nachspuren
 * Nach jeder zweiten Gruppe folgt eine `connect`-Lektion, in der Wörter aus den
 * bisher gelernten Buchstaben zusammengesetzt werden. Am Ende stehen die vier
 * Harakat-Lektionen.
 *
 * Die Kette wird programmatisch erzeugt: jede Lektion verweist auf ihre Vorgängerin.
 * Dadurch kann keine Lücke oder Sackgasse entstehen, und neue Abschnitte (z. B. das
 * Vokabel-Modul) lassen sich am Ende einfach anhängen.
 */

import type { Lesson } from '../domain/types.ts';
import { HARAKAT, harakatItemsFor } from './harakat.ts';
import { LETTER_GROUP_COUNT, LETTERS, lettersInGroup } from './letters.ts';

/** Baut die Lektionskette auf. */
function buildLessons(): Lesson[] {
  const lessons: Lesson[] = [];
  /** ID der zuletzt angefügten Lektion – dient als Voraussetzung der nächsten. */
  let previousId: string | null = null;

  /** Fügt eine Lektion an und verknüpft sie mit der vorherigen. */
  const push = (lesson: Omit<Lesson, 'requires'>): void => {
    lessons.push({
      ...lesson,
      requires: previousId === null ? [] : [previousId],
    });
    previousId = lesson.id;
  };

  for (let group = 1; group <= LETTER_GROUP_COUNT; group += 1) {
    const groupLetters = lettersInGroup(group);
    const itemIds = groupLetters.map((letter) => letter.id);
    // Titelzusatz: die Buchstaben der Gruppe als Zeichen, z. B. "ا ب ت ث"
    const charList = groupLetters.map((letter) => letter.arabic).join(' ');
    const nameList = groupLetters.map((letter) => letter.nameGerman).join(', ');

    push({
      id: `lesson:letters:${group}`,
      kind: 'letters',
      title: `Buchstaben ${group}`,
      subtitle: `${charList} — ${nameList}`,
      itemIds,
      xpReward: 30,
      // Genug Aufgaben, damit jeder Buchstabe mehrfach vorkommt.
      exerciseCount: 10,
    });

    push({
      id: `lesson:writing:${group}`,
      kind: 'writing',
      title: `Schreiben ${group}`,
      subtitle: `${charList} nachspuren`,
      itemIds,
      xpReward: 25,
      // Eine Schreibaufgabe pro Buchstabe der Gruppe.
      exerciseCount: groupLetters.length,
    });

    // Nach jeder zweiten Gruppe und am Ende: Buchstaben verbinden.
    const isLastGroup = group === LETTER_GROUP_COUNT;
    if (group % 2 === 0 || isLastGroup) {
      // Alle bis hierher gelernten Buchstaben stehen zur Verfügung.
      const learnedIds = LETTERS.filter((letter) => letter.group <= group).map(
        (letter) => letter.id,
      );
      push({
        id: `lesson:connect:${group}`,
        kind: 'connect',
        title: `Verbinden ${Math.ceil(group / 2)}`,
        subtitle: 'Buchstaben zu Wörtern zusammensetzen',
        itemIds: learnedIds,
        xpReward: 35,
        exerciseCount: 6,
      });
    }
  }

  // Die Vokalzeichen kommen erst, wenn alle Buchstaben durch sind.
  for (const mark of HARAKAT) {
    const items = harakatItemsFor(mark.kind);
    push({
      id: `lesson:harakat:${mark.kind}`,
      kind: 'harakat',
      title: mark.nameGerman,
      subtitle:
        mark.vowelSound === ''
          ? 'Kein Vokal – nur der Konsonant'
          : `Kurzes „${mark.vowelSound}"`,
      itemIds: items.map((item) => item.id),
      xpReward: 30,
      exerciseCount: 8,
    });
  }

  return lessons;
}

/** Der vollständige Lernpfad in Reihenfolge. */
export const LESSONS: Lesson[] = buildLessons();

/** Schnellzugriff per ID. */
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(
  LESSONS.map((lesson) => [lesson.id, lesson]),
);

/**
 * Die Wiederholen-Lektion ist nicht Teil der Kette: sie wird zur Laufzeit aus
 * fälligen Items gefüllt und ist immer verfügbar.
 */
export const REVIEW_LESSON: Lesson = {
  id: 'lesson:review',
  kind: 'review',
  title: 'Wiederholen',
  subtitle: 'Fällige und fehleranfällige Items',
  itemIds: [],
  requires: [],
  xpReward: 20,
  exerciseCount: 10,
};

/** Lektionen, die zum Alphabet-MVP gehören (ohne Harakat). */
export const ALPHABET_LESSON_IDS: string[] = LESSONS.filter(
  (lesson) => lesson.kind !== 'harakat',
).map((lesson) => lesson.id);
