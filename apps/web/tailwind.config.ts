import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#17345c',
        'primary-strong': '#102542',
        secondary: '#d7a72f',
        accent: '#e8f1f8',
        ink: '#1d2633',
        muted: '#667085',
      },
    },
  },
  plugins: [],
};

export default config;
