/**
 * Einstiegspunkt der Anwendung.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Das Wurzelelement #root fehlt in index.html.');
}

/**
 * Dunkler Modus nach Systemvorgabe.
 * Wird in Phase 2 durch die Einstellungen ersetzt (hell/dunkel/System).
 */
function applyInitialTheme(): void {
  const prefersDark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
}

applyInitialTheme();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
