export type CatalogPackage = {
  id: string; slug: string; title: string; description: string; durationDays: number;
  category: string; coverUrl: string; galleryUrls?: string[];
  fromPrice?: { currency: string; minor: string }; demoRate?: boolean;
  inclusions?: string[]; exclusions?: string[]; goodToKnow?: string[];
  destinations?: Array<{ id: string; slug: string; title: string }>;
  localized?: { en?: Record<string, unknown>; sw?: Record<string, unknown> };
  itinerary?: { days: Array<{ day: number; title: string; description?: string; activities?: Array<{ title?: string; description?: string }> }> };
};
export type Company = {
  name: string; email: string; phone: string; appStoreUrl?: string | null; playStoreUrl?: string | null;
  privacyUrl?: string | null; termsUrl?: string | null;
  shortName?: string; tagline?: string; story?: string; slogan?: string | null; motto?: string | null;
  website?: string | null; whatsapp?: string | null; instagram?: string | null; hashtag?: string | null;
  registrationNumber?: string | null; headquarters?: string | null; mainCurrency?: string;
  offices?: Array<{ label?: string; city?: string; address?: string; phone?: string }>;
  contactNumbers?: string[]; values?: string[]; mission?: string; vision?: string;
  productDivisions?: Array<{ slug?: string; title?: string; focus?: string }>;
};
export type RentalServiceLine = { id: string; slug: string; title: string; tagline: string; description: string; useCases?: string[] };
export type RentalVehicle = {
  id: string; slug: string; brand: string; model: string; variant?: string | null; modelYear?: number | null;
  segment: string; category: string; seats: number; luggageCapacity?: number; transmission?: string;
  chauffeurDriven?: boolean; selfDriveAvailable?: boolean; features?: string[]; serviceSlugs?: string[];
  fromPrice?: { currency?: string; amountMinor?: string } | null;
};
export type RentalPolicy = { id?: string | null; version: number; publishedAt?: string | null; policy?: { summary?: string; selfDrive?: string; longTermDiscount?: string; lengthOfHire?: string } };
export type RentalOverview = {
  name: string; tagline: string; operator: string;
  services: RentalServiceLine[];
  policy: RentalPolicy;
  fleet: { totalVehicles: number; segments: Array<{ segment: string; vehicles: number }> };
  featured: RentalVehicle[];
};
export type Service = { id: string; slug: string; title: string; description: string; requestMode?: string };
export type Destination = { id: string; slug: string; title: string; description: string; region: string; coverUrl?: string };
export type AppRelease = { state: string; appStoreUrl: string | null; playStoreUrl: string | null };
export type LandingContent = { heroTitle?: string; heroCopy?: string; storyCopy?: string };
export const companyFallback: Company = { name: 'Me and Adventure Safaris', email: 'meandadventuretz@gmail.com', phone: '+255 682 886 259' };
export const fallbackPackages: CatalogPackage[] = [
  { id: 'sample-serengeti', slug: 'serengeti', title: 'The Serengeti escape', description: 'Golden plains, extraordinary wildlife and nights beneath a sky full of stars.', durationDays: 5, category: 'wildlife', coverUrl: '/assets/safari.jpg', fromPrice: { currency: 'USD', minor: '125000' }, demoRate: true, inclusions: ['Private game drives', 'Serengeti & Ngorongoro', 'Local guiding'], exclusions: ['Flights', 'Visas', 'Optional activities'], itinerary: { days: [{ day: 1, title: 'Welcome to Arusha', description: 'A guide briefing and time to settle in.' }, { day: 2, title: 'Into the Serengeti', description: 'Journey into the park and a private game drive.' }, { day: 3, title: 'A day in the wild', description: 'Discover the plains at your own pace.' }, { day: 4, title: 'Ngorongoro discovery', description: 'Travel through the highlands.' }, { day: 5, title: 'One last memory', description: 'A relaxed morning and return transfer.' }] } },
  { id: 'sample-zanzibar', slug: 'zanzibar', title: 'Zanzibar, at your pace', description: 'Ocean mornings, island stories and room to slow down.', durationDays: 4, category: 'coast', coverUrl: '/assets/zanzibar.jpg', fromPrice: { currency: 'USD', minor: '89000' }, demoRate: true, inclusions: ['Beach time', 'Stone Town discovery', 'Airport transfers'] },
  { id: 'sample-kilimanjaro', slug: 'kilimanjaro', title: 'A higher perspective', description: 'A mountain journey with thoughtful planning and local support.', durationDays: 7, category: 'mountain', coverUrl: '/assets/kilimanjaro.jpg', fromPrice: { currency: 'USD', minor: '195000' }, demoRate: true, inclusions: ['Guided mountain experience', 'Route & safety briefing', 'Trip support'] },
];
export const fallbackServices: Service[] = [
  { id: 'wildlife', slug: 'wildlife', title: 'Wildlife & private safaris', description: 'Game drives, group journeys and family adventures in Tanzania’s wild places.' },
  { id: 'luxury', slug: 'luxury', title: 'Honeymoon & luxury', description: 'Unhurried escapes and thoughtful details for moments that matter.' },
  { id: 'mountain', slug: 'mountain', title: 'Mountain & day adventures', description: 'Kilimanjaro experiences, excursions and a fresh perspective.' },
  { id: 'beach', slug: 'beach', title: 'Beach & Zanzibar', description: 'Island days, ocean air and time to simply be.' },
  { id: 'culture', slug: 'culture', title: 'Culture & community', description: 'Connect with local traditions, people and stories.' },
  { id: 'transfer', slug: 'transfer', title: 'Transfers & car rental', description: 'Airport pickups and chauffeur services through Safari AI Rentals.' },
  { id: 'group', slug: 'group', title: 'Corporate & group travel', description: 'Coordinated journeys for companies, schools and institutions.' },
  { id: 'custom', slug: 'custom', title: 'Tailor-made journeys', description: 'Your destinations, your budget, your travel style. Planned together.' },
];
export const photoCredits = [
  ['Serengeti giraffe — Justin Lane / Unsplash', 'https://unsplash.com/photos/giraffe-walking-on-golden-savanna-fzsJesR92jE'],
  ['Serengeti elephants — Daniel Vargas / Unsplash', 'https://unsplash.com/photos/a-herd-of-elephants-in-a-grassland-6UPCRhTcIZY'],
  ['Zanzibar beach — Taryn Elliott / Pexels', 'https://www.pexels.com/photo/photo-of-white-sand-near-the-sea-5859092/'],
  ['Kilimanjaro — David Clode / Unsplash', 'https://unsplash.com/photos/landscape-photography-of-summit-3xJ9AeCwjTQ'],
  ['Safari 4×4 — Kureng Workx / Pexels', 'https://www.pexels.com/photo/a-safari-jeep-on-dirt-road-4404524/'],
];
export const fallbackRentals: RentalOverview = {
  name: 'Safari AI Rentals', tagline: 'Seamless rides, timeless memories.', operator: 'Me and Adventure Safaris',
  services: [
    { id: 'executive', slug: 'safari-ai-executive', title: 'Safari AI Executive', tagline: 'VIP, luxury and executive mobility', description: 'Premium chauffeur-driven vehicles for executives, VIP guests and special occasions.' },
    { id: 'weddings', slug: 'safari-ai-weddings', title: 'Safari AI Weddings', tagline: 'Bridal cars and wedding transport', description: 'Elegant bridal cars and coordinated wedding-day transport.' },
    { id: 'transfers', slug: 'safari-ai-transfers', title: 'Safari AI Transfers', tagline: 'Airport, hotel and intercity transfers', description: 'Reliable transfers across Tanzania with flight monitoring and transparent pricing.' },
    { id: 'expeditions', slug: 'safari-ai-expeditions', title: 'Safari AI Expeditions', tagline: 'Safari, wildlife and adventure transport', description: 'Rugged safari-ready 4x4s with experienced driver-guides.' },
    { id: 'corporate', slug: 'safari-ai-corporate', title: 'Safari AI Corporate', tagline: 'Business contracts and long-term rentals', description: 'Long-term vehicle hire and corporate transport contracts.' },
  ],
  policy: { version: 1, policy: { summary: 'Vehicles are provided with a company-approved driver. Each booking is confirmed in writing with the vehicle, dates, route, service scope and charges.', longTermDiscount: 'Bookings exceeding 10 days may qualify for a special or discounted rate, confirmed in writing before the booking is accepted.' } },
  fleet: { totalVehicles: 32, segments: [{ segment: 'SUV', vehicles: 20 }, { segment: 'SEDAN', vehicles: 4 }, { segment: 'CROSSOVER', vehicles: 4 }] },
  featured: [],
};
export function rentalVehicleName(vehicle: RentalVehicle): string { return [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' '); }
export function formatRentalRate(vehicle: RentalVehicle): string {
  const minor = vehicle.fromPrice?.amountMinor, currency = vehicle.fromPrice?.currency ?? 'TZS';
  if (!minor || !/^[0-9]+$/.test(minor)) return 'Rate on request';
  const value = BigInt(minor);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return 'Rate on request';
  try {
    const formatter = new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 });
    return `${formatter.format(Number(value) / 100)} / day`;
  } catch { return 'Rate on request'; }
}
export function formatFrom(p: CatalogPackage): string {
  if (!p.fromPrice) return 'Request an itinerary';
  const { currency, minor } = p.fromPrice;
  if (!/^[0-9]+$/.test(minor) || !/^[A-Z]{3}$/.test(currency)) return 'Request current pricing';
  try {
    const formatter = new Intl.NumberFormat('en', { style: 'currency', currency });
    const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    const value = BigInt(minor);
    // Public from rates are bounded; authoritative pricing stays in the API.
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return 'Request current pricing';
    return `From ${formatter.format(Number(value) / (10 ** exponent))} / adult`;
  } catch { return 'Request current pricing'; }
}
export function safeStoreUrl(value: string | null | undefined, store: 'apple' | 'google'): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed = store === 'apple' ? ['apps.apple.com'] : ['play.google.com'];
    return url.protocol === 'https:' && allowed.includes(url.hostname) && url.pathname.length > 1 && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function safePublicLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function imageUrl(p: { coverUrl?: string | null; slug?: string; category?: string; title?: string; region?: string }): string {
  const value = p.coverUrl ?? '';
  const file = value.match(/\/assets\/([a-z0-9-]+\.(?:webp|jpg|png))(?:[?#]|$)/i);
  const local = file ? `/assets/${file[1].replace(/\.(jpg|png)$/i, '-1200.webp').replace(/-1200-1200/, '-1200')}` : '';
  const hint = `${p.slug ?? ''} ${p.category ?? ''} ${p.title ?? ''} ${p.region ?? ''}`.toLowerCase();
  const themed = /zanzibar|pemba|mafia|beach|coast|island|stone-town/.test(hint) ? '/assets/zanzibar-1200.webp'
    : /kili|meru|mountain|trek|materuni|moshi/.test(hint) ? '/assets/kilimanjaro-1200.webp'
    : /vehicle|rent|transfer/.test(hint) ? '/assets/vehicle-1200.webp'
    : /serengeti|wildlife|safari|ngorongoro|tarangire|manyara|natron|dar/.test(hint) ? '/assets/safari-1200.webp'
    : '';
  if (local && !/\/hero(?:-\d+)?\.webp$/.test(local)) return local;
  if (/^https?:\/\//.test(value) && !file) return value;
  return themed || local || '/assets/safari-1200.webp';
}
