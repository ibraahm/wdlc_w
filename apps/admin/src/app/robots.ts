import type { MetadataRoute } from 'next';

// The admin back-office must never be indexed or crawled.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
