'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import InquiryForm from './InquiryForm';
import AppDownloadPopup from './AppDownloadPopup';
import { ANDROID_APP, ANDROID_PAGE_PATH } from '../lib/app-release';
import {
  type CatalogPackage, type Company, type Service, type Destination, type AppRelease, type LandingContent, type RentalOverview,
  companyFallback, fallbackPackages, fallbackServices, fallbackRentals, photoCredits,
  formatFrom, formatRentalRate, rentalVehicleName, imageUrl, safeStoreUrl,
} from '../lib/catalog';
import { captureAttribution, packageReference, whatsappHref, type Utm } from '../lib/inquiries';

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/v1').replace(/\/$/, '');
const nav = [
  ['Home', '#home'],
  ['Experiences', '#destinations'],
  ['Services', '#services'],
  ['Rentals', '#rentals'],
  ['Contact', '/contact/'],
];
const filters = [['all', 'All journeys'], ['wildlife', 'Wildlife'], ['coast', 'Coast'], ['mountain', 'Mountains']];
const pkgPath = (slug: string) => `/packages/${slug}/`;
const destPath = (slug: string) => `/destinations/${slug}/`;
const filterIcons: Record<string, string> = { all: 'compass', wildlife: 'binoculars', coast: 'sun', mountain: 'mountain' };
const serviceIcons = ['binoculars', 'heart', 'mountain', 'sun', 'people', 'car', 'briefcase', 'sparkles'];
function renderTwoToneName(name: string) {
  const words = (name || 'Me and Adventure Safaris').trim().split(/\s+/);
  if (words.length <= 1) return <em>{name}</em>;
  const last = words[words.length - 1];
  const rest = words.slice(0, -1).join(' ');
  return <>{rest} <em>{last}</em></>;
}
const valueIcons = ['sparkles', 'heart', 'leaf', 'people', 'compass', 'sun', 'mountain', 'binoculars'];
const divisionIcons = ['binoculars', 'car', 'mountain', 'sun'];
const rentalLineIcons = ['sparkles', 'heart', 'compass', 'binoculars', 'briefcase'];
const appScreens = [
  {
    id: 'explore',
    num: '01',
    role: 'Customer Home',
    title: 'Explore Tanzania',
    subtitle: 'Search parks, filter Wildlife, Beach & Hiking, and compare TZS rates.',
    chip: 'Serengeti · Zanzibar · Kilimanjaro',
    icon: 'compass',
    src: '/assets/app-screens/screen-explore.jpg',
    side: 'left' as const,
  },
  {
    id: 'mytrips',
    num: '02',
    role: 'Guide Dashboard',
    title: 'My Trips & Pickup',
    subtitle: 'Daily assigned safari schedule, vehicle TZ001 & one-tap pickup trigger.',
    chip: 'Arusha Pickup · Vehicle TZ001',
    icon: 'calendar',
    src: '/assets/app-screens/screen-mytrips.jpg',
    side: 'left' as const,
  },
  {
    id: 'itinerary',
    num: '03',
    role: 'Trip Schedule',
    title: 'Live Itinerary',
    subtitle: 'Every stop clearly planned with route, pickup details, and traveler counts.',
    chip: '11 Oct 2026 · 2 travelers',
    icon: 'map-pin',
    src: '/assets/app-screens/screen-itinerary.jpg',
    side: 'left' as const,
  },
  {
    id: 'progress',
    num: '04',
    role: 'Field Operations',
    title: 'Trip Progress Tracker',
    subtitle: '4-stage live status bar: Scheduled → Pickup → In progress → Completed.',
    chip: 'Real-time milestone updates',
    icon: 'car',
    src: '/assets/app-screens/screen-progress.jpg',
    side: 'left' as const,
  },
  {
    id: 'support',
    num: '05',
    role: '24/7 Safari Desk',
    title: 'Trip Support Thread',
    subtitle: 'Start a direct conversation linked to your assigned trip and Arusha desk.',
    chip: 'Linked to TRIP-DEMO-20261011',
    icon: 'heart',
    src: '/assets/app-screens/screen-support.jpg',
    side: 'right' as const,
  },
  {
    id: 'notifications',
    num: '06',
    role: 'Smart Alerts',
    title: 'Live Notifications',
    subtitle: 'Instant alerts for new trip assignments, driver arrivals, and schedule updates.',
    chip: 'All & Unread filters',
    icon: 'sparkles',
    src: '/assets/app-screens/screen-notifications.jpg',
    side: 'right' as const,
  },
  {
    id: 'account',
    num: '07',
    role: 'Unified Profile',
    title: 'Account & Modes',
    subtitle: 'Switch Customer & Guide modes, verify email, and manage Tanzania settings.',
    chip: 'Profile · Security · Preferences',
    icon: 'people',
    src: '/assets/app-screens/screen-account.jpg',
    side: 'right' as const,
  },
];
function categoryIcon(category?: string, title?: string) {
  const hint = `${category ?? ''} ${title ?? ''}`.toLowerCase();
  if (/coast|beach|zanzibar|island/.test(hint)) return 'sun';
  if (/mountain|climb|kili|trek/.test(hint)) return 'mountain';
  return 'binoculars';
}

async function publicRead<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}/public/${path}`, { credentials: 'omit', signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Public content unavailable (${response.status})`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('data' in body)) throw new Error('Invalid public content response');
  return (body as { data: T }).data;
}
function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) return (value as { items: T[] }).items;
  return [];
}
function StoreBadge({ kind, href, onComingSoon }: { kind: 'google' | 'apple'; href: string | null; onComingSoon: () => void }) {
  const isGoogle = kind === 'google';
  const aria = href
    ? (isGoogle ? 'Open M&A Safaris on Google Play' : 'Open M&A Safaris on App Store')
    : (isGoogle ? 'Google Play — coming soon' : 'App Store — coming soon');
  const content = (
    <>
      {isGoogle ? (
        <svg className="ma-store-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#00D2FF" d="M3.6 2.3C3.2 2.7 3 3.3 3 4.1v15.8c0 .8.2 1.4.6 1.8l.1.1L12.6 13v-.2L3.7 2.2l-.1.1Z"/>
          <path fill="#FFCE00" d="m15.6 16-3-3v-.2l3-3 .1.1 3.5 2c1 .6 1 1.5 0 2.1l-3.5 2-.1 0Z"/>
          <path fill="#FF3A44" d="M15.7 15.9 12.6 12.9 3.6 21.8c.4.4 1 .5 1.8 0l10.3-5.9Z"/>
          <path fill="#00F076" d="M15.7 8.1 5.4 2.2c-.8-.5-1.4-.4-1.8 0l9 9 3.1-3.1Z"/>
        </svg>
      ) : (
        <svg className="ma-store-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M16.5 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.8-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.2 1 8.3.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.4ZM14.5 6.5c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2Z"/>
        </svg>
      )}
      <span className="ma-store-text">
        <small>{isGoogle ? 'GET IT ON' : 'Download on the'}</small>
        <strong>{isGoogle ? 'Google Play' : 'App Store'}</strong>
      </span>
    </>
  );
  if (href) return <a className="ma-store-badge" href={href} aria-label={aria}>{content}</a>;
  return <button className="ma-store-badge" type="button" aria-label={aria} onClick={onComingSoon}>{content}</button>;
}
function renderHeroHeadline(raw?: string) {
  if (!raw || /safaris that deliver/i.test(raw)) {
    return <><em>Safaris</em> that deliver adventure, <em>fast</em>!</>;
  }
  const clean = raw.trim();
  const sentences = clean.split(/(?<=\.)\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    return (
      <>
        <em>{sentences[0]}</em>{' '}
        {sentences.slice(1, -1).join(' ')}{' '}
        {sentences.length > 2 ? <em>{sentences[sentences.length - 1]}</em> : sentences[1]}
      </>
    );
  }
  const words = clean.split(/\s+/);
  if (words.length >= 3) {
    return <><em>{words[0]}</em> {words.slice(1, -1).join(' ')} <em>{words[words.length - 1]}</em></>;
  }
  return clean;
}
function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog?.open) dialog?.showModal();
    const onCancel = (event: Event) => { event.preventDefault(); close(); };
    dialog?.addEventListener('cancel', onCancel);
    return () => dialog?.removeEventListener('cancel', onCancel);
  }, [close]);
  return (
    <dialog className="ma-dialog" ref={ref} aria-labelledby="dialogTitle" onClick={(event) => { if (event.target === ref.current) close(); }}>
      <div className="ma-dialog-card">
        <button className="ma-close" aria-label="Close dialog" onClick={close}>Close</button>
        <h2 id="dialogTitle">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export default function Landing({ initialPackages, initialCompany, initialDestinations, initialLive, initialServices, initialRentals }: {
  initialPackages?: CatalogPackage[];
  initialCompany?: Company;
  initialDestinations?: Destination[];
  initialLive?: boolean;
  initialServices?: Service[];
  initialRentals?: RentalOverview | null;
} = {}) {
  const [packages, setPackages] = useState<CatalogPackage[]>(initialPackages?.length ? initialPackages : fallbackPackages);
  const [company, setCompany] = useState<Company>(initialCompany ?? companyFallback);
  const [services, setServices] = useState<Service[]>(initialServices?.length ? initialServices : fallbackServices);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations ?? []);
  const [release, setRelease] = useState<AppRelease>({ state: 'unavailable', appStoreUrl: null, playStoreUrl: null });
  const [content, setContent] = useState<LandingContent>({});
  const [rentals, setRentals] = useState<RentalOverview>(initialRentals ? { ...fallbackRentals, ...initialRentals } : fallbackRentals);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'live' | 'fallback'>(initialPackages?.length && initialLive ? 'live' : 'loading');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<CatalogPackage | null>(null);
  const [storeNotice, setStoreNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeScreen, setActiveScreen] = useState(0);
  const [autoPlayApp, setAutoPlayApp] = useState(true);
  const [utm, setUtm] = useState<Utm>({});
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => { setUtm(captureAttribution().utm); }, []);

  useEffect(() => {
    if (!autoPlayApp) return;
    const timer = window.setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % appScreens.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [autoPlayApp]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const [catalog, companyResult, serviceResult, destinationResult, releaseResult, landingResult, rentalResult] = await Promise.allSettled([
      publicRead<CatalogPackage[] | { items: CatalogPackage[] }>('packages', signal),
      publicRead<Company>('company', signal),
      publicRead<Service[] | { items: Service[] }>('services', signal),
      publicRead<Destination[] | { items: Destination[] }>('destinations', signal),
      publicRead<AppRelease>('app-release', signal),
      publicRead<LandingContent>('landing', signal),
      publicRead<RentalOverview>('rentals/overview', signal),
    ]);
    if (signal?.aborted) return;
    const livePackages = catalog.status === 'fulfilled' ? asList<CatalogPackage>(catalog.value) : null;
    setPackages(livePackages ?? fallbackPackages);
    setCatalogStatus(livePackages ? 'live' : 'fallback');
    if (companyResult.status === 'fulfilled') setCompany({ ...companyFallback, ...companyResult.value });
    if (serviceResult.status === 'fulfilled') {
      const items = asList<Service>(serviceResult.value);
      if (items.length) setServices(items);
    }
    if (destinationResult.status === 'fulfilled') setDestinations(asList<Destination>(destinationResult.value));
    if (releaseResult.status === 'fulfilled') setRelease(releaseResult.value);
    if (rentalResult.status === 'fulfilled') setRentals({ ...fallbackRentals, ...rentalResult.value });
    if (landingResult.status === 'fulfilled') setContent({ heroTitle: landingResult.value.heroTitle, heroCopy: landingResult.value.heroCopy, storyCopy: landingResult.value.storyCopy });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    document.body.style.overflow = selected || storeNotice ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected, storeNotice]);

  const visible = useMemo(() => packages.filter((item) => {
    const hay = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    if (search.trim() && !hay.includes(search.trim().toLowerCase())) return false;
    return filter === 'all'
      || item.category === filter
      || (filter === 'coast' && /beach|zanzibar/i.test(`${item.category} ${item.title}`))
      || (filter === 'mountain' && /climb|mountain|kilimanjaro/i.test(`${item.category} ${item.title}`));
  }), [packages, filter, search]);

  const appUrl = safeStoreUrl(release.appStoreUrl, 'apple');
  const playUrl = safeStoreUrl(release.playStoreUrl, 'google');
  const story = content.storyCopy || company.story || 'Me and Adventure Safaris is a Tanzanian-owned tourism company designing locally rooted journeys, meaningful encounters and stories that stay with you.';
  const places = destinations.length ? destinations : [
    { id: 'serengeti', slug: 'serengeti', title: 'Serengeti', description: 'The great plains.', region: 'North', coverUrl: '/assets/safari.jpg' },
    { id: 'zanzibar', slug: 'zanzibar', title: 'Zanzibar', description: 'The spice islands.', region: 'Coast', coverUrl: '/assets/zanzibar.jpg' },
    { id: 'kili', slug: 'kilimanjaro', title: 'Kilimanjaro', description: 'Africa’s highest peak.', region: 'North', coverUrl: '/assets/kilimanjaro.jpg' },
  ];
  const featured = packages[0] ?? fallbackPackages[0];
  const officeCount = company.offices?.length || 4;
  const whatsappNumber = company.whatsapp || company.phone;
  const waFloat = whatsappNumber ? whatsappHref(whatsappNumber, { utm }) : null;
  const heroCopy = content.heroCopy
    || company.mission
    || 'Explore iconic parks, coast days in Zanzibar, Kilimanjaro routes and chauffeur-driven Safari AI Rentals — planned by people who live here.';

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="ma">
      <header className="ma-top">
        <div className="ma-wrap ma-top-row">
          <a className="ma-logo" href="#home" aria-label="M&A Safaris home">
            <img src="/assets/brand-logo.png" alt="Me and Adventure Safaris" width="44" height="44"/>
            <span>M&amp;A<br/>Safaris</span>
          </a>
          <nav className={menuOpen ? 'open' : ''} aria-label="Page sections">
            {nav.map(([label, href]) => (
              <a key={label} href={href} className={href === '#home' ? 'active' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <div className="ma-top-tools">
            <form className="ma-search" onSubmit={submitSearch} role="search">
              <Icon name="search"/>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                aria-label="Search journeys"
              />
            </form>
            <a className="ma-bag" href="#destinations" aria-label={`${packages.length} journeys available`}>
              <Icon name="bag"/>
              <span>{packages.length}</span>
            </a>
            <a className="ma-btn ma-btn-orange ma-top-cta" href="#download" aria-label="Get the app">
              <span className="ma-top-cta-full">Get the app</span>
              <span className="ma-top-cta-short" aria-hidden="true">App</span>
            </a>
            <button className="ma-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <span/><span/>
            </button>
          </div>
        </div>
    </header>

      <main id="home">
        <section className="ma-hero" aria-labelledby="heroTitle">
          <div className="ma-wrap ma-hero-grid">
            <div className="ma-hero-copy">
              <p className="ma-badge">
                <span>{company.slogan || 'Explore beyond limits, discover true adventure!'}</span>
                <span className="ma-badge-dot" aria-hidden="true">
                  <img src="/assets/brand-logo.png" alt="" width="24" height="24"/>
                </span>
              </p>
              <h1 id="heroTitle" aria-label={content.heroTitle ? `${content.heroTitle} — Safaris that deliver adventure, fast!` : 'Safaris that deliver adventure, fast!'}>
                {renderHeroHeadline(content.heroTitle)}
              </h1>
              <p className="ma-lead">{heroCopy}</p>
              <div className="ma-hero-actions">
                <a className="ma-btn ma-btn-navy" href="#destinations">Explore journeys</a>
                <a className="ma-btn ma-btn-how" href="#rentals">
                  <span className="ma-play" aria-hidden="true"><Icon name="play"/></span>
                  <span>Safari AI Rentals</span>
                </a>
              </div>
              <div className="ma-trust">
                <div className="ma-avatars" aria-hidden="true">
                  <img src="/assets/safari-640.webp" alt=""/>
                  <img src="/assets/zanzibar-640.webp" alt=""/>
                  <img src="/assets/kilimanjaro-640.webp" alt=""/>
                </div>
                <div>
                  <strong>Our Tanzanian Safari Desk</strong>
                  <p>
                    <span className="ma-trust-star" aria-hidden="true">★</span>
                    <b>{officeCount} offices</b>
                    <span>({rentals.fleet.totalVehicles} Safari AI vehicles)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="ma-hero-visual" aria-label="Featured Tanzania experiences">
              <div className="ma-hero-stage">
                <div className="ma-plate">
                  <div className="ma-plate-photo">
                    <img className="ma-orbit-main" src="/assets/safari-1200.webp" alt="Wildlife safari on the Tanzanian plains" width="720" height="720"/>
                  </div>
                </div>

                <a className="ma-float ma-float-a" href="#services" aria-label="Tour guiding and wildlife safaris">
                  <img src="/assets/kilimanjaro-640.webp" alt="" width="120" height="120"/>
                  <span className="ma-float-icon" aria-hidden="true"><Icon name="mountain"/></span>
                </a>
                <a className="ma-float ma-float-b" href="#rentals" aria-label="Safari AI Rentals vehicles">
                  <img src="/assets/vehicle-640.webp" alt="" width="120" height="120"/>
                  <span className="ma-float-icon" aria-hidden="true"><Icon name="car"/></span>
                </a>
                <a className="ma-float ma-float-c" href="#destinations" aria-label="Zanzibar coast escapes">
                  <img src="/assets/zanzibar-640.webp" alt="" width="120" height="120"/>
                  <span className="ma-float-icon" aria-hidden="true"><Icon name="sun"/></span>
                </a>

                <button
                  className="ma-offer"
                  type="button"
                  aria-label={`View featured ${featured.title}`}
                  onClick={() => setSelected(featured)}
                >
                  <span className="ma-offer-tag">Featured<br/>Journey</span>
                  <span className="ma-offer-thumb">
                    <img src={imageUrl(featured)} alt="" width="84" height="84"/>
                  </span>
                  <span className="ma-offer-copy">
                    <strong>{featured.title}</strong>
                    <span className="ma-offer-stars" aria-hidden="true">★★★★★</span>
                    <span className="ma-offer-price">
                      <em>{formatFrom(featured).replace(/^From\s+/i, '')}</em>
                      <small>{featured.durationDays}d · {featured.category}</small>
                    </span>
                  </span>
                </button>

                <div className="ma-pedestal" id="download-preview">
                  <p className="ma-pedestal-bar">Also available in:</p>
                  <div className="ma-pedestal-stores">
                    <StoreBadge kind="google" href={playUrl} onComingSoon={() => setStoreNotice('store')}/>
                    <StoreBadge kind="apple" href={appUrl} onComingSoon={() => setStoreNotice('store')}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ma-ribbon" aria-label="Places and services">
          <div className="ma-ribbon-track">
            {(() => {
              const labels = [...places.slice(0, 6).map((place) => place.title), 'Safari AI Rentals', 'Tour guiding', 'Airport transfers', 'Zanzibar coast', 'Kilimanjaro'];
              return [...labels, ...labels].map((label, index) => <span key={`${label}-${index}`}>{label}</span>);
            })()}
          </div>
        </section>

        <section className="ma-section ma-experiences" id="destinations" aria-labelledby="destinationsTitle">
          <div className="ma-wrap">
            <div className="ma-exp-top">
              <div className="ma-exp-title-block">
                <p className="ma-badge ma-exp-badge">
                  <span>Experiences · Curated in Tanzania</span>
                  <span className="ma-badge-dot" aria-hidden="true"><Icon name="compass"/></span>
                </p>
                <h2 id="destinationsTitle">
                  Where do you <em>want to go?</em>
                </h2>
                <p className="ma-exp-status">
                  {catalogStatus === 'loading'
                    ? 'Checking current experiences…'
                    : catalogStatus === 'fallback'
                      ? <>Showing supplied sample journeys. Current catalog is unavailable. <button className="ma-text-btn" type="button" onClick={() => { setCatalogStatus('loading'); void load(); }}>Retry current catalog</button></>
                      : 'Published experiences. The final price depends on dates and travelers.'}
                </p>
              </div>

              <div className="ma-exp-orbits" aria-label="Popular Tanzania regions">
                {places.slice(0, 4).map((place) => (
                  <a className="ma-exp-orbit-chip" href={destPath(place.slug)} key={place.id}>
                    <span className="ma-exp-orbit-ring">
                      <img src={imageUrl(place)} alt="" width="56" height="56"/>
                      <i aria-hidden="true"><Icon name={categoryIcon(place.region, place.title)}/></i>
                    </span>
                    <div>
                      <strong>{place.title}</strong>
                      <small>{place.region || 'Tanzania'}</small>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="ma-exp-bar">
              <div className="ma-filters" role="toolbar" aria-label="Filter journeys">
                {filters.map(([id, label]) => (
                  <button key={id} type="button" className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                    <span className="ma-filter-ico" aria-hidden="true"><Icon name={filterIcons[id] || 'compass'}/></span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="ma-exp-meta-pill" aria-hidden="true">
                <span className="ma-exp-meta-dot"/>
                <strong>{visible.length}</strong> {visible.length === 1 ? 'journey ready' : 'journeys ready'}
              </div>
            </div>

            {visible.length ? (
              <div className="ma-journey-grid">
                {visible.map((item, idx) => {
                  const rawPrice = formatFrom(item);
                  const mainPrice = rawPrice.replace(/^From\s+/i, '').replace(/\s*\/\s*adult$/i, '');
                  const hasPerAdult = /\/\s*adult/i.test(rawPrice);
                  const tags = item.inclusions?.length
                    ? item.inclusions.slice(0, 3)
                    : [`${item.durationDays} days guided`, 'Private desk support', 'Tailored pace'];
                  return (
                    <a className="destination-card" key={item.id} href={pkgPath(item.slug)} aria-label={`View ${item.title}`}>
                      <span className="ma-card-stage">
                        <span className="ma-photo">
                          <img src={imageUrl(item)} alt="" width="640" height="420"/>
                        </span>
                        <span className="ma-card-days">{item.durationDays} days</span>
                        {idx === 0 ? <span className="ma-card-hot">Popular</span> : null}
                        <span className="ma-card-float-ico" aria-hidden="true">
                          <Icon name={categoryIcon(item.category, item.title)}/>
                        </span>
                      </span>

                      <span className="ma-journey-copy">
                        <span className="ma-card-meta-row">
                          <small className="ma-card-cat">{item.category}</small>
                          <span className="ma-card-stars" aria-hidden="true">★★★★★ <b>5.0</b></span>
                        </span>
                        <strong>{item.title}</strong>
                        <span className="ma-card-desc">{item.description}</span>
                        <span className="ma-card-chips" aria-hidden="true">
                          {tags.map((tag) => <i key={tag}>{tag}</i>)}
                        </span>
                        <span className="ma-card-foot">
                          <span className="ma-card-price">
                            <u aria-hidden="true">From</u>
                            <em>{mainPrice}</em>
                            {hasPerAdult ? <dfn>/ adult</dfn> : null}
                          </span>
                          <span className="ma-card-cta" aria-hidden="true">
                            <span>View journey</span>
                            <b><Icon name="arrow"/></b>
                          </span>
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="ma-empty">
                <h3>{packages.length ? 'Let your curiosity take another direction.' : 'New journeys are being prepared.'}</h3>
                <button className="ma-btn ma-btn-orange" type="button" onClick={() => { setFilter('all'); setSearch(''); }}>Show all journeys</button>
              </div>
            )}
          </div>
        </section>

        <section className="ma-section ma-story-band" id="our-story" aria-labelledby="storyTitle">
          <div className="ma-wrap ma-story">
            <div className="ma-story-copy">
              <p className="ma-badge ma-story-badge">
                <span>Our story · Tanzanian-owned &amp; operated</span>
                <span className="ma-badge-dot" aria-hidden="true"><Icon name="heart"/></span>
              </p>
              <h2 id="storyTitle" className="ma-two-tone">
                {renderTwoToneName(company.name)}
              </h2>

              <div className="ma-story-quote-card">
                <span className="ma-story-quote-tag" aria-hidden="true">Our Promise</span>
                <p className="ma-motto">{company.motto || 'Your gateway to authentic Tanzania.'}</p>
                <p className="ma-story-body">{story}</p>
                {company.vision ? <p className="ma-story-vision">{company.vision}</p> : null}
                <div className="ma-story-reg-row">
                  <span className="ma-reg-pill">
                    <i aria-hidden="true"><Icon name="map-pin"/></i>
                    <span>
                      {company.registrationNumber
                        ? `Registration ${company.registrationNumber}${company.headquarters ? ` · ${company.headquarters}` : ''}`
                        : (company.headquarters || 'Arusha · Dar es Salaam · Moshi · Zanzibar')}
                    </span>
                  </span>
                  <a className="ma-story-cta" href="#contact">
                    <span>Meet the desk</span>
                    <b aria-hidden="true"><Icon name="arrow"/></b>
                  </a>
                </div>
              </div>

              <div className="ma-values-block">
                <span className="ma-values-label" aria-hidden="true">What guides every journey</span>
                <ul className="ma-values">
                  {(company.values?.length ? company.values : ['Authentic experiences', 'Guest safety', 'Environmental care', 'Community benefit']).slice(0, 8).map((value, idx) => (
                    <li key={value}>
                      <i aria-hidden="true"><Icon name={valueIcons[idx % valueIcons.length]}/></i>
                      <span>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="ma-story-visual">
              <div className="ma-story-stage" aria-hidden="true">
                <div className="ma-story-plate">
                  <div className="ma-story-plate-inner">
                    <img src="/assets/zanzibar-1200.webp" alt="" width="520" height="520"/>
                  </div>
                </div>

                <div className="ma-story-orb ma-story-orb-a">
                  <img src="/assets/safari-640.webp" alt="" width="110" height="110"/>
                  <span><Icon name="binoculars"/></span>
                </div>
                <div className="ma-story-orb ma-story-orb-b">
                  <img src="/assets/kilimanjaro-640.webp" alt="" width="110" height="110"/>
                  <span><Icon name="mountain"/></span>
                </div>

                <div className="ma-story-float-card">
                  <span className="ma-story-float-badge">Locally Rooted</span>
                  <img src="/assets/brand-logo.png" alt="" width="56" height="56"/>
                  <div>
                    <strong>Designed in Tanzania</strong>
                    <span className="ma-offer-stars">★★★★★</span>
                    <small>{officeCount} offices · {rentals.fleet.totalVehicles} Safari AI vehicles</small>
                  </div>
                </div>
              </div>

              <div className="ma-divisions">
                {(company.productDivisions?.length
                  ? company.productDivisions
                  : [
                      { slug: 'safaris', title: 'Me & Adventure Safaris', focus: 'Tailor-made wildlife safaris, Kilimanjaro treks, and Zanzibar island escapes.' },
                      { slug: 'rentals', title: 'Safari AI Rentals', focus: 'Chauffeur-driven 4×4 expedition cruisers, executive SUVs, and airport transfers.' },
                    ]
                ).map((division, idx) => (
                  <article key={division.slug || division.title}>
                    <span className="ma-div-ico" aria-hidden="true">
                      <Icon name={divisionIcons[idx % divisionIcons.length]}/>
                    </span>
                    <div className="ma-div-copy">
                      <strong>{division.title}</strong>
                      <p>{division.focus}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="ma-section ma-band-peach" id="services" aria-labelledby="servicesTitle">
          <div className="ma-wrap">
            <p className="ma-badge ma-exp-badge">
              <span>How we help · End-to-end safari desk</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="sparkles"/></span>
            </p>
            <h2 id="servicesTitle" className="ma-two-tone">One company, <em>the whole trip.</em></h2>
            <div className="ma-service-grid">
              {services.slice(0, 8).map((service, index) => (
                <article key={service.id}>
                  <span><Icon name={serviceIcons[index % serviceIcons.length]}/></span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ma-section ma-rentals-band" id="rentals" aria-labelledby="rentalsTitle">
          <div className="ma-wrap">
            <div className="ma-rentals">
              <div className="ma-rentals-hero">
                <div className="ma-rentals-copy">
                  <p className="ma-badge ma-rentals-badge">
                    <span>Safari AI Rentals · Chauffeur &amp; expedition fleet</span>
                    <span className="ma-badge-dot" aria-hidden="true"><Icon name="car"/></span>
                  </p>
                  <h2 id="rentalsTitle" className="ma-two-tone">
                    {renderTwoToneName(rentals.name || 'Safari AI Rentals')}
                  </h2>
                  <p className="ma-rentals-tagline">{rentals.tagline}</p>

                  <div className="ma-fleet-pills">
                    <span className="ma-fleet-main">
                      <i aria-hidden="true"><Icon name="car"/></i>
                      <strong>{rentals.fleet.totalVehicles} vehicles available</strong>
                    </span>
                    {rentals.fleet.segments.map((item) => (
                      <span className="ma-fleet-seg" key={item.segment}>
                        <b>{item.vehicles}</b> {item.segment}
                      </span>
                    ))}
                  </div>

                  {rentals.policy.policy?.summary ? (
                    <div className="ma-policy-card">
                      <span className="ma-policy-tag" aria-hidden="true">Chauffeur Policy</span>
                      <p className="ma-policy">{rentals.policy.policy.summary}</p>
                      <div className="ma-policy-foot">
                        <span>Written confirmation · Route, vehicle &amp; driver assigned</span>
                        <a className="ma-story-cta" href="#contact">
                          <span>Request a vehicle</span>
                          <b aria-hidden="true"><Icon name="arrow"/></b>
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="ma-rentals-stage" aria-hidden="true">
                  <div className="ma-rentals-plate">
                    <div className="ma-rentals-plate-inner">
                      <img src="/assets/vehicle-1200.webp" alt="" width="560" height="560"/>
                    </div>
                  </div>

                  <div className="ma-rentals-orb ma-rentals-orb-a">
                    <img src="/assets/safari-640.webp" alt="" width="110" height="110"/>
                    <span><Icon name="binoculars"/></span>
                  </div>
                  <div className="ma-rentals-orb ma-rentals-orb-b">
                    <img src="/assets/kilimanjaro-640.webp" alt="" width="110" height="110"/>
                    <span><Icon name="compass"/></span>
                  </div>

                  <div className="ma-rentals-offer">
                    <span className="ma-offer-tag">Chauffeur<br/>Included</span>
                    <span className="ma-offer-thumb">
                      <img src="/assets/vehicle-640.webp" alt="" width="76" height="76"/>
                    </span>
                    <span className="ma-offer-copy">
                      <strong>{rentals.featured[0] ? rentalVehicleName(rentals.featured[0]) : '4×4 Safari Land Cruiser'}</strong>
                      <span className="ma-offer-stars">★★★★★</span>
                      <span className="ma-offer-price">
                        <em>{rentals.featured[0] ? formatRentalRate(rentals.featured[0]) : `${rentals.fleet.totalVehicles} vehicles`}</em>
                        <small>Arusha &amp; nationwide</small>
                      </span>
                    </span>
                  </div>

                  <div className="ma-rentals-pedestal">
                    <p>Every hire includes a company-approved driver</p>
                    <div className="ma-rentals-pedestal-row">
                      <span><i>✓</i> Airport pickup</span>
                      <span><i>✓</i> Park-ready 4×4</span>
                      <span><i>✓</i> VIP &amp; corporate</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ma-line-grid">
                {rentals.services.map((line, idx) => (
                  <article key={line.slug}>
                    <div className="ma-line-top">
                      <span className="ma-line-ico" aria-hidden="true">
                        <Icon name={rentalLineIcons[idx % rentalLineIcons.length]}/>
                      </span>
                      <span className="ma-line-num" aria-hidden="true">0{idx + 1}</span>
                    </div>
                    <h3>{line.title}</h3>
                    <p>{line.tagline}</p>
                    {line.useCases?.length ? (
                      <ul>{line.useCases.slice(0, 4).map((use) => <li key={use}>{use}</li>)}</ul>
                    ) : null}
                  </article>
                ))}
              </div>

              {rentals.featured.length ? (
                <div className="ma-vehicle-grid">
                  {rentals.featured.slice(0, 4).map((vehicle) => (
                    <article key={vehicle.id}>
                      <div className="ma-veh-head">
                        <span className="ma-veh-thumb" aria-hidden="true">
                          <img src="/assets/vehicle-640.webp" alt="" width="64" height="64"/>
                        </span>
                        <div>
                          <strong>{rentalVehicleName(vehicle)}</strong>
                          <small>{vehicle.segment} · {vehicle.seats} seats{vehicle.chauffeurDriven ? ' · chauffeur' : ''}</small>
                        </div>
                      </div>
                      <div className="ma-veh-foot">
                        <em>{formatRentalRate(vehicle)}</em>
                        <a className="ma-card-cta" href="#contact" aria-hidden="true">
                          <span>Reserve</span>
                          <b><Icon name="arrow"/></b>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ma-section ma-app ma-band-peach" id="app-experience" aria-labelledby="appTitle">
          <div className="ma-wrap">
            <div className="ma-app-head">
              <p className="ma-badge ma-app-badge">
                <span>In your pocket · M&amp;A Safaris iOS &amp; Android App</span>
                <span className="ma-badge-dot" aria-hidden="true"><Icon name="compass"/></span>
              </p>
              <h2 id="appTitle" className="ma-two-tone">The same desk, <em>on your phone.</em></h2>
              <p className="ma-app-sub">
                Explore journeys, save what you like, track live Arusha pickups, and request a Safari AI Rentals vehicle. Your account is the same one our Tanzania desk and guides use to confirm and run the trip.
              </p>

              <div className="ma-app-pillbar" role="tablist" aria-label="App screen previews">
                {appScreens.map((scr, idx) => (
                  <button
                    key={scr.id}
                    type="button"
                    role="tab"
                    aria-selected={activeScreen === idx}
                    className={activeScreen === idx ? 'active' : ''}
                    onClick={() => setActiveScreen(idx)}
                  >
                    <b>{scr.num}</b>
                    <span>{scr.title}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`ma-app-autoplay ${autoPlayApp ? 'playing' : 'paused'}`}
                  onClick={() => setAutoPlayApp((v) => !v)}
                  aria-label={autoPlayApp ? 'Pause screen auto-switch' : 'Resume screen auto-switch'}
                >
                  <i aria-hidden="true"/>
                  <span>{autoPlayApp ? 'Auto-switching' : 'Paused'}</span>
                </button>
              </div>
            </div>

            <div
              className="ma-app-showcase"
              onMouseEnter={() => setAutoPlayApp(false)}
              onMouseLeave={() => setAutoPlayApp(true)}
            >
              <div className="ma-app-side ma-app-side-left" aria-label="Customer and guide trip menus">
                {appScreens.slice(0, 4).map((scr, idx) => {
                  const isActive = activeScreen === idx;
                  return (
                    <button
                      key={scr.id}
                      type="button"
                      className={`ma-app-menu-card ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveScreen(idx)}
                    >
                      <span className="ma-app-card-thumb" aria-hidden="true">
                        <img src={scr.src} alt="" width="52" height="112"/>
                      </span>
                      <span className="ma-app-card-body">
                        <span className="ma-app-card-top">
                          <span className="ma-app-card-ico" aria-hidden="true"><Icon name={scr.icon}/></span>
                          <small className="ma-app-card-role">{scr.role}</small>
                          <b className="ma-app-card-num">{scr.num}</b>
                        </span>
                        <strong>{scr.title}</strong>
                        <span className="ma-app-card-desc">{scr.subtitle}</span>
                        <span className="ma-app-card-chip">{scr.chip}</span>
                      </span>
                      <span className="ma-app-card-bar" aria-hidden="true">
                        <i key={`${scr.id}-${isActive ? 'on' : 'off'}`} className={isActive && autoPlayApp ? 'anim' : isActive ? 'full' : ''}/>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ma-app-center">
                <div className="ma-app-halo" aria-hidden="true"/>
                <div className="ma-app-orb ma-app-orb-a" aria-hidden="true">
                  <img src="/assets/safari-640.webp" alt="" width="86" height="86"/>
                  <span><Icon name="binoculars"/></span>
                </div>
                <div className="ma-app-orb ma-app-orb-b" aria-hidden="true">
                  <img src="/assets/vehicle-640.webp" alt="" width="86" height="86"/>
                  <span><Icon name="car"/></span>
                </div>

                <div className="ma-iphone18" aria-live="polite">
                  <span className="ma-ip18-btn ma-ip18-action" aria-hidden="true"/>
                  <span className="ma-ip18-btn ma-ip18-vol-up" aria-hidden="true"/>
                  <span className="ma-ip18-btn ma-ip18-vol-dn" aria-hidden="true"/>
                  <span className="ma-ip18-btn ma-ip18-power" aria-hidden="true"/>
                  <span className="ma-ip18-btn ma-ip18-cam" aria-hidden="true"/>

                  <div className="ma-ip18-bezel">
                    <div className="ma-ip18-island" aria-hidden="true">
                      <span className="ma-ip18-cam-dot"/>
                      <span className="ma-ip18-live-pill"/>
                    </div>

                    <div className="ma-ip18-screen">
                      {appScreens.map((scr, idx) => (
                        <div
                          key={scr.id}
                          className={`ma-ip18-slide ${activeScreen === idx ? 'active' : idx < activeScreen ? 'prev' : 'next'}`}
                          aria-hidden={activeScreen !== idx}
                        >
                          <img src={scr.src} alt={`${scr.title} — ${scr.subtitle}`} width="473" height="1024"/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ma-app-stage-dock">
                  <div className="ma-app-active-meta">
                    <span className="ma-app-active-num">{appScreens[activeScreen].num} / 07</span>
                    <div>
                      <strong>{appScreens[activeScreen].title}</strong>
                      <small>{appScreens[activeScreen].role} · {appScreens[activeScreen].chip}</small>
                    </div>
                  </div>
                  <div className="ma-app-dots" aria-label="Screen slide indicators">
                    {appScreens.map((scr, idx) => (
                      <button
                        key={scr.id}
                        type="button"
                        className={activeScreen === idx ? 'active' : ''}
                        aria-label={`Show screen ${scr.num}: ${scr.title}`}
                        onClick={() => setActiveScreen(idx)}
                      />
                    ))}
                  </div>
                </div>

                <div className="ma-app-pedestal">
                  <p>One unified app · Customer, Guide &amp; Safari AI Rentals</p>
                  <div className="ma-app-pedestal-badges">
                    <span><i>✓</i> Journeys &amp; TZS rates</span>
                    <span><i>✓</i> Live guide pickup</span>
                    <span><i>✓</i> 24/7 Arusha desk</span>
                  </div>
                </div>
              </div>

              <div className="ma-app-side ma-app-side-right" aria-label="Support, notifications and account menus">
                {appScreens.slice(4).map((scr, offset) => {
                  const idx = offset + 4;
                  const isActive = activeScreen === idx;
                  return (
                    <button
                      key={scr.id}
                      type="button"
                      className={`ma-app-menu-card ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveScreen(idx)}
                    >
                      <span className="ma-app-card-thumb" aria-hidden="true">
                        <img src={scr.src} alt="" width="52" height="112"/>
                      </span>
                      <span className="ma-app-card-body">
                        <span className="ma-app-card-top">
                          <span className="ma-app-card-ico" aria-hidden="true"><Icon name={scr.icon}/></span>
                          <small className="ma-app-card-role">{scr.role}</small>
                          <b className="ma-app-card-num">{scr.num}</b>
                        </span>
                        <strong>{scr.title}</strong>
                        <span className="ma-app-card-desc">{scr.subtitle}</span>
                        <span className="ma-app-card-chip">{scr.chip}</span>
                      </span>
                      <span className="ma-app-card-bar" aria-hidden="true">
                        <i key={`${scr.id}-${isActive ? 'on' : 'off'}`} className={isActive && autoPlayApp ? 'anim' : isActive ? 'full' : ''}/>
                      </span>
                    </button>
                  );
                })}

                <div className="ma-app-sync-card">
                  <span className="ma-policy-tag" aria-hidden="true">Desk Sync</span>
                  <strong>Connected to our Arusha &amp; Zanzibar teams</strong>
                  <p>Every saved journey, chauffeur hire, and pickup status syncs in real time with the M&amp;A operations desk.</p>
                  <a className="ma-story-cta" href="#download">
                    <span>Get the mobile app</span>
                    <b aria-hidden="true"><Icon name="arrow"/></b>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ma-download" id="download" aria-labelledby="downloadTitle">
          <div className="ma-wrap">
            <div className="ma-download-card">
              <div className="ma-download-copy">
                <p className="ma-badge ma-download-badge">
                  <span>The app · iOS &amp; Android companion</span>
                  <span className="ma-badge-dot" aria-hidden="true"><Icon name="sparkles"/></span>
                </p>
                <h2 id="downloadTitle" className="ma-two-tone">
                  Take the journey <em>with you.</em>
                </h2>
                <p className="ma-download-lead">
                  Browse on the web today. The iPhone and Android apps open the same catalog when the stores approve them.
                </p>
                <div className="ma-download-chips" aria-hidden="true">
                  <span><i>✓</i> Offline itinerary access</span>
                  <span><i>✓</i> Live driver &amp; pickup updates</span>
                  <span><i>✓</i> Direct Arusha desk chat</span>
                </div>
              </div>

              <div className="ma-download-stage">
                <div className="ma-download-plate" aria-hidden="true">
                  <div className="ma-download-plate-inner">
                    <img src="/assets/app-screens/screen-explore.jpg" alt="" width="240" height="520"/>
                  </div>
                  <div className="ma-download-orb ma-download-orb-a">
                    <img src="/assets/safari-640.webp" alt="" width="72" height="72"/>
                    <span><Icon name="binoculars"/></span>
                  </div>
                  <div className="ma-download-orb ma-download-orb-b">
                    <img src="/assets/zanzibar-640.webp" alt="" width="72" height="72"/>
                    <span><Icon name="sun"/></span>
                  </div>
                </div>

                <div className="ma-download-pedestal">
                  <p className="ma-download-bar">Available on iPhone &amp; Android:</p>
                  <div className="ma-stores">
                    <a className="ma-store-badge ma-apk-badge" href={ANDROID_PAGE_PATH}>
                      <span className="ma-store-icon" aria-hidden="true"><Icon name="download" /></span>
                      <span className="ma-store-text">
                        <small>ANDROID · v{ANDROID_APP.version}</small>
                        <strong>Download APK</strong>
                      </span>
                    </a>
                    <StoreBadge kind="google" href={playUrl} onComingSoon={() => setStoreNotice('store')}/>
                    <StoreBadge kind="apple" href={appUrl} onComingSoon={() => setStoreNotice('store')}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ma-section ma-band-cream ma-contact-band" id="contact" aria-labelledby="contactTitle">
          <div className="ma-wrap">
            <div className="ma-contact-hero">
              <div className="ma-contact-head">
                <p className="ma-badge ma-exp-badge">
                  <span>Contact · Arusha &amp; across Tanzania</span>
                  <span className="ma-badge-dot" aria-hidden="true"><Icon name="map-pin"/></span>
                </p>
                <h2 id="contactTitle" className="ma-two-tone">The desk is <em>in Tanzania.</em></h2>
                <p className="ma-contact-lead">
                  Speak directly with our local safari planners and Safari AI Rentals coordinators in Arusha, Dar es Salaam, Morogoro, and Moshi.
                </p>
              </div>

              <div className="ma-contact">
                <a className="ma-contact-card" href={`mailto:${encodeURIComponent(company.email)}`}>
                  <span className="ma-contact-ico" aria-hidden="true"><Icon name="sparkles"/></span>
                  <span className="ma-contact-meta">
                    <small>Email the safari desk</small>
                    <strong>{company.email}</strong>
                  </span>
                  <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow"/></b>
                </a>

                <a className="ma-contact-card" href={`tel:${company.phone.replace(/\s/g, '')}`}>
                  <span className="ma-contact-ico" aria-hidden="true"><Icon name="compass"/></span>
                  <span className="ma-contact-meta">
                    <small>Direct phone line</small>
                    <strong>{company.phone}</strong>
                  </span>
                  <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow"/></b>
                </a>

                {company.whatsapp || company.phone ? (
                  <a className="ma-contact-card ma-contact-wa" href={whatsappHref(company.whatsapp || company.phone, { utm }) ?? undefined} target="_blank" rel="noreferrer">
                    <span className="ma-contact-ico" aria-hidden="true"><Icon name="heart"/></span>
                    <span className="ma-contact-meta">
                      <small>Instant chat · {company.whatsapp || company.phone}</small>
                      <strong>WhatsApp</strong>
                    </span>
                    <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow"/></b>
                  </a>
                ) : null}

                {company.instagram ? (
                  <a className="ma-contact-card" href={`https://instagram.com/${company.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
                    <span className="ma-contact-ico" aria-hidden="true"><Icon name="sun"/></span>
                    <span className="ma-contact-meta">
                      <small>Follow field stories</small>
                      <strong>{company.instagram}</strong>
                    </span>
                    <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow"/></b>
                  </a>
                ) : null}
              </div>
            </div>

            <div className="ma-contact-form-band" id="enquiry">
              <div className="ma-contact-form-copy">
                <p className="ma-badge ma-exp-badge">
                  <span>Plan your trip · No deposit to ask</span>
                  <span className="ma-badge-dot" aria-hidden="true"><Icon name="compass"/></span>
                </p>
                <h3 className="ma-two-tone">Tell us the feeling. <em>We handle the details.</em></h3>
                <p>
                  Every journey is quoted in writing by a local planner in Arusha. Share your dates and group, and we reply
                  with a personal itinerary, lodge options and a clear price.
                </p>
                <ul className="ma-trust-points">
                  <li><i aria-hidden="true">✓</i> Reply within one working day</li>
                  <li><i aria-hidden="true">✓</i> 30% deposit, balance 7 days before travel</li>
                  <li><i aria-hidden="true">✓</i> Tanzanian-owned desk, {officeCount} offices</li>
                </ul>
                <a className="ma-story-cta" href="/contact/">
                  <span>Open the contact page</span>
                  <b aria-hidden="true"><Icon name="arrow"/></b>
                </a>
              </div>
              <div className="ma-contact-form-card">
                <InquiryForm
                  source="WEBSITE_CONTACT"
                  whatsapp={company.whatsapp || company.phone}
                  heading="Request a safari quote"
                  intro="Fields marked * are required. We never share your details with third parties."
                  submitLabel="Request my quote"
                />
              </div>
            </div>

            {company.offices?.length ? (
              <div className="ma-offices-block">
                <div className="ma-offices-head">
                  <span className="ma-values-label">Our Regional Offices · Walk-in &amp; Operations</span>
                  <span className="ma-exp-count">{company.offices.length} branches across Tanzania</span>
                </div>
                <div className="ma-offices">
                  {company.offices.map((office, idx) => (
                    <article key={office.label} className="ma-office-card">
                      <div className="ma-office-top">
                        <span className="ma-office-ico" aria-hidden="true">
                          <Icon name={idx === 3 ? 'car' : 'map-pin'}/>
                        </span>
                        <span className="ma-office-num" aria-hidden="true">0{idx + 1}</span>
                      </div>
                      <strong>{office.label}</strong>
                      <p>{[office.city, office.address].filter(Boolean).join(' · ')}</p>
                      {office.phone ? (
                        <div className="ma-office-foot">
                          <a href={`tel:${office.phone.replace(/\s/g, '')}`}>
                            <span>{office.phone}</span>
                            <b aria-hidden="true"><Icon name="arrow"/></b>
                          </a>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
      </section>
      </main>

      <footer className="ma-footer">
        <div className="ma-wrap">
          <div className="ma-footer-card">
            <div className="ma-footer-top">
              <div className="ma-footer-brand">
                <a className="ma-logo" href="#home" aria-label="M&A Safaris home">
                  <img src="/assets/brand-logo.png" alt="Me and Adventure Safaris" width="48" height="48"/>
                  <span>M&amp;A Safaris</span>
                </a>
                <p className="ma-footer-slogan">{company.slogan || 'Explore beyond limits, discover true adventure!'}</p>
                <div className="ma-footer-pills">
                  <span><i>✓</i> Tanzanian-owned</span>
                  <span><i>✓</i> Private 4×4 fleet</span>
                  <span><i>✓</i> 24/7 Arusha desk</span>
                </div>
              </div>

              <div className="ma-footer-col">
                <strong>Explore</strong>
                <ul>
                  {nav.map(([label, href]) => (
                    <li key={label}><a href={href}>{label}</a></li>
                  ))}
                </ul>
              </div>

              <div className="ma-footer-col">
                <strong>Signature Regions</strong>
                <ul>
                  {places.slice(0, 3).map((place) => (
                    <li key={place.id}><a href={destPath(place.slug)}>{place.title}</a></li>
                  ))}
                  <li><a href="#rentals">Safari AI Chauffeur Fleet</a></li>
                </ul>
              </div>

              <div className="ma-footer-col ma-footer-app">
                <div className="ma-footer-pedestal">
                  <p className="ma-footer-pedestal-bar">Mobile Companion · iOS &amp; Android</p>
                  <div className="ma-footer-pedestal-body">
                    <small>Same catalog &amp; live trip desk on iPhone and Android.</small>
                    <div className="ma-footer-stores">
                      <StoreBadge kind="google" href={playUrl} onComingSoon={() => setStoreNotice('store')}/>
                      <StoreBadge kind="apple" href={appUrl} onComingSoon={() => setStoreNotice('store')}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <div className="ma-footer-bottom">
              <small>© {new Date().getFullYear()} {company.name}. Journeys are confirmed by the team before you travel.</small>
              <div className="ma-footer-actions">
                <a className="ma-footer-top-link" href="/contact/">Contact the desk</a>
                <a className="ma-footer-top-link" href="/portal/">Customer sign in</a>
                <a className="ma-footer-top-link" href="/admin/">Staff login</a>
                <a className="ma-footer-top-link" href="#home">Back to top ↑</a>
                <button className="ma-footer-credits-btn" type="button" onClick={() => setStoreNotice('credits')}>Photo &amp; font credits</button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {waFloat ? (
        <a className="ma-wa-float" href={waFloat} target="_blank" rel="noreferrer" aria-label="Chat with the M&A Safaris desk on WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15.02L2 22l5.1-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.02a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.02.89.9-2.95-.2-.3a8.1 8.1 0 1 1 6.75 3.67Zm4.44-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg>
          <span>WhatsApp</span>
        </a>
      ) : null}

      {selected ? (
        <Modal title={selected.title} close={close}>
          <p className="ma-meta">
            {selected.durationDays} days · {selected.category} · {formatFrom(selected)}
            {selected.demoRate || catalogStatus === 'fallback' ? ' · Demonstration rate, awaiting owner approval.' : ' · Final price confirmed by the team.'}
          </p>
          <p>{selected.description}</p>
          {selected.itinerary?.days?.length ? (
            <ol className="ma-days">
              {selected.itinerary.days.map((day, index) => (
                <li key={`${day.day}-${day.title}`}>
                  <strong>Day {day.day || index + 1} · {day.title}</strong>
                  {day.description ? <span>{day.description}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
          {selected.inclusions?.length ? <p><strong>Included. </strong>{selected.inclusions.join(' · ')}</p> : null}
          {selected.exclusions?.length ? <p><strong>Not included. </strong>{selected.exclusions.join(' · ')}</p> : null}
          <div className="ma-dialog-cta">
            <a
              className="ma-wa-btn"
              href={whatsappHref(company.whatsapp || company.phone, {
                packageTitle: selected.title,
                reference: packageReference(selected.slug),
                utm,
                page: typeof window === 'undefined' ? undefined : window.location.href.slice(0, 300),
              }) || '#'}
              target="_blank"
              rel="noreferrer"
            >
              Ask on WhatsApp
            </a>
            <a className="ma-text-btn" href={`mailto:${company.email}?subject=${encodeURIComponent(selected.title)}`}>Email the desk</a>
            <a className="ma-text-btn" href={pkgPath(selected.slug)}>Full journey page</a>
          </div>
          <div className="ma-dialog-form">
            <InquiryForm
              source="WEBSITE_PACKAGE"
              packageSlug={selected.slug}
              packageTitle={selected.title}
              whatsapp={company.whatsapp || company.phone}
              heading="Plan this journey"
              intro="Ask about dates, lodges and group size. The desk replies with a written quote — no deposit needed to ask."
              submitLabel="Request this journey"
            />
          </div>
        </Modal>
      ) : null}
      {storeNotice ? (
        <Modal title={storeNotice === 'credits' ? 'Photo & font credits' : 'Store release'} close={() => setStoreNotice('')}>
          {storeNotice === 'credits' ? (
            <ul className="ma-credits">{photoCredits.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}</ul>
          ) : (
            <p>The store release is not available yet. You can keep exploring every journey on this page.</p>
          )}
        </Modal>
      ) : null}
      <AppDownloadPopup />
    </div>
  );
}
