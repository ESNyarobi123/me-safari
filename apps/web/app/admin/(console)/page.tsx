'use client';

import { Button, Chip, Skeleton, Separator } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { BarSeriesChart, DonutChart, RankedBars, Sparkline } from '../components/charts';
import { Icon } from '../components/icons';
import {
  DataTable,
  EmptyState,
  ErrorPanel,
  Money,
  Panel,
  RefreshButton,
  StatCard,
  StatGrid,
  StatusChip,
  type Column,
} from '../components/ui';
import { useApi, useList } from '../lib/hooks';
import { useWorkspace } from '../lib/workspace';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/hooks';
import { formatDate, formatDateTime, formatRelative, labelize, moneyValue, truncate } from '../lib/format';
import type { AuditEntry, Booking, Money as MoneyGroup, Overview, Trip, Vehicle } from '../lib/types';

const MONTHS = 8;

export default function DashboardPage() {
  const router = useRouter();
  const { currency, setCurrency } = useWorkspace();
  const { user } = useAuth();

  const overview = useApi<Overview>('/admin/overview');
  const bookings = useList<Booking>('/bookings', { limit: 50 });
  const trips = useList<Trip>('/trips', { limit: 12 });
  const audit = useList<AuditEntry>('/admin/audit', { limit: 8 });
  const vehicles = useList<Vehicle>('/admin/vehicles', { limit: 50 });

  const counts = overview.data?.counts;
  const groups = overview.data?.currencyGroups ?? [];
  const active: MoneyGroup | undefined = groups.find((group) => group.currency === currency) ?? groups[0];

  const bookingRows = bookings.data?.rows ?? [];
  const tripRows = trips.data?.rows ?? [];
  const vehicleRows = vehicles.data?.rows ?? [];

  /* -------------------------------------------------------- monthly series */
  const monthly = useMemo(() => {
    const buckets = new Map<string, { confirmed: number; requested: number; other: number }>();
    const now = new Date();
    for (let index = MONTHS - 1; index >= 0; index -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
      buckets.set(`${date.getUTCFullYear()}-${date.getUTCMonth()}`, { confirmed: 0, requested: 0, other: 0 });
    }
    for (const booking of bookingRows) {
      const date = new Date(booking.startDate);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') bucket.confirmed += 1;
      else if (booking.status === 'REQUESTED') bucket.requested += 1;
      else bucket.other += 1;
    }
    const labels: string[] = [];
    const confirmed: number[] = [];
    const requested: number[] = [];
    const other: number[] = [];
    for (const [key, bucket] of buckets) {
      const [year, month] = key.split('-').map(Number);
      labels.push(
        new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
          new Date(Date.UTC(year!, month!, 1)),
        ),
      );
      confirmed.push(bucket.confirmed);
      requested.push(bucket.requested);
      other.push(bucket.other);
    }
    return { labels, confirmed, requested, other };
  }, [bookingRows]);

  const moneyByCurrency = useMemo(
    () =>
      groups.map((group) => ({
        label: group.currency,
        value: moneyValue(group.contractedSales, group.currency),
        hint: 'contracted',
      })),
    [groups],
  );

  const fleetStatus = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const vehicle of vehicleRows) buckets.set(vehicle.status, (buckets.get(vehicle.status) ?? 0) + 1);
    return [...buckets.entries()].map(([label, value]) => ({ label: labelize(label), value }));
  }, [vehicleRows]);

  const attention = useMemo(() => {
    const rows: Array<{ label: string; detail: string; count: number; href: string; tone: 'warning' | 'danger' }> = [];
    const issues = counts?.openIssues ?? 0;
    if (issues > 0)
      rows.push({
        label: 'Open trip issues',
        detail: 'Reported on live and upcoming trips',
        count: issues,
        href: '/admin/trips/',
        tone: 'danger',
      });
    const unassigned = counts?.unassignedTrips ?? 0;
    if (unassigned > 0)
      rows.push({
        label: 'Trips without a crew',
        detail: 'Assign a guide and vehicle before departure',
        count: unassigned,
        href: '/admin/trips/',
        tone: 'warning',
      });
    const requested = counts?.requested ?? 0;
    if (requested > 0)
      rows.push({
        label: 'Bookings awaiting confirmation',
        detail: 'Check payment and policy before confirming',
        count: requested,
        href: '/admin/bookings/?status=REQUESTED',
        tone: 'warning',
      });
    const requests = counts?.customRequests ?? 0;
    if (requests > 0)
      rows.push({
        label: 'Custom requests in progress',
        detail: 'Tailor-made enquiries needing a quote',
        count: requests,
        href: '/admin/custom-requests/',
        tone: 'warning',
      });
    const inquiries = counts?.newInquiries ?? 0;
    if (inquiries > 0)
      rows.push({
        label: 'New inquiries',
        detail: 'Website and walk-in leads to triage',
        count: inquiries,
        href: '/admin/inquiries/',
        tone: 'warning',
      });
    const exceptions = bookingRows.filter((row) => row.financeException).length;
    if (exceptions > 0)
      rows.push({
        label: 'Finance exceptions',
        detail: 'Bookings flagged for money review',
        count: exceptions,
        href: '/admin/bookings/?exception=true',
        tone: 'danger',
      });
    return rows;
  }, [bookingRows, counts]);

  const bookingColumns: Array<Column<Booking>> = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Booking',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.reference}</p>
            <p className="truncate text-xs text-muted">{labelize(row.source)}</p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Traveller',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.customer?.name ?? '—'}</p>
            <p className="truncate text-xs text-muted">{row.customer?.email ?? ''}</p>
          </div>
        ),
      },
      {
        key: 'travel',
        header: 'Travel dates',
        render: (row) => (
          <div className="whitespace-nowrap text-sm">
            {formatDate(row.startDate)}
            <span className="text-muted"> → {formatDate(row.endDate)}</span>
          </div>
        ),
      },
      {
        key: 'value',
        header: 'Contract',
        align: 'end',
        render: (row) => (
          <div className="text-end">
            <Money
              minor={row.paymentSummary?.contractTotal ?? row.priceSnapshot?.totalMinor}
              currency={row.paymentSummary?.currency ?? row.currency}
              className="text-sm font-medium"
            />
            <p className="text-xs text-muted">
              {row.paymentSummary ? `Paid ${labelize(row.paymentSummary.status)}` : 'No payment yet'}
            </p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'end',
        render: (row) => (
          <div className="flex flex-col items-end gap-1">
            <StatusChip status={row.status} />
            {row.financeException ? <StatusChip status="HIGH" label="Finance exception" /> : null}
          </div>
        ),
      },
    ],
    [],
  );

  const tripColumns: Array<Column<Trip>> = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Trip',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.reference}</p>
            <p className="truncate text-xs text-muted">{row.travelerCount} travellers</p>
          </div>
        ),
      },
      {
        key: 'when',
        header: 'Window',
        render: (row) => (
          <div className="whitespace-nowrap text-sm">
            {formatDate(row.startsAt)}
            <span className="text-muted"> → {formatDate(row.endsAt)}</span>
          </div>
        ),
      },
      {
        key: 'crew',
        header: 'Crew',
        render: (row) => (
          <div className="min-w-0 text-sm">
            <p className="truncate">{row.guide?.name ?? 'Unassigned guide'}</p>
            <p className="truncate text-xs text-muted">{row.vehicle?.registration ?? 'No vehicle'}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'end',
        render: (row) => <StatusChip status={row.status} />,
      },
    ],
    [],
  );

  const loading = overview.isLoading && bookings.isLoading;

  return (
    <div className="animate-rise mx-auto w-full max-w-[1500px] space-y-6">
      {/* =================================================== HERO CONTROL ROOM BANNER */}
      <section className="admin-dash-hero">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
          {/* Left Copy & Quick Command Actions */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="admin-eyebrow-pill">
                <span>Arusha &amp; Zanzibar · Control Room</span>
                <span className="admin-eyebrow-pill-dot" aria-hidden>
                  <Icon name="compass" size={11} />
                </span>
              </span>
              {overview.data?.generatedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0D7C79]/20 bg-[#E8F5F5] px-3 py-1 font-ui text-[11px] font-extrabold text-[#0D7C79] dark:bg-[#0D7C79]/15 dark:text-teal-300">
                  <span className="size-1.5 rounded-full bg-[#0D7C79]" />
                  Synced {formatRelative(overview.data.generatedAt)}
                </span>
              ) : null}
            </div>

            <h1 className="font-ui mt-3.5 text-[28px] leading-[1.08] font-extrabold tracking-tight text-[#0A2540] sm:text-[36px] dark:text-[#FFFDFA]">
              Good day{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.{' '}
              <span className="text-[#FF7B00]">Command every safari &amp; fleet dispatch.</span>
            </h1>

            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#5E6358] dark:text-slate-300">
              Real-time overview of safari bookings, multi-currency settlements, 4×4 cruiser &amp; chauffeur rental
              dispatch, and guest inquiries across M&amp;A Safaris and Safari AI Rentals.
            </p>

            {/* Primary & Quick Launch Hero Pill Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="md" onPress={() => router.push('/admin/bookings/')}>
                <Icon name="ticket" size={16} />
                Open Bookings
              </Button>
              <Button variant="tertiary" size="sm" onPress={() => router.push('/admin/trips/')}>
                <Icon name="compass" size={15} />
                Trips &amp; Dispatch
              </Button>
              <Button variant="tertiary" size="sm" onPress={() => router.push('/admin/rentals/')}>
                <Icon name="car" size={15} />
                Safari AI Rentals
              </Button>
              <Button variant="tertiary" size="sm" onPress={() => router.push('/admin/packages/')}>
                <Icon name="sparkles" size={15} />
                Safari Packages
              </Button>
              <RefreshButton
                pending={overview.isFetching || bookings.isFetching}
                onPress={() => {
                  void overview.refetch();
                  void bookings.refetch();
                  void trips.refetch();
                  void audit.refetch();
                  void vehicles.refetch();
                }}
              />
            </div>

            {/* Reporting Currency Orbit Chips */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-ui text-[10px] font-extrabold tracking-[0.12em] text-[#A94700] uppercase dark:text-[#FF9526]">
                Desk Currency:
              </span>
              {(['USD', 'TZS', 'EUR', 'GBP'] as const).map((code) => {
                const isSelected = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`rounded-full px-3 py-1 font-ui text-[11px] font-extrabold transition-all ${
                      isSelected
                        ? 'bg-[#0A2540] text-white shadow-xs dark:bg-[#FF7B00]'
                        : 'border border-[#0A2540]/12 bg-[#FFFDFA] text-[#0A2540] hover:border-[#FF7B00]/40 hover:bg-[#FFF2E5] dark:border-white/12 dark:bg-white/5 dark:text-slate-200'
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Signature Circular Plate + Orange Pedestal Stage */}
          <div className="flex flex-col items-center">
            <div className="relative flex flex-col items-center">
              <div className="admin-dash-plate">
                <div className="admin-dash-plate-inner">
                  <img src="/assets/safari/serengeti-1.jpg" alt="Serengeti Safari Operations" />
                </div>
              </div>
              <span className="absolute -top-2 right-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#0A2540]/10 bg-[#FFFDFA] px-3 py-1 font-ui text-[10px] font-extrabold text-[#0A2540] shadow-md">
                <span className="size-2 rounded-full bg-[#FF7B00]" />
                {vehicleRows.length} Fleet Units
              </span>
              <span className="absolute bottom-2 -left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#0A2540] px-3 py-1 font-ui text-[10px] font-extrabold text-white shadow-md">
                <Icon name="shield" size={11} className="text-[#FF7B00]" />
                RBAC Protected
              </span>
            </div>

            <div className="admin-dash-pedestal">
              <p className="admin-dash-pedestal-bar">
                LIVE OPERATIONS PULSE · TANZANIA &amp; ZANZIBAR
              </p>
              <div className="admin-dash-pedestal-grid">
                <div className="admin-dash-pedestal-stat">
                  <p className="font-ui text-base font-extrabold text-[#FF9526] tabular-nums">
                    {counts?.bookings ?? 0}
                  </p>
                  <p className="text-[10px] font-bold text-white/80">Bookings</p>
                </div>
                <div className="admin-dash-pedestal-stat">
                  <p className="font-ui text-base font-extrabold text-emerald-400 tabular-nums">
                    {counts?.confirmed ?? 0}
                  </p>
                  <p className="text-[10px] font-bold text-white/80">Confirmed</p>
                </div>
                <div className="admin-dash-pedestal-stat">
                  <p className="font-ui text-base font-extrabold text-white tabular-nums">
                    {tripRows.length}
                  </p>
                  <p className="text-[10px] font-bold text-white/80">Live Trips</p>
                </div>
                <div className="admin-dash-pedestal-stat">
                  <p className="font-ui text-base font-extrabold text-amber-300 tabular-nums">
                    {counts?.newInquiries ?? 0}
                  </p>
                  <p className="text-[10px] font-bold text-white/80">Inquiries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {overview.isError ? (
        <ErrorPanel
          message="The overview endpoint did not answer."
          details={errorMessage(overview.error)}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      <StatGrid columns={4}>
        <StatCard
          label="Net captured"
          icon="card"
          tone="success"
          loading={loading}
          value={<Money minor={active?.netCaptured} currency={active?.currency ?? currency} compact />}
          hint={`${active?.currency ?? currency} · captures less settled refunds`}
          onPress={() => router.push('/admin/payments/')}
        />
        <StatCard
          label="Contracted sales"
          icon="chart"
          tone="accent"
          loading={loading}
          value={<Money minor={active?.contractedSales} currency={active?.currency ?? currency} compact />}
          hint="Accepted sell total with approved adjustments"
          onPress={() => router.push('/admin/reports/')}
        />
        <StatCard
          label="Outstanding balance"
          icon="alert"
          tone={(counts?.requested ?? 0) > 0 ? 'warning' : 'default'}
          loading={loading}
          value={<Money minor={active?.outstandingBalance} currency={active?.currency ?? currency} compact />}
          hint={`${counts?.requested ?? 0} awaiting confirmation`}
          onPress={() => router.push('/admin/bookings/')}
        />
        <StatCard
          label="Live bookings"
          icon="ticket"
          tone="default"
          loading={loading}
          value={counts?.bookings ?? 0}
          hint={`${counts?.confirmed ?? 0} confirmed · ${counts?.active ?? 0} active · ${counts?.completed ?? 0} completed`}
          onPress={() => router.push('/admin/bookings/')}
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Bookings by departure month"
          description="Stacked by booking state over the last eight months"
          icon="chart"
          action={
            <div className="flex flex-wrap items-center gap-3 font-ui text-[11px] font-bold text-muted">
              <span className="flex items-center gap-1.5 rounded-full bg-[#E8F5F5] px-2.5 py-0.5 text-[#0D7C79] dark:bg-white/10 dark:text-teal-300">
                <span className="size-2 rounded-full" style={{ background: '#0d7c79' }} />
                Confirmed
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-[#FFF2E5] px-2.5 py-0.5 text-[#A94700] dark:bg-white/10 dark:text-[#FF9526]">
                <span className="size-2 rounded-full" style={{ background: '#ff7b00' }} />
                Requested
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-[#F6F3ED] px-2.5 py-0.5 text-[#0A2540] dark:bg-white/10 dark:text-slate-300">
                <span className="size-2 rounded-full" style={{ background: '#0a2540' }} />
                Other
              </span>
            </div>
          }
        >
          {bookings.isLoading ? (
            <Skeleton className="h-[260px] rounded-xl" />
          ) : bookingRows.length === 0 ? (
            <EmptyState
              compact
              icon="chart"
              title="No bookings to chart yet"
              description="Once bookings arrive this chart breaks them down by departure month and state."
            />
          ) : (
            <BarSeriesChart
              labels={monthly.labels}
              series={[
                { key: 'confirmed', label: 'Confirmed', color: '#0d7c79', values: monthly.confirmed },
                { key: 'requested', label: 'Requested', color: '#ff7b00', values: monthly.requested },
                { key: 'other', label: 'Other', color: '#0a2540', values: monthly.other },
              ]}
              valueFormatter={(value) => String(Math.round(value))}
            />
          )}
        </Panel>

        <Panel
          title="Money by currency"
          description="Contracted sales share, from settled and contracted records"
          icon="card"
          action={
            groups.length > 1 ? (
              <Button size="sm" variant="ghost" onPress={() => setCurrency(groups[0]!.currency)}>
                Sync
              </Button>
            ) : null
          }
        >
          {overview.isLoading ? (
            <Skeleton className="h-[220px] rounded-xl" />
          ) : groups.length === 0 ? (
            <EmptyState compact icon="card" title="No money recorded yet" description="Payment postings will appear here." />
          ) : (
            <div className="space-y-4">
              <DonutChart
                slices={moneyByCurrency}
                centerLabel="Contracted"
                centerValue={<Money minor={active?.contractedSales} currency={active?.currency ?? currency} compact />}
                valueFormatter={(value) =>
                  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
                }
              />
              <Separator />
              <RankedBars
                rows={moneyByCurrency}
                valueFormatter={(value) =>
                  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
                }
              />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-[#0A2540]/8 bg-[#FAF6EE] p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="font-ui text-[10px] font-extrabold tracking-wider text-[#A94700] uppercase dark:text-[#FF9526]">
                    Gross captured
                  </p>
                  <p className="font-ui mt-1 text-base font-extrabold text-[#0A2540] dark:text-white">
                    <Money minor={active?.grossCaptured} currency={active?.currency ?? currency} compact />
                  </p>
                </div>
                <div className="rounded-2xl border border-[#0A2540]/8 bg-[#FAF6EE] p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="font-ui text-[10px] font-extrabold tracking-wider text-[#0D7C79] uppercase dark:text-teal-300">
                    Refunds settled
                  </p>
                  <p className="font-ui mt-1 text-base font-extrabold text-[#0A2540] dark:text-white">
                    <Money minor={active?.refundsSettled} currency={active?.currency ?? currency} compact />
                  </p>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Needs attention" description="Work that is waiting on an operator" icon="alert">
          {attention.length === 0 ? (
            <EmptyState
              compact
              icon="check"
              title="Nothing is blocked"
              description="Every booking, trip and request is in a healthy state."
            />
          ) : (
            <ul className="space-y-2.5">
              {attention.map((row) => (
                <li key={row.label}>
                  <button
                    type="button"
                    onClick={() => router.push(row.href)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#0A2540]/10 bg-[#FAF6EE] px-3.5 py-3 text-left transition-all hover:border-[#FF7B00]/40 hover:bg-[#FFF2E5]/70 dark:border-white/10 dark:bg-white/5"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                        row.tone === 'danger'
                          ? 'bg-danger/12 text-danger'
                          : 'bg-[#FFF2E5] text-[#FF7B00] dark:bg-[#FF7B00]/20'
                      }`}
                    >
                      <Icon name="alert" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-ui block truncate text-sm font-extrabold text-[#0A2540] dark:text-white">
                        {row.label}
                      </span>
                      <span className="block truncate text-xs text-muted">{row.detail}</span>
                    </span>
                    <Chip size="sm" variant="soft" color={row.tone}>
                      <Chip.Label>{row.count}</Chip.Label>
                    </Chip>
                    <Icon name="chevron-right" size={15} className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Operations pipeline" description="Where every record currently sits" icon="compass">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Bookings', value: counts?.bookings ?? 0, icon: 'ticket' as const, href: '/admin/bookings/', num: '01' },
              { label: 'Custom requests', value: counts?.customRequests ?? 0, icon: 'file' as const, href: '/admin/custom-requests/', num: '02' },
              { label: 'Inquiries', value: counts?.newInquiries ?? 0, icon: 'inbox' as const, href: '/admin/inquiries/', num: '03' },
              { label: 'Unassigned trips', value: counts?.unassignedTrips ?? 0, icon: 'compass' as const, href: '/admin/trips/', num: '04' },
            ].map((tile) => (
              <button
                key={tile.label}
                type="button"
                onClick={() => router.push(tile.href)}
                className="group rounded-2xl border border-[#0A2540]/10 bg-[#FAF6EE] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#FF7B00]/40 hover:bg-[#FFF2E5]/70 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#FF7B00] to-[#FF9526] text-white shadow-xs">
                    <Icon name={tile.icon} size={14} />
                  </span>
                  <span className="rounded-full bg-[#0A2540] px-2 py-0.5 font-ui text-[9px] font-extrabold text-white">
                    {tile.num}
                  </span>
                </div>
                <p className="font-ui mt-2.5 text-2xl font-extrabold text-[#0A2540] tabular-nums dark:text-white">
                  {tile.value}
                </p>
                <p className="font-ui text-[11px] font-bold text-[#5E6358] dark:text-slate-300">{tile.label}</p>
              </button>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-ui text-xs font-extrabold tracking-wider text-[#A94700] uppercase dark:text-[#FF9526]">
                Fleet readiness &amp; status
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin/fleet/')}
                className="font-ui text-xs font-extrabold text-[#0D7C79] hover:underline"
              >
                Manage fleet →
              </button>
            </div>
            {vehicles.isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : fleetStatus.length === 0 ? (
              <p className="text-sm text-muted">No vehicles registered.</p>
            ) : (
              <RankedBars rows={fleetStatus} valueFormatter={(value) => `${value}`} />
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent bookings"
        description="Latest requests and confirmations"
        icon="ticket"
        action={
          <Button size="sm" variant="tertiary" onPress={() => router.push('/admin/bookings/')}>
            View all
            <Icon name="arrow-right" size={14} />
          </Button>
        }
        bodyClassName="px-0 py-0"
      >
        <DataTable
          label="Recent bookings"
          columns={bookingColumns}
          rows={bookingRows.slice(0, 6)}
          loading={bookings.isLoading}
          emptyTitle="No bookings yet"
          emptyDescription="Requests from the website and the app will appear here the moment they land."
          onRowPress={(row) => router.push(`/admin/bookings/?booking=${row.id}`)}
          dense
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Today's dispatch" description="Trips in the operating window" icon="compass" bodyClassName="px-0 py-0">
          <DataTable
            label="Trips"
            columns={tripColumns}
            rows={tripRows.slice(0, 5)}
            loading={trips.isLoading}
            emptyTitle="No trips scheduled"
            emptyDescription="Assignments create trips automatically once a booking is confirmed."
            onRowPress={() => router.push('/admin/trips/')}
            dense
          />
        </Panel>

        <Panel title="Activity" description="Latest audited actions" icon="history">
          {audit.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (audit.data?.rows ?? []).length === 0 ? (
            <EmptyState compact icon="history" title="No activity yet" />
          ) : (
            <ul className="space-y-3">
              {(audit.data?.rows ?? []).slice(0, 6).map((entry) => (
                <li
                  key={entry.id}
                  className="flex gap-3 rounded-2xl border border-[#0A2540]/8 bg-[#FAF6EE]/80 p-2.5 dark:border-white/10 dark:bg-white/5"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#FFF2E5] text-[#FF7B00] dark:bg-[#FF7B00]/20">
                    <Icon name="history" size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-ui truncate text-xs font-extrabold text-[#0A2540] dark:text-white">
                      {labelize(entry.action)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {entry.entityType}
                      {entry.reason ? ` · ${truncate(entry.reason, 60)}` : ''}
                    </p>
                    <p className="text-[10px] font-semibold text-[#A94700] dark:text-[#FF9526]">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Momentum" description="Booking volume trend across the last 24 months of records" icon="trending-up">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#0A2540]/10 bg-[#FAF6EE] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <p className="font-ui text-xs font-extrabold tracking-wider text-[#A94700] uppercase dark:text-[#FF9526]">
                Bookings captured
              </p>
              <span className="rounded-full bg-[#FFF2E5] px-2 py-0.5 font-ui text-[10px] font-extrabold text-[#FF7B00]">
                24M Trend
              </span>
            </div>
            <Sparkline values={monthly.confirmed.map((value, index) => value + monthly.requested[index]!)} />
            <p className="mt-1 font-ui text-2xl font-extrabold text-[#0A2540] tabular-nums dark:text-white">
              {counts?.bookings ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-[#0A2540]/10 bg-[#FAF6EE] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <p className="font-ui text-xs font-extrabold tracking-wider text-[#0D7C79] uppercase dark:text-teal-300">
                Confirmed share
              </p>
              <span className="rounded-full bg-[#E8F5F5] px-2 py-0.5 font-ui text-[10px] font-extrabold text-[#0D7C79]">
                Conversion
              </span>
            </div>
            <Sparkline values={monthly.confirmed} color="#0d7c79" />
            <p className="mt-1 font-ui text-2xl font-extrabold text-[#0A2540] tabular-nums dark:text-white">
              {counts?.bookings ? Math.round(((counts.confirmed ?? 0) / counts.bookings) * 100) : 0}%
            </p>
          </div>
          <div className="rounded-2xl border border-[#0A2540]/10 bg-[#FAF6EE] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <p className="font-ui text-xs font-extrabold tracking-wider text-[#0A2540] uppercase dark:text-slate-200">
                Completed trips
              </p>
              <span className="rounded-full bg-[#0A2540] px-2 py-0.5 font-ui text-[10px] font-extrabold text-white">
                Dispatched
              </span>
            </div>
            <Sparkline values={monthly.other} color="#0a2540" />
            <p className="mt-1 font-ui text-2xl font-extrabold text-[#0A2540] tabular-nums dark:text-white">
              {counts?.completed ?? 0}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Definitions — {Object.entries(overview.data?.definitions ?? {}).slice(0, 2).map(([key, value]) => `${labelize(key)}: ${value}`).join(' · ')}
        </p>
      </Panel>
    </div>
  );
}
