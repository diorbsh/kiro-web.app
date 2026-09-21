# Design – Arabisch-Alphabet & Sprach-Lern-App

## 1. Überblick

Die App ist eine reine Client-Anwendung (React + TypeScript + Vite + Tailwind), die
ohne Backend läuft. Der Kern besteht aus drei entkoppelten Schichten:

```
┌─────────────────────────────────────────────────────────────┐
│  UI-Schicht (React, Tailwind, mobil-first, deutsche UI)      │
│  Screens · Lektions-Runner · Übungs-Komponenten · Canvas     │
└───────────────────────────┬─────────────────────────────────┘
                            │  Hooks / Context
┌───────────────────────────┴─────────────────────────────────┐
│  Domänen-Schicht (framework-unabhängiges TypeScript)         │
│  Übungs-Generator · SRS · Gamification · Progress · Audio    │
└───────────────────────────┬─────────────────────────────────┘
                            │  reine Daten
┌───────────────────────────┴─────────────────────────────────┐
│  Daten-Schicht (statische TS-Module)                         │
│  28 Buchstaben · Harakat · Lernpfad · Vokabeln (Phase 2)     │
└─────────────────────────────────────────────────────────────┘
                            │
                    localStorage (versioniert)
```

**Leitprinzip:** Die Domänen- und Daten-Schicht enthält keine React-Importe. Dadurch
ist sie mit `tsc` und Node ohne Browser testbar – wichtig, weil die Übungslogik und
der Buchstabenbestand die fehleranfälligsten Teile sind.

---

## 2. Wichtige Entscheidung vorab: Sandbox hat keinen npm-Zugang

In dieser Umgebung ist die Registry nicht erreichbar (`registry.npmjs.org` → 403,
Netzwerkmodus `INTEGRATIONS_ONLY`). Ich kann also **React/Vite/Tailwind hier nicht
installieren und den Build nicht ausführen**. Das ändert nichts am Zielbild, aber am
Verifikationsumfang. Zwei tragfähige Wege:

| | **Variante A – Vite-Projekt (empfohlen)** | **Variante B – Build-freie App** |
|---|---|---|
| Stack | React + TS + Vite + Tailwind, exakt wie gewünscht | Ein `index.html` + ES-Module, aus TS kompiliert, CSS handgeschrieben |
| Sofort nutzbar | erst nach `npm install` lokal | ja, Datei im Browser öffnen |
| Von mir hier prüfbar | Daten- und Domänenschicht per `tsc`/Node; UI nur per Review | vollständig, inkl. Klick-Test im Browser |
| Phase 2 / Wartung | ideal | mit mehr Eigenbau-Aufwand |

**Empfehlung: Variante A**, weil der Stack explizit gewünscht ist und Phase 2 damit
ohne Umbau wächst. Zur Absicherung:

- Domänen- und Datenschicht als `.ts` ohne JSX → mit der global vorhandenen
  TypeScript-Version typgeprüft und per Node-Testskript ausgeführt (28 Buchstaben,
  4 Formen, ≥2 Beispiele, SRS-Verhalten, Streak-Logik).
- `package.json` mit exakt gepinnten Versionen, `README.md` mit Startanleitung.
- Alle React-Dateien bewusst konservativ (keine exotischen APIs), damit
  `npm install && npm run dev` beim ersten Versuch durchläuft.

Zusätzlich liefere ich auf Wunsch am Ende einen statischen Build (`dist/`) nach, sobald
du einmal lokal `npm run build` ausführst – oder ich baue Variante B als Beigabe.

---

## 3. Tech-Stack und Projektstruktur

- **React 18 + TypeScript 5**, Build mit **Vite 5**
- **Tailwind CSS 3** (mobil-first, eigene Farb-/Font-Tokens)
- **Zustand über React Context + `useReducer`** – kein externes State-Management nötig,
  hält die Abhängigkeitsliste klein
- **Kein Router-Paket**: ein schlanker eigener View-Switch (`useState` + History-API),
  da die App nur ~8 Screens hat und als App-Shell funktioniert
- **Keine Animationsbibliothek**: Konfetti als eigenes Canvas-Modul (~60 Zeilen),
  restliche Animationen per CSS-Keyframes

```
src/
  data/
    letters.ts          # 28 Buchstaben (vollständig)
    harakat.ts          # Fatha, Kasra, Damma, Sukun
    lessons.ts          # Lernpfad: Gruppen → Lektionen
    vocab.ts            # Phase 2
  domain/
    arabic.ts           # Formen-Rendering, Joining-Regeln, Highlighting
    items.ts            # Item-Abstraktion über Buchstabe/Harakat/Vokabel
    exercises.ts        # Aufgaben-Generator (typisiert)
    srs.ts              # SM-2-ähnlicher Algorithmus
    gamification.ts     # XP, Level, Streak, Herzen
    progress.ts         # Lernstand-Berechnung, Freischaltung
    storage.ts          # Persistenz + Migration
  audio/
    speech.ts           # Web-Speech-Wrapper, Stimmen-Auswahl
  state/
    AppState.tsx        # Context, Reducer, Actions
    useLesson.ts        # Lektions-Runner-Hook
  components/
    shell/              # Layout, BottomNav, Header, SafeArea
    ui/                 # Button, Card, ProgressBar, Badge, Sheet
    arabic/             # ArabicText, LetterGlyph, FormsTable, WordWithHighlight
    exercises/          # AudioChoice, FormChoice, TranslitChoice,
                        # ConnectLetters, WritingCanvas
    feedback/           # Confetti, HeartBar, XpToast, LessonSummary
  screens/
    HomeScreen.tsx      # Lernpfad + Statusleiste
    LetterCardScreen.tsx
    LessonScreen.tsx
    AlphabetGridScreen.tsx
    ReviewScreen.tsx
    SettingsScreen.tsx
  styles/
    index.css           # Tailwind-Layer, @font-face, Arabic-Utilities
tests/                  # Node-Testskripte für data/ und domain/
public/
  fonts/                # NotoSansArabic (selbst hinzufügen, s. README)
  manifest.webmanifest
```

---

## 4. Datenmodell

Das Modell trennt **Inhalt** (statisch, ausgeliefert) von **Lernstand** (dynamisch,
gespeichert). Alle lernbaren Inhalte implementieren eine gemeinsame Basis, damit
Harakat und Vokabeln später ohne Umbau einhängen.

```ts
/** Was für ein Inhalt ist das Item? Erweiterbar ohne Änderung bestehender Typen. */
export type ItemKind = 'letter' | 'harakat' | 'vocab' | 'sentence';

/** Gemeinsame Basis aller lernbaren Einheiten. */
export interface LearnItemBase {
  id: string;              // stabil, z. B. "letter:baa", "harakat:baa+fatha"
  kind: ItemKind;
  arabic: string;          // anzuzeigender arabischer Text
  translit: string;        // Umschrift
  german: string;          // Bedeutung bzw. Name auf Deutsch
  ttsText?: string;        // abweichender Text für TTS (z. B. Beispielwort)
  tags?: string[];
}

/** Die vier Kontextformen eines Buchstaben. */
export interface LetterForms {
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

export interface ExampleWord {
  arabic: string;
  translit: string;
  german: string;
  /** Index des gelernten Buchstaben in `arabic` – für die Hervorhebung. */
  highlightIndex: number;
}

export interface Letter extends LearnItemBase {
  kind: 'letter';
  order: number;           // 1..28
  nameArabic: string;      // z. B. "باء"
  nameGerman: string;      // z. B. "Bā"
  pronunciation: string;   // deutscher Aussprachehinweis
  forms: LetterForms;
  /** false für ا د ذ ر ز و – verbindet nicht nach links. */
  connectsForward: boolean;
  examples: ExampleWord[];
  mnemonic: string;        // deutsche Eselsbrücke
  confusableWith: string[];// Letter-IDs, bevorzugte Distraktoren
  group: number;           // Lektionsgruppe
}

export type HarakatKind = 'fatha' | 'kasra' | 'damma' | 'sukun';

export interface HarakatMark {
  kind: HarakatKind;
  mark: string;            // U+064E / U+0650 / U+064F / U+0652
  nameGerman: string;
  vowelSound: string;      // "a", "i", "u", "—"
  description: string;
}

/** Buchstabe + Vokalzeichen als eigenständiges Item (Phase Harakat). */
export interface HarakatItem extends LearnItemBase {
  kind: 'harakat';
  letterId: string;
  harakat: HarakatKind;
}

/** Phase 2 – bereits im Modell vorgesehen, Inhalte kommen später. */
export interface VocabItem extends LearnItemBase {
  kind: 'vocab' | 'sentence';
  unitId: string;
  wordParts?: string[];    // für Lückentexte / Satzbau
  grammarNote?: string;
}

export type LearnItem = Letter | HarakatItem | VocabItem;
```

### Lernpfad

```ts
export type LessonKind =
  | 'letters'      // Lernkarten + Erkennung für eine Buchstabengruppe
  | 'writing'      // Schreibübung
  | 'connect'      // Buchstaben verbinden
  | 'harakat'
  | 'vocab'        // Phase 2
  | 'review';      // aus SRS gespeist

export interface Lesson {
  id: string;
  kind: LessonKind;
  title: string;           // deutsch
  subtitle?: string;
  itemIds: string[];       // Items dieser Lektion
  requires: string[];      // Lesson-IDs, die vorher abgeschlossen sein müssen
  xpReward: number;
  exerciseCount: number;   // Anzahl Aufgaben im Lauf
}
```

Gruppierung der 28 Buchstaben in 7 Gruppen à 4 Buchstaben, bewusst so sortiert, dass
formähnliche Buchstaben (ب ت ث / ج ح خ / د ذ / ر ز / س ش / ص ض / ط ظ / ع غ) gemeinsam
gelernt werden – das erzeugt automatisch sinnvolle Distraktoren. Nach je zwei
Buchstabengruppen folgt eine `connect`-Lektion, am Ende die vier Harakat-Lektionen.

### Lernstand

```ts
export type Mastery = 'unknown' | 'seen' | 'practiced' | 'mastered';

/** Pro Item gespeicherter Lern- und SRS-Zustand. */
export interface ItemProgress {
  itemId: string;
  seen: boolean;
  correct: number;
  wrong: number;
  streak: number;          // aufeinanderfolgende richtige Antworten
  /** Welche Übungsarten wurden mit diesem Item bestanden? */
  clearedExercises: ExerciseType[];
  writingScore?: number;   // beste Trefferquote 0..1
  // SRS (SM-2-ähnlich)
  easiness: number;        // Start 2.5
  intervalDays: number;
  dueAt: number;           // Epoch ms
  lastReviewedAt?: number;
}

export interface AppStateShape {
  schemaVersion: number;
  xp: number;
  streakDays: number;
  lastLessonDay: string | null;   // "YYYY-MM-DD" lokal
  dailyGoalXp: number;
  completedLessonIds: string[];
  items: Record<string, ItemProgress>;
  settings: {
    theme: 'light' | 'dark' | 'system';
    ttsEnabled: boolean;
    ttsRate: number;
    reducedMotion: boolean | null;   // null = System
  };
}
```

`Mastery` wird **abgeleitet**, nicht gespeichert – so bleibt die Regel an einer Stelle
änderbar:

| Stufe | Bedingung |
|---|---|
| `unknown` | nie gesehen |
| `seen` | Lernkarte angesehen |
| `practiced` | ≥ 3 korrekte Antworten |
| `mastered` | ≥ 5 korrekte, Genauigkeit ≥ 80 %, mind. 2 verschiedene Übungsarten bestanden |

---

## 5. Arabische Formen korrekt darstellen

Statt 112 Unicode-Präsentationsformen (U+FE80–FEFC) von Hand einzutragen – fehleranfällig
und typografisch schlechter – werden die Formen aus dem Grundbuchstaben mit
**Zero-Width Joiner** (U+200D) erzeugt. Die Font-Engine wählt dann selbst die richtige
Glyphe, inklusive korrekter Ligaturen:

```ts
const ZWJ = '\u200D';

/** Erzeugt die vier Kontextformen eines Buchstaben. */
export function buildForms(letter: string, connectsForward: boolean): LetterForms {
  return {
    isolated: letter,
    // "Anfang" = verbindet nach links (zum folgenden Buchstaben)
    initial: connectsForward ? letter + ZWJ : letter,
    // "Mitte" = beidseitig verbunden
    medial: connectsForward ? ZWJ + letter + ZWJ : ZWJ + letter,
    // "Ende" = verbindet nach rechts (zum vorangehenden Buchstaben)
    final: ZWJ + letter,
  };
}
```

Für die sechs nicht nach links verbindenden Buchstaben (ا د ذ ر ز و) entstehen so
automatisch die korrekten Darstellungen – die Anfangsform gleicht der isolierten, die
Mittelform der Endform. Die Lernkarte weist zusätzlich mit einem Hinweis darauf hin.

Für die Übung „Buchstaben verbinden" wird die Kette einfach konkateniert; das
Shaping übernimmt der Browser. Zur Vorschau eines Buchstaben in Wortmitte wird ein
neutraler Träger verwendet (z. B. `ـ` U+0640 Tatweel), damit die Form ohne Fremdglyphen
sichtbar wird.

**Hervorhebung in Beispielwörtern:** `WordWithHighlight` teilt das Wort an
`highlightIndex` in drei Segmente und rendert sie als drei `<span>` in einem
gemeinsamen RTL-Container. Da das Trennen die Shaping-Verbindung unterbrechen würde,
wird an den Schnittstellen ZWJ ergänzt – so bleibt die Schreibung verbunden und der
Buchstabe ist trotzdem einzeln einfärbbar.

---

## 6. Übungs-Engine

Aufgaben sind Daten, nicht Komponenten-Logik. Ein Generator erzeugt aus Items eine
Aufgabenliste; der `LessonScreen` rendert pro Typ die passende Komponente.

```ts
export type ExerciseType =
  | 'audioToLetter'      // Ton hören → Buchstabe wählen
  | 'formToLetter'       // Form im Wort → Grundbuchstabe wählen
  | 'letterToTranslit'   // Buchstabe → Umschrift
  | 'translitToLetter'   // Umschrift → Buchstabe
  | 'connectLetters'     // Buchstaben zu Wort verbinden
  | 'writing'            // Canvas-Schreibübung
  | 'harakatToSound'     // Kombination → Laut
  | 'soundToHarakat'
  // Phase 2
  | 'deToAr' | 'arToDe' | 'matchPairs' | 'clozeGap' | 'listening';

interface ExerciseBase { id: string; type: ExerciseType; itemId: string; prompt: string; }

export interface ChoiceExercise extends ExerciseBase {
  type: 'audioToLetter' | 'formToLetter' | 'letterToTranslit'
      | 'translitToLetter' | 'harakatToSound' | 'soundToHarakat'
      | 'deToAr' | 'arToDe';
  /** Darstellungsart der Frage, damit die Komponente generisch bleibt. */
  promptMode: 'audio' | 'arabic' | 'latin';
  promptArabic?: string;
  options: { id: string; label: string; isArabic: boolean }[];
  correctOptionId: string;
  explanation: string;     // deutsch, bei falscher Antwort
}

export interface ConnectExercise extends ExerciseBase {
  type: 'connectLetters';
  letterIds: string[];     // Zielreihenfolge (Lesereihenfolge rechts→links)
  shuffledLetterIds: string[];
}

export interface WritingExercise extends ExerciseBase {
  type: 'writing';
  targetChar: string;
  form: keyof LetterForms;
  minScore: number;        // Schwellwert, z. B. 0.55
}

export type Exercise = ChoiceExercise | ConnectExercise | WritingExercise;
```

**Distraktor-Auswahl** (`pickDistractors`), nach Priorität:
1. Items aus `confusableWith` des Ziel-Items,
2. Items aus derselben Lektionsgruppe,
3. bereits gelernte Items,
4. beliebige Items als Auffüllung.

Dedupliziert, gemischt, Ziel-Item an zufälliger Position. Ein fester Seed ist optional
möglich, damit Tests deterministisch laufen.

**Lektions-Runner** (`useLesson`) als endlicher Automat:

```
        ┌──────────┐  antworten   ┌──────────┐
  start │ question  │ ───────────▶ │ feedback │
   ───▶ └──────────┘              └────┬─────┘
             ▲   ▲                     │ weiter
             │   └─────────────────────┘
   falsch → Item an Warteschlange anhängen, Herz −1
             │
       Herzen = 0  ──▶ ┌────────┐      alle Aufgaben fertig ──▶ ┌─────────┐
                       │ failed │                               │ summary │
                       └────────┘                               └─────────┘
```

Falsch beantwortete Items werden in derselben Lektion erneut gestellt (Position: nach
zwei weiteren Aufgaben) und zusätzlich im SRS zurückgesetzt.

---

## 7. Spaced Repetition (SM-2-ähnlich)

Bewusst einfach gehalten und framework-frei, damit es Buchstaben, Harakat und später
Vokabeln gleich behandelt:

```ts
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export function schedule(p: ItemProgress, grade: Grade, now: number): ItemProgress {
  if (grade === 'again') {
    // Fehler: Intervall zurücksetzen, in ~10 Minuten wieder fällig
    return { ...p, streak: 0, easiness: Math.max(1.3, p.easiness - 0.2),
             intervalDays: 0, dueAt: now + 10 * 60_000 };
  }
  const q = grade === 'hard' ? 3 : grade === 'good' ? 4 : 5;
  const easiness = clamp(p.easiness + (0.1 - (5 - q) * 0.08), 1.3, 2.8);
  const streak = p.streak + 1;
  const intervalDays =
    streak === 1 ? 1 : streak === 2 ? 3 : Math.round(p.intervalDays * easiness);
  return { ...p, streak, easiness, intervalDays,
           dueAt: now + intervalDays * 86_400_000, lastReviewedAt: now };
}
```

Im Alphabet-MVP wird die Note automatisch abgeleitet (richtig beim ersten Versuch =
`good`, richtig nach Fehler = `hard`, falsch = `again`), damit der Nutzer sich nicht
selbst bewerten muss. Der Wiederholen-Modus zieht Items mit `dueAt <= now`, sortiert
nach Fälligkeit und Fehlerquote.

---

## 8. Gamification

- **XP:** 10 pro korrekter Erstantwort, 4 nach Korrektur, `xpReward` pro
  Lektionsabschluss, +20 Bonus bei fehlerfreier Lektion.
- **Level:** `level = floor(sqrt(xp / 50)) + 1`; Fortschrittsbalken aus XP-Differenz
  zur nächsten Schwelle. Wächst angenehm langsam ohne Tabellen.
- **Streak:** verglichen werden **lokale Kalendertage** (`YYYY-MM-DD`, nicht UTC, um
  Zeitzonensprünge zu vermeiden). Abschluss heute = gleicher Tag → unverändert;
  gestern → +1; älter → zurück auf 1.
- **Herzen:** 5 pro Lektionslauf, nur im Lauf gültig (nicht persistiert) – vermeidet
  die frustrierende „Warten auf Leben"-Mechanik.
- **Konfetti:** eigenes Canvas-Modul, ~150 Partikel, ~1,2 s, bricht sofort ab bei
  `prefers-reduced-motion`.

---

## 9. Audio (Web Speech API)

```ts
class SpeechService {
  /** Stimmen-Auswahl: ar-SA > ar-* > null. Stimmen laden asynchron (Chrome). */
  private pickVoice(): SpeechSynthesisVoice | null;
  get status(): 'ready' | 'no-arabic-voice' | 'unsupported';
  speak(text: string, opts?: { rate?: number }): void;
  cancel(): void;
}
```

Besonderheiten, die berücksichtigt werden:
- `voiceschanged` abwarten, sonst ist die Stimmenliste beim ersten Aufruf leer.
- Einzelne Buchstaben werden von TTS teils verschluckt; deshalb wird für
  `audioToLetter` der **Buchstabenname** gesprochen (z. B. „باء") statt des nackten
  Zeichens. Das ist zudem didaktisch richtig.
- Status `no-arabic-voice` blendet Audio-Aufgaben aus dem Generator aus, damit keine
  unlösbaren Aufgaben entstehen – stattdessen mehr Formen- und Umschrift-Aufgaben.
- Auf iOS ist Sprachausgabe nur nach einer Nutzerinteraktion erlaubt; der erste
  Tap in der App „entsperrt" die Ausgabe mit einer leeren Äußerung.

---

## 10. Schreibübung auf Canvas

**Aufbau:** zwei Canvas-Ebenen plus ein Offscreen-Canvas.

1. `guide` – gestrichelte Umriss-Vorlage des Zielzeichens, Startpunkt-Marker und
   Richtungspfeil (rechts → links).
2. `ink` – die Striche des Nutzers.
3. `mask` (offscreen) – dasselbe Zeichen als gefüllte, leicht verdickte Maske für die
   Bewertung.

**Zeichnen:** Pointer-Events (`pointerdown/move/up`, `touch-action: none`), Punkte je
Strich gesammelt, Rendering mit quadratischen Bézier-Segmenten durch die
Punkt-Mittelwerte → glatte Linien ohne Bibliothek. Canvas wird mit
`devicePixelRatio` skaliert.

**Vorlage & Bewertung ohne handgezeichnete SVG-Pfade:** Das Zielzeichen wird mit
`ctx.font = '<size>px "Noto Sans Arabic"'` gerendert – `strokeText` mit `setLineDash`
für die Vorlage, `fillText` mit dickem `strokeText`-Rand in die Maske. Die Bewertung
liest beide Bitmaps per `getImageData`:

```
coverage = (Vorlagenpixel, die übermalt wurden) / (Vorlagenpixel gesamt)
spill    = (gezeichnete Pixel außerhalb der Maske) / (gezeichnete Pixel gesamt)
score    = clamp(coverage - 0.5 * spill, 0, 1)
```

Das ist keine Handschrifterkennung, bewertet aber zuverlässig, ob der Nutzer der Form
gefolgt ist – und funktioniert für alle 28 Buchstaben ohne Extra-Daten. Bestanden ab
`score >= 0.55`; die Bewertung ist immer überspringbar (Requirement 3.8).

Ein Hinweis in der UI nennt die Strichfolge grob („erst den Grundstrich von rechts nach
links, dann die Punkte"), da Punkte diakritisch zuletzt gesetzt werden.

---

## 11. Oberfläche und Screens

```
HomeScreen                 Lernpfad (Lektionskarten mit Status), Kopfzeile mit
                           Streak · XP · Level · Tagesziel
 ├─ LetterCardScreen       Lernkarte(n) einer Gruppe, horizontal durchblättern
 ├─ LessonScreen           Lektions-Runner: Herzen, Fortschrittsbalken, Aufgabe,
 │                         Feedback-Leiste, Abschluss-Ansicht
 ├─ AlphabetGridScreen     28er-Raster, Farbe = Mastery, Tap → Lernkarte
 ├─ ReviewScreen           Wiederholen (fällige + fehlerhafte Items)
 └─ SettingsScreen         Theme, TTS, Tagesziel, Export/Import, Zurücksetzen
```

Navigation über eine Bottom-Nav (Lernen · Alphabet · Wiederholen · Profil). Views
werden über einen kleinen eigenen Switch mit `history.pushState` verwaltet, sodass die
Zurück-Taste des Handys funktioniert.

**Layout/Styling:**
- Tailwind mit eigenen Tokens: Font-Family `arabic`, Größen `text-glyph`
  (96 px) / `text-glyph-lg` (140 px), Farbpalette für Mastery-Stufen.
- Arabische Textbausteine ausschließlich über `<ArabicText>` – setzt `dir="rtl"`,
  `lang="ar"`, die Arabic-Font und optische Zeilenhöhe an einer Stelle.
- Mobile Shell: `100dvh`, `env(safe-area-inset-*)`, Touch-Ziele ≥ 44 px,
  `overscroll-behavior: contain`, `user-select: none` in Übungen.
- Dark Mode über `class`-Strategie, Systemvorgabe als Standard.
- Schrift: `@font-face` auf `public/fonts/NotoSansArabic-*.woff2` mit
  `font-display: swap`; fehlt die Datei, greift die Kette
  `"Noto Sans Arabic", "Geeza Pro", "Segoe UI Arabic", "Traditional Arabic", serif`.
  Der Download-Befehl steht im README (in dieser Sandbox ist kein Netz verfügbar).

---

## 12. Persistenz

- Ein Schlüssel `arabic-trainer:v1` in `localStorage`, Inhalt = `AppStateShape`.
- Schreiben **gebündelt**: Reducer-Änderungen werden mit einem 300-ms-Debounce
  persistiert, zusätzlich sofort bei `visibilitychange`/`pagehide`.
- Laden: JSON-Parse in `try/catch`; bei Fehler oder unbekannter `schemaVersion`
  → Default-State (und Backup des Rohwerts unter `…:corrupt` zur Diagnose).
- Migrationen als Kette `migrations[from] → to`, damit Phase 2 Felder ergänzen kann,
  ohne Fortschritt zu zerstören.
- Export/Import als `.json`-Datei über Blob-Download bzw. File-Input, mit Validierung
  vor dem Übernehmen.

---

## 13. Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| Kein Web-Speech-Support | Audio-Aufgaben deaktiviert, Hinweis in Einstellungen |
| Keine arabische Stimme | Audio optional, Generator meidet Audio-Aufgaben |
| `localStorage` blockiert (Privatmodus) | In-Memory-Fallback, einmaliger Hinweis |
| Beschädigter Speicher | Default-State, Rohwert als Backup |
| Canvas-Kontext nicht verfügbar | Schreibübung wird übersprungen statt Absturz |
| Unerwarteter Render-Fehler | `ErrorBoundary` mit deutscher Meldung + Neu-laden |
| Arabische Glyphen fehlen (Font) | System-Font-Kette, Hinweis im README |

---

## 14. Teststrategie

Da der Browser-Stack hier nicht installierbar ist, liegt der prüfbare Schwerpunkt auf
der framework-freien Logik. Testskripte laufen mit Node (`node --test`) ohne weitere
Abhängigkeiten:

1. **Datenintegrität:** genau 28 Buchstaben, eindeutige IDs, `order` 1–28 lückenlos,
   4 Formen vorhanden, ≥ 2 Beispiele pro Buchstabe, `highlightIndex` liegt im Wort und
   zeigt tatsächlich auf den Buchstaben, Mnemonic nicht leer, `confusableWith`
   verweist nur auf existierende IDs.
2. **Formenlogik:** `buildForms` für verbindende und nicht verbindende Buchstaben,
   ZWJ-Platzierung, Wort-Konkatenation.
3. **Übungs-Generator:** immer 4 Optionen, Ziel enthalten, keine Duplikate,
   Distraktor-Priorität greift, Audio-Aufgaben nur bei verfügbarer Stimme.
4. **SRS:** Fehler setzt Intervall zurück; Intervalle wachsen 1 → 3 → ×easiness;
   `easiness` bleibt in [1.3, 2.8].
5. **Gamification:** Streak über Tagesgrenzen (heute/gestern/älter, Monatswechsel),
   Level-Schwellen, XP-Vergabe.
6. **Persistenz:** Round-Trip, defekter JSON-Wert, Migration von v0.
7. **Manuell (vom Nutzer):** pro Aufgabe liefere ich eine kurze Testanleitung –
   Schreibfläche mit Maus und Touch, RTL-Darstellung, TTS, Zurück-Taste, Dark Mode.

---

## 15. Umsetzung in Phasen

1. **MVP (Alphabet-Trainer):** Setup, Daten, Persistenz, Gamification, Lernkarten,
   Schreibübung, Erkennungsübungen, Verbinden, Fortschrittsraster.
2. **Harakat:** vier Lektionen, zwei zusätzliche Aufgabentypen.
3. **Phase 2 (Vokabeln):** `vocab.ts` füllen, vier weitere Aufgabentypen, Lernpfad
   erweitern. Domänen-Schicht bleibt unverändert – nur Daten und
   Übungs-Komponenten kommen hinzu.
