# Implementierungsplan – Arabisch-Alphabet & Sprach-Lern-App

Reihenfolge: erst Daten und Logik (hier prüfbar), dann UI, dann Politur. Nach jeder
Aufgabe folgt eine kurze Testanleitung.

---

## Phase 1 – Fundament

- [x] 1. Projekt-Setup (Vite + React + TS + Tailwind)
  - `package.json` mit gepinnten Versionen, `vite.config.ts`, `tsconfig.json`
  - Tailwind-Konfiguration mit eigenen Tokens (Arabic-Font, Glyph-Größen,
    Mastery-Farben), Dark Mode über `class`
  - `index.html` mit `lang="de"`, Viewport inkl. `viewport-fit=cover`, Manifest
  - `styles/index.css`: Tailwind-Layer, `@font-face` mit System-Fallback-Kette,
    Arabic-Utilities, Safe-Area-Helfer
  - `README.md` mit Start-, Build- und Font-Download-Anleitung
  - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.7, 12.1, 12.3_

- [x] 2. Kern-Typen und Formenlogik
  - `domain/types.ts`: `LearnItemBase`, `Letter`, `HarakatItem`, `VocabItem`, `Lesson`,
    `ItemProgress`, `AppStateShape`, `Exercise`-Typen
  - `domain/arabic.ts`: `buildForms`, `joinLetters`, `splitForHighlight`,
    `withTatweel`, Joining-Regeln
  - `domain/items.ts`: Item-Registry über alle Arten, `getItem(id)`, `getItemsByKind`
  - _Requirements: 1.3, 1.4, 5.3, 5.6, 9.6_

- [x] 3. Buchstaben-Daten: alle 28 Buchstaben
  - `data/letters.ts` vollständig: Namen, Umschrift, Aussprache, 4 Formen,
    ≥ 2 Beispielwörter mit `highlightIndex`, deutsche Merkhilfe, `confusableWith`,
    Gruppen-Zuordnung
  - `data/lessons.ts`: 7 Buchstabengruppen, `connect`-Lektionen, Freischaltketten
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 7.1, 7.3_

- [x] 4. Datenintegritäts-Test
  - `tests/data.test.mjs`: 28 Einträge, eindeutige IDs, `order` lückenlos, 4 Formen,
    ≥ 2 Beispiele, `highlightIndex` zeigt auf den richtigen Buchstaben,
    `confusableWith` referenziert existierende IDs, Lektionen referenzieren nur
    existierende Items
  - _Requirements: 1.8_

- [x] 5. Persistenz mit Migration
  - `domain/storage.ts`: Default-State, Laden mit `try/catch`, Schema-Version,
    Migrationskette, gebündeltes Schreiben (Debounce + `pagehide`),
    In-Memory-Fallback, Export/Import
  - `tests/storage.test.mjs`: Round-Trip, defekter JSON-Wert, Migration
  - _Requirements: 10.1–10.7_

- [x] 6. Gamification-Engine
  - `domain/gamification.ts`: XP-Vergabe, Level aus XP, Streak über lokale
    Kalendertage, Herzen-Budget, Tagesziel
  - `tests/gamification.test.mjs`: Streak heute/gestern/älter/Monatswechsel,
    Level-Schwellen, XP-Regeln
  - _Requirements: 8.1–8.5, 8.8_

- [x] 7. Fortschritt und SRS
  - `domain/progress.ts`: `Mastery`-Ableitung, Freischaltung von Lektionen,
    Auswahl fälliger Items für den Wiederholen-Modus
  - `domain/srs.ts`: SM-2-ähnlicher Algorithmus, automatische Notenableitung
  - `tests/srs.test.mjs`, `tests/progress.test.mjs`
  - _Requirements: 7.3, 7.5, 7.6, 9.3, 9.4_

- [x] 8. Übungs-Generator
  - `domain/exercises.ts`: Generatoren für `audioToLetter`, `formToLetter`,
    `letterToTranslit`, `translitToLetter`, `connectLetters`, `writing`;
    `pickDistractors` mit Prioritätsregeln; Mischen mit optionalem Seed;
    Ausblenden von Audio-Aufgaben ohne arabische Stimme
  - `tests/exercises.test.mjs`: 4 Optionen, Ziel enthalten, keine Duplikate,
    Distraktor-Priorität, Determinismus mit Seed
  - _Requirements: 4.1–4.4, 4.7, 5.1_

---

## Phase 2 – Oberfläche

- [ ] 9. App-Shell, State-Container und Navigation
  - `state/AppState.tsx`: Context + Reducer, Actions, Anbindung an `storage`
  - `components/shell/`: Layout, Header (Streak · XP · Level · Tagesziel),
    BottomNav, Safe-Area, `ErrorBoundary`
  - View-Switch mit `history.pushState` (Zurück-Taste des Handys)
  - Theme-Umschaltung hell/dunkel/System
  - _Requirements: 10.2, 11.3, 11.4, 11.7, 13 (ErrorBoundary)_

- [ ] 10. Arabische Darstellungs-Komponenten
  - `components/arabic/`: `ArabicText` (dir/lang/Font an einer Stelle),
    `LetterGlyph`, `FormsTable` (4 Formen mit deutscher Beschriftung),
    `WordWithHighlight` (ZWJ-erhaltende Hervorhebung)
  - `components/ui/`: Button, Card, ProgressBar, Badge, Sheet
  - _Requirements: 2.5, 2.6, 11.1, 11.6_

- [ ] 11. Audio-Service
  - `audio/speech.ts`: Stimmen-Auswahl mit `voiceschanged`, Status
    (`ready`/`no-arabic-voice`/`unsupported`), iOS-Entsperrung beim ersten Tap,
    Buchstabennamen statt Einzelzeichen sprechen
  - `useSpeech`-Hook, Audio-Buttons mit Ladezustand
  - _Requirements: 2.3, 2.4, 2.8, 12.4_

- [ ] 12. Lernkarte pro Buchstabe
  - `screens/LetterCardScreen.tsx`: großer Glyph, Name, Umschrift,
    Aussprachehinweis, Audio, 4 Formen, Beispielwörter mit Hervorhebung und Audio,
    Merkhilfe, Hinweis bei nicht verbindenden Buchstaben; Wischen zwischen Karten
  - Markiert Items als `seen`
  - _Requirements: 2.1–2.8, 1.4_

- [ ] 13. Lektions-Runner
  - `state/useLesson.ts`: Automat (question → feedback → …, failed, summary),
    Warteschlange für falsche Items, Herzen, XP, SRS-Update
  - `screens/LessonScreen.tsx`: Fortschrittsbalken, Herzen-Leiste,
    Feedback-Leiste mit Erklärung, Abschlussansicht (XP, Genauigkeit, Streak),
    Neustart bei 0 Herzen
  - _Requirements: 4.5, 4.6, 7.7, 7.8, 8.1, 8.6_

- [ ] 14. Erkennungs-Übungs-Komponenten
  - `AudioChoice`, `FormChoice`, `TranslitChoice` auf Basis einer gemeinsamen
    `ChoiceGrid`-Komponente; Tastatur (1–4, Enter) und Touch; zufällige Anordnung
  - _Requirements: 4.1–4.3, 4.7, 4.8_

- [ ] 15. Schreib-Übung auf Canvas
  - `components/exercises/WritingCanvas.tsx`: Pointer-Events, DPR-Skalierung,
    geglättete Striche, gestrichelte Vorlage, Startpunkt + Richtungspfeil (RTL),
    Rückgängig/Löschen, Bewertung über Maskenvergleich (coverage/spill),
    Bestehens-Schwelle, „Überspringen"
  - _Requirements: 3.1–3.8_

- [ ] 16. Buchstaben verbinden
  - `components/exercises/ConnectLetters.tsx`: antippbare Bausteine, Live-Rendering
    des verbundenen Worts in RTL, letzten Buchstaben entfernen, Auswertung,
    korrekte Darstellung nicht verbindender Buchstaben
  - _Requirements: 5.1–5.6_

- [ ] 17. Lernpfad und Fortschrittsraster
  - `screens/HomeScreen.tsx`: Lektionsliste mit Status gesperrt/offen/abgeschlossen
  - `screens/AlphabetGridScreen.tsx`: 28er-Raster mit Mastery-Farben, Legende,
    Tap → Lernkarte
  - `screens/ReviewScreen.tsx`: Wiederholen-Modus aus fälligen/fehlerhaften Items
  - _Requirements: 7.2, 7.4, 7.6_

- [ ] 18. Feedback und Animationen
  - `components/feedback/Confetti.tsx` (eigenes Canvas-Modul), XP-Toast,
    Erfolgs-/Fehler-Animationen per CSS, `prefers-reduced-motion` respektieren
  - _Requirements: 8.6, 8.7_

- [ ] 19. Einstellungen
  - `screens/SettingsScreen.tsx`: Theme, TTS an/aus + Tempo, Tagesziel,
    Export/Import, Zurücksetzen mit Bestätigung, Hinweise bei fehlender
    Sprachunterstützung
  - _Requirements: 10.5, 10.6, 11.7, 13_

---

## Phase 3 – Harakat

- [ ] 20. Harakat-Daten und Lektionen
  - `data/harakat.ts`: Fatha, Kasra, Damma, Sukun; Kombinationen mit gelernten
    Buchstaben; Freischaltung nach den Buchstaben-Lektionen
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 21. Harakat-Übungen
  - Aufgabentypen `harakatToSound` und `soundToHarakat` im Generator und als
    Komponenten; Anbindung an Progress und Gamification
  - _Requirements: 6.3, 6.5_

---

## Phase 4 – Vokabeln & Sätze

- [ ] 22. Vokabel-Daten und Einheiten
  - `data/vocab.ts`: erste Einheiten (Wörter → kurze Sätze → Grammatikhinweise),
    Lernpfad-Erweiterung
  - _Requirements: 9.1_

- [ ] 23. Vokabel-Übungstypen
  - `deToAr`/`arToDe` (Multiple Choice), `matchPairs` (Wortpaare),
    `clozeGap` (Lückentext), `listening` (TTS), Schreibübung wiederverwenden
  - _Requirements: 9.2, 9.6_

- [ ] 24. Wiederholen über alle Module
  - Wiederholen-Modus auf Buchstaben, Harakat und Vokabeln erweitern, Statistiken
  - _Requirements: 9.5, 7.6_

---

## Phase 5 – Politur

- [ ] 25. PWA und Offline
  - Manifest, Icons, einfacher Service Worker (App-Shell-Cache), Installierbarkeit
  - _Requirements: 11.5, 12.1, 12.2_

- [ ] 26. Barrierefreiheit und Abschluss
  - Fokuszustände, ARIA-Beschriftungen, `lang="ar"` für arabische Zeichen,
    Kontrastprüfung, Tastatur-Durchlauf einer kompletten Lektion
  - Gesamttestlauf, README-Abschluss (manuelle Testanleitung)
  - _Requirements: 11.6_
