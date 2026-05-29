import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        bg: '#060606',
        surface: '#0d0d0d',
        border: '#1a1a1a',
        lime: '#c8ff00',
        muted: '#555555',
      },
    },
  },
  plugins: [],
};

export default config;

