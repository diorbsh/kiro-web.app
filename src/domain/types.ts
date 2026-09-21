/**
 * Zentrale Typen der Anwendung.
 *
 * Aufbau-Prinzip: Alle lernbaren Inhalte teilen eine gemeinsame Basis
 * (`LearnItemBase`). Dadurch können Harakat und später Vokabeln/Sätze an dieselbe
 * Fortschritts-, SRS- und Gamification-Logik angeschlossen werden, ohne dass
 * bestehende Typen geändert werden müssen.
 *
 * Diese Datei enthält bewusst keine React-Importe – die gesamte Domänenschicht ist
 * damit ohne Browser testbar.
 */

// ---------------------------------------------------------------------------
// Inhalte
// ---------------------------------------------------------------------------

/** Art des Inhalts. Erweiterbar, ohne bestehende Typen anzufassen. */
export type ItemKind = 'letter' | 'harakat' | 'vocab' | 'sentence';

/** Gemeinsame Basis aller lernbaren Einheiten. */
export interface LearnItemBase {
  /** Stabile ID, z. B. "letter:baa" oder "harakat:baa+fatha". */
  id: string;
  kind: ItemKind;
  /** Anzuzeigender arabischer Text. */
  arabic: string;
  /** Lateinische Umschrift. */
  translit: string;
  /** Deutsche Bedeutung bzw. Name. */
  german: string;
  /**
   * Abweichender Text für die Sprachausgabe. Einzelne Buchstaben werden von TTS
   * oft verschluckt – dann wird hier der Buchstabenname hinterlegt.
   */
  ttsText?: string;
  tags?: string[];
}

/** Die vier Kontextformen eines arabischen Buchstaben. */
export interface LetterForms {
  /** Alleinstehend. */
  isolated: string;
  /** Am Wortanfang (verbindet nach links). */
  initial: string;
  /** In der Wortmitte (beidseitig verbunden). */
  medial: string;
  /** Am Wortende (verbindet nach rechts). */
  final: string;
}

/** Name einer Form – für Beschriftungen und Übungsauswahl. */
export type FormName = keyof LetterForms;

/** Beispielwort zu einem Buchstaben. */
export interface ExampleWord {
  arabic: string;
  translit: string;
  german: string;
  /**
   * Position des gelernten Buchstaben in `arabic` (0 = erstes Zeichen der
   * Zeichenkette, also der Buchstabe ganz rechts). Wird für die farbliche
   * Hervorhebung genutzt.
   */
  highlightIndex: number;
}

/** Ein Buchstabe des arabischen Alphabets. */
export interface Letter extends LearnItemBase {
  kind: 'letter';
  /** Position im Alphabet, 1–28. */
  order: number;
  /** Arabischer Name, z. B. "باء". */
  nameArabic: string;
  /** Deutsche Umschrift des Namens, z. B. "Bā". */
  nameGerman: string;
  /** Aussprachehinweis auf Deutsch. */
  pronunciation: string;
  forms: LetterForms;
  /**
   * Verbindet der Buchstabe nach links zum folgenden Buchstaben?
   * false für ا د ذ ر ز و – deren Anfangsform gleicht der isolierten Form.
   */
  connectsForward: boolean;
  /** Mindestens zwei Beispielwörter. */
  examples: ExampleWord[];
  /** Kurze deutsche Eselsbrücke. */
  mnemonic: string;
  /** IDs formähnlicher Buchstaben – bevorzugte Distraktoren in Übungen. */
  confusableWith: string[];
  /** Lektionsgruppe (1–7). */
  group: number;
}

/** Die vier Kurzvokalzeichen. */
export type HarakatKind = 'fatha' | 'kasra' | 'damma' | 'sukun';

/** Beschreibung eines Vokalzeichens. */
export interface HarakatMark {
  kind: HarakatKind;
  /** Das kombinierende Zeichen selbst (U+064E, U+0650, U+064F, U+0652). */
  mark: string;
  nameArabic: string;
  nameGerman: string;
  /** Resultierender Vokal: "a", "i", "u" bzw. "" bei Sukun. */
  vowelSound: string;
  /** Erklärung auf Deutsch. */
  description: string;
}

/** Buchstabe + Vokalzeichen als eigenständiges lernbares Item. */
export interface HarakatItem extends LearnItemBase {
  kind: 'harakat';
  /** ID des Trägerbuchstaben. */
  letterId: string;
  harakat: HarakatKind;
}

/** Vokabel oder Satz (Phase 2 – im Modell bereits vorgesehen). */
export interface VocabItem extends LearnItemBase {
  kind: 'vocab' | 'sentence';
  /** Zugehörige Lerneinheit. */
  unitId: string;
  /** Einzelteile für Lückentexte bzw. Satzbau-Übungen. */
  wordParts?: string[];
  /** Kurzer Grammatikhinweis auf Deutsch. */
  grammarNote?: string;
}

/** Vereinigung aller lernbaren Inhalte. */
export type LearnItem = Letter | HarakatItem | VocabItem;

// ---------------------------------------------------------------------------
// Lernpfad
// ---------------------------------------------------------------------------

/** Art einer Lektion – bestimmt, welche Aufgabentypen erzeugt werden. */
export type LessonKind =
  | 'letters' // Lernkarten + Erkennungsübungen einer Buchstabengruppe
  | 'writing' // Schreibübung auf Canvas
  | 'connect' // Buchstaben zu einem Wort verbinden
  | 'harakat'
  | 'vocab' // Phase 2
  | 'review'; // aus dem SRS gespeist

/** Eine Lektion im Lernpfad. */
export interface Lesson {
  id: string;
  kind: LessonKind;
  /** Titel auf Deutsch. */
  title: string;
  subtitle?: string;
  /** IDs der Items, die in dieser Lektion vorkommen. */
  itemIds: string[];
  /** Lektionen, die vorher abgeschlossen sein müssen. */
  requires: string[];
  /** XP für den Abschluss. */
  xpReward: number;
  /** Anzahl Aufgaben in einem Lauf. */
  exerciseCount: number;
}

// ---------------------------------------------------------------------------
// Übungen
// ---------------------------------------------------------------------------

/** Alle Aufgabentypen. Die letzten vier gehören zu Phase 2. */
export type ExerciseType =
  | 'audioToLetter' // Ton hören → Buchstabe wählen
  | 'formToLetter' // Form im Wort → Grundbuchstabe wählen
  | 'letterToTranslit' // Buchstabe → Umschrift
  | 'translitToLetter' // Umschrift → Buchstabe
  | 'connectLetters' // Buchstaben zu einem Wort verbinden
  | 'writing' // Schreibübung
  | 'harakatToSound' // Buchstabe + Vokalzeichen → Laut
  | 'soundToHarakat'
  | 'deToAr'
  | 'arToDe'
  | 'matchPairs'
  | 'clozeGap'
  | 'listening';

/** Gemeinsame Felder aller Aufgaben. */
export interface ExerciseBase {
  id: string;
  type: ExerciseType;
  /** Item, das geübt wird – Ziel der Fortschritts-Buchung. */
  itemId: string;
  /** Aufgabenstellung auf Deutsch. */
  prompt: string;
}

/** Wie wird die Frage dargestellt? Hält die Komponente generisch. */
export type PromptMode = 'audio' | 'arabic' | 'latin';

/** Eine Antwortoption. */
export interface ExerciseOption {
  id: string;
  label: string;
  /** true → als arabischer Text rendern (RTL, Arabic-Font). */
  isArabic: boolean;
}

/** Aufgabe mit Auswahlmöglichkeiten. */
export interface ChoiceExercise extends ExerciseBase {
  type:
    | 'audioToLetter'
    | 'formToLetter'
    | 'letterToTranslit'
    | 'translitToLetter'
    | 'harakatToSound'
    | 'soundToHarakat'
    | 'deToAr'
    | 'arToDe';
  promptMode: PromptMode;
  /** Arabischer Text der Frage (z. B. die Form im Wortkontext). */
  promptArabic?: string;
  /** Text, der bei `promptMode === 'audio'` gesprochen wird. */
  ttsText?: string;
  options: ExerciseOption[];
  correctOptionId: string;
  /** Erklärung, die bei falscher Antwort erscheint. */
  explanation: string;
}

/** Buchstaben in der richtigen Reihenfolge zu einem Wort verbinden. */
export interface ConnectExercise extends ExerciseBase {
  type: 'connectLetters';
  /** Zielreihenfolge (Lesereihenfolge rechts → links). */
  letterIds: string[];
  /** Gemischte Bausteine zur Auswahl. */
  shuffledLetterIds: string[];
  /** Das fertige Wort als arabischer Text. */
  targetWord: string;
  explanation: string;
}

/** Buchstaben auf dem Canvas nachspuren. */
export interface WritingExercise extends ExerciseBase {
  type: 'writing';
  /** Zu schreibendes Zeichen (inkl. ZWJ, falls eine Form geübt wird). */
  targetChar: string;
  form: FormName;
  /** Trefferquote, ab der die Übung als bestanden gilt. */
  minScore: number;
  /** Hinweis zur Strichfolge auf Deutsch. */
  strokeHint: string;
}

export type Exercise = ChoiceExercise | ConnectExercise | WritingExercise;

// ---------------------------------------------------------------------------
// Fortschritt
// ---------------------------------------------------------------------------

/** Lernstand eines Items – wird abgeleitet, nicht gespeichert. */
export type Mastery = 'unknown' | 'seen' | 'practiced' | 'mastered';

/** Bewertung einer Antwort für das Spaced-Repetition-Verfahren. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** Pro Item gespeicherter Lern- und SRS-Zustand. */
export interface ItemProgress {
  itemId: string;
  /** Lernkarte wurde angesehen. */
  seen: boolean;
  correct: number;
  wrong: number;
  /** Aufeinanderfolgende richtige Antworten. */
  streak: number;
  /** Übungsarten, die mit diesem Item bestanden wurden. */
  clearedExercises: ExerciseType[];
  /** Beste Trefferquote der Schreibübung (0–1). */
  writingScore?: number;

  // --- SRS (SM-2-ähnlich) ---
  /** Leichtigkeitsfaktor, Start 2.5, begrenzt auf [1.3, 2.8]. */
  easiness: number;
  /** Aktuelles Intervall in Tagen. */
  intervalDays: number;
  /** Fälligkeitszeitpunkt (Epoch ms). */
  dueAt: number;
  lastReviewedAt?: number;
}

/** Nutzereinstellungen. */
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  /** Sprachausgabe aktiv. */
  ttsEnabled: boolean;
  /** Sprechgeschwindigkeit (0.5–1.5). */
  ttsRate: number;
  /** Tagesziel in XP. */
  dailyGoalXp: number;
}

/** Der komplette persistierte Zustand. */
export interface AppStateShape {
  /** Version des Speicherformats – Grundlage der Migrationen. */
  schemaVersion: number;
  xp: number;
  /** Aktuelle Tages-Serie. */
  streakDays: number;
  /** Längste je erreichte Serie. */
  longestStreak: number;
  /** Lokaler Kalendertag des letzten Lektionsabschlusses ("YYYY-MM-DD"). */
  lastLessonDay: string | null;
  /** Heute gesammelte XP – für das Tagesziel. */
  xpToday: number;
  completedLessonIds: string[];
  /** Lernstand je Item, Schlüssel = Item-ID. */
  items: Record<string, ItemProgress>;
  settings: Settings;
}
