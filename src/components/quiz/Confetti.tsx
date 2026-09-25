/**
 * Kurzes Konfetti für die Abschluss-Ansicht.
 *
 * Bewusst ohne Bibliothek: ein paar absolut positionierte Partikel mit der
 * `float-up`-Animation aus der Tailwind-Konfiguration genügen. Wichtig ist die
 * Barrierefreiheit – bei `prefers-reduced-motion: reduce` wird gar nichts gerendert,
 * statt die Animation nur zu verkürzen.
 */

import { useEffect, useState } from 'react';

/** Liest die Systemeinstellung „Bewegung reduzieren". */
function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7'];
const PARTICLE_COUNT = 24;

export function Confetti() {
  // Nach dem ersten Render entscheiden – matchMedia ist nur im Browser verfügbar.
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setActive(true);
    // Aufräumen: nach der Animation wieder ausblenden.
    const timer = setTimeout(() => setActive(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
        const left = (index / PARTICLE_COUNT) * 100;
        const delay = (index % 6) * 0.12;
        const color = COLORS[index % COLORS.length];
        return (
          <span
            key={index}
            className="absolute top-0 h-2 w-2 rounded-sm animate-float-up"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
