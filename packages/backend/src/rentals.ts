import { Prisma, type PrismaClient } from '@ma/database';
import { allowed, audit, command, customer, date, emit, pagination, requireFuture, transaction, type Actor, type Command, type Tx } from './core.js';
import { checkVersion, fail, requireValue } from './errors.js';
import { minor, serialize, supportedCurrency } from './money.js';

/**
 * SAFARI AI RENTALS — the car rental and chauffeur service of Me and Adventure Safaris.
 * The published policy is chauffeur-driven by default: self-drive is only offered where a
 * vehicle record explicitly enables it and the written quotation approves it.
 */
type CatalogQuery = Record<string, string | undefined>;
type JsonObject = Record<string, Prisma.JsonValue>;
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const json = (value: unknown): Prisma.InputJsonValue => serialize(value) as Prisma.InputJsonValue;
const texts = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
const localized = (value: unknown) => Object.fromEntries(Object.entries(object(value)).filter(([key]) => ['en', 'sw'].includes(key)));
const slug = (value: string, field = 'slug') => { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 100) fail(422, 'VALIDATION_FAILED', 'Use a lowercase hyphenated slug.', { field }); return value; };
function text(value: unknown, field: string, maximum = 4000): string { if (typeof value !== 'string' || !value.trim() || value.length > maximum) fail(422, 'VALIDATION_FAILED', `A valid ${field} is required.`, { field }); return value.trim(); }
function integer(value: number, field: string, minimum: number, maximum: number) { if (!Number.isInteger(value) || value < minimum || value > maximum) fail(422, 'VALIDATION_FAILED', `${field} is outside its allowed range.`, { field }); return value; }
const SEGMENTS = ['SUV', 'CROSSOVER', 'SEDAN', 'MINIBUS', 'VAN', 'VINTAGE', 'PICKUP'];
const STATUSES = ['AVAILABLE', 'ON_REQUEST', 'MAINTENANCE', 'RETIRED'];
const TRANSMISSIONS = ['AUTOMATIC', 'MANUAL'];
const FUELS = ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC'];
const RATE_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Fleet records are addressed by slug in public links and by id in admin flows; ids are UUID columns, so the id clause must only be sent for a real UUID. */
const byIdOrSlug = (value: string) => UUID.test(value) ? { OR: [{ slug: value }, { id: value }] } : { slug: value };

export interface RentalRateInput { rateType?: string; currency: string; amountMinor: string; minimumDays?: number; note?: string }
export interface RentalVehicleInput {
  slug: string; brand: string; model: string; variant?: string; modelYear?: number; category: string; segment: string;
  seats: number; doors?: number; luggageCapacity?: number; transmission?: string; fuel?: string;
  chauffeurDriven?: boolean; selfDriveAvailable?: boolean; features?: string[]; serviceSlugs?: string[];
  description?: string; status?: string; photo?: string; sortOrder?: number; rate?: RentalRateInput;
}
export type RentalVehiclePatch = Partial<RentalVehicleInput> & { expectedVersion: number };
export interface RentalServiceLineInput { slug: string; title: string; tagline: string; description: string; useCases?: string[]; icon?: string; sortOrder?: number; localized?: Prisma.InputJsonValue }
export interface RentalEnquiryInput {
  vehicleId?: string; serviceSlug?: string; pickupLocation: string; dropOffLocation?: string;
  startDate: string; endDate?: string; days?: number; passengers: number; withChauffeur: boolean;
  intendedRoute?: string; notes?: string; contactName: string; contactPhone: string; contactEmail?: string; customerId?: string;
}

const vehicleInclude = { rates: { orderBy: [{ activeAt: 'desc' as const }, { version: 'desc' as const }] } } satisfies Prisma.RentalVehicleInclude;
type VehicleRecord = Prisma.RentalVehicleGetPayload<{ include: typeof vehicleInclude }>;

function effectiveRate(vehicle: VehicleRecord) {
  const now = new Date();
  const active = vehicle.rates.filter(rate => rate.activeAt <= now);
  return active.find(rate => rate.rateType === 'DAILY' && rate.currency === 'TZS')
    ?? active.find(rate => rate.rateType === 'DAILY')
    ?? active[0];
}
function publicRate(rate: { id: string; rateType: string; currency: string; amountMinor: bigint; minimumDays: number; note: string | null; activeAt: Date }) {
  return { id: rate.id, rateType: rate.rateType, currency: rate.currency, amountMinor: rate.amountMinor.toString(), minimumDays: rate.minimumDays, note: rate.note, activeAt: rate.activeAt };
}
function publicVehicle(vehicle: VehicleRecord) {
  const rate = effectiveRate(vehicle);
  return {
    id: vehicle.id, slug: vehicle.slug, brand: vehicle.brand, model: vehicle.model, variant: vehicle.variant, modelYear: vehicle.modelYear,
    category: vehicle.category, segment: vehicle.segment, seats: vehicle.seats, doors: vehicle.doors, luggageCapacity: vehicle.luggageCapacity,
    transmission: vehicle.transmission, fuel: vehicle.fuel, chauffeurDriven: vehicle.chauffeurDriven, selfDriveAvailable: vehicle.selfDriveAvailable,
    features: vehicle.features, serviceSlugs: vehicle.serviceSlugs, description: vehicle.description, status: vehicle.status,
    photoUrl: vehicle.photo ?? null, version: vehicle.version,
    fromPrice: rate ? publicRate(rate) : null,
    rates: vehicle.rates.map(publicRate),
  };
}
function publicServiceLine(row: { id: string; slug: string; title: string; tagline: string; description: string; useCases: string[]; icon: string | null; localized: Prisma.JsonValue; sortOrder: number; version: number }) {
  return { id: row.id, slug: row.slug, title: row.title, tagline: row.tagline, description: row.description, useCases: row.useCases, icon: row.icon, localized: localized(row.localized), sortOrder: row.sortOrder, version: row.version };
}

export class RentalService {
  constructor(public db: PrismaClient) {}

  private async publishedPolicy() {
    const row = await this.db.rentalPolicyVersion.findFirst({ where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' } });
    return row ? { id: row.id, version: row.version, publishedAt: row.publishedAt, policy: object(row.policy) } : { id: null, version: 0, publishedAt: null, policy: {} };
  }

  async publicServices(query: CatalogQuery = {}) {
    const rows = await this.db.rentalServiceLine.findMany({
      where: { status: 'PUBLISHED', ...(query.search ? { OR: [{ title: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { description: { contains: query.search.slice(0, 100), mode: 'insensitive' } }] } : {}) },
      take: 50, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map(publicServiceLine);
  }

  async publicVehicles(query: CatalogQuery = {}) {
    const minimumSeats = Number(query.seats);
    const rows = await this.db.rentalVehicle.findMany({
      where: {
        status: { in: query.includeRetired === 'true' ? STATUSES : ['AVAILABLE', 'ON_REQUEST'] },
        ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
        ...(query.segment ? { segment: query.segment.toUpperCase() } : {}),
        ...(query.service ? { serviceSlugs: { has: query.service } } : {}),
        ...(query.chauffeur === 'true' ? { chauffeurDriven: true } : {}),
        ...(query.selfDrive === 'true' ? { selfDriveAvailable: true } : {}),
        ...(minimumSeats > 0 && minimumSeats <= 100 ? { seats: { gte: minimumSeats } } : {}),
        ...(query.search ? { OR: [{ brand: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { model: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { variant: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { category: { contains: query.search.slice(0, 100), mode: 'insensitive' } }] } : {}),
      },
      include: vehicleInclude, ...pagination(query), orderBy: [{ sortOrder: 'asc' }, { brand: 'asc' }, { model: 'asc' }, { id: 'asc' }],
    });
    const projected = rows.map(publicVehicle);
    const direction = query.sort === 'price_desc' ? -1 : query.sort === 'price_asc' ? 1 : 0;
    if (direction) projected.sort((a, b) => direction * (Number(a.fromPrice?.amountMinor ?? '0') - Number(b.fromPrice?.amountMinor ?? '0')));
    return projected;
  }

  async publicVehicle(value: string) {
    const row = requireValue(await this.db.rentalVehicle.findFirst({ where: byIdOrSlug(value), include: vehicleInclude }));
    return publicVehicle(row);
  }

  async publicFleetSummary() {
    const rows = await this.db.rentalVehicle.groupBy({ by: ['category', 'segment'], where: { status: { in: ['AVAILABLE', 'ON_REQUEST'] } }, _count: { _all: true }, _min: { seats: true }, _max: { seats: true } });
    const categories: Record<string, { category: string; vehicles: number }> = {};
    const segments: Record<string, number> = {};
    for (const row of rows) { categories[row.category] = { category: row.category, vehicles: (categories[row.category]?.vehicles ?? 0) + row._count._all }; segments[row.segment] = (segments[row.segment] ?? 0) + row._count._all; }
    return { totalVehicles: rows.reduce((sum, row) => sum + row._count._all, 0), categories: Object.values(categories).sort((a, b) => a.category.localeCompare(b.category)), segments: Object.entries(segments).map(([segment, vehicles]) => ({ segment, vehicles })).sort((a, b) => b.vehicles - a.vehicles) };
  }

  async publicOverview(query: CatalogQuery = {}) {
    const [services, policy, fleet] = await Promise.all([this.publicServices(), this.publishedPolicy(), this.publicFleetSummary()]);
    const featured = await this.db.rentalVehicle.findMany({ where: { status: 'AVAILABLE' }, include: vehicleInclude, take: 6, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return { name: 'Safari AI Rentals', tagline: 'Seamless rides, timeless memories.', operator: 'Me and Adventure Safaris', services, policy, fleet, featured: featured.map(publicVehicle), ...(query.locale ? { locale: query.locale } : {}) };
  }

  async publicPolicy() { return this.publishedPolicy(); }

  async enquire(actor: Actor, input: RentalEnquiryInput, opts: Command) {
    const owner = actor.role === 'CUSTOMER' ? customer(actor, true) : (allowed(actor, 'inquiry.manage'), requireValue(input.customerId, 'Select a customer for this enquiry.'));
    const service = await this.db.serviceCategory.findFirst({ where: { slug: 'safari-ai-rentals' } });
    const vehicle = input.vehicleId ? await this.db.rentalVehicle.findFirst({ where: byIdOrSlug(input.vehicleId), include: vehicleInclude }) : null;
    const start = date(input.startDate); requireFuture(start);
    const end = input.endDate ? date(input.endDate) : input.days ? new Date(start.getTime() + (input.days - 1) * 86_400_000) : undefined;
    if (end && end < start) fail(422, 'VALIDATION_FAILED', 'Return date must follow the pick-up date.');
    const days = input.days ?? (end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1 : 1);
    if (days < 1 || days > 365) fail(422, 'VALIDATION_FAILED', 'Rental duration is outside its allowed range.', { field: 'days' });
    const rate = vehicle ? effectiveRate(vehicle) : undefined;
    const requirements = json({
      rental: true,
      vehicleId: vehicle?.id ?? null, vehicleLabel: vehicle ? [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' ') : null,
      rateType: rate?.rateType ?? null, rateCurrency: rate?.currency ?? null, rateAmountMinor: rate?.amountMinor.toString() ?? null, quotedDays: days,
      estimatedTotalMinor: rate ? (rate.amountMinor * BigInt(days)).toString() : null,
      pickupLocation: input.pickupLocation, dropOffLocation: input.dropOffLocation ?? input.pickupLocation,
      withChauffeur: input.withChauffeur, intendedRoute: input.intendedRoute ?? null, notes: input.notes ?? null,
      contact: { name: input.contactName, phone: input.contactPhone, email: input.contactEmail ?? null },
      longTermDiscountEligible: days > 10,
    });
    return command(this.db, actor, 'rental.enquire', input, opts, async tx => {
      const request = await tx.customRequest.create({
        data: {
          customerId: owner, serviceId: requireValue(service, 'The Safari AI Rentals service category is not configured.').id,
          destinations: texts([input.intendedRoute]).slice(0, 30), startDate: start, endDate: end, adults: input.passengers, children: 0,
          currency: rate?.currency ?? 'TZS', requirements, status: 'SUBMITTED',
        },
      });
      await emit(tx, 'rental.enquiry_submitted', request.id, 1, { customerId: owner, vehicleId: vehicle?.id ?? null, days });
      await audit(tx, actor, 'rental.enquiry_created', 'CustomRequest', request.id, { vehicleId: vehicle?.id ?? null, days });
      return { id: request.id, status: request.status, days, estimatedTotalMinor: rate ? (rate.amountMinor * BigInt(days)).toString() : null, longTermDiscountEligible: days > 10, serviceSlug: 'safari-ai-rentals' };
    });
  }

  async adminVehicles(actor: Actor, query: CatalogQuery = {}) {
    allowed(actor, 'rental.manage');
    return this.db.rentalVehicle.findMany({
      where: { ...(query.status ? { status: query.status } : {}), ...(query.category ? { category: query.category } : {}), ...(query.search ? { OR: [{ brand: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { model: { contains: query.search.slice(0, 100), mode: 'insensitive' } }, { slug: { contains: query.search.slice(0, 100), mode: 'insensitive' } }] } : {}) },
      include: vehicleInclude, ...pagination(query), orderBy: [{ sortOrder: 'asc' }, { brand: 'asc' }, { model: 'asc' }, { id: 'asc' }],
    }).then(rows => serialize(rows.map(publicVehicle)));
  }

  async adminVehicle(actor: Actor, id: string) { allowed(actor, 'rental.manage'); return serialize(publicVehicle(requireValue(await this.db.rentalVehicle.findFirst({ where: byIdOrSlug(id), include: vehicleInclude })))); }

  private vehicleData(input: RentalVehicleInput, complete = false) {
    slug(input.slug, 'slug'); text(input.brand, 'brand', 80); text(input.model, 'model', 120);
    text(input.category, 'category', 60);
    const segment = text(input.segment, 'segment', 40).toUpperCase();
    if (!SEGMENTS.includes(segment)) fail(422, 'VALIDATION_FAILED', 'Unsupported vehicle segment.', { field: 'segment' });
    integer(input.seats, 'seats', 1, 80); integer(input.doors ?? 4, 'doors', 2, 6); integer(input.luggageCapacity ?? 0, 'luggageCapacity', 0, 200); integer(input.sortOrder ?? 0, 'sortOrder', 0, 10000);
    const transmission = (input.transmission ?? 'AUTOMATIC').toUpperCase(); if (!TRANSMISSIONS.includes(transmission)) fail(422, 'VALIDATION_FAILED', 'Unsupported transmission.', { field: 'transmission' });
    const fuel = (input.fuel ?? 'PETROL').toUpperCase(); if (!FUELS.includes(fuel)) fail(422, 'VALIDATION_FAILED', 'Unsupported fuel type.', { field: 'fuel' });
    const status = (input.status ?? 'AVAILABLE').toUpperCase(); if (!STATUSES.includes(status)) fail(422, 'VALIDATION_FAILED', 'Unsupported fleet status.', { field: 'status' });
    if (input.modelYear !== undefined && (input.modelYear < 1950 || input.modelYear > new Date().getFullYear() + 2)) fail(422, 'VALIDATION_FAILED', 'Model year is outside its allowed range.', { field: 'modelYear' });
    if (complete && !input.rate) fail(422, 'PUBLISH_INCOMPLETE', 'Publishing a vehicle needs a daily rate.', { field: 'rate' });
    return {
      slug: input.slug, brand: input.brand.trim(), model: input.model.trim(), variant: input.variant?.trim() || null, modelYear: input.modelYear ?? null,
      category: input.category.trim(), segment, seats: input.seats, doors: input.doors ?? 4, luggageCapacity: input.luggageCapacity ?? 0,
      transmission, fuel, chauffeurDriven: input.chauffeurDriven ?? true, selfDriveAvailable: input.selfDriveAvailable ?? false,
      features: (input.features ?? []).slice(0, 60), serviceSlugs: (input.serviceSlugs ?? []).slice(0, 20),
      description: input.description?.slice(0, 4000) ?? null, status, photo: input.photo ?? null, sortOrder: input.sortOrder ?? 0,
    };
  }

  private async createRate(tx: Tx, vehicleId: string, actor: Actor, input: RentalRateInput) {
    supportedCurrency(input.currency);
    const rateType = (input.rateType ?? 'DAILY').toUpperCase();
    if (!RATE_TYPES.includes(rateType)) fail(422, 'VALIDATION_FAILED', 'Unsupported rate type.', { field: 'rateType' });
    const amount = minor(input.amountMinor);
    if (amount <= 0n) fail(422, 'VALIDATION_FAILED', 'Rate must be positive.');
    integer(input.minimumDays ?? 1, 'minimumDays', 1, 365);
    const latest = await tx.rentalRate.findFirst({ where: { vehicleId, rateType, currency: input.currency }, orderBy: { version: 'desc' } });
    return tx.rentalRate.create({ data: { vehicleId, version: (latest?.version ?? 0) + 1, rateType, currency: input.currency, amountMinor: amount, minimumDays: input.minimumDays ?? 1, note: input.note?.slice(0, 300), createdBy: actor.id } });
  }

  async createVehicle(actor: Actor, input: RentalVehicleInput) {
    allowed(actor, 'rental.manage');
    return transaction(this.db, async tx => {
      const data = this.vehicleData(input, true);
      requireValue(await tx.serviceCategory.findFirst({ where: { slug: 'safari-ai-rentals' } }), 'The Safari AI Rentals service category is not configured.');
      const vehicle = await tx.rentalVehicle.create({ data });
      if (input.rate) await this.createRate(tx, vehicle.id, actor, input.rate);
      await audit(tx, actor, 'rental.vehicle_created', 'RentalVehicle', vehicle.id, { slug: vehicle.slug });
      return publicVehicle(requireValue(await tx.rentalVehicle.findUnique({ where: { id: vehicle.id }, include: vehicleInclude })));
    });
  }

  async updateVehicle(actor: Actor, id: string, input: RentalVehiclePatch) {
    allowed(actor, 'rental.manage');
    return transaction(this.db, async tx => {
      const row = requireValue(await tx.rentalVehicle.findUnique({ where: { id }, include: vehicleInclude }));
      checkVersion(row.version, input.expectedVersion);
      const { expectedVersion: _, rate, ...patch } = input;
      const merged: RentalVehicleInput = {
        slug: row.slug, brand: row.brand, model: row.model, variant: row.variant ?? undefined, modelYear: row.modelYear ?? undefined,
        category: row.category, segment: row.segment, seats: row.seats, doors: row.doors, luggageCapacity: row.luggageCapacity,
        transmission: row.transmission, fuel: row.fuel, chauffeurDriven: row.chauffeurDriven, selfDriveAvailable: row.selfDriveAvailable,
        features: row.features, serviceSlugs: row.serviceSlugs, description: row.description ?? undefined, status: row.status, photo: row.photo ?? undefined, sortOrder: row.sortOrder, ...patch,
      };
      const updated = await tx.rentalVehicle.update({ where: { id }, data: { ...this.vehicleData(merged), version: { increment: 1 } } });
      if (rate) await this.createRate(tx, id, actor, rate);
      await audit(tx, actor, 'rental.vehicle_updated', 'RentalVehicle', id, { version: updated.version });
      return publicVehicle(requireValue(await tx.rentalVehicle.findUnique({ where: { id }, include: vehicleInclude })));
    });
  }

  async addVehicleRate(actor: Actor, id: string, input: RentalRateInput) {
    allowed(actor, 'rental.manage');
    return transaction(this.db, async tx => {
      const vehicle = requireValue(await tx.rentalVehicle.findFirst({ where: byIdOrSlug(id) }));
      const rate = await this.createRate(tx, vehicle.id, actor, input);
      await audit(tx, actor, 'rental.rate_created', 'RentalVehicle', vehicle.id, { rateType: rate.rateType, currency: rate.currency, amountMinor: rate.amountMinor.toString() });
      return publicVehicle(requireValue(await tx.rentalVehicle.findUnique({ where: { id: vehicle.id }, include: vehicleInclude })));
    });
  }

  async retireVehicle(actor: Actor, id: string, input: { expectedVersion: number; reason: string }) {
    allowed(actor, 'rental.manage');
    return transaction(this.db, async tx => {
      const row = requireValue(await tx.rentalVehicle.findUnique({ where: { id } }));
      checkVersion(row.version, input.expectedVersion);
      const updated = await tx.rentalVehicle.update({ where: { id }, data: { status: 'RETIRED', version: { increment: 1 } } });
      await audit(tx, actor, 'rental.vehicle_retired', 'RentalVehicle', id, { version: updated.version }, input.reason);
      return publicVehicle(requireValue(await tx.rentalVehicle.findUnique({ where: { id }, include: vehicleInclude })));
    });
  }

  async adminServices(actor: Actor, query: CatalogQuery = {}) { allowed(actor, 'rental.manage'); const rows = await this.db.rentalServiceLine.findMany({ where: { ...(query.status ? { status: query.status } : {}) }, take: 50, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }); return rows.map(publicServiceLine); }

  private serviceData(input: RentalServiceLineInput) {
    slug(input.slug); text(input.title, 'title', 120); text(input.tagline, 'tagline', 200); text(input.description, 'description');
    integer(input.sortOrder ?? 0, 'sortOrder', 0, 10000);
    return { slug: input.slug, title: input.title.trim(), tagline: input.tagline.trim(), description: input.description.trim(), useCases: (input.useCases ?? []).slice(0, 30), icon: input.icon ?? null, localized: json(localized(input.localized)), sortOrder: input.sortOrder ?? 0 };
  }

  async createServiceLine(actor: Actor, input: RentalServiceLineInput) {
    allowed(actor, 'rental.manage');
    return transaction(this.db, async tx => { const row = await tx.rentalServiceLine.create({ data: { ...this.serviceData(input), status: 'DRAFT' } }); await audit(tx, actor, 'rental.service_created', 'RentalServiceLine', row.id, { slug: row.slug }); return publicServiceLine(row); });
  }

  async updateServiceLine(actor: Actor, id: string, input: Partial<RentalServiceLineInput> & { expectedVersion: number; status?: string }) {
    allowed(actor, 'rental.manage');
    if (input.status === 'PUBLISHED') allowed(actor, 'content.publish');
    return transaction(this.db, async tx => {
      const row = requireValue(await tx.rentalServiceLine.findUnique({ where: { id } }));
      checkVersion(row.version, input.expectedVersion);
      const { expectedVersion: _, status, ...patch } = input;
      const merged: RentalServiceLineInput = { slug: row.slug, title: row.title, tagline: row.tagline, description: row.description, useCases: row.useCases, icon: row.icon ?? undefined, sortOrder: row.sortOrder, localized: row.localized as Prisma.InputJsonValue, ...patch };
      if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) fail(422, 'VALIDATION_FAILED', 'Unsupported status.');
      const updated = await tx.rentalServiceLine.update({ where: { id }, data: { ...this.serviceData(merged), ...(status ? { status } : {}), version: { increment: 1 } } });
      await audit(tx, actor, 'rental.service_updated', 'RentalServiceLine', id, { version: updated.version, status: updated.status });
      return publicServiceLine(updated);
    });
  }

  async adminPolicy(actor: Actor) {
    allowed(actor, 'rental.manage');
    const rows = await this.db.rentalPolicyVersion.findMany({ take: 20, orderBy: { version: 'desc' } });
    return { draft: rows.find(row => row.status === 'DRAFT') ?? null, published: rows.find(row => row.status === 'PUBLISHED') ?? null, history: rows.map(row => ({ id: row.id, version: row.version, status: row.status, publishedAt: row.publishedAt, createdAt: row.createdAt })) };
  }

  async savePolicyDraft(actor: Actor, input: { expectedVersion: number; policy: Prisma.InputJsonValue }) {
    allowed(actor, 'rental.manage');
    if (!input.policy || typeof input.policy !== 'object' || Array.isArray(input.policy)) fail(422, 'VALIDATION_FAILED', 'Rental policy uses a typed object.');
    if (JSON.stringify(input.policy).length > 65536) fail(422, 'VALIDATION_FAILED', 'Rental policy content is too large.');
    return transaction(this.db, async tx => {
      const current = await tx.rentalPolicyVersion.findFirst({ orderBy: { version: 'desc' } });
      checkVersion(current?.version ?? 0, input.expectedVersion);
      await tx.rentalPolicyVersion.updateMany({ where: { status: 'DRAFT' }, data: { status: 'SUPERSEDED' } });
      const row = await tx.rentalPolicyVersion.create({ data: { version: (current?.version ?? 0) + 1, status: 'DRAFT', policy: input.policy, createdBy: actor.id } });
      await audit(tx, actor, 'rental.policy_draft_saved', 'RentalPolicyVersion', row.id, { version: row.version });
      return { id: row.id, version: row.version, status: row.status, policy: object(row.policy) };
    });
  }

  async publishPolicy(actor: Actor, input: { expectedVersion: number }) {
    allowed(actor, 'rental.manage'); allowed(actor, 'content.publish');
    return transaction(this.db, async tx => {
      const row = requireValue(await tx.rentalPolicyVersion.findFirst({ where: { status: 'DRAFT' }, orderBy: { version: 'desc' } }));
      checkVersion(row.version, input.expectedVersion);
      await tx.rentalPolicyVersion.updateMany({ where: { status: 'PUBLISHED' }, data: { status: 'SUPERSEDED' } });
      const published = await tx.rentalPolicyVersion.update({ where: { id: row.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await audit(tx, actor, 'rental.policy_published', 'RentalPolicyVersion', row.id, { version: row.version });
      await emit(tx, 'catalog.published', row.id, row.version, { entityType: 'RentalPolicyVersion' });
      return { id: published.id, version: published.version, status: published.status, publishedAt: published.publishedAt, policy: object(published.policy) };
    });
  }
}
