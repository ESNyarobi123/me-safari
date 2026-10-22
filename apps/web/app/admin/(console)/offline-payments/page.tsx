'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  DataTable,
  ErrorPanel,
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
import type { Booking, OfflinePaymentRecord, PaymentPosting } from '../../lib/types';

type OfflineMethod = 'BANK_TRANSFER' | 'CASH' | 'OTHER';

export default function OfflinePaymentsPage() {
  const filters = useFilters({ search: '', method: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const postings = useList<PaymentPosting>('/admin/payments', { limit: 50, cursor: pagination.cursor });
  const [recordOpen, setRecordOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [record, setRecord] = useState({
    bookingId: '',
    bookingSearch: '',
    reference: '',
    method: 'BANK_TRANSFER' as OfflineMethod,
    amount: '',
    notes: '',
    slipUrl: '',
    payerName: '',
  });

  const bookings = useList<Booking>('/bookings', { limit: 50, search: record.bookingSearch }, { enabled: recordOpen });
  const booking = useApi<Booking>(record.bookingId ? `/bookings/${record.bookingId}` : null, {}, { enabled: Boolean(record.bookingId) });
  const verifyDetail = useApi<OfflinePaymentRecord>(verifyId ? `/admin/offline-payments/${verifyId}` : null, {}, { enabled: Boolean(verifyId) });

  const command = useCommand({ invalidate: [['list', '/admin/payments']], successMessage: false });

  const rows = useMemo(() => {
    const list = (postings.data?.rows ?? []).filter((posting) => Boolean(posting.offlineRecordId));
    const term = search.trim().toLowerCase();
    return list.filter((posting) => {
      const matchesSearch =
        !term ||
        [posting.providerReference, posting.bookingId, posting.offlineRecordId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesMethod = !filters.values.method || (posting.provider ?? '').toLowerCase().includes(filters.values.method.toLowerCase());
      return matchesSearch && matchesMethod;
    });
  }, [filters.values.method, postings.data, search]);

  const stats = useMemo(() => {
    const list = (postings.data?.rows ?? []).filter((posting) => Boolean(posting.offlineRecordId));
    const byCurrency = new Map<string, bigint>();
    for (const posting of list) {
      byCurrency.set(posting.currency, (byCurrency.get(posting.currency) ?? 0n) + BigInt(posting.amountMinor ?? 0));
    }
    const top = [...byCurrency.entries()].sort((a, b) => (a[1] > b[1] ? -1 : 1))[0];
    return { count: list.length, top, currencies: byCurrency.size };
  }, [postings.data]);

  const bookingOptions = useMemo(
    () =>
      (bookings.data?.rows ?? []).slice(0, 40).map((row) => ({
        value: row.id,
        label: `${row.reference} · ${labelize(row.status)} · ${row.currency} ${row.startDate ? String(row.startDate).slice(0, 10) : ''}`,
      })),
    [bookings.data],
  );

  const columns: Array<Column<PaymentPosting>> = [
    {
      key: 'reference',
      header: 'Evidence reference',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.providerReference ?? '—'}</p>
          <p className="truncate text-xs text-muted">record {String(row.offlineRecordId ?? '').slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'end',
      render: (row) => <Money minor={row.amountMinor} currency={row.currency} className="font-medium" />,
    },
    { key: 'currency', header: 'Currency', render: (row) => <StatusChip status={row.currency} label={row.currency} /> },
    {
      key: 'booking',
      header: 'Booking',
      hideBelow: 'lg',
      render: (row) => <span className="font-mono text-xs text-muted">{row.bookingId.slice(0, 8)}</span>,
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (row) => (
        <div className="space-y-1">
          <StatusChip status="VERIFIED" tone="success" label="Verified" />
          <p className="text-[11px] text-muted">{formatDateTime(row.settledAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button size="sm" variant="ghost" onPress={() => { setVerifyId(row.offlineRecordId ?? null); setVerifyReason(''); }}>
          <Icon name="eye" size={15} />
        </Button>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Finance"
      title="Offline payments"
      subtitle="Bank transfers, cash and other manual settlements. Recording creates an unverified claim; verification posts it to the booking ledger."
      actions={
        <>
          <RefreshButton pending={postings.isFetching} onPress={() => void postings.refetch()} />
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setRecord({
                bookingId: '',
                bookingSearch: '',
                reference: '',
                method: 'BANK_TRANSFER',
                amount: '',
                notes: '',
                slipUrl: '',
                payerName: '',
              });
              setRecordOpen(true);
            }}
          >
            <Icon name="plus" size={15} />
            Record payment
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Verified offline" icon="download" tone="accent" loading={postings.isLoading} value={stats.count} hint="Offline-linked postings" />
        <StatCard
          label="Largest currency"
          icon="chart"
          tone="default"
          loading={postings.isLoading}
          value={stats.top ? <Money minor={stats.top[1].toString()} currency={stats.top[0]} compact /> : '—'}
          hint="Verified volume"
        />
        <StatCard label="Currencies" icon="globe" tone="default" loading={postings.isLoading} value={stats.currencies} hint="Distinct books" />
        <StatCard label="Verification" icon="shield" tone="success" loading={false} value="Required" hint="Every claim needs a re-authenticated approve" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Reference, booking or record id"
          />
        </FilterField>
        <FilterField label="Method">
          <SelectInput
            value={filters.values.method ?? ''}
            onChange={(value) => filters.set('method', value)}
            options={[
              { value: '', label: 'All methods' },
              { value: 'BANK', label: 'Bank transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
        </FilterField>
      </FilterBar>

      {postings.isError ? (
        <ErrorPanel message="Offline payments could not be loaded." details={errorMessage(postings.error)} onRetry={() => void postings.refetch()} />
      ) : null}

      <Panel
        title="Verified offline postings"
        description="The ledger view of manual settlements. Claims awaiting verification are handled by the operations team that recorded them."
        icon="download"
      >
        <DataTable
          label="Offline payments"
          columns={columns}
          rows={rows}
          loading={postings.isLoading}
          emptyTitle="No verified offline payments"
          emptyDescription="Record a bank transfer or cash payment to get started."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={postings.data?.meta.hasMore}
              pending={postings.isFetching}
              onNext={() => pagination.next(postings.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      {/* ------------------------------------------------------------------ record */}
      <FormDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        title="Record an offline payment"
        description="Claims start as UNVERIFIED. A second operator verifies them before any posting is created."
        submitLabel="Record claim"
        onSubmit={async () => {
          if (!booking.data) return;
          await command.run('/admin/offline-payments', 'POST', {
            body: {
              bookingId: record.bookingId,
              reference: record.reference.trim(),
              method: record.method,
              amountMinor: toMinor(record.amount, booking.data.currency),
              currency: booking.data.currency,
              evidence: {
                payerName: record.payerName || undefined,
                slipUrl: record.slipUrl || undefined,
                notes: record.notes || undefined,
              },
            },
            successMessage: 'Offline payment recorded — awaiting verification.',
          });
          void postings.refetch();
        }}
        disabled={!record.bookingId || !record.reference.trim() || !record.amount || record.amount === '0'}
      >
        <div className="space-y-3">
          <TextInput
            label="Find booking"
            value={record.bookingSearch}
            onChange={(value) => setRecord((c) => ({ ...c, bookingSearch: value }))}
            placeholder="Reference, customer name or email"
          />
          {bookings.isLoading ? <Skeleton className="h-12 rounded-xl" /> : null}
          <SelectInput
            label="Booking"
            value={record.bookingId || null}
            onChange={(value) => setRecord((c) => ({ ...c, bookingId: value }))}
            options={bookingOptions}
            placeholder="Select the booking this payment settles"
          />
          {booking.data ? (
            <Panel variant="secondary" title="Settlement context" icon="ticket">
              {definitionList([
                { label: 'Reference', value: booking.data.reference },
                { label: 'Currency', value: booking.data.currency },
                { label: 'Status', value: <StatusChip status={booking.data.status} /> },
                { label: 'Outstanding', value: booking.data.paymentSummary ? <Money minor={booking.data.paymentSummary.balanceDue} currency={booking.data.currency} /> : '—' },
              ])}
            </Panel>
          ) : null}
          <TextInput
            label="Evidence reference"
            value={record.reference}
            isRequired
            onChange={(value) => setRecord((c) => ({ ...c, reference: value }))}
            placeholder="Bank slip, receipt or cash voucher number"
          />
          <SelectInput
            label="Method"
            value={record.method}
            onChange={(value) => setRecord((c) => ({ ...c, method: value }))}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <TextInput
            label={`Amount (major units, ${booking.data?.currency ?? 'booking currency'})`}
            value={record.amount}
            inputMode="decimal"
            onChange={(value) => setRecord((c) => ({ ...c, amount: value.replace(/[^\d.]/g, '') }))}
          />
          <TextInput label="Payer name" value={record.payerName} onChange={(value) => setRecord((c) => ({ ...c, payerName: value }))} />
          <TextInput label="Evidence link" value={record.slipUrl} onChange={(value) => setRecord((c) => ({ ...c, slipUrl: value }))} placeholder="https://…" />
          <TextAreaInput label="Notes" rows={3} value={record.notes} onChange={(value) => setRecord((c) => ({ ...c, notes: value }))} />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------------ verify */}
      <FormDialog
        open={Boolean(verifyId)}
        onOpenChange={(open) => {
          if (!open) setVerifyId(null);
        }}
        title="Verify an offline payment"
        description="Verification posts the amount to the booking ledger and advances the payment summary."
        submitLabel="Verify and post"
        onSubmit={async () => {
          if (!verifyId) return;
          await command.run(`/admin/offline-payments/${verifyId}/verify`, 'POST', {
            body: { reason: verifyReason },
            reauth: 'finance.offline_verify',
            successMessage: 'Offline payment verified and posted.',
          });
          void postings.refetch();
        }}
        disabled={verifyReason.trim().length < 10}
      >
        <div className="space-y-3">
          {verifyDetail.isLoading ? <Skeleton className="h-24 rounded-xl" /> : null}
          {verifyDetail.data ? (
            <Panel variant="secondary" title="Claim under review" icon="download">
              {definitionList([
                { label: 'Reference', value: verifyDetail.data.reference },
                { label: 'Method', value: labelize(verifyDetail.data.method) },
                { label: 'Amount', value: <Money minor={verifyDetail.data.amountMinor} currency={verifyDetail.data.currency} /> },
                { label: 'State', value: <StatusChip status={verifyDetail.data.state ?? verifyDetail.data.status ?? 'UNVERIFIED'} /> },
                { label: 'Recorded', value: formatDateTime(verifyDetail.data.createdAt) },
                { label: 'Booking', value: <span className="font-mono text-xs">{verifyDetail.data.bookingId}</span> },
              ])}
              {verifyDetail.data.evidence && Object.keys(verifyDetail.data.evidence).length > 0 ? (
                <>
                  <Separator className="my-3" />
                  <pre className="admin-scroll max-h-40 overflow-auto font-mono text-[11px] text-muted">
                    {JSON.stringify(verifyDetail.data.evidence, null, 2)}
                  </pre>
                </>
              ) : null}
            </Panel>
          ) : null}
          <TextAreaInput
            label="Verification reason (recorded in the audit log)"
            rows={3}
            value={verifyReason}
            onChange={setVerifyReason}
            description="Reference the bank statement line or cash book entry you checked."
          />
          <p className="text-xs text-muted">
            Without a record id above you can still verify from the operations booking view — every verification is audited either way.
          </p>
        </div>
      </FormDialog>
    </Page>
  );
}
