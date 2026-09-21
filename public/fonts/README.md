# Arabische Schriftart

Die App nutzt **Noto Sans Arabic**. Die Font-Dateien liegen aus Lizenz- und
Größengründen nicht im Repository (siehe `.gitignore`).

## Ohne Download

Die App funktioniert sofort: fehlt die Datei, greift die Fallback-Kette aus
`tailwind.config.js` (`Geeza Pro` auf iOS/macOS, `Segoe UI Arabic` auf Windows,
`Noto Sans Arabic` auf Android). Die Typografie ist dann die des Systems.

## Mit Download (empfohlen für einheitliche Darstellung)

Zwei Dateien in dieses Verzeichnis legen:

- `NotoSansArabic-Regular.woff2`
- `NotoSansArabic-SemiBold.woff2`

Quelle: [Noto Sans Arabic bei Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Arabic)
(SIL Open Font License 1.1). Nach dem Entpacken die TTF-Dateien z. B. mit
[woff2](https://github.com/google/woff2) oder einem Online-Konverter nach WOFF2
umwandeln und hier ablegen – `@font-face` in `src/styles/index.css` erwartet genau
diese Dateinamen.
