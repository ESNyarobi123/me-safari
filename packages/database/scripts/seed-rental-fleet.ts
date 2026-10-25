/**
 * Production-safe Safari AI Rentals fleet seed.
 *
 * Publishes the real chauffeur-driven fleet (`RentalVehicle`) with a daily TZS
 * rate card (`RentalRate`) so the public rentals overview, the landing page
 * fleet counters and the reservation flow have bookable inventory.
 *
 * Everything is upserted by `slug`, so the script is safe to re-run and never
 * duplicates a vehicle or creates a second rate version.
 *
 *   NODE_ENV=production node --env-file=/etc/ma-safaris/api.env \
 *     --import tsx packages/database/scripts/seed-rental-fleet.ts
 */
import { config } from 'dotenv';
import { createDatabase } from '../src/index.js';

config({ path: '../../.env', quiet: true });

if (process.env.NODE_ENV !== 'production') {
  throw new Error('This rental fleet seed targets production data only. Use pnpm db:seed for local fixtures.');
}

const db = createDatabase();

type FleetSpec = {
  key: string;
  brand: string;
  model: string;
  variant: string;
  modelYear: number;
  category: string;
  segment: 'SUV' | 'CROSSOVER' | 'SEDAN' | 'MINIBUS' | 'VAN' | 'VINTAGE' | 'PICKUP';
  seats: number;
  doors: number;
  luggageCapacity: number;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuel: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  units: number;
  dailyTzs: number;
  serviceSlugs: string[];
  features: string[];
  description: string;
};

const safari4x4 = ['4×4', 'Pop-up safari roof', 'Air conditioning', 'Cooler box', 'Charging ports', 'Radio & USB', 'Roof rack'];
const executive = ['Air conditioning', 'Leather seats', 'Privacy glass', 'Charging ports', 'Bottled water', 'Airport meet & greet'];
const groupTransport = ['Air conditioning', 'Luggage trailer on request', 'Charging ports', 'PA system', 'Step access', 'Large luggage bay'];

const fleet: FleetSpec[] = [
  {
    key: 'lc79', brand: 'Toyota', model: 'Land Cruiser 79', variant: 'Double Cab 4×4',
    modelYear: 2023, category: 'Safari 4×4', segment: 'SUV', seats: 7, doors: 4,
    luggageCapacity: 8, transmission: 'MANUAL', fuel: 'DIESEL', units: 6, dailyTzs: 350_000,
    serviceSlugs: ['safari-ai-expeditions', 'safari-ai-transfers'], features: safari4x4,
    description: 'The definitive Tanzania safari vehicle: a hard-wearing 4×4 with a pop-up roof for game viewing and space for seven travellers with full camping kit.',
  },
  {
    key: 'lc200', brand: 'Toyota', model: 'Land Cruiser 200', variant: 'VX 4.5 V8',
    modelYear: 2022, category: 'Luxury 4×4', segment: 'SUV', seats: 6, doors: 4,
    luggageCapacity: 7, transmission: 'AUTOMATIC', fuel: 'DIESEL', units: 4, dailyTzs: 450_000,
    serviceSlugs: ['safari-ai-executive', 'safari-ai-expeditions'], features: [...safari4x4, 'Leather seats', 'Cool box fridge'],
    description: 'Flagship safari comfort: a quiet V8 4×4 with leather seating, generous luggage room and a pop-up roof for photographing the Serengeti.',
  },
  {
    key: 'prado', brand: 'Toyota', model: 'Land Cruiser Prado', variant: 'TX-L',
    modelYear: 2023, category: 'Safari 4×4', segment: 'SUV', seats: 6, doors: 4,
    luggageCapacity: 6, transmission: 'AUTOMATIC', fuel: 'DIESEL', units: 5, dailyTzs: 320_000,
    serviceSlugs: ['safari-ai-expeditions', 'safari-ai-transfers'], features: safari4x4,
    description: 'A comfortable, sure-footed 4×4 for northern-circuit parks and long transfers, equally at home on tarmac and rough tracks.',
  },
  {
    key: 'fortuner', brand: 'Toyota', model: 'Fortuner', variant: '2.8 GD-6',
    modelYear: 2023, category: 'Safari 4×4', segment: 'SUV', seats: 5, doors: 4,
    luggageCapacity: 5, transmission: 'AUTOMATIC', fuel: 'DIESEL', units: 3, dailyTzs: 280_000,
    serviceSlugs: ['safari-ai-transfers', 'safari-ai-expeditions'], features: safari4x4,
    description: 'A nimble 4×4 for smaller parties, day trips and airport runs around Arusha and Kilimanjaro.',
  },
  {
    key: 'patrol', brand: 'Nissan', model: 'Patrol', variant: 'Y62 4×4',
    modelYear: 2021, category: 'Safari 4×4', segment: 'SUV', seats: 6, doors: 4,
    luggageCapacity: 6, transmission: 'AUTOMATIC', fuel: 'PETROL', units: 2, dailyTzs: 300_000,
    serviceSlugs: ['safari-ai-expeditions'], features: safari4x4,
    description: 'A roomy, powerful 4×4 that handles remote routes and long game-drive days with ease.',
  },
  {
    key: 'rav4', brand: 'Toyota', model: 'RAV4', variant: '2.0 AWD',
    modelYear: 2023, category: 'Crossover', segment: 'CROSSOVER', seats: 5, doors: 5,
    luggageCapacity: 4, transmission: 'AUTOMATIC', fuel: 'PETROL', units: 2, dailyTzs: 220_000,
    serviceSlugs: ['safari-ai-transfers', 'safari-ai-corporate'], features: executive,
    description: 'An efficient all-wheel-drive crossover for city transfers, meetings and short excursions.',
  },
  {
    key: 'harrier', brand: 'Toyota', model: 'Harrier', variant: '2.0 Premium',
    modelYear: 2022, category: 'Crossover', segment: 'CROSSOVER', seats: 5, doors: 5,
    luggageCapacity: 4, transmission: 'AUTOMATIC', fuel: 'PETROL', units: 2, dailyTzs: 240_000,
    serviceSlugs: ['safari-ai-executive', 'safari-ai-corporate'], features: executive,
    description: 'A quiet, refined crossover for executive city mobility and discreet hotel transfers.',
  },
  {
    key: 'camry', brand: 'Toyota', model: 'Camry', variant: '2.5 SE',
    modelYear: 2022, category: 'Executive sedan', segment: 'SEDAN', seats: 4, doors: 4,
    luggageCapacity: 3, transmission: 'AUTOMATIC', fuel: 'PETROL', units: 2, dailyTzs: 250_000,
    serviceSlugs: ['safari-ai-executive', 'safari-ai-transfers'], features: executive,
    description: 'A comfortable executive sedan for airport pickups, meetings and city transfers with a uniformed chauffeur.',
  },
  {
    key: 'eclass', brand: 'Mercedes-Benz', model: 'E-Class', variant: 'E 220 d',
    modelYear: 2022, category: 'Executive sedan', segment: 'SEDAN', seats: 4, doors: 4,
    luggageCapacity: 3, transmission: 'AUTOMATIC', fuel: 'DIESEL', units: 2, dailyTzs: 400_000,
    serviceSlugs: ['safari-ai-executive', 'safari-ai-weddings'], features: [...executive, 'Ambient lighting', 'Bridal ribbon on request'],
    description: 'Premium executive saloon for VIP arrivals, weddings and corporate itineraries where presentation matters.',
  },
  {
    key: 'coaster', brand: 'Toyota', model: 'Coaster', variant: '4.2 D',
    modelYear: 2021, category: 'Group minibus', segment: 'MINIBUS', seats: 24, doors: 2,
    luggageCapacity: 20, transmission: 'MANUAL', fuel: 'DIESEL', units: 2, dailyTzs: 600_000,
    serviceSlugs: ['safari-ai-corporate', 'safari-ai-transfers'], features: groupTransport,
    description: 'A 24-seat minibus for school groups, corporate teams and conference shuttles with a professional driver.',
  },
  {
    key: 'hiace', brand: 'Toyota', model: 'HiAce', variant: 'Super GL',
    modelYear: 2022, category: 'Group van', segment: 'VAN', seats: 12, doors: 4,
    luggageCapacity: 12, transmission: 'MANUAL', fuel: 'DIESEL', units: 2, dailyTzs: 250_000,
    serviceSlugs: ['safari-ai-transfers', 'safari-ai-corporate'], features: groupTransport,
    description: 'A 12-seat passenger van with a large luggage bay for airport transfers and staff transport.',
  },
];

const serviceFallback = 'safari-ai-transfers';

let vehiclesTouched = 0;
let ratesTouched = 0;
let order = 0;

try {
  for (const spec of fleet) {
    for (let unit = 1; unit <= spec.units; unit += 1) {
      order += 1;
      const slug = `${spec.key}-${String(unit).padStart(2, '0')}`;
      const data = {
        brand: spec.brand,
        model: spec.model,
        variant: spec.variant,
        modelYear: spec.modelYear,
        category: spec.category,
        segment: spec.segment,
        seats: spec.seats,
        doors: spec.doors,
        luggageCapacity: spec.luggageCapacity,
        transmission: spec.transmission,
        fuel: spec.fuel,
        chauffeurDriven: true,
        selfDriveAvailable: false,
        features: spec.features,
        serviceSlugs: spec.serviceSlugs.length ? spec.serviceSlugs : [serviceFallback],
        description: spec.description,
        status: 'AVAILABLE',
        photo: null,
        sortOrder: order,
      };

      const vehicle = await db.rentalVehicle.upsert({
        where: { slug },
        update: data,
        create: { slug, ...data },
      });
      vehiclesTouched += 1;

      await db.rentalRate.upsert({
        where: { vehicleId_version_rateType_currency: { vehicleId: vehicle.id, version: 1, rateType: 'DAILY', currency: 'TZS' } },
        update: { amountMinor: BigInt(spec.dailyTzs) * 100n, minimumDays: 1, activeAt: new Date('2026-01-01T00:00:00Z') },
        create: {
          vehicleId: vehicle.id,
          version: 1,
          rateType: 'DAILY',
          currency: 'TZS',
          amountMinor: BigInt(spec.dailyTzs) * 100n,
          minimumDays: 1,
          note: 'Chauffeur, fuel and vehicle running costs as quoted in writing.',
          activeAt: new Date('2026-01-01T00:00:00Z'),
        },
      });
      ratesTouched += 1;
    }
  }

  const [available, rates] = await Promise.all([
    db.rentalVehicle.count({ where: { status: 'AVAILABLE' } }),
    db.rentalRate.count(),
  ]);
  console.log(JSON.stringify({ level: 'info', event: 'rental_fleet_seeded', vehiclesTouched, ratesTouched, available, rates }));
} finally {
  await db.$disconnect();
}
