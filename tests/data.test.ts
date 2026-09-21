/**
 * Integritätstests für die Inhaltsdaten.
 *
 * Diese Tests sind die wichtigste Absicherung des Projekts: Fehler in den
 * Buchstabendaten (falscher Index bei einem Beispielwort, fehlende Form, Tippfehler
 * in einer ID) fallen im Browser kaum auf, ruinieren aber das Lernergebnis.
 *
 * Ausführen: npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LETTERS, LETTER_BY_ID, lettersInGroup, LETTER_GROUP_COUNT } from '../src/data/letters.ts';
import { HARAKAT, HARAKAT_ITEMS, HARAKAT_ITEM_COUNT, HARAKAT_PRACTICE_LETTERS } from '../src/data/harakat.ts';
import { LESSONS, LESSON_BY_ID } from '../src/data/lessons.ts';
import { VOCAB_ITEMS, VOCAB_UNITS } from '../src/data/vocab.ts';
import { ALL_ITEMS, getItem } from '../src/domain/items.ts';
import { ZWJ, stripHarakat } from '../src/domain/arabic.ts';

// ---------------------------------------------------------------------------
// Buchstaben
// ---------------------------------------------------------------------------

test('enthält genau 28 Buchstaben', () => {
  assert.equal(LETTERS.length, 28);
});

test('die Reihenfolge 1..28 ist lückenlos und eindeutig', () => {
  const orders = LETTERS.map((letter) => letter.order).sort((a, b) => a - b);
  assert.deepEqual(
    orders,
    Array.from({ length: 28 }, (_, i) => i + 1),
  );
});

test('alle IDs sind eindeutig', () => {
  const ids = new Set(LETTERS.map((letter) => letter.id));
  assert.equal(ids.size, LETTERS.length);
});

test('die arabischen Zeichen sind eindeutig und einzelne Codepoints', () => {
  const chars = new Set(LETTERS.map((letter) => letter.arabic));
  assert.equal(chars.size, 28);
  for (const letter of LETTERS) {
    assert.equal(
      Array.from(letter.arabic).length,
      1,
      `${letter.id} sollte genau ein Zeichen sein, ist aber "${letter.arabic}"`,
    );
  }
});

test('jeder Buchstabe hat vier nicht-leere Formen', () => {
  for (const letter of LETTERS) {
    for (const form of ['isolated', 'initial', 'medial', 'final'] as const) {
      const value = letter.forms[form];
      assert.ok(value.length > 0, `${letter.id}: Form "${form}" ist leer`);
      // Jede Form muss den Grundbuchstaben enthalten.
      assert.ok(
        value.includes(letter.arabic),
        `${letter.id}: Form "${form}" enthält den Buchstaben nicht`,
      );
    }
  }
});

test('verbindende Buchstaben haben eine eigene Anfangsform, nicht-verbindende nicht', () => {
  for (const letter of LETTERS) {
    if (letter.connectsForward) {
      // Verbindet nach links → Anfangsform trägt einen ZWJ am Ende.
      assert.equal(
        letter.forms.initial,
        letter.arabic + ZWJ,
        `${letter.id}: Anfangsform sollte nach links verbinden`,
      );
      assert.equal(letter.forms.medial, ZWJ + letter.arabic + ZWJ);
    } else {
      // Verbindet nicht nach links → Anfangsform = isolierte Form.
      assert.equal(
        letter.forms.initial,
        letter.arabic,
        `${letter.id}: Anfangsform sollte der isolierten Form entsprechen`,
      );
      assert.equal(letter.forms.medial, ZWJ + letter.arabic);
    }
    // Die Endform verbindet immer nach rechts.
    assert.equal(letter.forms.final, ZWJ + letter.arabic);
  }
});

test('genau die sechs bekannten Buchstaben verbinden nicht nach links', () => {
  const nonConnecting = LETTERS.filter((letter) => !letter.connectsForward).map(
    (letter) => letter.arabic,
  );
  assert.deepEqual(nonConnecting.sort(), ['ا', 'د', 'ذ', 'ر', 'ز', 'و'].sort());
});

test('jeder Buchstabe hat mindestens zwei Beispielwörter', () => {
  for (const letter of LETTERS) {
    assert.ok(
      letter.examples.length >= 2,
      `${letter.id}: nur ${letter.examples.length} Beispielwörter`,
    );
  }
});

test('highlightIndex zeigt in jedem Beispielwort auf den gelernten Buchstaben', () => {
  for (const letter of LETTERS) {
    for (const example of letter.examples) {
      const chars = Array.from(stripHarakat(example.arabic));
      assert.ok(
        example.highlightIndex >= 0 && example.highlightIndex < chars.length,
        `${letter.id} / ${example.arabic}: highlightIndex ${example.highlightIndex} liegt außerhalb (Länge ${chars.length})`,
      );
      assert.equal(
        chars[example.highlightIndex],
        letter.arabic,
        `${letter.id} / ${example.arabic}: an Position ${example.highlightIndex} steht "${chars[example.highlightIndex]}" statt "${letter.arabic}"`,
      );
    }
  }
});

test('Beispielwörter haben Umschrift und deutsche Bedeutung', () => {
  for (const letter of LETTERS) {
    for (const example of letter.examples) {
      assert.ok(example.translit.trim().length > 0, `${letter.id}: Umschrift fehlt`);
      assert.ok(example.german.trim().length > 0, `${letter.id}: Bedeutung fehlt`);
    }
  }
});

test('Namen, Aussprache und Merkhilfe sind gefüllt', () => {
  for (const letter of LETTERS) {
    assert.ok(letter.nameArabic.trim().length > 0, `${letter.id}: arabischer Name fehlt`);
    assert.ok(letter.nameGerman.trim().length > 0, `${letter.id}: deutscher Name fehlt`);
    assert.ok(letter.translit.trim().length > 0, `${letter.id}: Umschrift fehlt`);
    assert.ok(
      letter.pronunciation.trim().length >= 10,
      `${letter.id}: Aussprachehinweis zu kurz`,
    );
    assert.ok(letter.mnemonic.trim().length >= 10, `${letter.id}: Merkhilfe zu kurz`);
  }
});

test('confusableWith verweist nur auf existierende, andere Buchstaben', () => {
  for (const letter of LETTERS) {
    assert.ok(letter.confusableWith.length > 0, `${letter.id}: keine Verwechslungspartner`);
    for (const id of letter.confusableWith) {
      assert.ok(LETTER_BY_ID[id], `${letter.id}: unbekannte ID "${id}"`);
      assert.notEqual(id, letter.id, `${letter.id}: verweist auf sich selbst`);
    }
  }
});

test('die Gruppen decken alle Buchstaben ab', () => {
  let total = 0;
  for (let group = 1; group <= LETTER_GROUP_COUNT; group += 1) {
    const inGroup = lettersInGroup(group);
    assert.ok(inGroup.length > 0, `Gruppe ${group} ist leer`);
    total += inGroup.length;
  }
  assert.equal(total, 28);
});

// ---------------------------------------------------------------------------
// Harakat
// ---------------------------------------------------------------------------

test('es gibt vier Vokalzeichen mit korrekten Codepoints', () => {
  assert.equal(HARAKAT.length, 4);
  const byKind = Object.fromEntries(HARAKAT.map((mark) => [mark.kind, mark.mark]));
  assert.equal(byKind['fatha'], '\u064E');
  assert.equal(byKind['kasra'], '\u0650');
  assert.equal(byKind['damma'], '\u064F');
  assert.equal(byKind['sukun'], '\u0652');
});

test('Harakat-Items kombinieren Buchstabe und Zeichen in der richtigen Reihenfolge', () => {
  assert.equal(HARAKAT_ITEMS.length, HARAKAT_ITEM_COUNT);
  for (const item of HARAKAT_ITEMS) {
    const chars = Array.from(item.arabic);
    assert.equal(chars.length, 2, `${item.id}: erwartet Buchstabe + Zeichen`);
    // Das kombinierende Zeichen muss NACH dem Buchstaben stehen.
    const mark = chars[1] as string;
    assert.match(mark, /[\u064B-\u0652]/, `${item.id}: zweites Zeichen ist kein Harakat`);
    // Der Träger muss ein bekannter Buchstabe sein.
    assert.ok(getItem(item.letterId), `${item.id}: unbekannter Trägerbuchstabe`);
  }
});

test('die Übungsbuchstaben für Harakat existieren alle', () => {
  for (const id of HARAKAT_PRACTICE_LETTERS) {
    assert.ok(id !== null, 'Ein Übungsbuchstabe für Harakat wurde nicht gefunden');
  }
});

// ---------------------------------------------------------------------------
// Lernpfad
// ---------------------------------------------------------------------------

test('Lektions-IDs sind eindeutig', () => {
  const ids = new Set(LESSONS.map((lesson) => lesson.id));
  assert.equal(ids.size, LESSONS.length);
});

test('jede Lektion verweist nur auf existierende Items', () => {
  for (const lesson of LESSONS) {
    assert.ok(lesson.itemIds.length > 0, `${lesson.id}: keine Items`);
    for (const itemId of lesson.itemIds) {
      assert.ok(getItem(itemId), `${lesson.id}: unbekanntes Item "${itemId}"`);
    }
  }
});

test('die Voraussetzungen bilden eine lückenlose Kette ohne Sackgasse', () => {
  const firstLesson = LESSONS[0];
  assert.ok(firstLesson, 'Lernpfad ist leer');
  // Die erste Lektion ist sofort spielbar.
  assert.deepEqual(firstLesson.requires, []);

  LESSONS.forEach((lesson, index) => {
    if (index === 0) return;
    const previous = LESSONS[index - 1];
    assert.ok(previous, 'Vorgänger fehlt');
    // Jede Lektion hängt genau an ihrer Vorgängerin – eine lineare Kette.
    assert.deepEqual(
      lesson.requires,
      [previous.id],
      `${lesson.id}: erwartete Voraussetzung ${previous.id}`,
    );
    // Und die Voraussetzung muss auflösbar sein.
    for (const required of lesson.requires) {
      assert.ok(LESSON_BY_ID[required], `${lesson.id}: unbekannte Voraussetzung`);
    }
  });
});

test('der Pfad enthält Lernkarten-, Schreib-, Verbinden- und Harakat-Lektionen', () => {
  const kinds = new Set(LESSONS.map((lesson) => lesson.kind));
  for (const expected of ['letters', 'writing', 'connect', 'harakat'] as const) {
    assert.ok(kinds.has(expected), `Lektionsart "${expected}" fehlt im Lernpfad`);
  }
});

test('Harakat-Lektionen kommen nach allen Buchstaben-Lektionen', () => {
  const firstHarakat = LESSONS.findIndex((lesson) => lesson.kind === 'harakat');
  const lastLetterish = LESSONS.reduce(
    (acc, lesson, index) => (lesson.kind !== 'harakat' ? index : acc),
    -1,
  );
  assert.ok(firstHarakat > lastLetterish, 'Harakat-Lektion liegt zu früh im Pfad');
});

test('jede Lektion vergibt XP und hat Aufgaben', () => {
  for (const lesson of LESSONS) {
    assert.ok(lesson.xpReward > 0, `${lesson.id}: keine XP`);
    assert.ok(lesson.exerciseCount > 0, `${lesson.id}: keine Aufgaben`);
  }
});

// ---------------------------------------------------------------------------
// Vokabeln (Phase 2) – nur Strukturprüfung
// ---------------------------------------------------------------------------

test('Vokabeln verweisen auf existierende Einheiten', () => {
  const unitIds = new Set(VOCAB_UNITS.map((unit) => unit.id));
  for (const item of VOCAB_ITEMS) {
    assert.ok(unitIds.has(item.unitId), `${item.id}: unbekannte Einheit "${item.unitId}"`);
    assert.ok(item.arabic.trim().length > 0, `${item.id}: arabischer Text fehlt`);
    assert.ok(item.german.trim().length > 0, `${item.id}: Bedeutung fehlt`);
  }
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test('die Item-Registry ist über alle Inhaltsarten eindeutig', () => {
  const ids = new Set(ALL_ITEMS.map((item) => item.id));
  assert.equal(ids.size, ALL_ITEMS.length, 'doppelte Item-IDs über Module hinweg');
});

test('die Registry enthält Buchstaben, Harakat und Vokabeln', () => {
  const kinds = new Set(ALL_ITEMS.map((item) => item.kind));
  assert.ok(kinds.has('letter'));
  assert.ok(kinds.has('harakat'));
  assert.ok(kinds.has('vocab'));
});
