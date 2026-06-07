/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  env: { API_URL: process.env.API_URL || 'http://localhost:4000' },
};

export default config;
