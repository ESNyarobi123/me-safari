/**
 * Shapes returned by the M&A Safaris API. Money is always an integer
 * minor-unit decimal string; the console formats it with the currency exponent.
 */

export interface Money {
  currency: string;
  grossCaptured: string;
  refundsSettled: string;
  netCaptured: string;
  contractedSales: string;
  outstandingBalance: string;
}

export interface Overview {
  generatedAt: string;
  timezone: string;
  range: { startDate: string | null; endDate: string | null };
  definitions: Record<string, string>;
  counts: {
    bookings: number;
    requested: number;
    confirmed: number;
    active: number;
    completed: number;
    customRequests: number;
    openIssues: number;
    newInquiries: number;
    unassignedTrips: number;
  };
  actions: Array<{
    code?: string;
    label?: string;
    detail?: string;
    severity?: string;
    count?: number;
    href?: string;
  }>;
  currencyGroups: Money[];
  groups: Money[];
}

export interface PaymentSummary {
  currency: string;
  originalTotal: string;
  contractTotal: string;
  capturedTotal: string;
  refundedTotal: string;
  netPaid: string;
  balanceDue: string;
  refundDue: string;
  depositTarget: string;
  depositDue: string;
  status: string;
}

export interface Booking {
  id: string;
  reference: string;
  version: number;
  source: string;
  status: string;
  customerId: string;
  customer?: { id: string; name: string; email?: string; phone?: string };
  packageId: string | null;
  quoteId: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  adults: number;
  children: number;
  currency: string;
  travelers?: Array<{ id: string; fullName: string; band: string; isLead?: boolean; requirements?: Record<string, unknown> }>;
  pickup?: Record<string, unknown> | null;
  requirements?: Record<string, unknown>;
  priceSnapshot?: { lines?: Array<{ label: string; quantity: number; unitMinor: string; totalMinor: string }>; totalMinor?: string };
  paymentSummary?: PaymentSummary;
  financeException?: string | null;
  itinerary?: { id: string; state?: string; versionNumber?: number } | null;
  trip?: { id: string; status?: string; reference?: string } | null;
  availableActions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Trip {
  id: string;
  reference: string;
  status: string;
  version: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
  travelerCount: number;
  pickup?: { label?: string; address?: string; pickupAt?: string; approved?: boolean; contact?: { name?: string; phone?: string } } | null;
  vehicle?: { id: string; reference?: string; registration?: string; seats?: number; type?: string } | null;
  guide?: { id: string; name: string; phone?: string } | null;
  bookingId?: string;
  booking?: { id: string; reference?: string; status?: string };
  leadContact?: { name?: string; phone?: string } | null;
  requirements?: Record<string, unknown>;
  itinerary?: { id: string; state?: string } | null;
  issues?: TripIssue[];
  events?: TripEvent[];
}

export interface ChangeRequest {
  id: string;
  bookingId?: string;
  version: number;
  type: 'CANCEL' | 'RESCHEDULE' | 'DETAILS' | string;
  status?: string;
  reason?: string;
  proposed?: Record<string, unknown>;
  decisionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripIssue {
  id: string;
  tripId?: string;
  category: string;
  severity: string;
  description?: string;
  status: string;
  customerSummary?: string | null;
  createdAt?: string;
  ownerStaffId?: string | null;
}

export interface TripEvent {
  id: string;
  type?: string;
  eventType?: string;
  note?: string | null;
  createdAt: string;
  status?: string;
}

export interface CatalogPackage {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  durationDays: number;
  status: string;
  version: number;
  cover?: string | null;
  gallery?: string[];
  inclusions?: string[];
  exclusions?: string[];
  goodToKnow?: string[];
  localized?: Record<string, unknown>;
  destinations?: Array<{ id: string; title?: string; slug?: string }>;
  prices?: Price[];
  departures?: Departure[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Price {
  id: string;
  currency: string;
  adultMinor: string;
  childBasisPoints: number;
  childMinAge: number;
  childMaxAge: number;
  startsAt: string;
  endsAt?: string | null;
  rules?: Record<string, unknown>;
  active?: boolean;
}

export interface Departure {
  id: string;
  packageId?: string;
  startDate: string;
  endDate?: string | null;
  capacity: number;
  status: string;
  version?: number;
  seatsRemaining?: number;
}

export interface Destination {
  id: string;
  slug: string;
  title: string;
  description: string;
  region?: string | null;
  gallery?: string[];
  status: string;
  version: number;
  localized?: Record<string, unknown>;
  packages?: Array<{ id: string; title?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceLine {
  id: string;
  slug: string;
  title: string;
  description: string;
  requestMode: string;
  sortOrder: number;
  status: string;
  version: number;
  localized?: Record<string, unknown>;
}

export interface CustomRequest {
  id: string;
  reference?: string;
  status: string;
  version: number;
  serviceId?: string;
  service?: { id: string; title?: string; slug?: string };
  customerId?: string;
  customer?: { id: string; name?: string; email?: string };
  destinations?: string[];
  startDate?: string | null;
  endDate?: string | null;
  adults?: number;
  children?: number;
  budgetMinor?: string | null;
  currency?: string;
  requirements?: Record<string, unknown>;
  ownerStaffId?: string | null;
  quotes?: Quote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  requestId?: string;
  version: number;
  status: string;
  currency: string;
  totalMinor?: string;
  lines?: Array<{ description: string; quantity: number; unitAmountMinor: string }>;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  preferences?: Record<string, unknown>;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  user?: { status?: string; emailVerifiedAt?: string | null };
  bookings?: Booking[];
  inquiries?: Inquiry[];
}

export interface Inquiry {
  id: string;
  source: string;
  status: string;
  version: number;
  customerId?: string | null;
  customer?: { id: string; name?: string; email?: string } | null;
  serviceId?: string | null;
  service?: { id: string; title?: string } | null;
  contact?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  ownerStaffId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  type: string;
  seats: number;
  luggageCapacity: number;
  capabilities: string[];
  status: string;
  photo?: string | null;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  allocations?: Array<Record<string, unknown>>;
  maintenanceBlocks?: Array<Record<string, unknown>>;
}

export interface StaffMember {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  languages: string[];
  capabilities: string[];
  active: boolean;
  version: number;
  createdAt?: string;
  user?: { id: string; email: string; status: string; version: number; roles: Array<{ role: string }> };
  availability?: Array<{ id: string; startsAt: string; endsAt: string; type: string; note?: string }>;
}

export interface PaymentPosting {
  id: string;
  bookingId: string;
  intentId?: string | null;
  offlineRecordId?: string | null;
  amountMinor: string;
  currency: string;
  provider: string;
  providerReference?: string | null;
  settledAt?: string | null;
  createdAt: string;
  refunds?: Refund[];
  documents?: Array<{ id: string; status: string }>;
  intent?: { id: string; status?: string; attempts?: Array<Record<string, unknown>> };
  booking?: { id: string; reference?: string };
}

export interface Refund {
  id: string;
  postingId: string;
  amountMinor: string;
  currency?: string;
  status: string;
  reason?: string;
  version?: number;
  createdAt?: string;
  posting?: PaymentPosting;
  postings?: Array<Record<string, unknown>>;
}

export interface OfflinePaymentRecord {
  id: string;
  bookingId: string;
  reference: string;
  method: string;
  amountMinor: string;
  currency: string;
  status?: string;
  state?: string;
  reason?: string | null;
  evidence?: Record<string, unknown>;
  verifiedAt?: string | null;
  posting?: PaymentPosting | null;
  createdAt?: string;
}

export interface VehicleRental extends Record<string, unknown> {
  id: string;
  slug: string;
  brand: string;
  model: string;
  variant?: string | null;
  modelYear?: number | null;
  category: string;
  segment: string;
  seats: number;
  doors?: number | null;
  luggageCapacity?: number | null;
  transmission?: string | null;
  fuel?: string | null;
  chauffeurDriven?: boolean;
  selfDriveAvailable?: boolean;
  features?: string[];
  serviceSlugs?: string[];
  description?: string | null;
  status: string;
  photoUrl?: string | null;
  version: number;
  fromPrice?: RentalRate | null;
  rates?: RentalRate[];
}

export interface RentalRate {
  id: string;
  rateType: string;
  currency: string;
  amountMinor: string;
  minimumDays?: number | null;
  note?: string | null;
  activeAt?: string;
}

export interface RentalServiceLine {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  useCases?: string[];
  icon?: string | null;
  sortOrder?: number;
  version: number;
  status?: string;
  localized?: Record<string, unknown>;
}

export interface Review {
  id: string;
  bookingId?: string;
  customerId?: string;
  stars: number;
  text: string;
  status: string;
  version: number;
  customer?: { id: string; name?: string };
  createdAt?: string;
}

export interface SupportThread {
  id: string;
  subject: string;
  status: string;
  version: number;
  customerId?: string;
  ownerStaffId?: string | null;
  customer?: { id: string; name?: string };
  messages?: Array<{ id: string; body: string; visibility: string; createdAt: string; authorId?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditEntry {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string;
  summary?: Record<string, unknown>;
  reason?: string | null;
  createdAt: string;
}

export interface BackgroundJob {
  id: string;
  type?: string;
  state?: string;
  attempts?: number;
  error?: string | null;
  nextAttemptAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InternalNote {
  id: string;
  targetType?: string;
  targetId?: string;
  authorId?: string;
  body: string;
  createdAt: string;
}

export interface AccessSnapshot {
  permissions: string[];
  roleDefaults: Record<string, string[]>;
  users?: Array<{
    id: string;
    email: string;
    status: string;
    roles: Array<{ role: string }>;
    overrides?: Array<{ action: string; allow: boolean; reason?: string }>;
    staff?: { displayName?: string } | null;
  }>;
  overrides?: Array<Record<string, unknown>>;
}

export interface CompanySettings {
  company: {
    id: string;
    version: number;
    settings: Record<string, unknown>;
  };
  policies?: Array<Record<string, unknown>>;
  versions?: Array<Record<string, unknown>>;
}

export interface LandingSnapshot {
  locale: string;
  draft: LandingVersion | null;
  published: LandingVersion | null;
}

export interface LandingVersion {
  id: string;
  version: number;
  locale: string;
  status: string;
  blocks: Record<string, Record<string, unknown>>;
  createdAt?: string;
  publishedAt?: string;
}

export interface RentalPolicyVersion {
  id: string;
  version: number;
  status: string;
  policy: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface RentalPolicySnapshot {
  draft: RentalPolicyVersion | null;
  published: RentalPolicyVersion | null;
  history?: RentalPolicyVersion[];
}

export interface IntegrationStatus {
  payments: { provider: string; status: string };
  email: { provider: string; status: string };
  push: { provider: string; status: string };
  storage: { driver: string; status: string };
  malwareScanning: { status: string };
  stores: { status: string };
}

export interface ReportExport {
  id: string;
  reportType?: string;
  status: string;
  filters?: Record<string, unknown>;
  downloadUrl?: string;
  rowCount?: number;
  createdAt?: string;
  expiresAt?: string;
}
