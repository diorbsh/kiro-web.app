/**
 * Sprachausgabe über die Web Speech API.
 *
 * Bewusst schlank für diese Runde: ein `speak(text)`-Wrapper und eine Prüfung, ob
 * überhaupt eine arabische Stimme zur Verfügung steht. Ist keine da, dürfen
 * Audio-Aufgaben nicht erzeugt werden – deshalb liefert `arabicVoiceAvailable()` das
 * Signal für `GeneratorContext.audioAvailable`.
 *
 * Framework-frei, damit die Quiz-Logik diese Funktionen ohne React nutzen kann.
 */

/** Steht die Sprachausgabe im aktuellen Browser grundsätzlich zur Verfügung? */
export function speechSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Gibt es eine arabische Stimme?
 *
 * `getVoices()` ist beim ersten Aufruf oft noch leer, weil die Stimmen asynchron
 * geladen werden. Wir werten das defensiv aus: Solange die Liste leer ist, nehmen wir
 * an, dass eine Stimme später verfügbar sein *könnte*, und lassen Audio zu. Sobald
 * Stimmen da sind, entscheidet die tatsächliche Verfügbarkeit.
 */
export function arabicVoiceAvailable(): boolean {
  if (!speechSupported()) return false;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return true; // noch nicht geladen – nicht vorschnell blockieren
  return voices.some((voice) => voice.lang.toLowerCase().startsWith('ar'));
}

/**
 * Spricht einen arabischen Text.
 *
 * `cancel()` vor dem Sprechen verhindert, dass sich schnell aufeinanderfolgende
 * Aufgaben überlagern. Fehlt die Sprachausgabe, passiert nichts – das Quiz darf davon
 * nie blockiert werden.
 */
export function speak(text: string, rate = 0.8): void {
  if (!speechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = rate;
  // Falls eine arabische Stimme existiert, gezielt wählen – sonst überlässt der
  // Browser die Auswahl anhand von `lang`.
  const voice = speechSynthesis.getVoices().find((entry) => entry.lang.toLowerCase().startsWith('ar'));
  if (voice) utterance.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}
