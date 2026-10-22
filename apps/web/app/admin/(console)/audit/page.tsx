'use client';

import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
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
  StatCard,
  StatGrid,
  StatusChip,
  TableFooter,
  TagPill,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, labelize } from '../../lib/format';
import type { AuditEntry } from '../../lib/types';

export default function AuditPage() {
  const filters = useFilters({ search: '', action: '', entityId: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(30);

  const audit = useList<AuditEntry>('/admin/audit', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    action: filters.values.action || undefined,
    entityId: filters.values.entityId || undefined,
  });

  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const rows = useMemo(() => {
    const list = audit.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((entry) =>
      [entry.action, entry.entityType, entry.entityId, entry.actorId, entry.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [audit.data, search]);

  const stats = useMemo(() => {
    const list = audit.data?.rows ?? [];
    const families = new Set(list.map((entry) => entry.action.split('.')[0]));
    const actors = new Set(list.map((entry) => entry.actorId).filter(Boolean));
    const reasons = list.filter((entry) => Boolean(entry.reason)).length;
    return { total: list.length, families: families.size, actors: actors.size, reasons };
  }, [audit.data]);

  const actionFamilies = useMemo(() => {
    const list = audit.data?.rows ?? [];
    return Array.from(new Set(list.map((entry) => entry.action.split('.')[0]))).sort();
  }, [audit.data]);

  const columns: Array<Column<AuditEntry>> = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{row.action}</p>
          <p className="truncate text-xs text-muted">
            {row.entityType}
            {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <span className="font-mono text-[11px] text-muted">{row.actorId ? row.actorId.slice(0, 8) : 'system'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 text-xs text-muted">{row.reason || '—'}</span>,
    },
    {
      key: 'request',
      header: 'Request',
      hideBelow: 'xl',
      render: (row) => <span className="font-mono text-[11px] text-muted">{(row.requestId ?? '').slice(0, 8) || '—'}</span>,
    },
    {
      key: 'created',
      header: 'When',
      align: 'end',
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

  return (
    <Page
      eyebrow="Governance"
      title="Audit log"
      subtitle="An append-only record of every privileged action: who did it, to what, why, and under which request id."
      actions={<RefreshButton pending={audit.isFetching} onPress={() => void audit.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Entries" icon="history" tone="accent" loading={audit.isLoading} value={stats.total} hint="On this page" />
        <StatCard label="Action families" icon="cog" tone="default" loading={audit.isLoading} value={stats.families} hint="Distinct domains touched" />
        <StatCard label="Actors" icon="users" tone="default" loading={audit.isLoading} value={stats.actors} hint="Distinct identities" />
        <StatCard label="With rationale" icon="edit" tone="success" loading={audit.isLoading} value={stats.reasons} hint="Entries carrying a reason" />
      </StatGrid>

      <FilterBar trailing={<Button size="sm" variant="ghost" onPress={() => filters.reset()}>Clear</Button>}>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Action, entity, actor or reason"
          />
        </FilterField>
        <FilterField label="Action">
          <SearchInput
            value={filters.values.action ?? ''}
            onChange={(value) => filters.set('action', value)}
            placeholder="e.g. booking.confirmed"
          />
        </FilterField>
        <FilterField label="Entity id">
          <SearchInput
            value={filters.values.entityId ?? ''}
            onChange={(value) => filters.set('entityId', value)}
            placeholder="UUID of the affected record"
          />
        </FilterField>
      </FilterBar>

      {actionFamilies.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {actionFamilies.map((family) => (
            <button key={family} type="button" onClick={() => filters.set('action', family)}>
              <TagPill icon="cog">{family}</TagPill>
            </button>
          ))}
        </div>
      ) : null}

      {audit.isError ? (
        <ErrorPanel message="The audit log could not be loaded." details={errorMessage(audit.error)} onRetry={() => void audit.refetch()} />
      ) : null}

      <Panel title="Activity trail" description="Filter by exact action or entity id to trace a single record across its life." icon="history">
        <DataTable
          label="Audit entries"
          columns={columns}
          rows={rows}
          loading={audit.isLoading}
          onRowPress={(row) => {
            setSelected(row);
            setShowRaw(false);
          }}
          emptyTitle="No audit entries"
          emptyDescription="Privileged actions appear here as soon as they happen."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={audit.data?.meta.hasMore}
              pending={audit.isFetching}
              onNext={() => pagination.next(audit.data?.meta.nextCursor)}
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
        title={selected?.action ?? ''}
        subtitle={selected ? `${selected.entityType}${selected.entityId ? ` · ${selected.entityId}` : ''}` : undefined}
        chip={selected ? <StatusChip status={selected.actorId ? 'ACTOR' : 'SYSTEM'} label={selected.actorId ? 'Actor' : 'System'} tone={selected.actorId ? 'accent' : 'default'} /> : null}
        fields={
          selected
            ? [
                { label: 'Entry id', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Actor', value: <span className="font-mono text-xs">{selected.actorId ?? 'system'}</span> },
                { label: 'Entity', value: <span className="font-mono text-xs">{selected.entityId ?? '—'}</span> },
                { label: 'Request id', value: <span className="font-mono text-xs">{selected.requestId ?? '—'}</span> },
                { label: 'Recorded', value: formatDateTime(selected.createdAt) },
                { label: 'Reason', value: selected.reason || '—' },
              ]
            : []
        }
        footer={
          selected ? (
            <>
              <CopyButton value={selected.id} label="Copy entry id" />
              <Button variant="tertiary" size="sm" onPress={() => setShowRaw((current) => !current)}>
                <Icon name="file" size={15} />
                {showRaw ? 'Hide payload' : 'Show payload'}
              </Button>
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Summary" icon="cog">
          {definitionList(
            Object.entries((selected?.summary ?? {}) as Record<string, unknown>).map(([key, value]) => ({
              label: labelize(key),
              value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
            })),
          )}
          {Object.keys((selected?.summary ?? {}) as Record<string, unknown>).length === 0 ? (
            <p className="text-sm text-muted">This entry carries no additional structured summary.</p>
          ) : null}
        </Panel>
        {showRaw && selected ? <JsonBlock value={selected} title="Raw audit entry" /> : null}
      </DetailDrawer>
    </Page>
  );
}
