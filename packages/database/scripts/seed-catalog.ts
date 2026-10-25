/**
 * Production-safe catalogue seed.
 *
 * Unlike `prisma/seed.ts` this never creates demo people, bookings, payments or
 * test fixtures — it publishes only the real M&A Safaris business profile, the
 * service catalogue, destinations, the Safari AI Rentals lines/policy, the
 * vehicle register and the three signature journeys. Everything is upserted by
 * its natural key, so it is safe to re-run.
 *
 *   NODE_ENV=production node --env-file=/etc/ma-safaris/api.env \
 *     --import tsx packages/database/scripts/seed-catalog.ts
 */
import { config } from 'dotenv';
import { createDatabase } from '../src/index.js';

config({ path: '../../.env', quiet: true });

if (process.env.NODE_ENV !== 'production') {
  throw new Error('This catalogue seed targets production data only. Use pnpm db:seed for local fixtures.');
}

const db = createDatabase();
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const companyProfile = {
  name: 'Me and Adventure Safaris', shortName: 'M&A Safaris',
  email: 'meandadventuretz@gmail.com', phone: '+255 682 886 259',
  tagline: 'Your Gateway to Authentic Tanzania', story: 'We listen. We plan. We experience.',
  slogan: 'Explore beyond limits, discover true adventure!',
  motto: "Tanzania - more than a destination, it's a feeling.",
  website: 'meandadventuresafaris.com', whatsapp: '0682 886 259',
  instagram: '@me_and_adventure_safari', hashtag: '#MeAndAdventureSafari',
  registrationNumber: 'ET 506 DTD',
  headquarters: 'Arusha, Sanawari ya Juu',
  offices: [
    { label: 'Head office', city: 'Arusha', address: 'Sanawari ya Juu', phone: '+255 741 486 256' },
    { label: 'Dar es Salaam office', city: 'Dar es Salaam', address: 'Ubungo', phone: '+255 741 486 256' },
    { label: 'Morogoro branch', city: 'Morogoro', address: 'Morogoro', phone: '+255 741 486 256' },
    { label: 'Vehicle operations', city: 'Moshi', address: 'Moshi', phone: '+255 682 886 259' },
  ],
  contactNumbers: ['+255 741 486 256', '+255 68 288 6259', '+255 65 402 1222', '0741 486 259'],
  mission: 'To deliver exceptional, safe, accessible and unforgettable travel experiences across Tanzania while creating meaningful connections between travellers, local communities, nature and culture - contributing to responsible tourism, conservation and local economic opportunities.',
  vision: "To become one of Tanzania's most trusted and innovative tourism brands and a leading gateway to authentic African adventure, recognised for personalised service, local expertise, responsible travel and memorable experiences.",
  values: ['Professional & reliable', 'Passionate about Africa', 'Customer-focused', 'Locally knowledgeable', 'Flexible & innovative', 'Authentic & responsible', 'Safety-conscious', 'Memorable by design'],
  whyChooseUs: ['Travel planning matched to your interests', 'Genuine local expertise', 'Flexible, tailor-made itineraries', 'Professional customer care', 'Quality vehicles and experienced drivers', 'Competitive, transparent packages', 'Genuine Tanzanian hospitality', 'Responsible travel with community benefit'],
  responsibleTravel: 'We believe tourism should protect nature, respect culture and create positive impact. We support conservation, encourage responsible travel and promote local community benefits.',
  travellerSegments: ['International tourists', 'Domestic travellers', 'Families', 'Couples & honeymooners', 'Adventure seekers', 'Luxury travellers', 'Corporate groups', 'Schools & institutions', 'Photographers & filmmakers', 'Wildlife enthusiasts'],
  tourismCategories: ['Wildlife & Safari Tourism', 'Adventure & Outdoor Tourism', 'Cultural, Community & Heritage Tourism', 'Marine, Beach & Water Tourism', 'Nature, Conservation & Educational Tourism', 'Specialised & Emerging Tourism', 'Additional Niche Products'],
  productDivisions: [
    { slug: 'wildlife-journeys', title: 'Me & Adventure Wildlife Journeys', focus: 'Wildlife safaris, Great Migration, birdwatching, photographic safaris and luxury safari experiences.' },
    { slug: 'outdoor-escapes', title: 'Me & Adventure Outdoor Escapes', focus: 'Kilimanjaro, trekking, waterfalls, cycling, camping and outdoor adventures.' },
    { slug: 'cultural-encounters', title: 'Me & Adventure Cultural Encounters', focus: 'Heritage, community tourism, food, village experiences, pastoralism and traditional knowledge.' },
    { slug: 'coastal-island-escapes', title: 'Me & Adventure Coastal & Island Escapes', focus: 'Zanzibar, Pemba, Mafia Island, beaches, diving, snorkelling and marine experiences.' },
    { slug: 'conservation-discovery', title: 'Me & Adventure Conservation & Discovery', focus: 'Conservation learning, educational trips, research, ecotourism, mining, geology and agricultural tours.' },
    { slug: 'private-special-journeys', title: 'Me & Adventure Private & Special Journeys', focus: 'Honeymoons, family holidays, corporate retreats, events, private transfers and tailor-made itineraries.' },
  ],
  defaultLocale: 'en', supportedLocales: ['en', 'sw'], timezone: 'Africa/Dar_es_Salaam',
  currency: 'USD', mainCurrency: 'TZS', depositBasisPoints: 3000,
  androidStoreUrl: null, iosStoreUrl: null, releaseState: 'COMING_SOON', developmentExample: false,
};

const services: Array<[string, string, 'CUSTOM' | 'PACKAGE', string]> = [
  ['wildlife-safaris', 'Wildlife Safaris & Game Drives', 'PACKAGE', 'Big-game drives and guided days in the Serengeti, Tarangire, Lake Manyara, Nyerere National Park and beyond.'],
  ['private-group', 'Private & Group Safaris', 'CUSTOM', 'Flexible safari options for individuals, families and groups, with private vehicles and dedicated guides.'],
  ['day-trips', 'Day Trips & Excursions', 'CUSTOM', 'Short adventures around Arusha, Moshi, Materuni, Chemka and other key destinations.'],
  ['airport-transfers', 'Airport Transfers', 'CUSTOM', 'Reliable, comfortable airport pick-up and drop-off through Safari AI Rentals.'],
  ['honeymoon', 'Honeymoon & Romantic Getaways', 'CUSTOM', 'Celebrate love with unforgettable safari and beach experiences in Tanzania and Zanzibar.'],
  ['family-luxury', 'Family & Luxury Safaris', 'CUSTOM', 'Comfort, safety and memorable adventures for families, plus premium lodges and exclusive camps.'],
  ['cultural', 'Cultural & Community Experiences', 'CUSTOM', 'Community-led experiences with Maasai, Chagga, Iraqw, Hadzabe, Datoga and other communities.'],
  ['kilimanjaro', 'Mount Kilimanjaro Adventures', 'PACKAGE', "Experience the challenge and achievement of Africa's highest peak, plus Mount Meru and trekking routes."],
  ['zanzibar', 'Beach & Zanzibar Holidays', 'PACKAGE', 'Combine safari adventure with relaxing beach and island escapes on Zanzibar, Pemba and Mafia.'],
  ['corporate-school', 'Corporate, School & Group Travel', 'CUSTOM', 'Professional travel solutions for companies, organisations, schools and institutions.'],
  ['safari-ai-rentals', 'Car Rental & Chauffeur Services', 'CUSTOM', 'Safari AI Rentals: chauffeur-driven vehicle rental, VIP mobility, transfers and long-term corporate hire.'],
  ['tailor-made', 'Customized & Tailor-Made Itineraries', 'CUSTOM', 'Journeys designed around your interests, time and budget - planned with genuine local expertise.'],
];

const destinations: Array<[string, string, string]> = [
  ['Arusha', 'Tanzania', 'The safari capital at the foot of Mount Meru, and the gateway to the northern circuit.'],
  ['Tarangire', 'Tanzania', 'Baobab-studded park famous for large elephant herds and the Tarangire River.'],
  ['Lake Manyara', 'Tanzania', 'Rift Valley lake park known for tree-climbing lions, flamingos and birdlife.'],
  ['Ngorongoro', 'Tanzania', 'The Ngorongoro Crater - a UNESCO World Heritage caldera teeming with wildlife.'],
  ['Serengeti', 'Tanzania', 'Endless plains and the Great Migration across the Serengeti ecosystem.'],
  ['Kilimanjaro', 'Tanzania', "Africa's highest peak, the roof of Africa, for iconic trekking expeditions."],
  ['Mount Meru', 'Tanzania', 'Arusha National Park trek with rewarding crater-rim views of Kilimanjaro.'],
  ['Zanzibar', 'Tanzania', 'Turquoise waters, Stone Town heritage and idyllic beaches on the spice island.'],
  ['Pemba', 'Tanzania', 'A quieter island escape with coral reefs, cloves and untouched dive sites.'],
  ['Mafia Island', 'Tanzania', 'Marine park island with whale sharks, coral gardens and gentle island life.'],
  ['Mikumi', 'Tanzania', 'Accessible southern park in the Mkata floodplain, rich in wildlife and birdlife.'],
  ['Udzungwa Mountains', 'Tanzania', 'Rainforest mountains with waterfalls, endemic primates and walking trails.'],
  ['Usambara Mountains', 'Tanzania', 'Cool highland trails, viewpoints and village cultures of the north-east.'],
  ['Nyerere National Park', 'Tanzania', "Tanzania's largest park - raw wilderness along the Rufiji River in the south."],
  ['Bagamoyo', 'Tanzania', 'Historic Swahili coastal town and former trading port with carvings and ruins.'],
  ['Kilwa Kisiwani', 'Tanzania', 'UNESCO-listed island of Swahili trade history and ancient ruins.'],
  ['Stone Town', 'Tanzania', "Zanzibar's historic quarter of Swahili, Arab and European heritage."],
  ['Olduvai Gorge', 'Tanzania', 'The cradle of humankind - archaeological site of early human origins.'],
  ['Lake Natron', 'Tanzania', 'Otherworldly soda lake, flamingo breeding grounds and Rift Valley landscapes.'],
  ['Materuni', 'Tanzania', 'Chagga village beneath Kilimanjaro with coffee tours and a waterfall hike.'],
  ['Chemka (Kikuletwa)', 'Tanzania', 'A crystal-clear hot spring oasis for a refreshing day away from the trail.'],
  ['Dar es Salaam', 'Tanzania', "Tanzania's vibrant coastal metropolis - markets, food, art and city life."],
  ['Moshi', 'Tanzania', 'Kilimanjaro-region town and our vehicle operations base.'],
  ['Mererani', 'Tanzania', 'The tanzanite region, visited only where access and safety permissions allow.'],
];

const rentalServiceLines: Array<[string, string, string, string, string[], string, number]> = [
  ['safari-ai-executive', 'Safari AI Executive', 'VIP, luxury and executive mobility', 'Premium chauffeur-driven vehicles for executives, VIP guests and special occasions, with discreet professional drivers.', ['VIP airport meet and greet', 'Executive city mobility', 'Luxury lodge transfers', 'Special occasions'], 'briefcase', 0],
  ['safari-ai-weddings', 'Safari AI Weddings', 'Bridal cars and wedding transport', 'Elegant bridal cars and coordinated wedding-day transport, planned around your schedule and colours.', ['Bridal car', 'Wedding party transport', 'Decorated vehicle options', 'Photoshoot transfers'], 'heart', 1],
  ['safari-ai-transfers', 'Safari AI Transfers', 'Airport, hotel and intercity transfers', 'Reliable airport, hotel and intercity transfers across Tanzania with flight monitoring and transparent pricing.', ['Airport pick-up and drop-off', 'Hotel transfers', 'Intercity travel', 'Day-hire with driver'], 'plane', 2],
  ['safari-ai-expeditions', 'Safari AI Expeditions', 'Safari, wildlife and adventure transport', 'Rugged safari-ready 4x4s with experienced driver-guides for game drives, national parks and remote routes.', ['Game drives', 'National park circuits', 'Camping and lodge transfers', 'Remote-area routing'], 'compass', 3],
  ['safari-ai-corporate', 'Safari AI Corporate', 'Business contracts and long-term rentals', 'Long-term vehicle hire and corporate transport contracts with monthly billing and dedicated account management.', ['Long-term hire', 'Monthly corporate billing', 'Staff transport', 'Project and NGO mobility'], 'office', 4],
];

const rentalPolicy = {
  serviceModel: 'CHAUFFEUR_DRIVEN',
  effectiveFrom: '2026-10-11',
  summary: 'Safari AI Rentals provides vehicles with a company-approved driver/chauffeur. Each booking is confirmed in writing with the vehicle, dates, route, service scope and charges.',
  selfDrive: 'Self-drive hire is not offered under the standard policy. It may be approved in writing for selected 4x4 vehicles with a valid licence and satisfied insurance and vehicle documentation requirements.',
  lengthOfHire: 'Rental duration is set per booking and may be any agreed length, including short-term, multi-week or 30-day-plus rentals. No fixed period applies.',
  longTermDiscount: 'Bookings exceeding 10 days may qualify for a special or discounted rate. Discounts are not automatic and are confirmed in writing before the booking is accepted.',
  deposit: 'A refundable security deposit may be required and is separate from the rental fee. It is applied only to documented amounts properly due, such as damage, missing equipment, fines or fuel shortages.',
  fuel: 'The quotation states whether fuel is included. The vehicle should be returned at the agreed fuel level unless stated otherwise.',
  route: 'Intended routes and any change of route, travel outside the agreed area, overnight assignments and cross-border travel require prior written approval.',
  cancellation: 'Cancellation, rescheduling, no-show and refund terms are stated in the quotation or booking confirmation before payment.',
  prohibitedUse: ['Illegal activities', 'Racing', 'Towing without approval', 'Carrying prohibited goods', 'Exceeding passenger limits', 'Smoking in the vehicle unless authorised'],
  insurance: 'The Company discloses applicable insurance arrangements and limitations before service begins. Any customer liability depends on the facts, the agreed terms, insurance and applicable law.',
  contact: { whatsapp: ['0682 886 259', '0741 486 259'], phone: ['0682 886 259', '0741 486 259'], email: 'meandadventuretz@gmail.com' },
  note: "Business policy summary prepared for the M&A Safaris platform. Review against the company's insurance, licences and current Tanzanian law before formal adoption.",
};

const commonInclusions = ['Professional English-speaking safari guide', 'Private 4x4 safari vehicle with pop-up roof', 'Park, conservation and camping fees', 'Accommodation as described in the itinerary', 'Bottled drinking water in the vehicle'];
const commonExclusions = ['International flights', 'Tanzania entry visa', 'Travel insurance', 'Tips and personal items', 'Alcoholic and premium drinks'];

const journeys = [
  {
    slug: 'serengeti-five-days', title: 'Serengeti 5-Day Safari · Great Migration', duration: 5, adult: 125_000n, service: 'wildlife-safaris',
    destinations: ['serengeti', 'ngorongoro'],
    description: 'Follow the greatest wildlife show on earth through the Serengeti ecosystem, with time in the Ngorongoro Crater and nights under endless African skies.',
    goodToKnow: ['The Mara River crossings are best from July to October.', 'Booking remains a request until Operations confirms availability.', 'Rates are confirmed in writing by the Arusha desk before any deposit is taken.'],
  },
  {
    slug: 'zanzibar-four-days', title: 'Zanzibar 4-Day Escape · Beach & Island', duration: 4, adult: 89_000n, service: 'zanzibar',
    destinations: ['zanzibar', 'stone-town'],
    description: 'Unwind on the turquoise shores of Zanzibar with a Stone Town heritage walk, spice-farm visit and time to simply relax by the Indian Ocean.',
    goodToKnow: ['Combine easily with a northern-circuit safari.', 'Kite season runs from June to September.', 'Rates are confirmed in writing by the Arusha desk before any deposit is taken.'],
  },
  {
    slug: 'kilimanjaro-seven-days', title: 'Kilimanjaro 7-Day Trek · Machame Route', duration: 7, adult: 195_000n, service: 'kilimanjaro',
    destinations: ['kilimanjaro', 'materuni'],
    description: "Climb Africa's highest peak on the scenic Machame route, with gradual acclimatisation, experienced mountain crew and a sunrise on Uhuru Peak.",
    goodToKnow: ['Train before you travel and pack for four seasons in a day.', 'A pre-climb Materuni coffee and waterfall day is included in this plan.', 'Rates are confirmed in writing by the Arusha desk before any deposit is taken.'],
  },
];

try {
  const policy = await db.bookingPolicyVersion.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1, depositBasisPoints: 3000, balanceDaysBefore: 7, previewMinutes: 15, quoteDays: 7,
      rules: {
        childBasisPoints: 7000, childMinAge: 0, childMaxAge: 15,
        currencyExponents: { USD: 2, TZS: 2, EUR: 2, GBP: 2, JPY: 0, KWD: 3 },
        cancellationText: 'Cancellation and rescheduling are reviewed by the Arusha desk. Any refund is decided and recorded separately.',
        shortNoticeRequiresFullPayment: true, maxTravelers: 50,
        preparationKeys: ['ITINERARY', 'PICKUP', 'ACCOMMODATION', 'REQUIREMENTS', 'CUSTOMER_NOTICE'],
        completionKeys: ['travelers_dropped_off', 'vehicle_checked', 'issues_reported'],
        allocationBufferMinutes: 60, guideHistoryDays: 30,
      },
    },
  });

  for (const version of [1, 2]) {
    await db.companySettingsVersion.upsert({
      where: { version },
      update: {},
      create: { version, policyVersionId: policy.id, settings: companyProfile },
    });
  }

  for (const [index, [slug, title, requestMode, description]] of services.entries()) {
    const existing = await db.serviceCategory.findUnique({ where: { slug } });
    if (existing) continue;
    await db.serviceCategory.create({ data: { slug, title, requestMode, description, sortOrder: index, status: 'PUBLISHED' } });
  }

  for (const [title, region, description] of destinations) {
    const slug = slugify(title);
    const existing = await db.destination.findUnique({ where: { slug } });
    if (existing) continue;
    await db.destination.create({ data: { slug, title, description, region, status: 'PUBLISHED' } });
  }

  for (const [slug, title, tagline, description, useCases, icon, sortOrder] of rentalServiceLines) {
    await db.rentalServiceLine.upsert({
      where: { slug },
      update: { title, tagline, description, useCases, icon, sortOrder, status: 'PUBLISHED' },
      create: { slug, title, tagline, description, useCases, icon, sortOrder, status: 'PUBLISHED' },
    });
  }

  await db.rentalPolicyVersion.upsert({
    where: { version: 1 },
    update: {},
    create: { version: 1, status: 'PUBLISHED', policy: rentalPolicy, publishedAt: new Date() },
  });

  for (const [index, registration] of ['TZ001', 'TZ002', 'TZ003'].entries()) {
    const existing = await db.vehicle.findUnique({ where: { registration } });
    if (existing) continue;
    await db.vehicle.create({
      data: {
        registration,
        type: index === 2 ? 'Transfer van' : 'Safari 4×4',
        seats: index === 2 ? 12 : 7,
        luggageCapacity: 7,
        capabilities: ['wildlife', 'transfer'],
      },
    });
  }

  const cover = `${process.env.PUBLIC_WEB_URL ?? 'https://meandadventuresafaris.com'}/assets/safari.jpg`;
  for (const journey of journeys) {
    const category = await db.serviceCategory.findUnique({ where: { slug: journey.service } });
    if (!category) continue;

    const pkg = await db.package.upsert({
      where: { slug: journey.slug },
      update: {},
      create: {
        slug: journey.slug,
        title: journey.title,
        description: journey.description,
        durationDays: journey.duration,
        categoryId: category.id,
        status: 'PUBLISHED',
        cover,
        gallery: [cover],
        inclusions: commonInclusions,
        exclusions: commonExclusions,
        goodToKnow: journey.goodToKnow,
      },
    });

    await db.packagePriceVersion.upsert({
      where: { packageId_version_currency: { packageId: pkg.id, version: 1, currency: 'USD' } },
      update: {},
      create: {
        packageId: pkg.id, version: 1, currency: 'USD', adultMinor: journey.adult,
        startsAt: new Date('2020-01-01T00:00:00Z'), rules: { taxMinor: '0', addOns: [] },
      },
    });

    for (const [order, destinationSlug] of journey.destinations.entries()) {
      const destination = await db.destination.findUnique({ where: { slug: destinationSlug } });
      if (!destination) continue;
      await db.packageDestination.upsert({
        where: { packageId_destinationId_day: { packageId: pkg.id, destinationId: destination.id, day: 1 } },
        update: {},
        create: { packageId: pkg.id, destinationId: destination.id, day: 1, order: order + 1 },
      });
    }

    await db.catalogItineraryTemplate.upsert({
      where: { packageId_version: { packageId: pkg.id, version: 1 } },
      update: {},
      create: {
        packageId: pkg.id,
        version: 1,
        days: Array.from({ length: journey.duration }, (_, index) => ({
          sequence: index + 1,
          title: index === 0 ? 'Arrival & welcome briefing' : index === journey.duration - 1 ? 'Final morning & departure' : `${journey.title.split('·')[0]!.trim()} - day ${index + 1}`,
          activities: [{
            order: 1,
            title: index === 0 ? 'Pickup, briefing and first experience' : index === journey.duration - 1 ? 'Breakfast and transfer' : 'Guided experience',
            customerText: 'Daily timings are finalised by Operations before departure.',
          }],
        })),
      },
    });
  }

  const counts = {
    services: await db.serviceCategory.count(),
    destinations: await db.destination.count(),
    packages: await db.package.count(),
    rentalLines: await db.rentalServiceLine.count(),
    vehicles: await db.vehicle.count(),
  };
  console.log(JSON.stringify({ level: 'info', event: 'catalogue_seeded', ...counts }));
} finally {
  await db.$disconnect();
}
