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
