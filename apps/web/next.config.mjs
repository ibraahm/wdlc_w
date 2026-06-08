// The browser calls the backend API directly (e.g. form submissions in
// FormRenderer), so its origin must be allowlisted in connect-src.
function apiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000/api';
  try { return new URL(raw).origin; } catch { return 'http://localhost:4000'; }
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",   // unsafe-inline needed for Next.js inline scripts; tighten with nonces in future
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${apiOrigin()} https://nominatim.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
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
  async redirects() {
    return [
      { source: '/company-overview',          destination: '/about/company',              permanent: true },
      { source: '/our-network',               destination: '/about/network',              permanent: true },
      { source: '/licenses-registrations',    destination: '/about/licenses',             permanent: true },
      { source: '/contact',                   destination: '/about/contact',              permanent: true },
      { source: '/become-agent',              destination: '/agents/become-an-agent',     permanent: true },
      { source: '/agent-resources',           destination: '/agents/resources',           permanent: true },
      { source: '/partners',                  destination: '/agents/partners',            permanent: true },
      { source: '/compliance-overview',       destination: '/compliance',                 permanent: true },
      { source: '/fraud-consumer-scams',      destination: '/compliance/fraud',           permanent: true },
      { source: '/report-suspicious-activity',destination: '/compliance/report',          permanent: true },
      { source: '/agent-regulatory-notices',  destination: '/compliance/notices',         permanent: true },
      { source: '/law-enforcement-requests',  destination: '/compliance/law-enforcement', permanent: true },
      { source: '/compliance-resources',      destination: '/compliance/resources',       permanent: true },
    ];
  },
};

export default config;
