import type { MetadataRoute } from 'next';
import { getAgentLocations, locationSlug } from '@/lib/agents';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worlddirectlink.com';

// Static public routes. News posts and CMS forms are intentionally omitted -
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = ROUTES.map((path) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: (path === '/' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));

  // Per-location pages for the agent network (drives local map/search SEO).
  const locations = await getAgentLocations();
  const locationEntries = locations.map((loc) => ({
    url: `${SITE}/find-an-agent/${locationSlug(loc)}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...locationEntries];
}
