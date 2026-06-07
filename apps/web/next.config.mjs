/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  env: { API_URL: process.env.API_URL || 'http://localhost:4000/api' },
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
