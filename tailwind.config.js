/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Arabische Inhalte: eigene Datei (public/fonts) mit System-Fallback-Kette.
        arabic: [
          '"Noto Sans Arabic"',
          '"Geeza Pro"',
          '"Segoe UI Arabic"',
          '"Traditional Arabic"',
          '"Arabic Typesetting"',
          'serif',
        ],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Große Darstellung der Schriftzeichen – zentral definiert.
        glyph: ['5rem', { lineHeight: '1.6' }],
        'glyph-lg': ['8.5rem', { lineHeight: '1.5' }],
        'glyph-sm': ['2.5rem', { lineHeight: '1.7' }],
      },
      colors: {
        // Lernstand-Farben (Mastery-Stufen) – auch im Fortschrittsraster genutzt.
        mastery: {
          unknown: '#e2e8f0',
          seen: '#fcd34d',
          practiced: '#60a5fa',
          mastered: '#34d399',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#599fff',
          500: '#337bf6',
          600: '#1f5ee3',
          700: '#1b4bc0',
          800: '#1c409c',
          900: '#1c397b',
        },
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 220ms ease-out',
        shake: 'shake 340ms ease-in-out',
        'slide-up': 'slide-up 220ms ease-out',
        'float-up': 'float-up 900ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
