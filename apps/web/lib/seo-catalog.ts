/**
 * Build-time catalog snapshot for crawlable journey and destination pages.
 *
 * The marketing site is a static export, so SEO pages must be generated at
 * build time. We read the published catalog from the API when it is reachable
 * during the build and fall back to the bundled sample journeys otherwise, so
 * `next build` never depends on a running API.
 */
import {
  companyFallback,
  fallbackPackages,
  imageUrl,
  type CatalogPackage,
  type Company,
  type Destination,
} from './catalog';

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/v1').replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meandadventure.com').replace(/\/$/, '');

export interface DestinationWithPackages extends Destination {
  galleryUrls?: string[];
  packages?: CatalogPackage[];
}

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) return (value as { items: T[] }).items;
  return [];
}

async function read<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API}/public/${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body)) return null;
    return (body as { data: T }).data;
  } catch {
    return null;
  }
}

/** Page through a public collection so the sitemap never truncates at 20 items. */
async function readAll<T>(path: string): Promise<T[] | null> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const query = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : '?limit=50';
    try {
      const response = await fetch(`${API}/public/${path}${query}`, {
        headers: { Accept: 'application/json' },
        cache: 'force-cache',
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return items.length ? items : null;
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('data' in body)) return items.length ? items : null;
      items.push(...asList<T>((body as { data: unknown }).data));
      const meta = (body as { meta?: { hasMore?: boolean; nextCursor?: string | null } }).meta;
      if (!meta?.hasMore || !meta.nextCursor) break;
      cursor = meta.nextCursor;
    } catch {
      return items.length ? items : null;
    }
  }
  return items;
}

const destinationFallbacks: Destination[] = [
  { id: 'serengeti', slug: 'serengeti', title: 'Serengeti & Ngorongoro', description: 'The great migration, crater floors and endless golden plains.', region: 'Northern Tanzania', coverUrl: '/assets/safari.jpg' },
  { id: 'zanzibar', slug: 'zanzibar', title: 'Zanzibar Spice Islands', description: 'Stone Town lanes, spice farms and the Indian Ocean at your door.', region: 'Zanzibar', coverUrl: '/assets/zanzibar.jpg' },
  { id: 'kilimanjaro', slug: 'kilimanjaro', title: 'Mount Kilimanjaro', description: 'Africa’s highest peak, climbed with local guides and real acclimatisation.', region: 'Northern Tanzania', coverUrl: '/assets/kilimanjaro.jpg' },
];

export interface SeoCatalog {
  packages: CatalogPackage[];
  destinations: Destination[];
  company: Company;
  live: boolean;
}

/** Cached per build process so every generateStaticParams / page shares one fetch. */
let snapshot: Promise<SeoCatalog> | null = null;

async function buildSnapshot(): Promise<SeoCatalog> {
  const [packageResult, destinationResult, companyResult] = await Promise.all([
    readAll<CatalogPackage>('packages'),
    readAll<Destination>('destinations'),
    read<Company>('company'),
  ]);
  const livePackages = packageResult ?? [];
  const liveDestinations = destinationResult ?? [];
  // Keep the iconic marketing destinations even when the CRM has not created a
  // matching destination record yet (for example Serengeti today).
  const destinations = [...liveDestinations];
  for (const fallback of destinationFallbacks) {
    if (!destinations.some((item) => item.slug === fallback.slug)) destinations.unshift(fallback);
  }
  return {
    packages: livePackages.length ? livePackages : fallbackPackages,
    destinations,
    company: companyResult ? { ...companyFallback, ...companyResult } : companyFallback,
    live: livePackages.length > 0,
  };
}

export function seoCatalog(): Promise<SeoCatalog> {
  if (!snapshot) snapshot = buildSnapshot();
  return snapshot;
}

export async function packageBySlug(slug: string): Promise<CatalogPackage | null> {
  const { packages } = await seoCatalog();
  return packages.find((item) => item.slug === slug) ?? null;
}

export async function destinationBySlug(slug: string): Promise<DestinationWithPackages | null> {
  const { destinations, packages } = await seoCatalog();
  const destination = destinations.find((item) => item.slug === slug);
  if (!destination) return null;
  const live = await read<DestinationWithPackages>(`destinations/${encodeURIComponent(slug)}`);
  if (live?.packages?.length) return { ...destination, ...live };
  const haystack = `${destination.title} ${destination.description}`.toLowerCase();
  const related = packages.filter((item) => {
    const named = item.destinations?.some((place) => place.slug === destination.slug) ?? false;
    const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    return named || haystack.split(/\s+/).some((word) => word.length > 4 && text.includes(word));
  });
  return { ...destination, packages: related.length ? related : packages };
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function packagePath(slug: string): string {
  return `/packages/${slug}/`;
}

export function destinationPath(slug: string): string {
  return `/destinations/${slug}/`;
}

/** Absolute, crawlable image URL for Open Graph and JSON-LD. */
export function socialImage(packageLike: { coverUrl?: string | null; slug?: string; category?: string; title?: string; region?: string }): string {
  const raw = imageUrl(packageLike);
  return raw.startsWith('http') ? raw : absoluteUrl(raw);
}
