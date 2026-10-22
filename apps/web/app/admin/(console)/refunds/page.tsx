'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  ConfirmDialog,
  DataTable,
  DetailDrawer,
  EmptyState,
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
import type { PaymentPosting, Refund } from '../../lib/types';

interface RefundRow extends Refund {
  state?: string;
  bookingId?: string;
  approvedAt?: string | null;
}

export default function RefundsPage() {
  const filters = useFilters({ search: '', status: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const refunds = useList<RefundRow>('/admin/refunds', { limit: pagination.limit, cursor: pagination.cursor });
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settle, setSettle] = useState({ providerReference: '', reason: '' });
  const [request, setRequest] = useState({
    postingId: '',
    amount: '',
    reason: '',
    currency: 'USD',
    search: '',
  });

  const postings = useList<PaymentPosting>('/admin/payments', { limit: 50 }, { enabled: requestOpen });
  const detail = useApi<RefundRow>(selected ? `/admin/refunds/${selected.id}` : null, {}, { enabled: Boolean(selected) });
  const command = useCommand({ invalidate: [['list', '/admin/refunds']], successMessage: false });

  const rows = useMemo(() => {
    const list = refunds.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((refund) => {
      const state = refund.state ?? refund.status;
      const matchesStatus = !filters.values.status || state === filters.values.status;
      const matchesSearch =
        !term ||
        [refund.id, refund.bookingId, refund.postingId, refund.reason]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filters.values.status, refunds.data, search]);

  const stats = useMemo(() => {
    const list = refunds.data?.rows ?? [];
    const byState = (value: string) => list.filter((refund) => (refund.state ?? refund.status) === value).length;
    return {
      total: list.length,
      requested: byState('REQUESTED'),
      inFlight: byState('PENDING') + byState('PROCESSING'),
      settled: byState('SETTLED') + byState('COMPLETED'),
    };
  }, [refunds.data]);

  const postingOptions = useMemo(() => {
    const list = postings.data?.rows ?? [];
    const term = request.search.trim().toLowerCase();
    return list
      .filter((posting) =>
        !term
          ? true
          : [posting.providerReference, posting.bookingId]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term)),
      )
      .slice(0, 40)
      .map((posting) => ({
        value: posting.id,
        label: `${posting.providerReference ?? posting.id.slice(0, 8)} · ${posting.currency} ${posting.amountMinor}`,
      }));
  }, [postings.data, request.search]);

  const selectedPosting = (postings.data?.rows ?? []).find((posting) => posting.id === request.postingId) ?? null;

  const columns: Array<Column<RefundRow>> = [
    {
      key: 'refund',
      header: 'Refund',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.id.slice(0, 12)}</p>
          <p className="truncate text-xs text-muted">posting {String(row.postingId ?? '').slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'end',
      render: (row) => <Money minor={row.amountMinor} currency={row.currency ?? 'USD'} className="font-medium" />,
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => <StatusChip status={row.state ?? row.status ?? 'REQUESTED'} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 text-xs text-muted">{row.reason || '—'}</span>,
    },
    {
      key: 'created',
      header: 'Requested',
      hideBelow: 'lg',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
          <Icon name="eye" size={15} />
        </Button>
      ),
    },
  ];

  const state = selected ? (selected.state ?? selected.status ?? 'REQUESTED') : '';

  return (
    <Page
      eyebrow="Finance"
      title="Refunds"
      subtitle="Request and approve traveller refunds. Snippe payouts are settled in the merchant account; record the payout reference here so the ledger, receipt and audit trail stay in step."
      actions={
        <>
          <RefreshButton pending={refunds.isFetching} onPress={() => void refunds.refetch()} />
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setRequest({ postingId: '', amount: '', reason: '', currency: 'USD', search: '' });
              setRequestOpen(true);
            }}
          >
            <Icon name="plus" size={15} />
            Request refund
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Refunds" icon="refresh" tone="accent" loading={refunds.isLoading} value={stats.total} hint="On this page" />
        <StatCard label="Awaiting approval" icon="clock" tone="warning" loading={refunds.isLoading} value={stats.requested} hint="REQUESTED state" />
        <StatCard label="With provider" icon="card" tone="default" loading={refunds.isLoading} value={stats.inFlight} hint="Pending settlement" />
        <StatCard label="Settled" icon="check" tone="success" loading={refunds.isLoading} value={stats.settled} hint="Funds returned" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Refund, booking or posting id"
          />
        </FilterField>
        <FilterField label="State">
          <SelectInput
            value={filters.values.status ?? ''}
            onChange={(value) => filters.set('status', value)}
            options={[
              { value: '', label: 'All states' },
              { value: 'REQUESTED', label: 'Requested' },
              { value: 'PENDING', label: 'Pending with provider' },
              { value: 'SETTLED', label: 'Settled' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </FilterField>
      </FilterBar>

      {refunds.isError ? (
        <ErrorPanel message="Refunds could not be loaded." details={errorMessage(refunds.error)} onRetry={() => void refunds.refetch()} />
      ) : null}

      <Panel title="Refund queue" description="Refunds can never exceed the remaining captured funds on a posting." icon="refresh">
        <DataTable
          label="Refunds"
          columns={columns}
          rows={rows}
          loading={refunds.isLoading}
          onRowPress={(row) => setSelected(row)}
          emptyTitle="No refunds recorded"
          emptyDescription="Refunds requested by operations appear here for approval."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={refunds.data?.meta.hasMore}
              pending={refunds.isFetching}
              onNext={() => pagination.next(refunds.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      {/* ----------------------------------------------------------------- request */}
      <FormDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request a refund"
        description="Pick the captured posting, enter the amount in major units and record the reason. Approvals happen separately."
        submitLabel="Request refund"
        onSubmit={async () => {
          await command.run('/admin/refunds', 'POST', {
            body: {
              postingId: request.postingId,
              amountMinor: toMinor(request.amount, request.currency),
              reason: request.reason,
            },
            successMessage: 'Refund requested.',
          });
          void refunds.refetch();
        }}
        disabled={!request.postingId || !request.amount || request.reason.trim().length < 10}
      >
        <div className="space-y-3">
          <TextInput
            label="Find posting"
            value={request.search}
            onChange={(value) => setRequest((c) => ({ ...c, search: value }))}
            placeholder="Provider reference or booking id"
          />
          {postings.isLoading ? <Skeleton className="h-12 rounded-xl" /> : null}
          <SelectInput
            label="Captured posting"
            value={request.postingId || null}
            onChange={(value) => {
              const posting = (postings.data?.rows ?? []).find((row) => row.id === value);
              setRequest((c) => ({
                ...c,
                postingId: value,
                currency: posting?.currency ?? c.currency,
              }));
            }}
            options={postingOptions}
            placeholder="Select a settled payment posting"
          />
          {selectedPosting ? (
            <Panel variant="secondary" title="Posting" icon="card">
              {definitionList([
                { label: 'Amount', value: <Money minor={selectedPosting.amountMinor} currency={selectedPosting.currency} /> },
                { label: 'Provider', value: labelize(selectedPosting.provider) },
                { label: 'Settled', value: formatDateTime(selectedPosting.settledAt) },
                { label: 'Currency', value: selectedPosting.currency },
              ])}
            </Panel>
          ) : null}
          <TextInput
            label="Refund amount (major units)"
            value={request.amount}
            inputMode="decimal"
            onChange={(value) => setRequest((c) => ({ ...c, amount: value.replace(/[^\d.]/g, '') }))}
            description={`Stored as minor units in ${request.currency}.`}
          />
          <TextAreaInput
            label="Reason"
            rows={3}
            value={request.reason}
            onChange={(value) => setRequest((c) => ({ ...c, reason: value }))}
            description="At least 10 characters; recorded in the audit log."
          />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------- manual settlement */}
      <FormDialog
        open={settleOpen && Boolean(selected)}
        onOpenChange={setSettleOpen}
        title="Record the refund payout"
        description="Snippe has no refund API. Pay the traveller from the merchant balance, then paste the provider payout reference here. This writes the refund posting and closes the refund."
        submitLabel="Mark settled"
        onSubmit={async () => {
          if (!selected) return;
          await command.run(`/admin/refunds/${selected.id}/settle`, 'POST', {
            body: {
              expectedVersion: selected.version ?? 1,
              providerReference: settle.providerReference.trim(),
              reason: settle.reason,
            },
            reauth: 'refund.approve',
            successMessage: 'Refund settled.',
          });
          void refunds.refetch();
          setSelected(null);
          setSettle({ providerReference: '', reason: '' });
        }}
        disabled={settle.providerReference.trim().length < 3 || settle.reason.trim().length < 10}
      >
        <div className="space-y-3">
          <TextInput
            label="Provider payout reference"
            value={settle.providerReference}
            onChange={(value) => setSettle((c) => ({ ...c, providerReference: value }))}
            placeholder="Mobile-money payout or bank transfer reference"
          />
          <TextAreaInput
            label="Reason"
            rows={3}
            value={settle.reason}
            onChange={(value) => setSettle((c) => ({ ...c, reason: value }))}
            description="At least 10 characters; recorded in the audit log."
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
        subtitle={<span className="font-mono text-xs">{selected?.id ?? ''}</span>}
        chip={selected ? <StatusChip status={state} /> : null}
        fields={
          selected
            ? [
                { label: 'State', value: <StatusChip status={state} /> },
                { label: 'Posting', value: <span className="font-mono text-xs">{String(selected.postingId ?? '—')}</span> },
                { label: 'Booking', value: <span className="font-mono text-xs">{String(selected.bookingId ?? '—')}</span> },
                { label: 'Requested', value: formatDateTime(selected.createdAt) },
                { label: 'Approved', value: selected.approvedAt ? formatDateTime(selected.approvedAt) : 'Not yet approved' },
                { label: 'Version', value: `v${selected.version ?? 1}` },
                { label: 'Reason', value: selected.reason || '—', full: true },
              ]
            : []
        }
        sections={[
          {
            title: 'Settlement postings',
            content: detail.isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (detail.data?.postings ?? []).length === 0 ? (
              <EmptyState compact icon="card" title="No settlement postings yet" description="A posting appears once the provider confirms the refund." />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {(detail.data?.postings ?? []).map((posting, index) => (
                  <li key={String(posting.id ?? index)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{String(posting.providerReference ?? posting.id ?? '')}</p>
                      <p className="text-xs text-muted">{formatDateTime(posting.settledAt as string)}</p>
                    </div>
                    <Money minor={posting.amountMinor} currency={String(posting.currency ?? 'USD')} />
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
        footer={
          selected ? (
            <>
              <ConfirmDialog
                trigger={
                  <Button variant="primary" size="sm" isDisabled={state !== 'REQUESTED'}>
                    <Icon name="check" size={15} />
                    Approve
                  </Button>
                }
                title="Approve this refund"
                description="Approval reserves the funds, emits the provider refund event and moves the refund to PENDING."
                confirmLabel="Approve refund"
                destructive={false}
                onConfirm={async (reason) => {
                  await command.run(`/admin/refunds/${selected.id}/approve`, 'POST', {
                    body: { expectedVersion: selected.version ?? 1, reason },
                    reauth: 'refund.approve',
                    successMessage: 'Refund approved.',
                  });
                  void refunds.refetch();
                  setSelected(null);
                }}
              />
              <Button
                variant="primary"
                size="sm"
                isDisabled={state !== 'PENDING'}
                onPress={() => {
                  setSettle({ providerReference: '', reason: '' });
                  setSettleOpen(true);
                }}
              >
                <Icon name="check" size={15} />
                Mark settled
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="danger" size="sm" isDisabled={state !== 'REQUESTED'}>
                    <Icon name="x" size={15} />
                    Reject
                  </Button>
                }
                title="Reject this refund"
                description="The refund stays on record with your reason and no funds move."
                confirmLabel="Reject refund"
                onConfirm={async (reason) => {
                  await command.run(`/admin/refunds/${selected.id}/reject`, 'POST', {
                    body: { expectedVersion: selected.version ?? 1, reason },
                    successMessage: 'Refund rejected.',
                  });
                  void refunds.refetch();
                  setSelected(null);
                }}
              />
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Disposition rules" icon="shield">
          <ul className="space-y-1.5 text-xs text-muted">
            <li>• Never refund more than the remaining captured funds on a posting.</li>
            <li>• Record the approved contract reduction before requesting funds back.</li>
            <li>• Approvals require a re-authentication token and are appended to the audit log.</li>
          </ul>
          <Separator className="my-3" />
          {definitionList([
            { label: 'Refund id', value: <span className="font-mono text-xs">{selected?.id ?? '—'}</span> },
            { label: 'State', value: state || '—' },
          ])}
        </Panel>
      </DetailDrawer>
    </Page>
  );
}
