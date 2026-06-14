import type { MetadataRoute } from 'next';

// The agent portal is account-only - never indexed or crawled.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
