// The browser calls the backend API directly (e.g. form submissions in
// FormRenderer), so its origin must be allowlisted in connect-src.
function apiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000/api';
  try { return new URL(raw).origin; } catch { return 'http://localhost:4000'; }
}

const isDev = process.env.NODE_ENV !== 'production';
const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(' ');

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,   // unsafe-inline needed for Next.js inline scripts; tighten with nonces in future
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${apiOrigin()} https://nominatim.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org`,
  // Allow the embedded Google Maps HQ map; without an explicit frame-src it
  // falls back to default-src 'self' and the browser blocks the iframe.
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  // Lint is a CI / `npm run lint` gate, not a deploy blocker — the project has a
  // pre-existing backlog. Keeps builds green while the gate runs separately.
  eslint: { ignoreDuringBuilds: true },
  env: { API_URL: process.env.API_URL || 'http://localhost:4000/api' },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default config;
