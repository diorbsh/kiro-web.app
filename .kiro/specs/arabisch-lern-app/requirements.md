# Requirements – Arabisch-Alphabet & Sprach-Lern-App

## Einleitung

Eine mobil-first Web-App zum Erlernen der arabischen Schrift und Sprache, spielerisch
aufgebaut (Duolingo-Stil, kleine Lektionen). Der MVP ist ein **vollständiger
Alphabet-Trainer** für alle 28 Buchstaben inkl. Lernkarten, Schreibübung,
Erkennungsübungen, Fortschrittsanzeige sowie XP und Streak. Vokabeln/Sätze und die
Vokalzeichen (Harakat) folgen als Phase 2, müssen aber ohne Umbau des Datenmodells
ergänzbar sein.

Die UI-Sprache ist durchgehend **Deutsch**; arabische Inhalte werden in korrekter
RTL-Darstellung und großer, gut lesbarer Typografie gezeigt. Es gibt kein Backend,
keinen Login und keine API-Keys – alle Daten liegen lokal im Client.

## Glossar

| Begriff | Bedeutung |
|---|---|
| **Item** | Kleinste lernbare Einheit (Buchstabe, Harakat-Kombination, Vokabel, Satz) |
| **Lektion** | Kurze Übungssequenz aus mehreren Aufgaben zu einer Item-Gruppe |
| **Aufgabe (Exercise)** | Einzelne Interaktion innerhalb einer Lektion (z. B. eine Multiple-Choice-Frage) |
| **Form** | Kontextvariante eines Buchstaben: isoliert, initial, medial, final |
| **Harakat** | Kurzvokalzeichen: Fatha, Kasra, Damma, Sukun |
| **Herzen** | Fehlerbudget innerhalb einer Lektion |
| **Streak** | Anzahl aufeinanderfolgender Tage mit mindestens einer abgeschlossenen Lektion |

---

## Requirement 1: Buchstaben-Datenbestand

**User Story:** Als Lernender möchte ich zu jedem der 28 arabischen Buchstaben
vollständige, korrekte Lerninformationen sehen, damit ich das Alphabet verlässlich
lernen kann.

### Acceptance Criteria

1. Die App SOLL Daten zu genau 28 Buchstaben des arabischen Alphabets enthalten
   (ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي).
2. Jeder Buchstabe SOLL enthalten: Unicode-Zeichen, arabischen Namen, deutsche
   Namens-Umschrift (z. B. „Bā"), phonetische Umschrift (DMG/ALA-LC-nah),
   Aussprachehinweis auf Deutsch.
3. Jeder Buchstabe SOLL alle vier Formen als darstellbare Zeichenketten bereitstellen:
   isoliert, am Wortanfang, in der Wortmitte, am Wortende.
4. WENN ein Buchstabe nicht nach links verbindet (ا د ذ ر ز و), DANN SOLL die App
   dies als Eigenschaft kennzeichnen UND die initiale/mediale Form entsprechend
   korrekt (nicht verbunden) darstellen.
5. Jeder Buchstabe SOLL mindestens **2 Beispielwörter** enthalten, jeweils mit
   arabischer Schreibweise, Umschrift, deutscher Bedeutung und der Zeichen-Position
   des gelernten Buchstaben zur Hervorhebung.
6. Jeder Buchstabe SOLL eine kurze deutsche Merkhilfe (Eselsbrücke) enthalten.
7. Jeder Buchstabe SOLL Metadaten zur Gruppierung tragen: Reihenfolge-Index,
   Lerngruppen-Zuordnung und optional eine Liste verwechslungsgefährdeter Buchstaben
   (z. B. ب/ت/ث), die bevorzugt als Distraktoren verwendet werden.
8. Ein automatisierter Check SOLL die Vollständigkeit und Konsistenz der Daten
   verifizieren (28 Einträge, 4 Formen, ≥2 Beispiele, eindeutige IDs).

---

## Requirement 2: Lernkarte pro Buchstabe

**User Story:** Als Lernender möchte ich pro Buchstabe eine übersichtliche Lernkarte,
damit ich Aussehen, Klang und Verwendung in einem Schritt erfassen kann.

### Acceptance Criteria

1. Die Lernkarte SOLL den isolierten Buchstaben groß (mind. 96 px Schriftgröße) und
   den Namen anzeigen.
2. Die Lernkarte SOLL die Umschrift und einen Aussprachehinweis auf Deutsch anzeigen.
3. WENN der Nutzer die Audio-Schaltfläche auslöst, DANN SOLL die App den Buchstaben
   per Web Speech API mit arabischer Stimme vorlesen.
4. WENN keine arabische Stimme verfügbar ist, DANN SOLL die App einen dezenten
   Hinweis anzeigen UND die Karte ohne Audio weiterhin nutzbar halten.
5. Die Lernkarte SOLL alle vier Formen mit deutscher Beschriftung („isoliert",
   „Anfang", „Mitte", „Ende") in RTL-korrekter Darstellung zeigen.
6. Die Lernkarte SOLL die Beispielwörter zeigen UND darin den gelernten Buchstaben
   farblich hervorheben.
7. Die Lernkarte SOLL die Merkhilfe anzeigen.
8. WENN der Nutzer ein Beispielwort auslöst, DANN SOLL das Wort per TTS vorgelesen
   werden.

---

## Requirement 3: Schreib-Übung (Canvas)

**User Story:** Als Lernender möchte ich Buchstaben mit Finger oder Maus nachspuren,
damit ich die Schreibbewegung und die Schreibrichtung verinnerliche.

### Acceptance Criteria

1. Die App SOLL eine Zeichenfläche anzeigen, die Eingaben per Maus, Touch und Stift
   über Pointer-Events verarbeitet.
2. Die Zeichenfläche SOLL den zu übenden Buchstaben als gestrichelte Vorlage im
   Hintergrund anzeigen.
3. Die Zeichenfläche SOLL Richtungspfeile bzw. Startpunkt-Marker anzeigen, die die
   Schreibrichtung von rechts nach links verdeutlichen.
4. Die Zeichenfläche SOLL flüssige, geglättete Linien zeichnen und auf
   High-DPI-Displays scharf darstellen.
5. Die App SOLL Aktionen „Rückgängig" (letzter Strich) und „Löschen" (alles) anbieten.
6. Die App SOLL nach Abschluss eine Trefferquote berechnen, indem sie die gezeichneten
   Pixel gegen die Glyphen-Maske der Vorlage abgleicht (Abdeckung der Vorlage und
   Anteil außerhalb der Vorlage).
7. WENN die Trefferquote einen Schwellwert erreicht, DANN SOLL die Übung als
   bestanden gewertet werden, ANDERNFALLS SOLL ein erneuter Versuch angeboten werden.
8. Die Schreibübung SOLL ohne Bewertung fortsetzbar sein („Überspringen"), damit die
   Bewertung niemals blockiert.

---

## Requirement 4: Erkennungs-Übungen

**User Story:** Als Lernender möchte ich abwechslungsreiche Erkennungsaufgaben, damit
ich Buchstaben sicher unterscheiden und zuordnen kann.

### Acceptance Criteria

1. Die App SOLL den Aufgabentyp „Audio → Buchstabe" anbieten: Ton abspielen, aus
   vier Buchstaben-Optionen wählen.
2. Die App SOLL den Aufgabentyp „Form im Wort → Buchstabe" anbieten: eine
   Buchstabenform in einem Wortkontext zeigen, den passenden Grundbuchstaben wählen.
3. Die App SOLL den Aufgabentyp „Buchstabe → Umschrift" anbieten (und umgekehrt).
4. Distraktoren SOLLEN bevorzugt aus der Liste verwechslungsgefährdeter Buchstaben
   und aus bereits gelernten Buchstaben gezogen werden.
5. WENN eine Antwort korrekt ist, DANN SOLL die App unmittelbar positives Feedback
   (Farbe, Animation, Ton optional) geben UND XP vergeben.
6. WENN eine Antwort falsch ist, DANN SOLL die App die richtige Lösung mit kurzer
   Erklärung zeigen UND ein Herz abziehen UND das Item für die Wiederholung
   innerhalb der Lektion vormerken.
7. Antwortoptionen SOLLEN pro Aufgabe zufällig angeordnet werden.
8. Die Aufgaben SOLLEN per Tastatur (1–4, Enter) und per Touch bedienbar sein.

---

## Requirement 5: Buchstaben verbinden

**User Story:** Als Lernender möchte ich Buchstaben zu Wörtern zusammensetzen, damit
ich die Formen im Kontext beherrsche.

### Acceptance Criteria

1. Die App SOLL eine Aufgabe anbieten, bei der 2–4 vorgegebene Buchstaben in
   korrekter Reihenfolge zu einem verbundenen (Pseudo-)Wort zusammengesetzt werden.
2. Die Aufgabe SOLL die Buchstaben als antippbare Bausteine in der isolierten Form
   anbieten UND das Ergebnis live als verbundene Schrift in RTL rendern.
3. WENN ein Buchstabe gesetzt wird, DANN SOLL die App die resultierende Form korrekt
   nach Position (initial/medial/final) darstellen.
4. Die App SOLL das Entfernen des letzten gesetzten Buchstaben erlauben.
5. WENN die Reihenfolge korrekt ist, DANN SOLL die App die Aufgabe als bestanden
   werten, ANDERNFALLS die korrekte Reihenfolge zeigen.
6. WENN ein nicht-verbindender Buchstabe (ا د ذ ر ز و) enthalten ist, DANN SOLL die
   Darstellung die Unterbrechung der Verbindung korrekt abbilden.

---

## Requirement 6: Vokalzeichen (Harakat)

**User Story:** Als Lernender möchte ich nach den Buchstaben die Vokalzeichen lernen,
damit ich vokalisierten Text lesen kann.

### Acceptance Criteria

1. Die App SOLL Lektionen für Fatha, Kasra, Damma und Sukun bereitstellen.
2. Jede Harakat-Lektion SOLL Kombinationen aus bereits gelerntem Buchstaben +
   Vokalzeichen zeigen (z. B. بَ = „ba") mit Umschrift und Audio.
3. Die App SOLL Erkennungsaufgaben „Kombination → Laut" und „Laut → Kombination"
   anbieten.
4. Harakat-Lektionen SOLLEN erst freigeschaltet werden, wenn die Buchstaben-Lektionen
   abgeschlossen sind.
5. Harakat-Items SOLLEN dasselbe Progress- und Gamification-System nutzen wie
   Buchstaben-Items.

---

## Requirement 7: Lernpfad, Lektionen und Fortschritt

**User Story:** Als Lernender möchte ich einen klaren Lernpfad mit sichtbarem
Fortschritt, damit ich weiß, was als Nächstes kommt und was ich erreicht habe.

### Acceptance Criteria

1. Die App SOLL die 28 Buchstaben in aufeinander aufbauende Lektionsgruppen
   (ca. 4 Buchstaben pro Gruppe) gliedern.
2. Die Startseite SOLL den Lernpfad als Abfolge von Lektionen mit Status
   (gesperrt / offen / abgeschlossen) darstellen.
3. WENN eine Lektion abgeschlossen ist, DANN SOLL die nächste Lektion freigeschaltet
   werden.
4. Die App SOLL ein Fortschritts-Raster mit 28 Feldern anzeigen, deren Farbe den
   Lernstand pro Buchstabe abbildet (unbekannt / gesehen / geübt / gemeistert).
5. Der Lernstand pro Buchstabe SOLL aus Anzahl korrekter/falscher Antworten und
   absolvierten Übungsarten abgeleitet werden.
6. Die App SOLL einen Wiederholen-Modus anbieten, der bevorzugt Items mit Fehlern und
   fällige Items abfragt.
7. WENN alle Herzen einer Lektion verbraucht sind, DANN SOLL die Lektion beendet
   werden UND ein Neustart angeboten werden.
8. Jede Lektion SOLL eine Abschlussansicht mit erreichten XP, Genauigkeit und
   Streak-Status zeigen.

---

## Requirement 8: Gamification

**User Story:** Als Lernender möchte ich Belohnungen und Fortschrittsanreize, damit
ich täglich weiterlerne.

### Acceptance Criteria

1. Die App SOLL XP für korrekte Antworten und Lektionsabschlüsse vergeben.
2. Die App SOLL aus dem XP-Stand ein Level mit Fortschrittsbalken ableiten.
3. Die App SOLL einen Tages-Streak führen, der bei mindestens einer abgeschlossenen
   Lektion pro Kalendertag steigt.
4. WENN ein Kalendertag ohne abgeschlossene Lektion verstreicht, DANN SOLL der Streak
   zurückgesetzt werden.
5. Die App SOLL pro Lektion ein Herzen-Budget (Standard 5) führen und den Stand
   sichtbar anzeigen.
6. WENN eine Lektion abgeschlossen wird, DANN SOLL eine Erfolgs-Animation
   (Konfetti o. ä.) abgespielt werden.
7. Animationen SOLLEN `prefers-reduced-motion` respektieren.
8. Die App SOLL ein Tagesziel (XP pro Tag) anzeigen und dessen Erreichung markieren.

---

## Requirement 9: Vokabeln & Sätze (Phase 2)

**User Story:** Als Lernender möchte ich nach dem Alphabet Wörter und Sätze lernen,
damit ich die Sprache tatsächlich verwenden kann.

### Acceptance Criteria

1. Die App SOLL Vokabel-Einheiten mit Wörtern, kurzen Sätzen und einfachen
   Grammatikhinweisen bereitstellen.
2. Die App SOLL die Übungstypen Multiple Choice (DE↔AR), Wortpaare zuordnen,
   Lückentext, Hörübung (TTS) und Schreibübung unterstützen.
3. Die App SOLL ein SM-2-ähnliches Spaced-Repetition-Verfahren mit Easiness-Faktor,
   Intervall und Fälligkeitsdatum pro Item führen.
4. WENN ein Item falsch beantwortet wird, DANN SOLL sein Intervall zurückgesetzt und
   es zeitnah erneut abgefragt werden.
5. Die App SOLL einen Wiederholen-Modus für fällige und fehlerhafte Items anbieten.
6. Das Vokabel-Modul SOLL dieselben Progress-, SRS- und Gamification-Bausteine
   verwenden wie der Alphabet-Trainer, ohne diese zu verändern.

---

## Requirement 10: Persistenz

**User Story:** Als Lernender möchte ich, dass mein Fortschritt erhalten bleibt, damit
ich ohne Login weiterlernen kann.

### Acceptance Criteria

1. Die App SOLL Fortschritt, XP, Streak und Einstellungen lokal im Browser speichern.
2. Die App SOLL den gespeicherten Zustand beim Start laden und die Oberfläche
   entsprechend herstellen.
3. Der gespeicherte Zustand SOLL eine Schema-Version tragen UND bei älteren Versionen
   migriert werden.
4. WENN der gespeicherte Zustand beschädigt oder nicht lesbar ist, DANN SOLL die App
   mit einem Standardzustand starten, ohne abzustürzen.
5. Die App SOLL Export und Import des Fortschritts als JSON-Datei anbieten.
6. Die App SOLL das Zurücksetzen des Fortschritts mit Bestätigungsdialog anbieten.
7. Schreibzugriffe SOLLEN gebündelt erfolgen, um die UI nicht zu blockieren.

---

## Requirement 11: Darstellung, RTL und Mobile

**User Story:** Als Lernender am Handy möchte ich eine App-ähnliche, gut lesbare
Oberfläche, damit das Lernen unterwegs angenehm ist.

### Acceptance Criteria

1. Arabische Inhalte SOLLEN in Containern mit `dir="rtl"` und der Schriftart
   „Noto Sans Arabic" dargestellt werden; die deutsche UI bleibt LTR.
2. Die Schriftart SOLL per `@font-face` aus dem eigenen `public/`-Verzeichnis
   eingebunden werden; WENN die Datei fehlt, DANN SOLL eine System-Font-Kette für
   arabische Schrift greifen, sodass die App ohne externe CDN nutzbar bleibt.
3. Das Layout SOLL mobil-first sein, mit Bottom-Navigation, Touch-Zielen ≥ 44 px und
   Beachtung der Safe-Area auf Geräten mit Notch.
4. Die App SOLL bei Breiten ab 768 px ein zentriertes, breiteres Layout nutzen.
5. Die App SOLL als installierbare PWA mit Manifest und Offline-Fähigkeit auslieferbar
   sein.
6. Interaktive Elemente SOLLEN sichtbare Fokuszustände und ARIA-Beschriftungen haben;
   arabische Zeichen SOLLEN für Screenreader mit `lang="ar"` markiert werden.
7. Die App SOLL einen hellen und einen dunklen Modus unterstützen.

---

## Requirement 12: Betrieb ohne Backend

**User Story:** Als Nutzer möchte ich die App ohne Konten, Schlüssel oder Server
betreiben, damit sie sofort und überall läuft.

### Acceptance Criteria

1. Die App SOLL vollständig statisch ausgeliefert werden können.
2. Die App SOLL zur Laufzeit keine Netzwerkaufrufe an Dritte tätigen.
3. Die App SOLL keine API-Keys oder Geheimnisse benötigen.
4. Audio SOLL ausschließlich über die im Browser vorhandene Web Speech API erzeugt
   werden.

---

## Nicht-Ziele (MVP)

- Kein Backend, keine Synchronisierung zwischen Geräten, keine Nutzerkonten.
- Keine Handschrifterkennung per ML; die Schreibbewertung bleibt pixelbasiert.
- Keine vollständige arabische Grammatik; Phase 2 beschränkt sich auf einfache Muster.
- Keine Lautsprache-Aufnahme/Sprechbewertung (Mikrofon).
