import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1e3a5f',
        primary: '#1a56db',
      },
    },
  },
  plugins: [],
};

export default config;
