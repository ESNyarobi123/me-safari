'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  ConfirmDialog,
  CopyButton,
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
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, labelize, toMinor } from '../../lib/format';
import type { Booking, PaymentPosting } from '../../lib/types';

type AdjustmentType = 'CORRECTION' | 'CANCELLATION' | 'RESCHEDULE' | 'GOODWILL';

interface PaymentDetail extends Omit<PaymentPosting, 'refunds'> {
  refunds?: Array<Record<string, unknown>>;
  documents?: Array<{ id: string; status: string; type?: string }>;
  intent?: { id: string; state?: string; status?: string; attempts?: Array<Record<string, unknown>> };
}

interface PaymentIntentRow {
  id: string;
  bookingId: string;
  purpose: string;
  amountMinor: string | number;
  currency: string;
  state: string;
  version?: number;
  provider: string;
  expiresAt: string;
  createdAt?: string;
  booking?: { reference: string; status: string } | null;
  customer?: { name: string; email: string } | null;
  attempts?: Array<{
    id: string;
    state: string;
    providerTransactionId?: string | null;
    nextAction?: unknown;
  }>;
}

export default function PaymentsPage() {
  const filters = useFilters({ search: '', provider: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const payments = useList<PaymentPosting>('/admin/payments', { limit: pagination.limit, cursor: pagination.cursor });
  const openIntents = useList<PaymentIntentRow>('/admin/payment-intents', { limit: 10, open: 'true' });
  const [selected, setSelected] = useState<PaymentPosting | null>(null);
  const [adjustFor, setAdjustFor] = useState<PaymentPosting | null>(null);
  const [adjustment, setAdjustment] = useState({
    amount: '',
    direction: 'CREDIT',
    type: 'CORRECTION' as AdjustmentType,
    reason: '',
  });

  const detail = useApi<PaymentDetail>(selected ? `/admin/payments/${selected.id}` : null, {}, { enabled: Boolean(selected) });
  const booking = useApi<Booking>(adjustFor ? `/bookings/${adjustFor.bookingId}` : null, {}, { enabled: Boolean(adjustFor) });

  const command = useCommand({ invalidate: [['list', '/admin/payments'], ['list', '/admin/payment-intents']], successMessage: false });

  const rows = useMemo(() => {
    const list = payments.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((posting) => {
      const matchesProvider = !filters.values.provider || posting.provider === filters.values.provider;
      const matchesSearch =
        !term ||
        [posting.providerReference, posting.bookingId, posting.currency]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesProvider && matchesSearch;
    });
  }, [filters.values.provider, payments.data, search]);

  const stats = useMemo(() => {
    const list = payments.data?.rows ?? [];
    const settled = list.filter((posting) => Boolean(posting.settledAt));
    const providers = new Set(list.map((posting) => posting.provider));
    const refunded = list.reduce((total, posting) => total + (posting.refunds?.length ?? 0), 0);
    const byCurrency = new Map<string, bigint>();
    for (const posting of list) {
      byCurrency.set(posting.currency, (byCurrency.get(posting.currency) ?? 0n) + BigInt(posting.amountMinor ?? 0));
    }
    const top = [...byCurrency.entries()].sort((a, b) => (a[1] > b[1] ? -1 : 1))[0];
    return { count: list.length, settled: settled.length, providers: providers.size, refunded, top };
  }, [payments.data]);

  const providerOptions = useMemo(() => {
    const list = payments.data?.rows ?? [];
    const unique = Array.from(new Set(list.map((posting) => posting.provider))).sort();
    return [{ value: '', label: 'All providers' }, ...unique.map((provider) => ({ value: provider, label: labelize(provider) }))];
  }, [payments.data]);

  const columns: Array<Column<PaymentPosting>> = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.providerReference ?? row.id.slice(0, 12)}</p>
          <p className="truncate text-xs text-muted">booking {row.bookingId.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'end',
      render: (row) => <Money minor={row.amountMinor} currency={row.currency} className="font-medium" />,
    },
    { key: 'provider', header: 'Provider', render: (row) => <StatusChip status={row.provider} /> },
    {
      key: 'settled',
      header: 'Settled',
      hideBelow: 'lg',
      render: (row) => (
        <span className="text-xs text-muted">{row.settledAt ? formatDateTime(row.settledAt) : 'Not settled'}</span>
      ),
    },
    {
      key: 'refunds',
      header: 'Refunds',
      hideBelow: 'lg',
      render: (row) =>
        (row.refunds?.length ?? 0) > 0 ? (
          <StatusChip status="PENDING" label={`${row.refunds?.length} refunds`} />
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      hideBelow: 'xl',
      render: (row) =>
        (row.documents?.length ?? 0) > 0 ? (
          <StatusChip status={row.documents?.[0]?.status ?? 'READY'} label="Issued" tone="success" />
        ) : (
          <span className="text-xs text-muted">Pending</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
            <Icon name="eye" size={15} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setAdjustFor(row);
              setAdjustment({ amount: '', direction: 'CREDIT', type: 'CORRECTION', reason: '' });
            }}
          >
            <Icon name="sliders" size={15} />
          </Button>
        </div>
      ),
    },
  ];

  const intentColumns: Array<Column<PaymentIntentRow>> = [
    {
      key: 'intent',
      header: 'Intent',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.id.slice(0, 12)}</p>
          <p className="truncate text-xs text-muted">{row.booking?.reference ?? row.bookingId.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'end',
      render: (row) => <Money minor={row.amountMinor} currency={row.currency} className="font-medium" />,
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => <StatusChip status={row.state} />,
    },
    {
      key: 'expires',
      header: 'Expires',
      hideBelow: 'lg',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.expiresAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <ConfirmDialog
          trigger={
            <Button variant="danger" size="sm">
              <Icon name="x" size={15} />
              Void
            </Button>
          }
          title="Void this payment intent"
          description="Only void after confirming in the Snippe dashboard that no charge exists for this reference. Voiding unblocks a new payment attempt; a late verified capture is still recorded."
          confirmLabel="Void intent"
          destructive
          onConfirm={async (reason) => {
            await command.run(`/admin/payment-intents/${row.id}/void`, 'POST', {
              body: { expectedVersion: row.version ?? 1, reason },
              reauth: 'finance.adjustment',
              successMessage: 'Payment intent voided.',
            });
            void openIntents.refetch();
          }}
        />
      ),
    },
  ];

  return (
    <Page
      eyebrow="Finance"
      title="Payments"
      subtitle="Every settled posting with provider references, receipts and linked refunds. Adjustments require a re-authenticated, version-checked reason."
      actions={<RefreshButton pending={payments.isFetching} onPress={() => void payments.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Postings" icon="card" tone="accent" loading={payments.isLoading} value={stats.count} hint="On this page" />
        <StatCard label="Settled" icon="check" tone="success" loading={payments.isLoading} value={stats.settled} hint="Confirmed by the provider" />
        <StatCard label="Providers" icon="globe" tone="default" loading={payments.isLoading} value={stats.providers} hint="Distinct channels" />
        <StatCard
          label="Top currency"
          icon="chart"
          tone="default"
          loading={payments.isLoading}
          value={stats.top ? <Money minor={stats.top[1].toString()} currency={stats.top[0]} compact /> : '—'}
          hint={`${stats.refunded} refund records linked`}
        />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Provider reference, booking id or currency"
          />
        </FilterField>
        <FilterField label="Provider">
          <SelectInput
            value={filters.values.provider ?? ''}
            onChange={(value) => filters.set('provider', value)}
            options={providerOptions}
          />
        </FilterField>
      </FilterBar>

      {payments.isError ? (
        <ErrorPanel message="Payments could not be loaded." details={errorMessage(payments.error)} onRetry={() => void payments.refetch()} />
      ) : null}

      <Panel
        title="Open payment intents"
        description="Pending or ambiguous attempts block new payments for the same booking. Void one only after checking the provider dashboard."
        icon="clock"
      >
        {openIntents.isError ? (
          <ErrorPanel message="Open payment intents could not be loaded." details={errorMessage(openIntents.error)} onRetry={() => void openIntents.refetch()} />
        ) : (
          <DataTable
            label="Open payment intents"
            columns={intentColumns}
            rows={openIntents.data?.rows ?? []}
            loading={openIntents.isLoading}
            emptyTitle="No open payment intents"
            emptyDescription="New mobile-money prompts appear here while they await verification."
          />
        )}
      </Panel>

      <Panel title="Payment postings" description="Postings are append-only; corrections are recorded as adjustments." icon="card">
        <DataTable
          label="Payment postings"
          columns={columns}
          rows={rows}
          loading={payments.isLoading}
          onRowPress={(row) => setSelected(row)}
          emptyTitle="No payments recorded"
          emptyDescription="Captures appear here as soon as a provider confirms them."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={payments.data?.meta.hasMore}
              pending={payments.isFetching}
              onNext={() => pagination.next(payments.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      {/* -------------------------------------------------------------- adjustment */}
      <FormDialog
        open={Boolean(adjustFor)}
        onOpenChange={(open) => {
          if (!open) setAdjustFor(null);
        }}
        title="Record a financial adjustment"
        description="Adjustments change the contracted total. Debits increase what the traveller owes; credits reduce it."
        submitLabel="Record adjustment"
        onSubmit={async () => {
          if (!adjustFor || !booking.data) return;
          await command.run(`/admin/bookings/${adjustFor.bookingId}/financial-adjustments`, 'POST', {
            body: {
              expectedVersion: booking.data.version,
              amountMinor: toMinor(adjustment.amount, booking.data.currency),
              direction: adjustment.direction,
              type: adjustment.type,
              reason: adjustment.reason,
            },
            reauth: 'finance.adjustment',
            successMessage: 'Adjustment recorded.',
          });
          void payments.refetch();
          void booking.refetch();
        }}
        disabled={!adjustment.amount || adjustment.reason.trim().length < 10 || !booking.data}
      >
        <div className="space-y-3">
          {booking.isLoading ? <Skeleton className="h-16 rounded-xl" /> : null}
          {booking.data ? (
            <Panel variant="secondary" title="Booking context" icon="ticket">
              {definitionList([
                { label: 'Booking', value: booking.data.reference },
                { label: 'Status', value: <StatusChip status={booking.data.status} /> },
                { label: 'Currency', value: booking.data.currency },
                { label: 'Version', value: `v${booking.data.version}` },
              ])}
            </Panel>
          ) : null}
          <FieldGrid>
            <TextInput
              label="Amount (major units)"
              value={adjustment.amount}
              inputMode="decimal"
              onChange={(value) => setAdjustment((c) => ({ ...c, amount: value.replace(/[^\d.]/g, '') }))}
              description="Entered in the booking currency; stored as minor units."
            />
            <SelectInput
              label="Direction"
              value={adjustment.direction}
              onChange={(value) => setAdjustment((c) => ({ ...c, direction: value }))}
              options={[
                { value: 'CREDIT', label: 'Credit — reduce what the traveller owes' },
                { value: 'DEBIT', label: 'Debit — increase what the traveller owes' },
              ]}
            />
          </FieldGrid>
          <SelectInput
            label="Adjustment type"
            value={adjustment.type}
            onChange={(value) => setAdjustment((c) => ({ ...c, type: value }))}
            options={[
              { value: 'CORRECTION', label: 'Correction' },
              { value: 'CANCELLATION', label: 'Cancellation' },
              { value: 'RESCHEDULE', label: 'Reschedule' },
              { value: 'GOODWILL', label: 'Goodwill' },
            ]}
          />
          <TextAreaInput
            label="Reason (recorded in the audit log)"
            rows={3}
            value={adjustment.reason}
            onChange={(value) => setAdjustment((c) => ({ ...c, reason: value }))}
          />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------------ detail */}
      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={<Money minor={selected?.amountMinor} currency={selected?.currency ?? 'USD'} />}
        subtitle={<span className="font-mono">{selected?.providerReference ?? ''}</span>}
        chip={selected ? <StatusChip status={selected.provider} /> : null}
        fields={
          selected
            ? [
                { label: 'Posting id', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Booking', value: <span className="font-mono text-xs">{selected.bookingId}</span> },
                { label: 'Settled', value: formatDateTime(selected.settledAt) },
                { label: 'Recorded', value: formatDateTime(selected.createdAt) },
                {
                  label: 'Offline record',
                  value: selected.offlineRecordId ? (
                    <span className="font-mono text-xs">{selected.offlineRecordId}</span>
                  ) : (
                    'Provider capture'
                  ),
                },
                { label: 'Receipt documents', value: (detail.data?.documents ?? []).length || 'None' },
              ]
            : []
        }
        sections={[
          {
            title: 'Refunds against this posting',
            content: detail.isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (detail.data?.refunds ?? []).length === 0 ? (
              <EmptyState compact icon="refresh" title="No refunds requested" />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {(detail.data?.refunds ?? []).map((refund, index) => (
                  <li key={String(refund.id ?? index)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {String(refund.amountMinor ?? '')} {String(refund.currency ?? '')}
                      </p>
                      <p className="truncate text-xs text-muted">{String(refund.reason ?? 'No reason recorded')}</p>
                    </div>
                    <StatusChip status={String(refund.state ?? refund.status ?? 'REQUESTED')} />
                  </li>
                ))}
              </ul>
            ),
          },
          {
            title: 'Provider attempts',
            content:
              (detail.data?.intent?.attempts ?? []).length === 0 ? (
                <p className="text-sm text-muted">This posting has no recorded provider attempts.</p>
              ) : (
                definitionList([
                  { label: 'Intent', value: <span className="font-mono text-xs">{detail.data?.intent?.id}</span> },
                  { label: 'Intent state', value: <StatusChip status={String(detail.data?.intent?.state ?? 'UNKNOWN')} /> },
                  { label: 'Attempts', value: (detail.data?.intent?.attempts ?? []).length },
                ])
              ),
          },
        ]}
        footer={
          selected ? (
            <>
              <CopyButton value={selected.id} label="Copy posting id" />
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  setAdjustFor(selected);
                  setAdjustment({ amount: '', direction: 'CREDIT', type: 'CORRECTION', reason: '' });
                  setSelected(null);
                }}
              >
                <Icon name="sliders" size={15} />
                Record adjustment
              </Button>
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Settlement summary" icon="chart">
          {definitionList([
            { label: 'Amount', value: <Money minor={selected?.amountMinor} currency={selected?.currency ?? 'USD'} /> },
            { label: 'Currency', value: selected?.currency ?? '—' },
            { label: 'Provider', value: labelize(selected?.provider) },
            { label: 'Refund records', value: (selected?.refunds ?? []).length },
          ])}
          <Separator className="my-3" />
          <p className="text-xs text-muted">
            Refunds are requested against a posting from the Refunds page so approvals and re-authentication stay in one place.
          </p>
        </Panel>
      </DetailDrawer>
    </Page>
  );
}
