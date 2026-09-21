/**
 * Tests der Schrift-Logik: Formen, Verbinden, Hervorheben.
 *
 * Das Zusammenspiel von ZWJ und getrennten Textsegmenten ist der subtilste Teil des
 * Projekts – hier würde ein Fehler zu optisch zerfallenden Wörtern führen.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ZWJ,
  applyHarakat,
  buildForms,
  connectsForward,
  isArabicText,
  joinLetters,
  splitForHighlight,
  stripHarakat,
  stripJoiners,
  withTatweel,
  TATWEEL,
} from '../src/domain/arabic.ts';

test('connectsForward erkennt die sechs nicht verbindenden Buchstaben', () => {
  for (const char of ['ا', 'د', 'ذ', 'ر', 'ز', 'و']) {
    assert.equal(connectsForward(char), false, `${char} sollte nicht nach links verbinden`);
  }
  for (const char of ['ب', 'ت', 'س', 'م', 'ن', 'ي']) {
    assert.equal(connectsForward(char), true, `${char} sollte nach links verbinden`);
  }
});

test('buildForms erzeugt für verbindende Buchstaben vier verschiedene Formen', () => {
  const forms = buildForms('ب');
  assert.equal(forms.isolated, 'ب');
  assert.equal(forms.initial, 'ب' + ZWJ);
  assert.equal(forms.medial, ZWJ + 'ب' + ZWJ);
  assert.equal(forms.final, ZWJ + 'ب');
  // Alle vier müssen sich unterscheiden.
  assert.equal(new Set(Object.values(forms)).size, 4);
});

test('buildForms spiegelt bei nicht verbindenden Buchstaben die Schriftregel', () => {
  const forms = buildForms('د');
  // Anfangsform = isolierte Form, weil Dāl nicht nach links verbindet.
  assert.equal(forms.initial, forms.isolated);
  // Mittelform = Endform, aus demselben Grund.
  assert.equal(forms.medial, forms.final);
  assert.equal(forms.final, ZWJ + 'د');
});

test('buildForms akzeptiert eine explizite Vorgabe', () => {
  // Überschreiben der automatischen Erkennung.
  const forms = buildForms('د', true);
  assert.equal(forms.initial, 'د' + ZWJ);
});

test('withTatweel hängt den Verbindungsstrich nur dort an, wo verbunden wird', () => {
  assert.equal(withTatweel('ب', 'isolated'), 'ب');
  assert.equal(withTatweel('ب', 'initial'), 'ب' + TATWEEL);
  assert.equal(withTatweel('ب', 'medial'), TATWEEL + 'ب' + TATWEEL);
  assert.equal(withTatweel('ب', 'final'), TATWEEL + 'ب');
  // Dāl verbindet nicht nach links → kein Strich links.
  assert.equal(withTatweel('د', 'initial'), 'د');
  assert.equal(withTatweel('د', 'medial'), TATWEEL + 'د');
});

test('joinLetters setzt Buchstaben ohne Zusatzzeichen zusammen', () => {
  assert.equal(joinLetters(['ك', 'ت', 'ا', 'ب']), 'كتاب');
  assert.equal(joinLetters([]), '');
});

test('splitForHighlight trennt ein Wort in drei Segmente', () => {
  // كتاب, Ziel: ت an Position 1
  const parts = splitForHighlight('كتاب', 1);
  // Ohne Steuerzeichen muss das Originalwort wieder herauskommen.
  const rebuilt = stripJoiners(parts.before + parts.highlight + parts.after);
  assert.equal(rebuilt, 'كتاب');
  assert.equal(stripJoiners(parts.highlight), 'ت');
});

test('splitForHighlight hält die Verbindung mit ZWJ offen', () => {
  // ك(0) ت(1) ا(2) ب(3) – Ziel ت in der Mitte, beidseitig verbunden
  const parts = splitForHighlight('كتاب', 1);
  // Vorangehendes ك verbindet nach links → Segment muss offen enden.
  assert.ok(parts.before.endsWith(ZWJ), 'before sollte mit ZWJ enden');
  // Das Ziel ist beidseitig offen.
  assert.ok(parts.highlight.startsWith(ZWJ), 'highlight sollte mit ZWJ beginnen');
  assert.ok(parts.highlight.endsWith(ZWJ), 'highlight sollte mit ZWJ enden');
  assert.ok(parts.after.startsWith(ZWJ), 'after sollte mit ZWJ beginnen');
});

test('splitForHighlight am Wortanfang erzeugt kein führendes ZWJ', () => {
  // باب – Ziel ب an Position 0
  const parts = splitForHighlight('باب', 0);
  assert.equal(parts.before, '');
  assert.ok(!parts.highlight.startsWith(ZWJ), 'am Wortanfang darf kein ZWJ links stehen');
  // Bā verbindet nach links → rechts offen.
  assert.ok(parts.highlight.endsWith(ZWJ));
  assert.equal(stripJoiners(parts.highlight), 'ب');
});

test('splitForHighlight am Wortende erzeugt kein nachfolgendes ZWJ', () => {
  // كتاب – Ziel ب an Position 3 (letztes Zeichen)
  const parts = splitForHighlight('كتاب', 3);
  assert.equal(parts.after, '');
  assert.ok(!parts.highlight.endsWith(ZWJ), 'am Wortende darf kein ZWJ rechts stehen');
  assert.equal(stripJoiners(parts.highlight), 'ب');
});

test('splitForHighlight berücksichtigt nicht verbindende Vorgänger', () => {
  // دار – Ziel ا an Position 1. Dāl verbindet NICHT nach links,
  // also darf das Segment davor nicht mit ZWJ geöffnet werden.
  const parts = splitForHighlight('دار', 1);
  assert.ok(!parts.before.endsWith(ZWJ), 'nach Dāl darf kein ZWJ folgen');
  assert.ok(!parts.highlight.startsWith(ZWJ));
  // Alif verbindet ebenfalls nicht nach links.
  assert.ok(!parts.highlight.endsWith(ZWJ));
  assert.equal(stripJoiners(parts.highlight), 'ا');
});

test('splitForHighlight ist robust gegen ungültige Indizes', () => {
  const tooBig = splitForHighlight('كتاب', 99);
  assert.equal(tooBig.before, 'كتاب');
  assert.equal(tooBig.highlight, '');
  const negative = splitForHighlight('كتاب', -1);
  assert.equal(negative.highlight, '');
});

test('stripJoiners und stripHarakat entfernen die richtigen Zeichen', () => {
  assert.equal(stripJoiners(ZWJ + 'ب' + ZWJ), 'ب');
  assert.equal(stripJoiners(TATWEEL + 'ب'), 'ب');
  // Fatha entfernen
  assert.equal(stripHarakat('بَ'), 'ب');
  assert.equal(stripHarakat('كَتَبَ'), 'كتب');
});

test('applyHarakat setzt das Zeichen hinter den Buchstaben', () => {
  const combined = applyHarakat('ب', '\u064E');
  assert.equal(Array.from(combined).length, 2);
  assert.equal(Array.from(combined)[0], 'ب');
  assert.equal(Array.from(combined)[1], '\u064E');
});

test('isArabicText unterscheidet arabische und lateinische Texte', () => {
  assert.equal(isArabicText('كتاب'), true);
  assert.equal(isArabicText('Bā'), false);
  assert.equal(isArabicText(''), false);
});
