/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  transpilePackages: ['@measured/puck'],
  env: { API_URL: process.env.API_URL || 'http://localhost:4000/api' },
};

export default config;
