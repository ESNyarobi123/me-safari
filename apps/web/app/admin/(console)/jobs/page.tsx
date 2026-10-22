'use client';

import { Button, Separator } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  ConfirmDialog,
  CopyButton,
  DataTable,
  DetailDrawer,
  ErrorPanel,
  FilterBar,
  FilterField,
  JsonBlock,
  Page,
  Panel,
  RefreshButton,
  SearchInput,
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  TableFooter,
  TagPill,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, labelize } from '../../lib/format';
import type { BackgroundJob } from '../../lib/types';

const RETRYABLE = new Set([
  'payment.captured',
  'itinerary.published',
  'quote.sent',
  'auth.email',
  'report.export',
  'booking.requested',
  'booking.confirmed',
  'trip.assignment_changed',
  'trip.completed',
]);

export default function JobsPage() {
  const filters = useFilters({ search: '', state: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(30);

  const jobs = useList<BackgroundJob>('/admin/jobs', { limit: pagination.limit, cursor: pagination.cursor });
  const [selected, setSelected] = useState<BackgroundJob | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const command = useCommand({ invalidate: [['list', '/admin/jobs']], successMessage: false });

  const rows = useMemo(() => {
    const list = jobs.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((job) => {
      const matchesState = !filters.values.state || job.state === filters.values.state;
      const matchesSearch =
        !term ||
        [job.type, job.error, job.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesState && matchesSearch;
    });
  }, [filters.values.state, jobs.data, search]);

  const stats = useMemo(() => {
    const list = jobs.data?.rows ?? [];
    const byState = (state: string) => list.filter((job) => job.state === state).length;
    return {
      total: list.length,
      failed: byState('FAILED'),
      pending: byState('PENDING'),
      inFlight: byState('PROCESSING') + byState('DISPATCHED'),
      maxAttempts: list.reduce((max, job) => Math.max(max, job.attempts ?? 0), 0),
    };
  }, [jobs.data]);

  const types = useMemo(() => {
    const list = jobs.data?.rows ?? [];
    return Array.from(new Set(list.map((job) => job.type).filter(Boolean))).sort() as string[];
  }, [jobs.data]);

  const columns: Array<Column<BackgroundJob>> = [
    {
      key: 'type',
      header: 'Job',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.type ?? 'unknown'}</p>
          <p className="truncate text-xs text-muted">event {row.id.slice(0, 8)}</p>
        </div>
      ),
    },
    { key: 'state', header: 'State', render: (row) => <StatusChip status={row.state ?? 'PENDING'} /> },
    {
      key: 'attempts',
      header: 'Attempts',
      align: 'center',
      render: (row) => <span className="text-sm tabular-nums">{row.attempts ?? 0}</span>,
    },
    {
      key: 'error',
      header: 'Last error',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 text-xs text-danger">{row.error || '—'}</span>,
    },
    {
      key: 'next',
      header: 'Next attempt',
      hideBelow: 'lg',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.nextAttemptAt)}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      align: 'end',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onPress={() => {
            setSelected(row);
            setShowRaw(false);
          }}
        >
          <Icon name="eye" size={15} />
        </Button>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Governance"
      title="Failed jobs"
      subtitle="The transactional outbox: payment events, emails, documents and exports that still need to land. Retries are allowlisted and audited."
      actions={<RefreshButton pending={jobs.isFetching} onPress={() => void jobs.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Jobs" icon="cog" tone="accent" loading={jobs.isLoading} value={stats.total} hint="On this page" />
        <StatCard label="Failed" icon="alert" tone="danger" loading={jobs.isLoading} value={stats.failed} hint="Needing a retry decision" />
        <StatCard label="Queued" icon="clock" tone="warning" loading={jobs.isLoading} value={stats.pending} hint="Waiting for the worker" />
        <StatCard label="In flight" icon="refresh" tone="default" loading={jobs.isLoading} value={stats.inFlight} hint="Dispatched or processing" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Job type, error text or event id"
          />
        </FilterField>
        <FilterField label="State">
          <SelectInput
            value={filters.values.state ?? ''}
            onChange={(value) => filters.set('state', value)}
            options={[
              { value: '', label: 'All states' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'DISPATCHED', label: 'Dispatched' },
            ]}
          />
        </FilterField>
      </FilterBar>

      {types.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {types.map((type) => (
            <button key={type} type="button" onClick={() => filters.set('search', type)}>
              <TagPill icon={RETRYABLE.has(type) ? 'check' : 'cog'}>{type}</TagPill>
            </button>
          ))}
        </div>
      ) : null}

      {jobs.isError ? (
        <ErrorPanel message="The job queue could not be loaded." details={errorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />
      ) : null}

      <Panel
        title="Outbox"
        description="Only failed events on the retry allowlist can be requeued; everything else needs the integration fixed first."
        icon="cog"
      >
        <DataTable
          label="Background jobs"
          columns={columns}
          rows={rows}
          loading={jobs.isLoading}
          onRowPress={(row) => {
            setSelected(row);
            setShowRaw(false);
          }}
          emptyTitle="Nothing queued"
          emptyDescription="The outbox is empty — every event has been delivered."
          footer={
            <TableFooter
              summary={`${rows.length} shown · most attempts seen ${stats.maxAttempts}`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={jobs.data?.meta.hasMore}
              pending={jobs.isFetching}
              onNext={() => pagination.next(jobs.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.type ?? 'Job'}
        subtitle={<span className="font-mono text-xs">{selected?.id ?? ''}</span>}
        chip={selected ? <StatusChip status={selected.state ?? 'PENDING'} /> : null}
        fields={
          selected
            ? [
                { label: 'State', value: <StatusChip status={selected.state ?? 'PENDING'} /> },
                { label: 'Attempts', value: selected.attempts ?? 0 },
                { label: 'Next attempt', value: formatDateTime(selected.nextAttemptAt) },
                { label: 'Created', value: formatDateTime(selected.createdAt) },
                { label: 'Updated', value: formatDateTime(selected.updatedAt) },
                { label: 'Retryable', value: RETRYABLE.has(selected.type ?? '') ? 'Yes' : 'No — fix the integration' },
                { label: 'Last error', value: selected.error || '—', full: true },
              ]
            : []
        }
        footer={
          selected ? (
            <>
              <CopyButton value={selected.id} label="Copy event id" />
              <Button variant="tertiary" size="sm" onPress={() => setShowRaw((current) => !current)}>
                <Icon name="file" size={15} />
                {showRaw ? 'Hide payload' : 'Show payload'}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="primary" size="sm" isDisabled={selected.state !== 'FAILED' || !RETRYABLE.has(selected.type ?? '')}>
                    <Icon name="refresh" size={15} />
                    Retry job
                  </Button>
                }
                title="Requeue this job"
                description="Failed deliveries are moved back to QUEUED and picked up by the worker. The retry is recorded against your identity."
                confirmLabel="Requeue job"
                destructive={false}
                onConfirm={async (reason) => {
                  await command.run(`/admin/jobs/${selected.id}/retry`, 'POST', {
                    body: { reason },
                    reauth: 'settings.manage',
                    successMessage: 'Job requeued.',
                  });
                  void jobs.refetch();
                  setSelected(null);
                }}
              />
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Diagnosis checklist" icon="alert">
          <ul className="space-y-1.5 text-xs text-muted">
            <li>• Read the error text — most failures are expired credentials or an unconfigured integration.</li>
            <li>• Check Integrations to confirm the provider is actually enabled for this environment.</li>
            <li>• Retry only after the cause is fixed; blind retries inflate attempt counters without delivering.</li>
          </ul>
          <Separator className="my-3" />
          {definitionList([
            { label: 'Allowlisted', value: RETRYABLE.has(selected?.type ?? '') ? 'Yes' : 'No' },
            { label: 'State', value: selected?.state ?? '—' },
            { label: 'Attempts logged', value: selected?.attempts ?? 0 },
          ])}
        </Panel>
        {showRaw && selected ? <JsonBlock value={selected} title="Raw outbox event" /> : null}
      </DetailDrawer>
    </Page>
  );
}
