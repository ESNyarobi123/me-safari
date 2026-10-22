import type { MetadataRoute } from 'next';
import { absoluteUrl, destinationPath, packagePath, seoCatalog } from '../lib/seo-catalog';

/** Static-export sitemap: every crawlable marketing page, generated at build time. */
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { packages, destinations } = await seoCatalog();
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/contact/'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
  return [
    ...base,
    ...packages.map((item) => ({
      url: absoluteUrl(packagePath(item.slug)),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...destinations.map((place) => ({
      url: absoluteUrl(destinationPath(place.slug)),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
