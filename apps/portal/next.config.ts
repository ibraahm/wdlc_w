import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  env: { API_URL: process.env.API_URL || 'http://localhost:4000' },
};
export default config;
