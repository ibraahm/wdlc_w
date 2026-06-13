import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Static public routes. News posts and CMS forms are intentionally omitted —
// add dynamic entries here if/when those need indexing.
const ROUTES = [
  '/',
  '/about',
  '/about/company',
  '/services',
  '/services/send-money',
  '/services/cash-pickup',
  '/services/bank-deposit',
  '/services/mobile-wallet',
  '/services/track',
  '/find-an-agent',
  '/agents/become-an-agent',
  '/agents/resources',
  '/agents/partners',
  '/compliance',
  '/compliance/fraud',
  '/compliance/report',
  '/compliance/notices',
  '/compliance/law-enforcement',
  '/compliance/resources',
  '/news',
  '/news/press',
  '/licenses',
  '/support/help',
  '/support/contact',
  '/privacy',
  '/terms',
  '/accessibility',
  '/legal/cookies',
  '/legal/electronic-communications',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
