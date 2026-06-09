import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0b1f3a',
        'navy-mid': '#152d50',
        gold: '#c8960c',
        'gold-light': '#e8b020',
        ivory: '#fafaf7',
        cream: '#f5f2eb',
        smoke: '#e8e4dc',
        charcoal: '#2c2c2c',
        primary: '#0b1f3a',
        secondary: '#c8960c',
        // Warm neutral scale aligned to the shell (ivory → cream → smoke →
        // charcoal → navy). Overriding Tailwind's cool default gray makes every
        // existing gray-* utility across the console match the navy-gold theme:
        // borders become smoke, headings (gray-900) become navy.
        gray: {
          50: '#fafaf7',
          100: '#f4f1ea',
          200: '#e8e4dc',
          300: '#d7d0c4',
          400: '#b0a799',
          500: '#857d70',
          600: '#5d574e',
          700: '#403b34',
          800: '#2c2c2c',
          900: '#0b1f3a',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
