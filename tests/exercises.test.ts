/**
 * Tests des Übungs-Generators.
 *
 * Hier entscheidet sich die didaktische Qualität: Sind die falschen Antworten
 * sinnvoll gewählt? Kommt jeder Buchstabe oft genug vor? Entstehen lösbare Aufgaben,
 * auch wenn keine Sprachausgabe verfügbar ist?
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OPTION_COUNT,
  defaultContext,
  findConnectableWords,
  generateExercises,
  generateReviewExercises,
  generateVocabExercises,
  makeArToDe,
  makeAudioToLetter,
  makeConnectExercise,
  makeDeToAr,
  makeFormToLetter,
  makeLetterToTranslit,
  makeTranslitToLetter,
  makeWriting,
  pickDistractors,
  pickVocabDistractors,
  seededRandom,
  shuffle,
} from '../src/domain/exercises.ts';
import { LETTERS, LETTER_BY_ID } from '../src/data/letters.ts';
import { LESSONS, LESSON_BY_ID } from '../src/data/lessons.ts';
import { letterByChar } from '../src/data/letters.ts';
import { VOCAB_ITEMS, vocabInUnit } from '../src/data/vocab.ts';
import { stripJoiners } from '../src/domain/arabic.ts';
import type { ChoiceExercise, Letter, VocabItem } from '../src/domain/types.ts';

/** Testkontext mit festem Seed – macht die Läufe reproduzierbar. */
function ctx(seed = 1234, overrides = {}) {
  return defaultContext({ random: seededRandom(seed), ...overrides });
}

function letter(slug: string): Letter {
  const found = LETTER_BY_ID[`letter:${slug}`];
  assert.ok(found, `Buchstabe ${slug} fehlt`);
  return found;
}

// ---------------------------------------------------------------------------
// Zufall
// ---------------------------------------------------------------------------

test('seededRandom liefert reproduzierbare Werte', () => {
  const a = seededRandom(42);
  const b = seededRandom(42);
  for (let i = 0; i < 10; i += 1) {
    assert.equal(a(), b());
  }
  // Verschiedene Seeds ergeben verschiedene Folgen.
  assert.notEqual(seededRandom(1)(), seededRandom(2)());
});

test('seededRandom bleibt im Intervall [0, 1)', () => {
  const random = seededRandom(7);
  for (let i = 0; i < 500; i += 1) {
    const value = random();
    assert.ok(value >= 0 && value < 1, `Wert außerhalb: ${value}`);
  }
});

test('shuffle verändert das Original nicht und behält alle Elemente', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...original];
  const mixed = shuffle(original, seededRandom(9));

  assert.deepEqual(original, copy, 'das Original bleibt unberührt');
  assert.equal(mixed.length, original.length);
  assert.deepEqual([...mixed].sort((a, b) => a - b), copy);
});

// ---------------------------------------------------------------------------
// Distraktoren
// ---------------------------------------------------------------------------

test('pickDistractors liefert die gewünschte Anzahl ohne das Ziel', () => {
  for (const target of LETTERS) {
    const distractors = pickDistractors(target, OPTION_COUNT - 1, ctx());
    assert.equal(distractors.length, OPTION_COUNT - 1, `${target.id}: falsche Anzahl`);
    // Das Ziel darf nicht unter den falschen Antworten sein.
    assert.ok(
      !distractors.some((entry) => entry.id === target.id),
      `${target.id}: Ziel als Distraktor`,
    );
    // Keine Duplikate.
    assert.equal(new Set(distractors.map((entry) => entry.id)).size, distractors.length);
  }
});

test('pickDistractors bevorzugt formähnliche Buchstaben', () => {
  // Bā wird typischerweise mit Tā, Thā, Nūn und Yā verwechselt.
  const target = letter('baa');
  const distractors = pickDistractors(target, 3, ctx());
  const confusable = new Set(target.confusableWith);
  const fromConfusable = distractors.filter((entry) => confusable.has(entry.id));
  // Bā hat 4 Verwechslungspartner, wir brauchen 3 → alle müssen von dort kommen.
  assert.equal(
    fromConfusable.length,
    3,
    `erwartete nur verwechselbare Distraktoren, war: ${distractors.map((d) => d.arabic).join(' ')}`,
  );
});

test('pickDistractors funktioniert auch, wenn mehr Optionen als Partner gebraucht werden', () => {
  // Kāf hat nur einen Verwechslungspartner (Lām) – der Rest muss aufgefüllt werden.
  const target = letter('kaf');
  const distractors = pickDistractors(target, 3, ctx());
  assert.equal(distractors.length, 3);
  assert.ok(distractors.some((entry) => entry.id === 'letter:lam'), 'Lām sollte dabei sein');
});

test('die Distraktor-Priorität ist: verwechselbar → Gruppe → gelernt → beliebig', () => {
  // Alif: 1 Verwechslungspartner (Lām) + 3 Gruppenmitglieder (Bā, Tā, Thā) = 4 Kandidaten
  // auf den Stufen 1 und 2. Erst ab dem 5. Distraktor greift Stufe 3.
  const target = letter('alif');
  const context = ctx(5, { knownItemIds: ['letter:mim', 'letter:nun'] });
  const distractors = pickDistractors(target, 6, context);
  const ids = distractors.map((entry) => entry.id);

  // Stufe 1 + 2 müssen vollständig enthalten sein.
  assert.ok(ids.includes('letter:lam'), 'der Verwechslungspartner fehlt');
  for (const slug of ['baa', 'taa', 'thaa']) {
    assert.ok(ids.includes(`letter:${slug}`), `Gruppenmitglied ${slug} fehlt`);
  }
  // Stufe 3: die gelernten Buchstaben kommen vor beliebigen anderen.
  assert.ok(
    ids.includes('letter:mim') && ids.includes('letter:nun'),
    `erwartete gelernte Buchstaben auf Stufe 3, war: ${ids.join(', ')}`,
  );
  assert.equal(ids.length, 6);
});

test('bei nur drei Distraktoren genügen Partner und Gruppe', () => {
  const target = letter('alif');
  const distractors = pickDistractors(target, 3, ctx(5));
  const allowed = new Set([...target.confusableWith, 'letter:baa', 'letter:taa', 'letter:thaa']);
  for (const entry of distractors) {
    assert.ok(
      allowed.has(entry.id),
      `${entry.id} sollte aus Partnern oder Gruppe stammen`,
    );
  }
});

// ---------------------------------------------------------------------------
// Einzelne Aufgabentypen
// ---------------------------------------------------------------------------

test('jede Auswahlaufgabe hat vier Optionen mit genau einer richtigen', () => {
  const target = letter('sin');
  const builders = [
    makeAudioToLetter,
    makeFormToLetter,
    makeLetterToTranslit,
    makeTranslitToLetter,
  ];

  for (const build of builders) {
    const exercise = build(target, ctx()) as ChoiceExercise;
    assert.equal(exercise.options.length, OPTION_COUNT, `${exercise.type}: Anzahl Optionen`);
    // Genau eine Option ist die richtige.
    const correct = exercise.options.filter((o) => o.id === exercise.correctOptionId);
    assert.equal(correct.length, 1, `${exercise.type}: richtige Option nicht eindeutig`);
    // Die richtige Option gehört zum Ziel-Item.
    assert.equal(exercise.correctOptionId, target.id, `${exercise.type}: falsches Ziel`);
    // Keine doppelten Beschriftungen – sonst gäbe es zwei richtige Antworten.
    const labels = exercise.options.map((o) => o.label);
    assert.equal(new Set(labels).size, labels.length, `${exercise.type}: doppelte Beschriftung`);
    // Jede Aufgabe hat eine Erklärung für den Fehlerfall.
    assert.ok(exercise.explanation.length > 5, `${exercise.type}: Erklärung fehlt`);
    assert.ok(exercise.prompt.length > 0, `${exercise.type}: Aufgabenstellung fehlt`);
  }
});

test('die Audio-Aufgabe spricht den Buchstabennamen, nicht das Zeichen', () => {
  const target = letter('baa');
  const exercise = makeAudioToLetter(target, ctx());
  assert.equal(exercise.promptMode, 'audio');
  // Einzelne Zeichen werden von TTS verschluckt – deshalb der Name.
  assert.equal(exercise.ttsText, target.nameArabic);
});

test('die Formen-Aufgabe zeigt nie die isolierte Form', () => {
  const target = letter('nun');
  for (let seed = 0; seed < 25; seed += 1) {
    const exercise = makeFormToLetter(target, ctx(seed));
    assert.ok(exercise.promptArabic, 'arabischer Prompt fehlt');
    // Die isolierte Form wäre zu leicht: der Prompt muss einen Verbindungsstrich tragen.
    assert.notEqual(
      exercise.promptArabic,
      target.arabic,
      'isolierte Form ist als Aufgabe zu einfach',
    );
    // Der Buchstabe selbst muss im Prompt stecken.
    assert.ok(exercise.promptArabic.includes(target.arabic));
  }
});

test('die Formen-Aufgabe kann auf eine bestimmte Form festgelegt werden', () => {
  const exercise = makeFormToLetter(letter('baa'), ctx(), 'final');
  assert.match(exercise.prompt, /Wortende/);
});

test('Umschrift-Aufgaben nutzen lateinische, Buchstaben-Aufgaben arabische Optionen', () => {
  const toTranslit = makeLetterToTranslit(letter('mim'), ctx());
  assert.ok(
    toTranslit.options.every((option) => !option.isArabic),
    'Antworten sollten lateinisch sein',
  );
  assert.equal(toTranslit.promptMode, 'arabic');

  const toLetter = makeTranslitToLetter(letter('mim'), ctx());
  assert.ok(toLetter.options.every((option) => option.isArabic));
  assert.equal(toLetter.promptMode, 'latin');
});

test('die Schreibaufgabe nennt die Strichfolge und eine erreichbare Schwelle', () => {
  // Buchstabe mit Punkten
  const withDots = makeWriting(letter('baa'));
  assert.match(withDots.strokeHint, /Punkte/, 'Hinweis auf die Punkte fehlt');
  assert.equal(withDots.targetChar, letter('baa').forms.isolated);
  assert.ok(withDots.minScore > 0 && withDots.minScore < 1);

  // Buchstabe ohne Punkte
  const noDots = makeWriting(letter('sin'));
  assert.ok(!/Punkte/.test(noDots.strokeHint), 'Sīn hat keine Punkte');

  // Andere Form anfordern
  const finalForm = makeWriting(letter('baa'), 'final');
  assert.equal(finalForm.form, 'final');
  assert.equal(finalForm.targetChar, letter('baa').forms.final);
});

// ---------------------------------------------------------------------------
// Buchstaben verbinden
// ---------------------------------------------------------------------------

test('findConnectableWords liefert nur Wörter aus erlaubten Buchstaben', () => {
  const allowed = LETTERS.map((entry) => entry.id);
  const words = findConnectableWords(allowed, seededRandom(3), 5);
  assert.ok(words.length > 0, 'keine Wörter gefunden');

  for (const entry of words) {
    // Die Buchstaben-IDs müssen das Wort exakt ergeben.
    const rebuilt = entry.letterIds
      .map((id) => LETTER_BY_ID[id]?.arabic ?? '?')
      .join('');
    assert.equal(rebuilt, entry.word, `${entry.word}: Zerlegung passt nicht`);
    assert.ok(entry.letterIds.length >= 2 && entry.letterIds.length <= 4, 'Länge 2–4');
    assert.ok(entry.german.length > 0, 'Bedeutung fehlt');
  }
});

test('findConnectableWords überspringt Wörter mit fremden Zeichen', () => {
  // Nur eine kleine Auswahl erlauben.
  const allowed = ['letter:baa', 'letter:ya', 'letter:taa'];
  const words = findConnectableWords(allowed, seededRandom(11), 10);
  for (const entry of words) {
    for (const char of Array.from(entry.word)) {
      const found = letterByChar(char);
      assert.ok(found, `${entry.word}: "${char}" ist kein Buchstabe des Alphabets`);
      assert.ok(allowed.includes(found.id), `${entry.word}: "${char}" war nicht erlaubt`);
    }
  }
});

test('findConnectableWords liefert keine Duplikate', () => {
  const allowed = LETTERS.map((entry) => entry.id);
  const words = findConnectableWords(allowed, seededRandom(3), 20);
  const unique = new Set(words.map((entry) => entry.word));
  assert.equal(unique.size, words.length);
});

test('die Verbinden-Aufgabe enthält alle Bausteine und das Zielwort', () => {
  const ids = ['letter:kaf', 'letter:taa', 'letter:alif', 'letter:baa'];
  const exercise = makeConnectExercise(ids, 'Buch', ctx());

  assert.equal(exercise.targetWord, 'كتاب');
  assert.deepEqual(exercise.letterIds, ids, 'die Zielreihenfolge bleibt erhalten');
  // Gemischt, aber inhaltlich identisch.
  assert.deepEqual([...exercise.shuffledLetterIds].sort(), [...ids].sort());
  assert.match(exercise.prompt, /Buch/);
  assert.match(exercise.explanation, /كتاب/);
});

test('die Verbinden-Aufgabe funktioniert auch ohne Bedeutung (Pseudo-Wort)', () => {
  const exercise = makeConnectExercise(['letter:baa', 'letter:taa'], null, ctx());
  assert.match(exercise.prompt, /Reihenfolge/);
  assert.equal(exercise.targetWord, 'بت');
});

// ---------------------------------------------------------------------------
// Ganze Lektionen
// ---------------------------------------------------------------------------

test('eine Buchstaben-Lektion erzeugt genau die vorgesehene Anzahl Aufgaben', () => {
  const lesson = LESSON_BY_ID['lesson:letters:1'];
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx());
  assert.equal(exercises.length, lesson.exerciseCount);
});

test('in einer Buchstaben-Lektion kommt jeder Buchstabe mehrfach und variiert vor', () => {
  const lesson = LESSON_BY_ID['lesson:letters:1'];
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx());

  // Jeder Buchstabe der Gruppe muss vorkommen.
  for (const itemId of lesson.itemIds) {
    const count = exercises.filter((exercise) => exercise.itemId === itemId).length;
    assert.ok(count >= 2, `${itemId}: nur ${count}× – zu selten für "gemeistert"`);
  }

  // Und es müssen mehrere Aufgabenarten auftreten (Voraussetzung für "mastered").
  const types = new Set(exercises.map((exercise) => exercise.type));
  assert.ok(types.size >= 2, `nur ${types.size} Aufgabenart(en)`);
});

test('ohne Sprachausgabe entstehen keine Audio-Aufgaben', () => {
  const lesson = LESSON_BY_ID['lesson:letters:1'];
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx(1234, { audioAvailable: false }));

  assert.equal(exercises.length, lesson.exerciseCount, 'die Lektion bleibt vollständig');
  assert.ok(
    !exercises.some((exercise) => exercise.type === 'audioToLetter'),
    'Audio-Aufgaben wären nicht lösbar',
  );
});

test('mit Sprachausgabe kommen Audio-Aufgaben vor', () => {
  const lesson = LESSON_BY_ID['lesson:letters:1'];
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx(1234, { audioAvailable: true }));
  assert.ok(exercises.some((exercise) => exercise.type === 'audioToLetter'));
});

test('eine Schreib-Lektion erzeugt eine Aufgabe pro Buchstabe', () => {
  const lesson = LESSON_BY_ID['lesson:writing:1'];
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx());
  assert.equal(exercises.length, lesson.itemIds.length);
  assert.ok(exercises.every((exercise) => exercise.type === 'writing'));
  // Jeder Buchstabe genau einmal.
  assert.equal(new Set(exercises.map((e) => e.itemId)).size, lesson.itemIds.length);
});

test('eine Verbinden-Lektion füllt die geforderte Anzahl Aufgaben', () => {
  const lesson = LESSONS.find((entry) => entry.kind === 'connect');
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx());
  assert.equal(exercises.length, lesson.exerciseCount);
  assert.ok(exercises.every((exercise) => exercise.type === 'connectLetters'));
});

test('eine Harakat-Lektion fragt beide Richtungen ab', () => {
  const lesson = LESSONS.find((entry) => entry.kind === 'harakat');
  assert.ok(lesson);
  const exercises = generateExercises(lesson, ctx());
  assert.equal(exercises.length, lesson.exerciseCount);

  const types = new Set(exercises.map((exercise) => exercise.type));
  assert.ok(types.has('harakatToSound'), 'Richtung Kombination → Laut fehlt');
  assert.ok(types.has('soundToHarakat'), 'Richtung Laut → Kombination fehlt');
});

test('alle Lektionen des Lernpfads erzeugen lösbare Aufgaben', () => {
  for (const lesson of LESSONS) {
    const exercises = generateExercises(lesson, ctx(99));
    assert.ok(exercises.length > 0, `${lesson.id}: keine Aufgaben erzeugt`);

    for (const exercise of exercises) {
      assert.ok(exercise.prompt.length > 0, `${lesson.id}: Aufgabenstellung fehlt`);
      if (exercise.type === 'writing') {
        assert.ok(exercise.targetChar.length > 0);
        // Der Zielbuchstabe muss ein echtes Zeichen sein.
        assert.ok(stripJoiners(exercise.targetChar).length > 0);
      } else if (exercise.type === 'connectLetters') {
        assert.ok(exercise.letterIds.length >= 2);
        assert.equal(exercise.shuffledLetterIds.length, exercise.letterIds.length);
      } else {
        assert.equal(exercise.options.length, OPTION_COUNT, `${lesson.id}/${exercise.type}`);
        assert.ok(
          exercise.options.some((option) => option.id === exercise.correctOptionId),
          `${lesson.id}: richtige Antwort fehlt in den Optionen`,
        );
      }
    }
  }
});

test('der Generator ist mit gleichem Seed deterministisch', () => {
  const lesson = LESSON_BY_ID['lesson:letters:2'];
  assert.ok(lesson);

  const first = generateExercises(lesson, ctx(777));
  const second = generateExercises(lesson, ctx(777));

  assert.equal(first.length, second.length);
  first.forEach((exercise, index) => {
    const other = second[index];
    assert.ok(other);
    assert.equal(exercise.type, other.type);
    assert.equal(exercise.itemId, other.itemId);
    if (exercise.type !== 'writing' && exercise.type !== 'connectLetters') {
      const otherChoice = other as ChoiceExercise;
      // Auch die Reihenfolge der Optionen muss reproduzierbar sein.
      assert.deepEqual(
        exercise.options.map((option) => option.id),
        otherChoice.options.map((option) => option.id),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Wiederholen
// ---------------------------------------------------------------------------

test('der Wiederholen-Modus erzeugt Aufgaben aus beliebigen Item-IDs', () => {
  const ids = ['letter:baa', 'letter:sin', 'letter:mim'];
  const exercises = generateReviewExercises(ids, 6, ctx());
  assert.equal(exercises.length, 6);
  // Nur die übergebenen Items dürfen abgefragt werden.
  for (const exercise of exercises) {
    assert.ok(ids.includes(exercise.itemId), `fremdes Item: ${exercise.itemId}`);
  }
  // Jedes Item kommt vor.
  assert.equal(new Set(exercises.map((e) => e.itemId)).size, 3);
});

test('der Wiederholen-Modus verkraftet eine leere Liste', () => {
  assert.deepEqual(generateReviewExercises([], 5, ctx()), []);
  // Unbekannte IDs werden ignoriert, nicht als Fehler behandelt.
  assert.deepEqual(generateReviewExercises(['gibts:nicht'], 5, ctx()), []);
});

// ---------------------------------------------------------------------------
// Vokabeln
// ---------------------------------------------------------------------------

test('pickVocabDistractors liefert die gewünschte Anzahl ohne das Ziel', () => {
  for (const target of VOCAB_ITEMS) {
    const distractors = pickVocabDistractors(target, VOCAB_ITEMS, OPTION_COUNT - 1, seededRandom(3));
    assert.equal(distractors.length, OPTION_COUNT - 1, `${target.id}: falsche Anzahl`);
    assert.ok(
      !distractors.some((entry) => entry.id === target.id),
      `${target.id}: Ziel als Distraktor`,
    );
    assert.equal(new Set(distractors.map((entry) => entry.id)).size, distractors.length);
  }
});

test('pickVocabDistractors bevorzugt Wörter derselben Einheit', () => {
  // „Haus" liegt in unit:basics, das mehr als drei Vokabeln hat – die Distraktoren
  // sollten deshalb alle aus derselben Einheit stammen.
  const target = VOCAB_ITEMS.find((item) => item.id === 'vocab:bayt') as VocabItem;
  assert.ok(target);
  const sameUnit = vocabInUnit(target.unitId);
  assert.ok(sameUnit.length >= OPTION_COUNT, 'Testannahme: Einheit hat genug Vokabeln');
  const distractors = pickVocabDistractors(target, VOCAB_ITEMS, OPTION_COUNT - 1, seededRandom(7));
  for (const entry of distractors) {
    assert.equal(entry.unitId, target.unitId, `${entry.id} stammt aus fremder Einheit`);
  }
});

test('Deutsch→Arabisch und Arabisch→Deutsch bauen saubere Auswahlaufgaben', () => {
  const target = VOCAB_ITEMS.find((item) => item.id === 'vocab:kitab') as VocabItem;
  assert.ok(target);

  const deToAr = makeDeToAr(target, VOCAB_ITEMS, ctx());
  assert.equal(deToAr.type, 'deToAr');
  assert.equal(deToAr.promptMode, 'latin');
  assert.match(deToAr.prompt, /Buch/);
  // Die arabischen Optionen werden als arabischer Text gerendert.
  assert.ok(deToAr.options.every((option) => option.isArabic));
  assert.equal(deToAr.correctOptionId, target.id);
  assert.equal(deToAr.options.length, OPTION_COUNT);
  assert.equal(deToAr.options.filter((o) => o.id === deToAr.correctOptionId).length, 1);
  assert.equal(new Set(deToAr.options.map((o) => o.label)).size, deToAr.options.length);

  const arToDe = makeArToDe(target, VOCAB_ITEMS, ctx());
  assert.equal(arToDe.type, 'arToDe');
  assert.equal(arToDe.promptMode, 'arabic');
  assert.equal(arToDe.promptArabic, target.arabic);
  // Die deutschen Optionen sind lateinisch.
  assert.ok(arToDe.options.every((option) => !option.isArabic));
  assert.equal(arToDe.correctOptionId, target.id);
  assert.equal(new Set(arToDe.options.map((o) => o.label)).size, arToDe.options.length);
});

test('generateVocabExercises füllt die geforderte Anzahl und wechselt die Richtung', () => {
  const exercises = generateVocabExercises(VOCAB_ITEMS, 8, ctx());
  assert.equal(exercises.length, 8);

  const types = new Set(exercises.map((exercise) => exercise.type));
  assert.ok(types.has('deToAr'), 'Richtung Deutsch→Arabisch fehlt');
  assert.ok(types.has('arToDe'), 'Richtung Arabisch→Deutsch fehlt');

  for (const exercise of exercises) {
    assert.equal(exercise.options.length, OPTION_COUNT);
    // Genau eine richtige Option, die zum Ziel-Item gehört.
    assert.equal(
      exercise.options.filter((o) => o.id === exercise.correctOptionId).length,
      1,
      'richtige Option nicht eindeutig',
    );
    assert.ok(
      VOCAB_ITEMS.some((item) => item.id === exercise.itemId),
      `fremdes Item: ${exercise.itemId}`,
    );
    // Keine doppelten Beschriftungen – sonst gäbe es zwei richtige Antworten.
    const labels = exercise.options.map((o) => o.label);
    assert.equal(new Set(labels).size, labels.length, 'doppelte Beschriftung');
  }
});

test('generateVocabExercises bleibt ohne genügend Distraktoren leer', () => {
  // Weniger Vokabeln als Optionen → keine sauberen Aufgaben möglich.
  const tooFew = VOCAB_ITEMS.slice(0, OPTION_COUNT - 1);
  assert.deepEqual(generateVocabExercises(tooFew, 5, ctx()), []);
  assert.deepEqual(generateVocabExercises([], 5, ctx()), []);
});

test('generateVocabExercises ist mit gleichem Seed deterministisch', () => {
  const first = generateVocabExercises(VOCAB_ITEMS, 6, ctx(555));
  const second = generateVocabExercises(VOCAB_ITEMS, 6, ctx(555));
  assert.equal(first.length, second.length);
  first.forEach((exercise, index) => {
    const other = second[index];
    assert.ok(other);
    assert.equal(exercise.type, other.type);
    assert.equal(exercise.itemId, other.itemId);
    assert.deepEqual(
      exercise.options.map((option) => option.id),
      other.options.map((option) => option.id),
    );
  });
});
