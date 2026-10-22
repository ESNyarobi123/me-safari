'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  CheckInput,
  ConfirmDialog,
  DataTable,
  DetailDrawer,
  EmptyState,
  ErrorPanel,
  FieldGrid,
  FilterBar,
  FilterField,
  FormDialog,
  Money,
  Page,
  Panel,
  RefreshButton,
  SearchInput,
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  StringListInput,
  TabStrip,
  TableFooter,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { useWorkspace } from '../../lib/workspace';
import {
  formatDate,
  formatDateTime,
  formatRelative,
  labelize,
  moneyValue,
  toMinor,
  truncate,
} from '../../lib/format';
import type {
  Booking,
  ChangeRequest,
  Customer,
  Money as MoneyGroup,
  Overview,
  PaymentSummary,
} from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DECLINED', label: 'Declined' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Any source' },
  { value: 'PACKAGE', label: 'Package' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'QUOTE', label: 'Quote' },
];

export default function BookingsPage() {
  const { currency } = useWorkspace();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [exceptionOnly, setExceptionOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const overview = useApi<Overview>('/admin/overview');
  const list = useList<Booking>('/bookings', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    search: term || undefined,
    status: status || undefined,
  });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    return exceptionOnly ? all.filter((row) => row.financeException) : all;
  }, [exceptionOnly, list.data]);

  const groups = overview.data?.currencyGroups ?? [];
  const active: MoneyGroup | undefined = groups.find((group) => group.currency === currency) ?? groups[0];
  const counts = overview.data?.counts;

  const contracted = rows.reduce(
    (sum, row) => sum + moneyValue(row.paymentSummary?.contractTotal ?? row.priceSnapshot?.totalMinor, row.currency),
    0,
  );

  const columns: Array<Column<Booking>> = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Booking',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.reference}</p>
            <p className="truncate text-xs text-muted">
              {labelize(row.source)} · v{row.version}
            </p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Traveller',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.customer?.name ?? '—'}</p>
            <p className="truncate text-xs text-muted">{row.customer?.email ?? row.customer?.phone ?? ''}</p>
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
            <p className="text-xs text-muted">
              {row.adults} adult{row.adults === 1 ? '' : 's'}
              {row.children ? ` · ${row.children} child` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'end',
        render: (row) => (
          <div className="text-end">
            <Money
              minor={row.paymentSummary?.balanceDue}
              currency={row.paymentSummary?.currency ?? row.currency}
              className="text-sm font-medium"
            />
            <p className="text-xs text-muted">of {row.paymentSummary ? labelize(row.paymentSummary.status) : 'no money'}</p>
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

  const refresh = () => {
    void list.refetch();
    void overview.refetch();
  };

  return (
    <Page
      eyebrow="Operations"
      title="Bookings"
      subtitle="Every request, confirmation, payment position and change request in one operating queue."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <NewBookingDialog onCreated={() => refresh()} />
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Bookings loaded"
          icon="ticket"
          tone="accent"
          loading={list.isLoading}
          value={rows.length}
          hint={`${list.data?.meta.hasMore ? 'more available' : 'end of queue'}`}
        />
        <StatCard
          label="Awaiting confirmation"
          icon="alert"
          tone={(counts?.requested ?? 0) > 0 ? 'warning' : 'default'}
          loading={overview.isLoading}
          value={counts?.requested ?? 0}
          hint="Review payment and policy before confirming"
        />
        <StatCard
          label="Contracted on screen"
          icon="card"
          tone="success"
          loading={list.isLoading}
          value={
            <Money
              minor={toMinor(contracted, 'USD')}
              currency="USD"
              compact
            />
          }
          hint="Sum of loaded rows, USD-normalised"
        />
        <StatCard
          label="Outstanding"
          icon="chart"
          tone="default"
          loading={overview.isLoading}
          value={<Money minor={active?.outstandingBalance} currency={active?.currency ?? currency} compact />}
          hint={`${active?.currency ?? currency} · whole book`}
        />
      </StatGrid>

      <FilterBar
        trailing={<StatusChip status={status || 'OPEN'} label={labelize(status || 'all statuses')} />}
        leading={
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-default/70 text-muted">
            <Icon name="filter" size={16} />
          </span>
        }
      >
        <FilterField label="Search">
          <SearchInput value={search} onChange={setSearch} placeholder="Reference or traveller…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
        <FilterField label="Source">
          <SelectInput value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        </FilterField>
        <FilterField label="View">
          <div className="pt-1">
            <CheckInput label="Finance exceptions only" value={exceptionOnly} onChange={setExceptionOnly} />
          </div>
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel
          message="Bookings could not be loaded."
          details={errorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      <Panel
        title="Operating queue"
        description="Newest first. Open a row to confirm, adjust travellers, or review money."
        icon="ticket"
        bodyClassName="px-0 py-0"
      >
        <DataTable
          label="Bookings"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No bookings match these filters"
          emptyDescription="Try clearing the search box or switching the status filter."
          footer={
            <TableFooter
              summary={`${rows.length} booking${rows.length === 1 ? '' : 's'} on this page`}
              page={pagination.page}
              hasMore={list.data?.meta.hasMore}
              atStart={pagination.atStart}
              pending={list.isFetching}
              onNext={() => pagination.next(list.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      <BookingDetail id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail -- */

function BookingDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'travelers' | 'money' | 'timeline'>('overview');
  const booking = useApi<Booking>(id ? `/bookings/${id}` : null);
  const changes = useList<ChangeRequest>(id ? `/bookings/${id}/change-requests` : null);
  const timeline = useList<{ id: string; type?: string; eventType?: string; status?: string; createdAt: string }>(
    id ? `/bookings/${id}/timeline` : null,
  );
  const command = useCommand({
    invalidate: [['api', `/bookings/${id}`], ['list', `/bookings/${id}/change-requests`], ['list', '/bookings']],
    successMessage: false,
  });

  const row = booking.data;
  const summary: PaymentSummary | undefined = row?.paymentSummary;
  const travelers = row?.travelers ?? [];
  const priceLines = row?.priceSnapshot?.lines ?? [];

  async function act(path: string, body: Record<string, unknown>, message: string) {
    await command.run(`/bookings/${id}${path}`, 'POST', { body, successMessage: message });
    void booking.refetch();
    void changes.refetch();
    void timeline.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.reference ?? 'Booking'}
      subtitle={
        row
          ? `${row.customer?.name ?? 'Unknown traveller'} · ${formatDate(row.startDate)} → ${formatDate(row.endDate)}`
          : 'Loading…'
      }
      chip={row ? <StatusChip status={row.status} /> : null}
      placement="right"
      footer={
        row ? (
          <>
            <ConfirmDialog
              trigger={
                <Button variant="primary" size="sm" isDisabled={row.status !== 'REQUESTED'}>
                  <Icon name="check" size={15} />
                  Confirm booking
                </Button>
              }
              title={`Confirm ${row.reference}`}
              description="Confirmation locks the price, creates the trip and starts dispatch preparation."
              confirmLabel="Confirm booking"
              destructive={false}
              onConfirm={(reason) =>
                act(`/confirm`, { expectedVersion: row.version, reason }, `${row.reference} confirmed.`)
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="danger" size="sm" isDisabled={!['REQUESTED', 'CONFIRMED'].includes(row.status)}>
                  <Icon name="x" size={15} />
                  Decline
                </Button>
              }
              title={`Decline ${row.reference}`}
              description="Any retained charge is recorded in the finance ledger and the audit log."
              confirmLabel="Decline booking"
              onConfirm={(reason) =>
                act(`/decline`, { expectedVersion: row.version, reason, retainedChargeMinor: '0' }, `${row.reference} declined.`)
              }
            />
            <Button variant="tertiary" size="sm" onPress={() => void booking.refetch()} isPending={booking.isFetching}>
              <Icon name="refresh" size={15} />
              Refresh
            </Button>
          </>
        ) : null
      }
    >
      {booking.isError ? (
        <ErrorPanel message="This booking could not be loaded." details={errorMessage(booking.error)} />
      ) : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'travelers', label: 'Travellers', count: travelers.length },
          { value: 'money', label: 'Money' },
          { value: 'timeline', label: 'Timeline', count: timeline.data?.rows.length },
        ]}
      />

      {booking.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}

      {tab === 'overview' && row
        ? definitionList([
            { label: 'Reference', value: row.reference },
            { label: 'Version', value: row.version },
            { label: 'Source', value: labelize(row.source) },
            { label: 'Timezone', value: row.timezone },
            { label: 'Departure', value: formatDate(row.startDate, true) },
            { label: 'Return', value: formatDate(row.endDate, true) },
            { label: 'Party', value: `${row.adults} adults · ${row.children} children` },
            {
              label: 'Trip',
              value: row.trip ? `${row.trip.reference ?? row.trip.id} · ${labelize(row.trip.status)}` : 'Not created yet',
            },
            {
              label: 'Itinerary',
              value: row.itinerary ? labelize(row.itinerary.state ?? 'DRAFT') : 'None',
            },
            { label: 'Finance flag', value: row.financeException ? labelize(row.financeException) : 'None' },
            {
              label: 'Pickup',
              value: row.pickup ? (
                <span>
                  {String((row.pickup as Record<string, unknown>).label ?? '—')}
                  <span className="block text-xs text-muted">
                    {String((row.pickup as Record<string, unknown>).address ?? '')}
                  </span>
                </span>
              ) : (
                'Not captured'
              ),
            },
            { label: 'Created', value: row.createdAt ? formatDateTime(row.createdAt) : '—' },
          ])
        : null}

      {tab === 'overview' && row?.requirements ? (
        <>
          <Separator className="my-4" />
          <p className="font-ui mb-2 text-[13px] font-semibold">Requirements</p>
          {definitionList(
            Object.entries(row.requirements as Record<string, unknown>).map(([key, value]) => ({
              label: labelize(key),
              value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—'),
            })),
          )}
        </>
      ) : null}

      {tab === 'travelers' && row ? (
        <TravelersEditor
          booking={row}
          onSave={(payload) => act('/travelers', { expectedVersion: row.version, travelers: payload }, 'Travellers updated.')}
        />
      ) : null}

      {tab === 'money' && row ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Contract total', value: summary?.contractTotal, tone: 'accent' as const },
              { label: 'Captured', value: summary?.capturedTotal, tone: 'success' as const },
              { label: 'Balance due', value: summary?.balanceDue, tone: 'warning' as const },
              { label: 'Refund due', value: summary?.refundDue, tone: 'danger' as const },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
                <p className="text-[11px] tracking-wide text-muted uppercase">{tile.label}</p>
                <p className="font-ui mt-1 text-lg font-semibold tabular-nums">
                  <Money minor={tile.value} currency={summary?.currency ?? row.currency} />
                </p>
                <StatusChip status={summary?.status ?? 'PENDING'} size="sm" />
              </div>
            ))}
          </div>

          <div>
            <p className="font-ui mb-2 text-[13px] font-semibold">Priced lines</p>
            {priceLines.length === 0 ? (
              <EmptyState compact icon="card" title="No priced lines" description="This booking has no snapshot lines." />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {priceLines.map((line) => (
                  <li key={line.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{line.label}</span>
                      <span className="text-xs text-muted">×{line.quantity}</span>
                    </span>
                    <Money minor={line.totalMinor} currency={row.currency} className="font-medium" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />
          <div className="flex flex-wrap gap-2">
            {(['DEPOSIT', 'FULL', 'BALANCE'] as const).map((purpose) => (
              <ConfirmDialog
                key={purpose}
                trigger={
                  <Button size="sm" variant="tertiary">
                    <Icon name="card" size={14} />
                    {labelize(purpose)} intent
                  </Button>
                }
                title={`Create ${purpose.toLowerCase()} payment intent`}
                description="A mock checkout is opened for the development provider. Simulate it to settle funds."
                confirmLabel="Create intent"
                destructive={false}
                onConfirm={async (reason) => {
                  const intent = await command.run(`/bookings/${id}/payment-intents`, 'POST', {
                    body: { purpose },
                    successMessage: false,
                  });
                  const intentId = (intent as { id?: string }).id;
                  if (!intentId) return;
                  await command.run(`/dev/payment-intents/${intentId}/simulate`, 'POST', {
                    body: { scenario: 'SUCCESS' },
                    successMessage: `Simulated settlement (${reason.slice(0, 24)}).`,
                  });
                  void booking.refetch();
                  onChanged();
                }}
              />
            ))}
          </div>

          <ChangeRequests
            rows={changes.data?.rows ?? []}
            loading={changes.isLoading}
            onDecide={(changeId, action, body) =>
              act(`/change-requests/${changeId}/${action}`, body, `Change request ${action}d.`)
            }
            booking={row}
          />
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <ol className="space-y-3">
          {(timeline.data?.rows ?? []).map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-default/70 text-muted">
                <Icon name="clock" size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm">{labelize(entry.eventType ?? entry.type ?? 'event')}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(entry.createdAt)} · {formatRelative(entry.createdAt)}
                </p>
              </div>
            </li>
          ))}
          {!timeline.isLoading && (timeline.data?.rows ?? []).length === 0 ? (
            <EmptyState compact icon="clock" title="No timeline events yet" />
          ) : null}
        </ol>
      ) : null}
    </DetailDrawer>
  );
}

/* --------------------------------------------------------------- travelers -- */

interface TravelerDraft {
  fullName: string;
  band: 'ADULT' | 'CHILD';
  isLead: boolean;
  ageYears: string;
}

function TravelersEditor({ booking, onSave }: { booking: Booking; onSave: (payload: unknown[]) => Promise<void> }) {
  const [draft, setDraft] = useState<TravelerDraft[]>(
    (booking.travelers ?? []).map((traveler) => ({
      fullName: traveler.fullName,
      band: traveler.band === 'CHILD' ? 'CHILD' : 'ADULT',
      isLead: Boolean(traveler.isLead),
      ageYears: String((traveler.requirements as { ageYears?: number } | undefined)?.ageYears ?? ''),
    })),
  );
  const [pickup, setPickup] = useState({
    label: String((booking.pickup as Record<string, unknown> | null)?.label ?? ''),
    address: String((booking.pickup as Record<string, unknown> | null)?.address ?? ''),
  });
  const command = useCommand({ successMessage: false });

  function update(index: number, patch: Partial<TravelerDraft>) {
    setDraft((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {draft.map((traveler, index) => (
          <div key={index} className="rounded-xl border border-separator p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Traveller {index + 1}</p>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Remove traveller"
                onPress={() => setDraft((current) => current.filter((_, position) => position !== index))}
              >
                <Icon name="trash" size={14} />
              </Button>
            </div>
            <div className="mt-2">
              <FieldGrid columns={2}>
                <TextInput
                  label="Full name"
                  value={traveler.fullName}
                  onChange={(value) => update(index, { fullName: value })}
                />
                <SelectInput
                  label="Band"
                  value={traveler.band}
                  onChange={(value) => update(index, { band: value })}
                  options={[
                    { value: 'ADULT', label: 'Adult' },
                    { value: 'CHILD', label: 'Child' },
                  ]}
                />
                <TextInput
                  label="Age (children only)"
                  value={traveler.ageYears}
                  inputMode="numeric"
                  onChange={(value) => update(index, { ageYears: value.replace(/[^\d]/g, '') })}
                />
                <div className="pt-6">
                  <CheckInput
                    label="Lead traveller"
                    value={traveler.isLead}
                    onChange={(value) =>
                      setDraft((current) =>
                        current.map((row, position) => ({ ...row, isLead: position === index ? value : false })),
                      )
                    }
                  />
                </div>
              </FieldGrid>
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="tertiary"
        onPress={() =>
          setDraft((current) => [...current, { fullName: '', band: 'ADULT', isLead: current.length === 0, ageYears: '' }])
        }
      >
        <Icon name="plus" size={14} />
        Add traveller
      </Button>

      <Separator />

      <div>
        <p className="font-ui mb-2 text-[13px] font-semibold">Pickup</p>
        <FieldGrid columns={2}>
          <TextInput label="Label" value={pickup.label} onChange={(value) => setPickup((c) => ({ ...c, label: value }))} />
          <TextInput
            label="Address"
            value={pickup.address}
            onChange={(value) => setPickup((c) => ({ ...c, address: value }))}
          />
        </FieldGrid>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="tertiary"
          size="sm"
          isPending={command.pending}
          onPress={async () => {
            await command.run(`/bookings/${booking.id}/pickup`, 'PATCH', {
              body: {
                expectedVersion: booking.version,
                pickup: { label: pickup.label || 'Pickup point', address: pickup.address || 'To be confirmed' },
              },
              successMessage: 'Pickup updated.',
            });
          }}
        >
          Save pickup
        </Button>
        <Button
          variant="primary"
          size="sm"
          isPending={command.pending}
          isDisabled={draft.some((row) => row.fullName.trim().length < 2)}
          onPress={async () => {
            await onSave(
              draft.map((row) => ({
                fullName: row.fullName.trim(),
                band: row.band,
                isLead: row.isLead,
                ...(row.band === 'CHILD' && row.ageYears ? { ageYears: Number(row.ageYears) } : {}),
              })),
            );
          }}
        >
          Save travellers
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- change requests -- */

function ChangeRequests({
  rows,
  loading,
  booking,
  onDecide,
}: {
  rows: ChangeRequest[];
  loading: boolean;
  booking: Booking;
  onDecide: (id: string, action: 'approve' | 'reject', body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div>
      <p className="font-ui mb-2 text-[13px] font-semibold">Change requests</p>
      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState compact icon="refresh" title="No change requests" description="Traveller requests appear here." />
      ) : (
        <ul className="space-y-2">
          {rows.map((change) => (
            <li key={change.id} className="rounded-xl border border-separator p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{labelize(change.type)}</p>
                  <p className="truncate text-xs text-muted">{truncate(change.reason, 120)}</p>
                </div>
                <StatusChip status={change.status ?? 'PENDING'} />
              </div>
              {['PENDING', 'REQUESTED', 'OPEN'].includes(String(change.status ?? 'PENDING').toUpperCase()) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="primary">
                        Approve
                      </Button>
                    }
                    title="Approve change request"
                    description="Approval applies the change, re-prices the booking and notifies the traveller."
                    confirmLabel="Approve"
                    destructive={false}
                    onConfirm={(reason) =>
                      onDecide(change.id, 'approve', {
                        expectedVersion: change.version,
                        bookingExpectedVersion: booking.version,
                        reason,
                      })
                    }
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="danger">
                        Reject
                      </Button>
                    }
                    title="Reject change request"
                    confirmLabel="Reject"
                    onConfirm={(reason) =>
                      onDecide(change.id, 'reject', {
                        expectedVersion: change.version,
                        bookingExpectedVersion: booking.version,
                        reason,
                      })
                    }
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- new booking -- */

interface PreviewResult {
  id: string;
  policyVersionId: string;
  lines: Array<{ label: string; quantity: number; unitAmountMinor: string; totalMinor: string }>;
  totalMinor: string;
  depositMinor: string;
  requiredPaymentPurpose: string;
  startDate: string;
  endDate: string;
}

function NewBookingDialog({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [adults, setAdults] = useState('2');
  const [childAges, setChildAges] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [leadName, setLeadName] = useState('');
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const command = useCommand({ invalidate: [['list', '/bookings']], successMessage: false });

  const customers = useList<Customer>('/ops/customers', { limit: 100 });
  const packages = useList<{ id: string; title: string; status: string }>('/admin/packages', { limit: 100, status: 'PUBLISHED' });

  const quote = preview?.totalMinor ?? '0';

  return (
    <FormDialog
      trigger={
        <Button variant="primary" size="sm">
          <Icon name="plus" size={15} />
          New booking
        </Button>
      }
      title="Create a booking"
      description="Price a published package for a customer, capture travellers and pickup, then submit."
      submitLabel={step === 0 ? 'Price it' : 'Create booking'}
      size="lg"
      disabled={step === 0 ? !(customerId && packageId && startDate) : !preview || leadName.trim().length < 2}
      onSubmit={async () => {
        if (step === 0) {
          const result = await command.run('/ops/bookings/pricing-previews', 'POST', {
            body: {
              customerId,
              packageId,
              startDate,
              adults: Number(adults) || 1,
              children: childAges
                .split(',')
                .map((age) => age.trim())
                .filter(Boolean)
                .map((age) => ({ ageYears: Number(age) })),
              currency,
              addOnIds: [],
            },
            successMessage: 'Price preview ready.',
          });
          setPreview(result as PreviewResult);
          setStep(1);
          return;
        }
        if (!preview) return;
        await command.run('/ops/bookings', 'POST', {
          body: {
            pricePreviewId: preview.id,
            acceptedPolicyVersionId: preview.policyVersionId,
            pickup: { label: pickupLabel || 'Hotel lobby', address: pickupAddress || 'To be confirmed' },
            requirements: notes ? { notes } : {},
            travelers: [
              { fullName: leadName.trim(), band: 'ADULT', isLead: true },
              ...Array.from({ length: Math.max(0, (Number(adults) || 1) - 1) }).map((_, index) => ({
                fullName: `Adult traveller ${index + 2}`,
                band: 'ADULT' as const,
                isLead: false,
              })),
              ...childAges
                .split(',')
                .map((age) => age.trim())
                .filter(Boolean)
                .map((age, index) => ({
                  fullName: `Child traveller ${index + 1}`,
                  band: 'CHILD' as const,
                  isLead: false,
                  ageYears: Number(age),
                })),
            ],
          },
          successMessage: 'Booking created.',
        });
        setStep(0);
        setPreview(null);
        onCreated();
      }}
    >
      {step === 0 ? (
        <FieldGrid columns={2}>
          <SelectInput
            label="Customer"
            value={customerId}
            onChange={setCustomerId}
            placeholder="Choose a customer"
            options={(customers.data?.rows ?? []).map((customer) => ({
              value: customer.id,
              label: `${customer.name}${customer.email ? ` · ${customer.email}` : ''}`,
            }))}
          />
          <SelectInput
            label="Published package"
            value={packageId}
            onChange={setPackageId}
            placeholder="Choose a package"
            options={(packages.data?.rows ?? []).map((item) => ({ value: item.id, label: item.title }))}
          />
          <TextInput label="Start date" type="date" value={startDate} onChange={setStartDate} isRequired />
          <SelectInput
            label="Currency"
            value={currency}
            onChange={setCurrency}
            options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
          />
          <TextInput label="Adults" value={adults} inputMode="numeric" onChange={(value) => setAdults(value.replace(/[^\d]/g, ''))} />
          <TextInput
            label="Child ages"
            value={childAges}
            onChange={setChildAges}
            placeholder="e.g. 6, 9"
            description="Comma separated. Must sit inside the rate's child band."
          />
        </FieldGrid>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-separator bg-surface-secondary/60 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Price preview</p>
            <ul className="mt-2 space-y-1 text-sm">
              {(preview?.lines ?? []).map((line) => (
                <li key={line.label} className="flex items-center justify-between gap-3">
                  <span>
                    {line.label} <span className="text-xs text-muted">×{line.quantity}</span>
                  </span>
                  <Money minor={line.totalMinor} currency={currency} />
                </li>
              ))}
            </ul>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Total</span>
              <Money minor={quote} currency={currency} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Required now · {labelize(preview?.requiredPaymentPurpose ?? 'DEPOSIT')}</span>
              <Money minor={preview?.depositMinor} currency={currency} />
            </div>
          </div>

          <FieldGrid columns={2}>
            <TextInput label="Lead traveller name" value={leadName} onChange={setLeadName} isRequired />
            <TextInput label="Pickup label" value={pickupLabel} onChange={setPickupLabel} placeholder="Serena Hotel" />
            <TextInput label="Pickup address" value={pickupAddress} onChange={setPickupAddress} placeholder="Full address" />
          </FieldGrid>

          <StringListInput
            label="Notes for the operations team"
            value={notes ? notes.split('\n') : []}
            onChange={(lines) => setNotes(lines.join('\n'))}
            rows={3}
          />

          <Button size="sm" variant="tertiary" onPress={() => setStep(0)}>
            <Icon name="chevron-left" size={14} />
            Back to pricing
          </Button>
        </div>
      )}
    </FormDialog>
  );
}
