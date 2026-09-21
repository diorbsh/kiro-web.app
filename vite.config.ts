import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite-Konfiguration.
 *
 * `base` ist relativ ('./'), damit der Build sowohl unter einer Domain-Wurzel als
 * auch in einem Unterpfad funktioniert – GitHub Pages liefert das Projekt unter
 * /<repo-name>/ aus. Relative Pfade vermeiden hier hartes Verdrahten des Repo-Namens.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Sourcemaps erleichtern die Fehlersuche auf dem Handy per Remote-Debugging.
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
