# Arabisch lernen – Alphabet-Trainer

Eine mobil-first Web-App zum Erlernen der arabischen Schrift. Spielerisch in kleinen
Lektionen, mit Schwerpunkt auf dem Alphabet: Buchstabenformen, Schreibübung,
Erkennungsübungen. Vokabeln und Sätze folgen in Phase 2.

Kein Backend, kein Login, keine API-Keys. Der Fortschritt bleibt im Browser.

## Schnellstart

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm run dev          # → http://localhost:5173
```

Auf dem Handy im selben WLAN testen:

```bash
npm run dev -- --host
```

Vite zeigt dann eine Netzwerk-Adresse an (z. B. `http://192.168.1.42:5173`), die du am
Handy öffnest. Für die Schreibübung und das App-Gefühl ist das der wichtigste Testweg.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |
| `npm run preview` | Den Produktions-Build lokal ansehen |
| `npm run typecheck` | Nur die Typprüfung |
| `npm test` | Logik-Tests (Daten, Schrift, SRS, Gamification, Generator) |

`npm test` braucht Node ≥ 22.6, weil die Tests TypeScript direkt ausführen
(`--experimental-strip-types`). Unter Node 20 läuft alles andere normal.

## Veröffentlichen (GitHub Pages)

Der Workflow `.github/workflows/deploy.yml` prüft, baut und veröffentlicht automatisch.
Einmalig im Repository einstellen:

**Settings → Pages → Source: „GitHub Actions"**

Danach erzeugt jeder Push eine neue Version unter
`https://<nutzer>.github.io/kiro-web.app/`. Die App ist als PWA installierbar – auf dem
Handy über „Zum Startbildschirm hinzufügen".

## Arabische Schriftart

Die App nutzt **Noto Sans Arabic**. Die Font-Dateien liegen aus Lizenz- und
Größengründen nicht im Repository.

- **Ohne Download:** Es greift automatisch die Schrift des Systems (`Geeza Pro` auf
  iOS/macOS, `Segoe UI Arabic` auf Windows, `Noto Sans Arabic` auf Android). Die App ist
  sofort benutzbar.
- **Mit Download:** Zwei Dateien nach `public/fonts/` legen –
  `NotoSansArabic-Regular.woff2` und `NotoSansArabic-SemiBold.woff2`. Details in
  [`public/fonts/README.md`](public/fonts/README.md).

## Architektur

Drei Schichten, klar getrennt. Die unteren beiden enthalten **keine React-Importe** und
sind deshalb ohne Browser testbar – dort steckt die Logik, die man nicht per Augenmaß
prüfen kann.

```
src/
  data/        Inhalte: 28 Buchstaben, Harakat, Lernpfad, Vokabeln
  domain/      Logik: Schriftformen, Übungs-Generator, SRS, Gamification, Persistenz
  components/  React-Bausteine (arabische Darstellung, Übungen, UI)
  screens/      Bildschirme (Phase 2)
tests/         Node-Tests für data/ und domain/
```

### Zwei Entscheidungen, die das Projekt prägen

**Buchstabenformen entstehen aus Zero-Width Joinern, nicht aus Unicode-Präsentationsformen.**
Arabische Buchstaben wechseln ihre Gestalt je nach Position. Statt 112 Codepoints aus
dem Block U+FE80–FEFC von Hand einzutragen, wird die Form mit `\u200D` erzeugt und die
Font-Engine wählt die Glyphe selbst. Das ist typografisch korrekt (Ligaturen bleiben
erhalten) und für die sechs nicht nach links verbindenden Buchstaben (ا د ذ ر ز و)
automatisch richtig.

**Die Schreibübung bewertet per Pixelvergleich, nicht per Handschrifterkennung.**
Das Zielzeichen wird als Text aufs Canvas gerendert – gestrichelt als Vorlage, gefüllt
als Maske. Bewertet wird, wie viel der Vorlage übermalt wurde (`coverage`) minus dem,
was daneben ging (`spill`). Das funktioniert für alle 28 Buchstaben ohne zusätzliche
Daten und braucht kein ML-Modell.

## Stand der Umsetzung

Spec und Aufgabenliste: [`.kiro/specs/arabisch-lern-app/`](.kiro/specs/arabisch-lern-app/)

**Phase 1 – Fundament (fertig, 126 Tests)**
- Projekt-Setup, Tailwind-Tokens, RTL, PWA-Manifest, Pages-Workflow
- Alle 28 Buchstaben mit 4 Formen, je 3 Beispielwörtern, Merkhilfen, Verwechslungspartnern
- Harakat-Daten, Lernpfad (22 Lektionen), Vokabel-Grundbestand
- Schriftlogik, Übungs-Generator, SRS, Gamification, Persistenz mit Migration

**Phase 2 – Oberfläche (offen)**
App-Shell, Lernkarten, Lektions-Runner, Schreibübung auf Canvas, Erkennungsübungen,
Verbinden-Übung, Fortschrittsraster, Einstellungen.

`src/App.tsx` ist derzeit eine **Vorschau-Ansicht**, mit der sich die Datenschicht auf
dem Gerät prüfen lässt. Sie wird in Phase 2 durch die echte App-Shell ersetzt.
