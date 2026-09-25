/**
 * Erzeugt die Aufgaben einer Lektion.
 *
 * Aufgaben sind **Daten**, keine Komponenten-Logik. Der Generator kennt keine UI, und
 * die UI enthält keine Auswahllogik. Das macht die didaktisch heiklen Entscheidungen
 * (welche Distraktoren? welche Aufgabenart?) testbar.
 *
 * Determinismus: Der Zufall kommt über `random()` herein. Mit `seededRandom(n)` sind
 * Läufe reproduzierbar – Grundlage der Tests.
 */

import { LETTERS, LETTER_BY_ID, letterByChar } from '../data/letters.ts';
import { HARAKAT_BY_KIND } from '../data/harakat.ts';
import { withTatweel } from './arabic.ts';
import { getItem, getLetter } from './items.ts';
import type {
  ChoiceExercise,
  ConnectExercise,
  Exercise,
  ExerciseOption,
  ExerciseType,
  FormName,
  HarakatItem,
  Lesson,
  Letter,
  VocabItem,
  WritingExercise,
} from './types.ts';

// ---------------------------------------------------------------------------
// Zufall
// ---------------------------------------------------------------------------

/** Zufallsquelle – austauschbar, damit Tests deterministisch laufen. */
export type RandomFn = () => number;

/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * Gleicher Seed → gleiche Aufgabenfolge.
 */
export function seededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mischt eine Kopie des Arrays (Fisher-Yates). */
export function shuffle<T>(items: T[], random: RandomFn): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

/** Ein zufälliges Element – `undefined` nur bei leerer Liste. */
function pickOne<T>(items: T[], random: RandomFn): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

// ---------------------------------------------------------------------------
// Kontext
// ---------------------------------------------------------------------------

/** Anzahl Antwortoptionen pro Auswahlaufgabe. */
export const OPTION_COUNT = 4;

export interface GeneratorContext {
  /** Bereits gelernte Item-IDs – bevorzugte Quelle für Distraktoren. */
  knownItemIds: string[];
  /**
   * Steht eine arabische Stimme zur Verfügung? Wenn nicht, werden Audio-Aufgaben
   * weggelassen – sie wären nicht lösbar.
   */
  audioAvailable: boolean;
  random: RandomFn;
}

/** Standardkontext für den Produktionsbetrieb. */
export function defaultContext(overrides: Partial<GeneratorContext> = {}): GeneratorContext {
  return {
    knownItemIds: [],
    audioAvailable: true,
    random: Math.random,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Distraktoren
// ---------------------------------------------------------------------------

/**
 * Wählt falsche Antwortoptionen aus.
 *
 * Priorität – didaktisch der wichtigste Teil des Generators:
 *   1. formähnliche Buchstaben (`confusableWith`) – dort passieren echte Verwechslungen
 *   2. Buchstaben derselben Lektionsgruppe
 *   3. bereits gelernte Buchstaben
 *   4. beliebige Buchstaben zum Auffüllen
 */
export function pickDistractors(
  target: Letter,
  count: number,
  ctx: GeneratorContext,
): Letter[] {
  const chosen: Letter[] = [];
  const used = new Set<string>([target.id]);

  /** Fügt Kandidaten einer Prioritätsstufe hinzu (gemischt, ohne Duplikate). */
  const addFrom = (candidates: Letter[]): void => {
    for (const candidate of shuffle(candidates, ctx.random)) {
      if (chosen.length >= count) return;
      if (used.has(candidate.id)) continue;
      used.add(candidate.id);
      chosen.push(candidate);
    }
  };

  // 1. Verwechslungsgefährdete Buchstaben
  addFrom(
    target.confusableWith
      .map((id) => LETTER_BY_ID[id])
      .filter((letter): letter is Letter => letter !== undefined),
  );

  // 2. Gleiche Lektionsgruppe
  addFrom(LETTERS.filter((letter) => letter.group === target.group));

  // 3. Bereits gelernte Buchstaben
  addFrom(
    ctx.knownItemIds
      .map((id) => getLetter(id))
      .filter((letter): letter is Letter => letter !== undefined),
  );

  // 4. Auffüllen mit allem Übrigen
  addFrom(LETTERS);

  return chosen.slice(0, count);
}

/** Baut die gemischte Optionsliste inkl. der richtigen Antwort. */
function buildOptions(
  correct: ExerciseOption,
  distractors: ExerciseOption[],
  random: RandomFn,
): { options: ExerciseOption[]; correctOptionId: string } {
  const options = shuffle([correct, ...distractors], random);
  return { options, correctOptionId: correct.id };
}

// ---------------------------------------------------------------------------
// Einzelne Aufgabentypen
// ---------------------------------------------------------------------------

let counter = 0;
/** Eindeutige Aufgaben-ID (nur innerhalb eines Laufs relevant). */
function nextId(type: string): string {
  counter += 1;
  return `${type}#${counter}`;
}

/** „Welcher Buchstabe klingt so?" – Ton hören, Buchstabe wählen. */
export function makeAudioToLetter(target: Letter, ctx: GeneratorContext): ChoiceExercise {
  const distractors = pickDistractors(target, OPTION_COUNT - 1, ctx);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.arabic, isArabic: true },
    distractors.map((letter) => ({ id: letter.id, label: letter.arabic, isArabic: true })),
    ctx.random,
  );

  return {
    id: nextId('audioToLetter'),
    type: 'audioToLetter',
    itemId: target.id,
    prompt: 'Welcher Buchstabe klingt so?',
    promptMode: 'audio',
    // Der Buchstabenname, nicht das nackte Zeichen – TTS verschluckt einzelne Zeichen.
    ttsText: target.nameArabic,
    options,
    correctOptionId,
    explanation: `${target.arabic} heißt „${target.nameGerman}" und klingt wie „${target.translit}".`,
  };
}

/** „Welcher Buchstabe ist das?" – eine Kontextform zeigen, Grundbuchstabe wählen. */
export function makeFormToLetter(
  target: Letter,
  ctx: GeneratorContext,
  form?: FormName,
): ChoiceExercise {
  // Die isolierte Form wäre zu einfach – wir zeigen eine verbundene Form.
  const forms: FormName[] = ['initial', 'medial', 'final'];
  const chosenForm = form ?? pickOne(forms, ctx.random) ?? 'medial';
  const labels: Record<FormName, string> = {
    isolated: 'allein stehend',
    initial: 'am Wortanfang',
    medial: 'in der Wortmitte',
    final: 'am Wortende',
  };

  const distractors = pickDistractors(target, OPTION_COUNT - 1, ctx);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.arabic, isArabic: true },
    distractors.map((letter) => ({ id: letter.id, label: letter.arabic, isArabic: true })),
    ctx.random,
  );

  return {
    id: nextId('formToLetter'),
    type: 'formToLetter',
    itemId: target.id,
    prompt: `Welcher Buchstabe ist das (${labels[chosenForm]})?`,
    promptMode: 'arabic',
    // Tatweel macht die Verbindungsstellen sichtbar, ohne einen fremden Buchstaben einzuführen.
    promptArabic: withTatweel(target.arabic, chosenForm),
    options,
    correctOptionId,
    explanation: `Das ist ${target.arabic} („${target.nameGerman}") ${labels[chosenForm]}.`,
  };
}

/** Buchstabe → Umschrift. */
export function makeLetterToTranslit(target: Letter, ctx: GeneratorContext): ChoiceExercise {
  const distractors = pickDistractors(target, OPTION_COUNT - 1, ctx);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.nameGerman, isArabic: false },
    distractors.map((letter) => ({ id: letter.id, label: letter.nameGerman, isArabic: false })),
    ctx.random,
  );

  return {
    id: nextId('letterToTranslit'),
    type: 'letterToTranslit',
    itemId: target.id,
    prompt: 'Wie heißt dieser Buchstabe?',
    promptMode: 'arabic',
    promptArabic: target.arabic,
    options,
    correctOptionId,
    explanation: `${target.arabic} heißt „${target.nameGerman}" (${target.translit}).`,
  };
}

/** Umschrift → Buchstabe. */
export function makeTranslitToLetter(target: Letter, ctx: GeneratorContext): ChoiceExercise {
  const distractors = pickDistractors(target, OPTION_COUNT - 1, ctx);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.arabic, isArabic: true },
    distractors.map((letter) => ({ id: letter.id, label: letter.arabic, isArabic: true })),
    ctx.random,
  );

  return {
    id: nextId('translitToLetter'),
    type: 'translitToLetter',
    itemId: target.id,
    prompt: `Welcher Buchstabe ist „${target.nameGerman}"?`,
    promptMode: 'latin',
    options,
    correctOptionId,
    explanation: `„${target.nameGerman}" wird ${target.arabic} geschrieben.`,
  };
}

/** Schreibübung für einen Buchstaben. */
export function makeWriting(target: Letter, form: FormName = 'isolated'): WritingExercise {
  // Punkte werden im Arabischen zuletzt gesetzt – das ist der häufigste Anfängerfehler.
  const hasDots = /[بتثجخذزشضظغفقني]/.test(target.arabic);
  const strokeHint = hasDots
    ? 'Zuerst den Grundstrich von rechts nach links, danach die Punkte setzen.'
    : 'Den Grundstrich von rechts nach links ziehen.';

  return {
    id: nextId('writing'),
    type: 'writing',
    itemId: target.id,
    prompt: `Schreibe ${target.nameGerman} (${target.arabic})`,
    targetChar: target.forms[form],
    form,
    // Pixelvergleich ist tolerant – 0.55 verlangt eine erkennbare Form, keine Perfektion.
    minScore: 0.55,
    strokeHint,
  };
}

/** Harakat: Kombination zeigen → Laut wählen (und umgekehrt). */
export function makeHarakatExercise(
  item: HarakatItem,
  siblings: HarakatItem[],
  ctx: GeneratorContext,
  direction: 'toSound' | 'toCombination',
): ChoiceExercise {
  const mark = HARAKAT_BY_KIND[item.harakat];
  // Distraktoren: dieselben Buchstaben mit anderen Vokalzeichen bzw. andere Buchstaben.
  const pool = siblings.filter((other) => other.id !== item.id);
  const distractors = shuffle(pool, ctx.random).slice(0, OPTION_COUNT - 1);

  if (direction === 'toSound') {
    const { options, correctOptionId } = buildOptions(
      { id: item.id, label: item.translit, isArabic: false },
      distractors.map((other) => ({ id: other.id, label: other.translit, isArabic: false })),
      ctx.random,
    );
    return {
      id: nextId('harakatToSound'),
      type: 'harakatToSound',
      itemId: item.id,
      prompt: 'Wie wird das gelesen?',
      promptMode: 'arabic',
      promptArabic: item.arabic,
      options,
      correctOptionId,
      explanation: `${item.arabic} ist „${item.translit}" – ${mark.nameGerman} erzeugt den Laut.`,
    };
  }

  const { options, correctOptionId } = buildOptions(
    { id: item.id, label: item.arabic, isArabic: true },
    distractors.map((other) => ({ id: other.id, label: other.arabic, isArabic: true })),
    ctx.random,
  );
  return {
    id: nextId('soundToHarakat'),
    type: 'soundToHarakat',
    itemId: item.id,
    prompt: `Welche Schreibweise ergibt „${item.translit}"?`,
    promptMode: 'latin',
    options,
    correctOptionId,
    explanation: `„${item.translit}" schreibt man ${item.arabic} (mit ${mark.nameGerman}).`,
  };
}

// ---------------------------------------------------------------------------
// Buchstaben verbinden
// ---------------------------------------------------------------------------

/**
 * Sucht Wörter, die sich aus den erlaubten Buchstaben zusammensetzen lassen.
 *
 * Echte Wörter sind Pseudo-Wörtern vorzuziehen – der Nutzer lernt gleich etwas mit.
 * Nur wenn sich kein passendes Wort findet, wird ein Pseudo-Wort gebildet.
 */
export function findConnectableWords(
  allowedLetterIds: string[],
  random: RandomFn,
  limit: number,
): { word: string; letterIds: string[]; german: string }[] {
  const allowed = new Set(allowedLetterIds);
  const results: { word: string; letterIds: string[]; german: string }[] = [];
  const seenWords = new Set<string>();

  // Kandidaten sind alle Beispielwörter der erlaubten Buchstaben.
  const candidates = LETTERS.filter((letter) => allowed.has(letter.id)).flatMap(
    (letter) => letter.examples,
  );

  for (const example of shuffle(candidates, random)) {
    if (results.length >= limit) break;
    if (seenWords.has(example.arabic)) continue;

    const chars = Array.from(example.arabic);
    // Zu lange Wörter überfordern die Übung.
    if (chars.length < 2 || chars.length > 4) continue;

    const letterIds: string[] = [];
    let usable = true;
    for (const char of chars) {
      const letter = letterByChar(char);
      // Jedes Zeichen muss ein bekannter, erlaubter Buchstabe sein
      // (schließt ة, ء usw. aus, die nicht zu den 28 gehören).
      if (!letter || !allowed.has(letter.id)) {
        usable = false;
        break;
      }
      letterIds.push(letter.id);
    }
    if (!usable) continue;

    seenWords.add(example.arabic);
    results.push({ word: example.arabic, letterIds, german: example.german });
  }

  return results;
}

/** Erzeugt eine Verbinden-Aufgabe. */
export function makeConnectExercise(
  letterIds: string[],
  german: string | null,
  ctx: GeneratorContext,
): ConnectExercise {
  const letters = letterIds
    .map((id) => LETTER_BY_ID[id])
    .filter((letter): letter is Letter => letter !== undefined);
  const word = letters.map((letter) => letter.arabic).join('');

  return {
    id: nextId('connectLetters'),
    type: 'connectLetters',
    // Gebucht wird auf den ersten Buchstaben – die Aufgabe übt vor allem seine Anfangsform.
    itemId: letters[0]?.id ?? letterIds[0] ?? 'unknown',
    prompt:
      german === null
        ? 'Setze die Buchstaben in dieser Reihenfolge zusammen'
        : `Setze das Wort für „${german}" zusammen`,
    letterIds,
    shuffledLetterIds: shuffle(letterIds, ctx.random),
    targetWord: word,
    explanation:
      german === null
        ? `Richtig ist ${word}.`
        : `„${german}" schreibt man ${word}.`,
  };
}

// ---------------------------------------------------------------------------
// Lektionen
// ---------------------------------------------------------------------------

/** Aufgabenarten, die für Buchstaben-Lektionen in Frage kommen. */
function letterExerciseTypes(ctx: GeneratorContext): ExerciseType[] {
  const types: ExerciseType[] = ['formToLetter', 'letterToTranslit', 'translitToLetter'];
  // Ohne arabische Stimme wären Hör-Aufgaben nicht lösbar.
  if (ctx.audioAvailable) types.unshift('audioToLetter');
  return types;
}

/** Baut eine einzelne Buchstaben-Aufgabe des gewünschten Typs. */
function buildLetterExercise(
  type: ExerciseType,
  letter: Letter,
  ctx: GeneratorContext,
): Exercise {
  switch (type) {
    case 'audioToLetter':
      return makeAudioToLetter(letter, ctx);
    case 'formToLetter':
      return makeFormToLetter(letter, ctx);
    case 'translitToLetter':
      return makeTranslitToLetter(letter, ctx);
    case 'letterToTranslit':
    default:
      return makeLetterToTranslit(letter, ctx);
  }
}

/**
 * Erzeugt die Aufgaben einer Lektion.
 *
 * Verteilung bei Buchstaben-Lektionen: Die Items werden wiederholt durchlaufen und
 * jedes Mal mit einer anderen Aufgabenart kombiniert. So kommt jeder Buchstabe
 * mehrfach und in unterschiedlichen Zugängen vor – Voraussetzung dafür, dass er
 * überhaupt den Status „gemeistert" erreichen kann.
 */
export function generateExercises(lesson: Lesson, ctx: GeneratorContext): Exercise[] {
  const exercises: Exercise[] = [];

  switch (lesson.kind) {
    case 'letters':
    case 'review': {
      const letters = lesson.itemIds
        .map((id) => getLetter(id))
        .filter((letter): letter is Letter => letter !== undefined);
      if (letters.length === 0) return [];

      const types = letterExerciseTypes(ctx);
      for (let i = 0; i < lesson.exerciseCount; i += 1) {
        const letter = letters[i % letters.length] as Letter;
        // Der Typ rotiert versetzt zur Item-Schleife → abwechslungsreiche Folge.
        const type = types[Math.floor(i / letters.length) % types.length] as ExerciseType;
        exercises.push(buildLetterExercise(type, letter, ctx));
      }
      return exercises;
    }

    case 'writing': {
      const letters = lesson.itemIds
        .map((id) => getLetter(id))
        .filter((letter): letter is Letter => letter !== undefined);
      return letters.map((letter) => makeWriting(letter));
    }

    case 'connect': {
      const words = findConnectableWords(lesson.itemIds, ctx.random, lesson.exerciseCount);
      for (const entry of words) {
        exercises.push(makeConnectExercise(entry.letterIds, entry.german, ctx));
      }

      // Zu wenig echte Wörter → mit Pseudo-Wörtern auffüllen.
      while (exercises.length < lesson.exerciseCount) {
        const pool = shuffle(lesson.itemIds, ctx.random).slice(0, 3);
        if (pool.length < 2) break;
        exercises.push(makeConnectExercise(pool, null, ctx));
      }
      return exercises;
    }

    case 'harakat': {
      const items = lesson.itemIds
        .map((id) => getItem(id))
        .filter((item): item is HarakatItem => item?.kind === 'harakat');
      if (items.length === 0) return [];

      for (let i = 0; i < lesson.exerciseCount; i += 1) {
        const item = items[i % items.length] as HarakatItem;
        // Abwechselnd beide Richtungen abfragen.
        const direction = i % 2 === 0 ? 'toSound' : 'toCombination';
        exercises.push(makeHarakatExercise(item, items, ctx, direction));
      }
      return exercises;
    }

    case 'vocab':
      // Phase 2 – die Typen sind vorbereitet, die Generatoren folgen mit den Inhalten.
      return [];

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Vokabeln
// ---------------------------------------------------------------------------

/**
 * Wählt falsche Antwortoptionen für eine Vokabelaufgabe.
 *
 * Anders als bei Buchstaben gibt es hier keine „formähnlichen" Distraktoren – die
 * Verwechslungsgefahr entsteht über die Bedeutung. Wir ziehen deshalb schlicht
 * andere Vokabeln aus demselben Pool, bevorzugt aus derselben Einheit (thematisch
 * naheliegend und damit anspruchsvoller).
 */
export function pickVocabDistractors(
  target: VocabItem,
  pool: VocabItem[],
  count: number,
  random: RandomFn,
): VocabItem[] {
  const chosen: VocabItem[] = [];
  const used = new Set<string>([target.id]);

  const addFrom = (candidates: VocabItem[]): void => {
    for (const candidate of shuffle(candidates, random)) {
      if (chosen.length >= count) return;
      if (used.has(candidate.id)) continue;
      used.add(candidate.id);
      chosen.push(candidate);
    }
  };

  // 1. Gleiche Einheit – thematisch nah, dadurch die besseren Distraktoren.
  addFrom(pool.filter((item) => item.unitId === target.unitId));
  // 2. Auffüllen mit allen übrigen Vokabeln.
  addFrom(pool);

  return chosen.slice(0, count);
}

/** Deutsch → Arabisch: Bedeutung lesen, arabisches Wort wählen. */
export function makeDeToAr(
  target: VocabItem,
  pool: VocabItem[],
  ctx: GeneratorContext,
): ChoiceExercise {
  const distractors = pickVocabDistractors(target, pool, OPTION_COUNT - 1, ctx.random);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.arabic, isArabic: true },
    distractors.map((item) => ({ id: item.id, label: item.arabic, isArabic: true })),
    ctx.random,
  );

  return {
    id: nextId('deToAr'),
    type: 'deToAr',
    itemId: target.id,
    prompt: `Wie heißt „${target.german}" auf Arabisch?`,
    promptMode: 'latin',
    options,
    correctOptionId,
    explanation: `„${target.german}" heißt ${target.arabic} (${target.translit}).`,
  };
}

/** Arabisch → Deutsch: arabisches Wort lesen, Bedeutung wählen. */
export function makeArToDe(
  target: VocabItem,
  pool: VocabItem[],
  ctx: GeneratorContext,
): ChoiceExercise {
  const distractors = pickVocabDistractors(target, pool, OPTION_COUNT - 1, ctx.random);
  const { options, correctOptionId } = buildOptions(
    { id: target.id, label: target.german, isArabic: false },
    distractors.map((item) => ({ id: item.id, label: item.german, isArabic: false })),
    ctx.random,
  );

  return {
    id: nextId('arToDe'),
    type: 'arToDe',
    itemId: target.id,
    prompt: 'Was bedeutet dieses Wort?',
    promptMode: 'arabic',
    promptArabic: target.arabic,
    // Bei Audio-Verfügbarkeit kann die UI das Wort zusätzlich vorlesen.
    ttsText: target.ttsText ?? target.arabic,
    options,
    correctOptionId,
    explanation: `${target.arabic} (${target.translit}) bedeutet „${target.german}".`,
  };
}

/**
 * Erzeugt einen Lauf aus Vokabelaufgaben.
 *
 * Der reguläre Lektions-Generator liefert für `kind:'vocab'` bewusst nichts – die
 * Vokabeln stehen nicht im linearen Buchstaben-Lernpfad, sondern werden als eigener
 * Quiz-Modus abgefragt. Beide Richtungen (Deutsch→Arabisch und Arabisch→Deutsch)
 * wechseln sich ab, damit ein Wort nicht nur passiv wiedererkannt, sondern auch
 * aktiv abgerufen wird.
 *
 * Distraktoren stammen aus demselben `items`-Pool. Damit mindestens vier Optionen
 * (eine richtige + drei falsche) möglich sind, braucht der Pool ≥ 4 Einträge – sonst
 * bleibt der Lauf leer.
 */
export function generateVocabExercises(
  items: VocabItem[],
  count: number,
  ctx: GeneratorContext,
): ChoiceExercise[] {
  // Ohne genügend Distraktoren ließen sich keine sauberen Multiple-Choice-Aufgaben bauen.
  if (items.length < OPTION_COUNT) return [];

  const exercises: ChoiceExercise[] = [];
  // Reihenfolge der Vokabeln einmal mischen, damit nicht immer dasselbe Wort zuerst kommt.
  const order = shuffle(items, ctx.random);

  for (let i = 0; i < count; i += 1) {
    const target = order[i % order.length] as VocabItem;
    // Richtung abwechseln: gerade → Deutsch→Arabisch, ungerade → Arabisch→Deutsch.
    const exercise =
      i % 2 === 0 ? makeDeToAr(target, items, ctx) : makeArToDe(target, items, ctx);
    exercises.push(exercise);
  }

  return exercises;
}

/**
 * Erzeugt die Aufgaben für einen Wiederholen-Lauf aus beliebigen Item-IDs.
 * Wird vom Wiederholen-Modus genutzt, der seine Items aus dem SRS zieht.
 */
export function generateReviewExercises(
  itemIds: string[],
  count: number,
  ctx: GeneratorContext,
): Exercise[] {
  const letters = itemIds
    .map((id) => getLetter(id))
    .filter((letter): letter is Letter => letter !== undefined);
  if (letters.length === 0) return [];

  const types = letterExerciseTypes(ctx);
  const exercises: Exercise[] = [];
  for (let i = 0; i < count; i += 1) {
    const letter = letters[i % letters.length] as Letter;
    const type = types[Math.floor(i / letters.length) % types.length] as ExerciseType;
    exercises.push(buildLetterExercise(type, letter, ctx));
  }
  return exercises;
}
