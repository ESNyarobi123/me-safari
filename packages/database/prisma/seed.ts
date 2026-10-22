import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import { createDatabase } from '../src/index.js';

config({ path: '../../.env', quiet: true });
config({ quiet: true });
if (process.env.NODE_ENV === 'production') throw new Error('Development seeds are forbidden in production');
const password = process.env.SEED_DEMO_PASSWORD;
if (!password || password.length < 12 || /SET_A_|CHANGE_/.test(password)) {
  throw new Error('Set SEED_DEMO_PASSWORD to a local password with at least 12 characters');
}

export function seedId(name: string): string {
  const hex = createHash('sha256').update(`ma-safaris-development-v1:${name}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
const db = createDatabase();
const hashPassword = () => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const travelDate = new Date().toLocaleDateString('en-CA', { timeZone: process.env.COMPANY_TIMEZONE ?? 'Africa/Dar_es_Salaam' });
const today = new Date(`${travelDate}T00:00:00Z`);
const day = (offset: number) => new Date(today.getTime() + offset * 86_400_000);
const policyId = seedId('policy');
const rules = {
  developmentExample: true, childBasisPoints: 7000, childMinAge: 0, childMaxAge: 15,
  currencyExponents: { USD: 2, TZS: 2, EUR: 2, GBP: 2, JPY: 0, KWD: 3 },
  cancellationText: 'Development policy: cancellation and rescheduling require staff review. Any refund is decided and recorded separately.',
  shortNoticeRequiresFullPayment: true, maxTravelers: 50,
  preparationKeys: ['ITINERARY', 'PICKUP', 'ACCOMMODATION', 'REQUIREMENTS', 'CUSTOMER_NOTICE'],
  completionKeys: ['travelers_dropped_off', 'vehicle_checked', 'issues_reported'],
  allocationBufferMinutes: 60, guideHistoryDays: 30,
};

try {
  await db.bookingPolicyVersion.upsert({ where: { id: policyId }, update: {}, create: {
    id: policyId, version: 1, depositBasisPoints: 3000, balanceDaysBefore: 7,
    previewMinutes: 15, quoteDays: 7, rules,
  }});
  await db.companySettingsVersion.upsert({ where: { version: 1 }, update: {}, create: {
    id: seedId('company'), version: 1, policyVersionId: policyId, settings: {
      name: 'Me and Adventure Safaris', shortName: 'M&A Safaris',
      email: 'meandadventuretz@gmail.com', phone: '+255 682 886 259',
      tagline: 'Your Gateway to Authentic Tanzania', story: 'We listen. We plan. We experience.',
      defaultLocale: 'en', supportedLocales: ['en','sw'], timezone: 'Africa/Dar_es_Salaam',
      currency: 'USD', depositBasisPoints: 3000, androidStoreUrl: null, iosStoreUrl: null,
      releaseState: 'COMING_SOON', developmentExample: true,
    },
  }});
  // Published company profile, sourced from the Me and Adventure Safaris business and company profiles.
  // Created as version 2 so the original seeded version stays intact and history is preserved.
  const companyProfile = {
    name: 'Me and Adventure Safaris', shortName: 'M&A Safaris',
    email: 'meandadventuretz@gmail.com', phone: '+255 682 886 259',
    tagline: 'Your Gateway to Authentic Tanzania', story: 'We listen. We plan. We experience.',
    slogan: 'Explore beyond limits, discover true adventure!',
    motto: "Tanzania - more than a destination, it's a feeling.",
    website: 'meandadventure.com', whatsapp: '0682 886 259',
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
    values: ['Professional & reliable','Passionate about Africa','Customer-focused','Locally knowledgeable','Flexible & innovative','Authentic & responsible','Safety-conscious','Memorable by design'],
    whyChooseUs: ['Travel planning matched to your interests','Genuine local expertise','Flexible, tailor-made itineraries','Professional customer care','Quality vehicles and experienced drivers','Competitive, transparent packages','Genuine Tanzanian hospitality','Responsible travel with community benefit'],
    responsibleTravel: 'We believe tourism should protect nature, respect culture and create positive impact. We support conservation, encourage responsible travel and promote local community benefits.',
    travellerSegments: ['International tourists','Domestic travellers','Families','Couples & honeymooners','Adventure seekers','Luxury travellers','Corporate groups','Schools & institutions','Photographers & filmmakers','Wildlife enthusiasts'],
    tourismCategories: ['Wildlife & Safari Tourism','Adventure & Outdoor Tourism','Cultural, Community & Heritage Tourism','Marine, Beach & Water Tourism','Nature, Conservation & Educational Tourism','Specialised & Emerging Tourism','Additional Niche Products'],
    productDivisions: [
      { slug: 'wildlife-journeys', title: 'Me & Adventure Wildlife Journeys', focus: 'Wildlife safaris, Great Migration, birdwatching, photographic safaris and luxury safari experiences.' },
      { slug: 'outdoor-escapes', title: 'Me & Adventure Outdoor Escapes', focus: 'Kilimanjaro, trekking, waterfalls, cycling, camping and outdoor adventures.' },
      { slug: 'cultural-encounters', title: 'Me & Adventure Cultural Encounters', focus: 'Heritage, community tourism, food, village experiences, pastoralism and traditional knowledge.' },
      { slug: 'coastal-island-escapes', title: 'Me & Adventure Coastal & Island Escapes', focus: 'Zanzibar, Pemba, Mafia Island, beaches, diving, snorkelling and marine experiences.' },
      { slug: 'conservation-discovery', title: 'Me & Adventure Conservation & Discovery', focus: 'Conservation learning, educational trips, research, ecotourism, mining, geology and agricultural tours.' },
      { slug: 'private-special-journeys', title: 'Me & Adventure Private & Special Journeys', focus: 'Honeymoons, family holidays, corporate retreats, events, private transfers and tailor-made itineraries.' },
    ],
    defaultLocale: 'en', supportedLocales: ['en','sw'], timezone: 'Africa/Dar_es_Salaam',
    currency: 'USD', mainCurrency: 'TZS', depositBasisPoints: 3000,
    androidStoreUrl: null, iosStoreUrl: null, releaseState: 'COMING_SOON', developmentExample: true,
  };
  await db.companySettingsVersion.upsert({ where: { version: 2 }, update: { settings: companyProfile }, create: {
    id: seedId('company:v2'), version: 2, policyVersionId: policyId, settings: companyProfile,
  }});

  const accounts = [
    { key: 'alice', email: 'customer.demo@ma-safaris.local', name: 'Alice Morgan', role: 'CUSTOMER' },
    { key: 'bob', email: 'customer2.demo@ma-safaris.local', name: 'Ben Carter', role: 'CUSTOMER' },
    { key: 'neema', email: 'operations.demo@ma-safaris.local', name: 'Neema Kweka', role: 'OPERATIONS' },
    { key: 'kelvin', email: 'guide.demo@ma-safaris.local', name: 'Kelvin Mushi', role: 'DRIVER_GUIDE' },
    { key: 'asha', email: 'guide2.demo@ma-safaris.local', name: 'Asha Nyerere', role: 'DRIVER_GUIDE' },
    { key: 'admin', email: 'admin.demo@ma-safaris.local', name: 'M&A Demo Admin', role: 'ADMIN' },
  ];
  for (const account of accounts) {
    const user = await db.user.upsert({ where: { email: account.email }, update: {}, create: {
      id: seedId(`user:${account.key}`), email: account.email, passwordHash: await hashPassword(), emailVerifiedAt: new Date(),
    }});
    const grant = await db.userRoleGrant.findFirst({ where: { userId: user.id, role: account.role, revokedAt: null }});
    if (!grant) await db.userRoleGrant.create({ data: { userId: user.id, role: account.role }});
    if (account.role === 'CUSTOMER') await db.customerProfile.upsert({ where: { userId: user.id }, update: {}, create: {
      id: seedId(`customer:${account.key}`), userId: user.id, name: account.name, email: account.email,
      phone: '+255 700 000 000', country: 'Development example', preferences: { locale: 'en' },
    }});
    else await db.staffProfile.upsert({ where: { userId: user.id }, update: {}, create: {
      id: seedId(`staff:${account.key}`), userId: user.id, displayName: account.name,
      phone: '+255 700 000 001', languages: ['en','sw'],
      capabilities: account.role === 'DRIVER_GUIDE' ? ['wildlife','cultural','transfer','mountain'] : ['operations'],
    }});
  }

  // Service catalogue mirrors the published Me and Adventure Safaris services.
  const services: Array<[string, string, 'CUSTOM' | 'PACKAGE', string]> = [
    ['wildlife-safaris','Wildlife Safaris & Game Drives','PACKAGE','Big-game drives and guided days in the Serengeti, Tarangire, Lake Manyara, Nyerere National Park and beyond.'],
    ['private-group','Private & Group Safaris','CUSTOM','Flexible safari options for individuals, families and groups, with private vehicles and dedicated guides.'],
    ['day-trips','Day Trips & Excursions','CUSTOM','Short adventures around Arusha, Moshi, Materuni, Chemka and other key destinations.'],
    ['airport-transfers','Airport Transfers','CUSTOM','Reliable, comfortable airport pick-up and drop-off through Safari AI Rentals.'],
    ['honeymoon','Honeymoon & Romantic Getaways','CUSTOM','Celebrate love with unforgettable safari and beach experiences in Tanzania and Zanzibar.'],
    ['family-luxury','Family & Luxury Safaris','CUSTOM','Comfort, safety and memorable adventures for families, plus premium lodges and exclusive camps.'],
    ['cultural','Cultural & Community Experiences','CUSTOM','Community-led experiences with Maasai, Chagga, Iraqw, Hadzabe, Datoga and other communities.'],
    ['kilimanjaro','Mount Kilimanjaro Adventures','PACKAGE','Experience the challenge and achievement of Africa\'s highest peak, plus Mount Meru and trekking routes.'],
    ['zanzibar','Beach & Zanzibar Holidays','PACKAGE','Combine safari adventure with relaxing beach and island escapes on Zanzibar, Pemba and Mafia.'],
    ['corporate-school','Corporate, School & Group Travel','CUSTOM','Professional travel solutions for companies, organisations, schools and institutions.'],
    ['safari-ai-rentals','Car Rental & Chauffeur Services','CUSTOM','Safari AI Rentals: chauffeur-driven vehicle rental, VIP mobility, transfers and long-term corporate hire.'],
    ['tailor-made','Customized & Tailor-Made Itineraries','CUSTOM','Journeys designed around your interests, time and budget - planned with genuine local expertise.'],
  ];
  for (const [index, [slug, title, requestMode, description]] of services.entries()) await db.serviceCategory.upsert({
    where: { slug }, update: { title, description, requestMode, sortOrder: index }, create: {
      id: seedId(`service:${slug}`), slug: slug, title, description, requestMode, sortOrder: index,
    },
  });

  // Destination catalogue from the tourism product portfolio.
  const destinations: Array<[string, string, string]> = [
    ['Arusha','Tanzania','The safari capital at the foot of Mount Meru, and the gateway to the northern circuit.'],
    ['Tarangire','Tanzania','Baobab-studded park famous for large elephant herds and the Tarangire River.'],
    ['Lake Manyara','Tanzania','Rift Valley lake park known for tree-climbing lions, flamingos and birdlife.'],
    ['Ngorongoro','Tanzania','The Ngorongoro Crater - a UNESCO World Heritage caldera teeming with wildlife.'],
    ['Serengeti','Tanzania','Endless plains and the Great Migration across the Serengeti ecosystem.'],
    ['Kilimanjaro','Tanzania','Africa\'s highest peak, the roof of Africa, for iconic trekking expeditions.'],
    ['Mount Meru','Tanzania','Arusha National Park trek with rewarding crater-rim views of Kilimanjaro.'],
    ['Zanzibar','Tanzania','Turquoise waters, Stone Town heritage and idyllic beaches on the spice island.'],
    ['Pemba','Tanzania','A quieter island escape with coral reefs, cloves and untouched dive sites.'],
    ['Mafia Island','Tanzania','Marine park island with whale sharks, coral gardens and gentle island life.'],
    ['Mikumi','Tanzania','Accessible southern park in the Mkata floodplain, rich in wildlife and birdlife.'],
    ['Udzungwa Mountains','Tanzania','Rainforest mountains with waterfalls, endemic primates and walking trails.'],
    ['Usambara Mountains','Tanzania','Cool highland trails, viewpoints and village cultures of the north-east.'],
    ['Nyerere National Park','Tanzania','Tanzania\'s largest park - raw wilderness along the Rufiji River in the south.'],
    ['Bagamoyo','Tanzania','Historic Swahili coastal town and former trading port with carvings and ruins.'],
    ['Kilwa Kisiwani','Tanzania','UNESCO-listed island of Swahili trade history and ancient ruins.'],
    ['Stone Town','Tanzania','Zanzibar\'s historic quarter of Swahili, Arab and European heritage.'],
    ['Olduvai Gorge','Tanzania','The cradle of humankind - archaeological site of early human origins.'],
    ['Lake Natron','Tanzania','Otherworldly soda lake, flamingo breeding grounds and Rift Valley landscapes.'],
    ['Materuni','Tanzania','Chagga village beneath Kilimanjaro with coffee tours and a waterfall hike.'],
    ['Chemka (Kikuletwa)','Tanzania','A crystal-clear hot spring oasis for a refreshing day away from the trail.'],
    ['Dar es Salaam','Tanzania','Tanzania\'s vibrant coastal metropolis - markets, food, art and city life.'],
    ['Moshi','Tanzania','Kilimanjaro-region town and our vehicle operations base.'],
    ['Mererani','Tanzania','The tanzanite region, visited only where access and safety permissions allow.'],
  ];
  for (const [title, region, description] of destinations) {
    const slug = title.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-').replaceAll(/(^-|-$)/g,'');
    await db.destination.upsert({ where: { slug }, update: { title, description, region }, create: {
      id: seedId(`destination:${slug}`), slug, title, description, region, status: 'PUBLISHED',
    }});
  }
  const asset = (process.env.PUBLIC_API_BASE_URL??'http://127.0.0.1:4000/v1')+'/public/assets/hero-1200.webp';
  const commonInclusions = ['Professional English-speaking safari guide','Private 4x4 safari vehicle with pop-up roof','Park, conservation and camping fees','Accommodation as described in the itinerary','Bottled drinking water in the vehicle'];
  const commonExclusions = ['International flights','Tanzania entry visa','Travel insurance','Tips and personal items','Alcoholic and premium drinks'];
  const packages = [
    { slug:'serengeti-five-days', title:'Serengeti 5-Day Safari · Great Migration', duration:5, adult:125000n, service:'wildlife-safaris', destinations:['serengeti','ngorongoro'], image:asset,
      description:'Follow the greatest wildlife show on earth through the Serengeti ecosystem, with time in the Ngorongoro Crater and nights under endless African skies.',
      goodToKnow:['The Mara River crossings are best from July to October.','Booking remains a request until Operations confirms availability.','Rates are indicative development rates pending owner approval.'] },
    { slug:'zanzibar-four-days', title:'Zanzibar 4-Day Escape · Beach & Island', duration:4, adult:89000n, service:'zanzibar', destinations:['zanzibar','stone-town'], image:asset,
      description:'Unwind on the turquoise shores of Zanzibar with a Stone Town heritage walk, spice-farm visit and time to simply relax by the Indian Ocean.',
      goodToKnow:['Combine easily with a northern-circuit safari.','Kite season runs from June to September.','Rates are indicative development rates pending owner approval.'] },
    { slug:'kilimanjaro-seven-days', title:'Kilimanjaro 7-Day Trek · Machame Route', duration:7, adult:195000n, service:'kilimanjaro', destinations:['kilimanjaro','materuni'], image:asset,
      description:'Climb Africa\'s highest peak on the scenic Machame route, with gradual acclimatisation, experienced mountain crew and a sunrise on Uhuru Peak.',
      goodToKnow:['Train before you travel and pack for four seasons in a day.','A pre-climb Materuni coffee and waterfall day is included in this plan.','Rates are indicative development rates pending owner approval.'] },
  ];
  for (const p of packages) {
    const packageId = seedId(`package:${p.slug}`);
    const content = {
      description: p.description, inclusions: commonInclusions, exclusions: commonExclusions, goodToKnow: p.goodToKnow,
    };
    await db.package.upsert({ where: { slug: p.slug }, update: { title: p.title, ...content }, create: {
      id: packageId, slug: p.slug, title: p.title, description: content.description,
      durationDays:p.duration, categoryId:seedId(`service:${p.service}`), status:'PUBLISHED', cover:p.image,
      gallery:[p.image], inclusions:content.inclusions, exclusions:content.exclusions, goodToKnow:content.goodToKnow,
    }});
    // One-time portability correction for early demo fixtures; custom edited media is preserved.
    await db.package.updateMany({where:{id:packageId,cover:{startsWith:'https://images.unsplash.com/'}},data:{cover:p.image,gallery:[p.image]}});
    await db.packagePriceVersion.upsert({ where: { packageId_version_currency: { packageId, version:1, currency:'USD' }}, update:{}, create:{
      id:seedId(`price:${p.slug}`), packageId, version:1, currency:'USD', adultMinor:p.adult,
      startsAt:new Date('2020-01-01T00:00:00Z'), rules:{ developmentExample:true, taxMinor:'0', addOns:[] },
    }});
    for (const [order, destination] of p.destinations.entries()) await db.packageDestination.upsert({ where: { packageId_destinationId_day: { packageId, destinationId:seedId(`destination:${destination}`), day:1 }}, update:{}, create:{ packageId, destinationId:seedId(`destination:${destination}`), day:1, order:order+1 }});
    await db.catalogItineraryTemplate.upsert({ where: { packageId_version:{ packageId,version:1 }}, update:{}, create:{
      packageId, version:1, days:Array.from({length:p.duration},(_,i)=>({ sequence:i+1, title:i===0?'Arrival & welcome briefing':i===p.duration-1?'Final morning & departure':`${p.title.split('·')[0]!.trim()} - day ${i+1}`, activities:[{ order:1,title:i===0?'Pickup, briefing and first experience':i===p.duration-1?'Breakfast and transfer':'Guided experience',customerText:'Daily timings are finalised by Operations before departure.' }] })),
    }});
  }
  for (const [index, registration] of ['TZ001','TZ002','TZ003'].entries()) await db.vehicle.upsert({ where:{registration}, update:{}, create:{
    id:seedId(`vehicle:${registration}`), registration, type:index===2?'Transfer van':'Safari 4×4', seats:index===2?12:7, luggageCapacity:7,
    capabilities:['wildlife','transfer'],
  }});

  // SAFARI AI RENTALS — published service lines (the five signature services).
  const rentalServiceLines: Array<[string,string,string,string,string[],string,number]> = [
    ['safari-ai-executive','Safari AI Executive','VIP, luxury and executive mobility','Premium chauffeur-driven vehicles for executives, VIP guests and special occasions, with discreet professional drivers.',['VIP airport meet and greet','Executive city mobility','Luxury lodge transfers','Special occasions'],'briefcase',0],
    ['safari-ai-weddings','Safari AI Weddings','Bridal cars and wedding transport','Elegant bridal cars and coordinated wedding-day transport, planned around your schedule and colours.',['Bridal car','Wedding party transport','Decorated vehicle options','Photoshoot transfers'],'heart',1],
    ['safari-ai-transfers','Safari AI Transfers','Airport, hotel and intercity transfers','Reliable airport, hotel and intercity transfers across Tanzania with flight monitoring and transparent pricing.',['Airport pick-up and drop-off','Hotel transfers','Intercity travel','Day-hire with driver'],'plane',2],
    ['safari-ai-expeditions','Safari AI Expeditions','Safari, wildlife and adventure transport','Rugged safari-ready 4x4s with experienced driver-guides for game drives, national parks and remote routes.',['Game drives','National park circuits','Camping and lodge transfers','Remote-area routing'],'compass',3],
    ['safari-ai-corporate','Safari AI Corporate','Business contracts and long-term rentals','Long-term vehicle hire and corporate transport contracts with monthly billing and dedicated account management.',['Long-term hire','Monthly corporate billing','Staff transport','Project and NGO mobility'],'office',4],
  ];
  for (const [slug,title,tagline,description,useCases,icon,sortOrder] of rentalServiceLines) await db.rentalServiceLine.upsert({
    where:{slug}, update:{title,tagline,description,useCases,icon,sortOrder}, create:{ id:seedId(`rental-service:${slug}`), slug, title, tagline, description, useCases, icon, sortOrder, status:'PUBLISHED' },
  });

  // Published rental policy (Safari AI Rentals Updated Car Rental Policy & Terms).
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
    prohibitedUse: ['Illegal activities','Racing','Towing without approval','Carrying prohibited goods','Exceeding passenger limits','Smoking in the vehicle unless authorised'],
    insurance: 'The Company discloses applicable insurance arrangements and limitations before service begins. Any customer liability depends on the facts, the agreed terms, insurance and applicable law.',
    contact: { whatsapp: ['0682 886 259','0741 486 259'], phone: ['0682 886 259','0741 486 259'], email: 'meandadventuretz@gmail.com' },
    note: 'Business policy summary prepared for the M&A Safaris platform. Review against the company\'s insurance, licences and current Tanzanian law before formal adoption.',
  };
  await db.rentalPolicyVersion.upsert({ where:{version:1}, update:{}, create:{ id:seedId('rental-policy:v1'), version:1, status:'PUBLISHED', policy:rentalPolicy, publishedAt:new Date() }});

  // Published Safari AI Rentals price list (TZS per day). TZS carries two minor-unit decimals.
  const tzs = (whole: number) => BigInt(whole) * 100n;
  const SELF_DRIVE = new Set(['toyota-prado-120','toyota-prado-150','toyota-fortuner-2016','toyota-lc200-zx','toyota-lc300-zx','toyota-prado-250','land-rover-defender-2024','land-rover-discovery-5']);
  const featuresFor = (segment: string, category: string) => [
    'Air conditioning','Chauffeur-driven with a Safari AI approved driver',
    ...(['SUV','CROSSOVER','PICKUP'].includes(segment) ? ['4x4 capability'] : []),
    ...(['Land Rover','Lexus','Mercedes-Benz'].includes(category) ? ['Premium leather interior'] : []),
    'Comprehensive insurance and roadside support',
  ];
  const fleet: Array<[string,string,string,string|null,number|null,string,string,number,number,string[],number]> = [
    // Land Rover / Range Rover
    ['range-rover-sport-se-2010','Land Rover','Range Rover Sport','SE 2010/13',2013,'Land Rover','SUV',5,3,['safari-ai-executive','safari-ai-weddings','safari-ai-transfers'],600000],
    ['range-rover-evoque','Land Rover','Range Rover Evoque',null,2013,'Land Rover','CROSSOVER',5,2,['safari-ai-executive','safari-ai-transfers'],600000],
    ['range-rover-autobiography','Land Rover','Range Rover Autobiography',null,2016,'Land Rover','SUV',5,3,['safari-ai-executive','safari-ai-weddings'],1200000],
    ['range-rover-vogue-2018','Land Rover','Range Rover Vogue','2018/20',2020,'Land Rover','SUV',5,3,['safari-ai-executive','safari-ai-weddings'],1200000],
    ['range-rover-velar','Land Rover','Range Rover Velar',null,2019,'Land Rover','SUV',5,3,['safari-ai-executive','safari-ai-expeditions'],1200000],
    ['land-rover-defender-2024','Land Rover','Defender','2024',2024,'Land Rover','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],2500000],
    ['range-rover-sport-2024','Land Rover','Range Rover Sport','2024/25',2025,'Land Rover','SUV',5,3,['safari-ai-executive','safari-ai-weddings'],5000000],
    ['land-rover-discovery-4','Land Rover','Discovery 4',null,2013,'Land Rover','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],600000],
    ['land-rover-discovery-5','Land Rover','Discovery 5',null,2019,'Land Rover','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],1000000],
    // Toyota
    ['toyota-alphard','Toyota','Alphard',null,2018,'Toyota','VAN',6,4,['safari-ai-executive','safari-ai-weddings','safari-ai-transfers'],300000],
    ['toyota-coaster','Toyota','Coaster',null,2016,'Toyota','MINIBUS',26,20,['safari-ai-corporate','safari-ai-transfers'],400000],
    ['toyota-crown','Toyota','Crown',null,2015,'Toyota','SEDAN',5,2,['safari-ai-executive','safari-ai-weddings'],500000],
    ['toyota-harrier','Toyota','Harrier',null,2015,'Toyota','CROSSOVER',5,2,['safari-ai-executive','safari-ai-transfers'],500000],
    ['toyota-prado-120','Toyota','Land Cruiser Prado','120',2008,'Toyota','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],500000],
    ['toyota-harrier-anaconda','Toyota','Harrier','Anaconda',2017,'Toyota','CROSSOVER',5,2,['safari-ai-executive','safari-ai-transfers'],600000],
    ['toyota-prado-150','Toyota','Land Cruiser Prado','150',2015,'Toyota','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],600000],
    ['toyota-fortuner-2016','Toyota','Fortuner','2016',2016,'Toyota','SUV',7,4,['safari-ai-expeditions','safari-ai-corporate'],800000],
    ['toyota-lc200-zx','Toyota','Land Cruiser V8','LC 200 ZX',2018,'Toyota','SUV',7,5,['safari-ai-expeditions','safari-ai-executive','safari-ai-corporate'],1000000],
    ['toyota-prado-250','Toyota','Land Cruiser Prado','250',2024,'Toyota','SUV',7,5,['safari-ai-expeditions','safari-ai-executive','safari-ai-corporate'],2000000],
    ['toyota-lc300-zx','Toyota','Land Cruiser V8','LC 300 ZX',2023,'Toyota','SUV',7,5,['safari-ai-executive','safari-ai-expeditions','safari-ai-corporate'],2000000],
    // Mercedes-Benz
    ['mercedes-c-class-200','Mercedes-Benz','C-Class','200',2018,'Mercedes-Benz','SEDAN',5,2,['safari-ai-executive','safari-ai-weddings','safari-ai-transfers'],500000],
    ['mercedes-e-class','Mercedes-Benz','E-Class',null,2018,'Mercedes-Benz','SEDAN',5,2,['safari-ai-executive','safari-ai-weddings'],1000000],
    ['mercedes-s-class-550','Mercedes-Benz','S-Class','550',2018,'Mercedes-Benz','SEDAN',4,2,['safari-ai-executive','safari-ai-weddings'],1200000],
    ['mercedes-gl-350','Mercedes-Benz','GL','350',2015,'Mercedes-Benz','SUV',7,4,['safari-ai-executive','safari-ai-expeditions','safari-ai-corporate'],1500000],
    ['mercedes-g-wagon-2010','Mercedes-Benz','G-Wagon',null,2010,'Mercedes-Benz','SUV',5,3,['safari-ai-executive','safari-ai-weddings'],2500000],
    ['mercedes-g-wagon-2020','Mercedes-Benz','G-Wagon',null,2020,'Mercedes-Benz','SUV',5,3,['safari-ai-executive','safari-ai-weddings'],3500000],
    // Other makes
    ['mazda-cx5','Mazda','CX-5',null,2017,'Other','CROSSOVER',5,2,['safari-ai-transfers','safari-ai-corporate'],600000],
    ['nissan-mitsuoka-vintage','Nissan','Mitsuoka','Vintage',2010,'Other','VINTAGE',4,2,['safari-ai-weddings','safari-ai-executive'],2000000],
    ['hummer-h3','Hummer','H3',null,2008,'Other','SUV',5,3,['safari-ai-executive','safari-ai-expeditions'],800000],
    ['infiniti-qx80','Infiniti','QX80',null,2017,'Other','SUV',7,4,['safari-ai-executive','safari-ai-corporate','safari-ai-weddings'],1000000],
    // Lexus
    ['lexus-lx570','Lexus','LX','570',2018,'Lexus','SUV',7,4,['safari-ai-executive','safari-ai-expeditions','safari-ai-corporate'],2000000],
    ['lexus-lx600','Lexus','LX','600',2023,'Lexus','SUV',7,5,['safari-ai-executive','safari-ai-weddings','safari-ai-corporate'],5000000],
  ];
  for (const [index, row] of fleet.entries()) {
    const [slug,brand,model,variant,modelYear,category,segment,seats,luggage,serviceSlugs,rateTzs] = row;
    const vehicleId = seedId(`rental:${slug}`);
    const label = [brand,model,variant].filter(Boolean).join(' ');
    const shared = { brand, model, variant:variant??null, modelYear:modelYear??null, category, segment, seats, luggageCapacity:luggage, features:featuresFor(segment,category), serviceSlugs, status:'AVAILABLE', sortOrder:index };
    await db.rentalVehicle.upsert({ where:{slug}, update:shared, create:{ id:vehicleId, slug, ...shared,
      doors:4, transmission:'AUTOMATIC', fuel:['SEDAN','Land Rover','Lexus','Mercedes-Benz'].includes(segment)||['Land Rover','Lexus','Mercedes-Benz'].includes(category)?'PETROL':'DIESEL',
      chauffeurDriven:true, selfDriveAvailable:SELF_DRIVE.has(slug),
      description:`${label} available with a Safari AI Rentals chauffeur, or self-drive on written approval.`,
    }});
    await db.rentalRate.upsert({ where:{ vehicleId_version_rateType_currency:{ vehicleId, version:1, rateType:'DAILY', currency:'TZS' }}, update:{ amountMinor:tzs(rateTzs) }, create:{
      id:seedId(`rental-rate:${slug}`), vehicleId, version:1, rateType:'DAILY', currency:'TZS', amountMinor:tzs(rateTzs), minimumDays:1,
      note: rateTzs>=1000000?'Premium/luxury daily rate':'Standard daily rate',
    }});
  }

  const bookingId=seedId('connected-booking');
  const customerId=seedId('customer:alice');
  const adminId=seedId('user:admin');
  const existing=await db.booking.findUnique({where:{id:bookingId}});
  if (!existing) await db.$transaction(async tx=>{
    await tx.booking.create({data:{
      id:bookingId, customerId, reference:`MA-DEMO-${today.toISOString().slice(0,10).replaceAll('-','')}`, source:'PACKAGE',
      packageId:seedId('package:serengeti-five-days'), policyVersionId:policyId, startDate:day(0), endDate:day(4),
      adults:2, children:0, status:'CONFIRMED', currency:'USD', totalMinor:250000n, depositMinor:75000n,
      priceSnapshot:{developmentExample:true,totalMinor:'250000',lines:[{label:'Adults',quantity:2,unitMinor:'125000',totalMinor:'250000'}]},
      policySnapshot:{...rules,depositBasisPoints:3000,balanceDaysBefore:7},
      travelers:{create:[{fullName:'Alice Morgan',lead:true,band:'ADULT',language:'en'},{fullName:'Daniel Morgan',band:'ADULT',language:'en'}]},
      pickup:{create:{label:'Arusha pickup',address:'M&A Safaris agreed pickup location, Arusha',pickupAt:new Date(day(0).getTime()+6*3_600_000),contact:{name:'Alice Morgan',phone:'+255 700 000 000'},approved:true}},
      lineItems:{create:{label:'Adults · Demo Rate',type:'ADULT',quantity:2,unitMinor:125000n,totalMinor:250000n}},
    }});
    const itineraryId=seedId('connected-itinerary');
    const days=Array.from({length:5},(_,i)=>({sequence:i+1,date:day(i).toISOString().slice(0,10),title:i===0?'Arusha to Serengeti':i===4?'Return to Arusha':'Serengeti wildlife experience',activities:[{order:1,title:'Guided safari experience',customerText:'Approved demonstration plan'}]}));
    await tx.itineraryVersion.create({data:{id:itineraryId,bookingId,versionNumber:1,state:'DRAFT',content:{days},days:{create:days.map(d=>({sequence:d.sequence,date:new Date(`${d.date}T00:00:00Z`),title:d.title,activities:{create:d.activities}}))}}});
    await tx.itineraryVersion.update({where:{id:itineraryId},data:{state:'PUBLISHED',approvedBy:adminId,publishedAt:new Date()}});
    const tripId=seedId('connected-trip');
    const startsAt=new Date(day(0).getTime()+5*3_600_000);
    const endsAt=new Date(day(4).getTime()+16*3_600_000);
    await tx.trip.create({data:{id:tripId,bookingId,reference:`TRIP-DEMO-${today.toISOString().slice(0,10).replaceAll('-','')}`,startsAt,endsAt,itineraryVersionId:itineraryId,
      checklist:{create:['ITINERARY','PICKUP','ACCOMMODATION','REQUIREMENTS','CUSTOMER_NOTICE'].map(key=>({key,checked:true,checkedBy:adminId,checkedAt:new Date()}))},
    }});
    const guideId=seedId('staff:kelvin'),vehicleId=seedId('vehicle:TZ001');
    const guideAllocationId=seedId('connected-guide-allocation'),vehicleAllocationId=seedId('connected-vehicle-allocation');
    await tx.resourceAllocation.createMany({data:[{id:guideAllocationId,tripId,resourceType:'GUIDE',resourceId:guideId,guideId,startsAt,endsAt},{id:vehicleAllocationId,tripId,resourceType:'VEHICLE',resourceId:vehicleId,vehicleId,startsAt,endsAt}]});
    await tx.tripAssignment.create({data:{id:seedId('connected-assignment'),tripId,guideId,vehicleId,guideAllocationId,vehicleAllocationId,assignedBy:adminId}});
    await tx.paymentIntent.create({data:{id:seedId('connected-intent'),bookingId,customerId,purpose:'FULL',amountMinor:250000n,currency:'USD',provider:'mock',merchantReference:'DEMO-CONNECTED-SETTLED',state:'SUCCEEDED',expiresAt:day(1),reservationMinor:0n}});
    const postingId=seedId('connected-posting');
    await tx.paymentPosting.create({data:{id:postingId,bookingId,intentId:seedId('connected-intent'),amountMinor:250000n,currency:'USD',provider:'mock',providerReference:'DEMO-CONNECTED-CAPTURE',settledAt:new Date()}});
    await tx.outboxEvent.create({data:{type:'payment.captured',aggregateId:bookingId,aggregateVersion:1,logicalKey:`seed:receipt:${postingId}`,payload:{bookingId,paymentPostingId:postingId,userId:seedId('user:alice')}}});
    await tx.outboxEvent.create({data:{type:'itinerary.published',aggregateId:bookingId,aggregateVersion:1,logicalKey:`seed:itinerary:${itineraryId}`,payload:{bookingId,itineraryId,userId:seedId('user:alice')}}});
    await tx.auditEvent.create({data:{actorId:adminId,action:'development.seed',entityType:'Booking',entityId:bookingId,requestId:'development-seed',summary:{developmentExample:true,connectedTripId:tripId},reason:'Connected demonstration fixture with settled development payment'}});
  });
  await db.landingContentVersion.upsert({where:{locale_version:{locale:'en',version:1}},update:{},create:{locale:'en',version:1,status:'SUPERSEDED',publishedAt:new Date(),blocks:{hero:{title:'Discover Tanzania. Experience Africa. Create Memories.',subtitle:'Your Gateway to Authentic Tanzania'},story:{title:'We listen. We plan. We experience.'}}}});
  // Published landing version 2, built from the real business and company profiles.
  await db.landingContentVersion.upsert({where:{locale_version:{locale:'en',version:2}},update:{},create:{
    locale:'en', version:2, status:'PUBLISHED', publishedAt:new Date(), createdBy:adminId, blocks:{
      hero:{
        title:'Discover Tanzania. Experience Africa. Create Memories.',
        subtitle:'Your Gateway to Authentic Tanzania',
        copy:"A Tanzanian-owned tourism and travel company designing locally rooted journeys, meaningful encounters and stories that stay with you.",
        slogan:companyProfile.slogan, motto:companyProfile.motto,
        highlights:['Wildlife safaris & the Great Migration','Kilimanjaro treks & outdoor escapes','Zanzibar, Pemba & Mafia island escapes','Safari AI Rentals: car rental & chauffeurs'],
      },
      story:{ title:companyProfile.story, body:companyProfile.mission, vision:companyProfile.vision, responsibleTravel:companyProfile.responsibleTravel, values:companyProfile.values },
      services:{ title:'Our services', items:services.map(([slug,title,,description])=>({slug,title,description})) },
      divisions:{ title:'Our tourism product divisions', items:companyProfile.productDivisions },
      destinations:{ title:'Where we take you', items:destinations.map(([title,region,description])=>({title,region,description})) },
      rentals:{
        title:'Safari AI Rentals', tagline:'Car rental & chauffeur services by Me and Adventure Safaris',
        summary:rentalPolicy.summary, serviceModel:rentalPolicy.serviceModel,
        lines:rentalServiceLines.map(([slug,title,tagline,description])=>({slug,title,tagline,description})),
        segments:[...new Set(fleet.map(row=>row[6]))],
        makes:[...new Set(fleet.map(row=>row[1]))],
        fleetSize:fleet.length, currency:'TZS', publicPolicyVersion:1,
      },
      contact:{
        title:'Talk to us', companyName:companyProfile.name, email:companyProfile.email, phone:companyProfile.phone,
        whatsapp:companyProfile.whatsapp, website:companyProfile.website, instagram:companyProfile.instagram,
        hashtag:companyProfile.hashtag, registrationNumber:companyProfile.registrationNumber,
        headquarters:companyProfile.headquarters, offices:companyProfile.offices, contactNumbers:companyProfile.contactNumbers,
      },
    },
  }});
  console.log('Development seed complete. Existing records and passwords were preserved.');
  console.log(accounts.map(a=>`${a.role}: ${a.email}`).join('\n'));
  console.log(`Connected booking: ${bookingId}; trip: ${seedId('connected-trip')}`);
} finally {
  await db.$disconnect();
}
