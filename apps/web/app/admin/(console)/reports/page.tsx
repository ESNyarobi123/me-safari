'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  CURRENCY_OPTIONS,
  DataTable,
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
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  TextInput,
  definitionList,
} from '../../components/ui';
import { download, saveBlob } from '../../lib/api';
import { errorMessage, useApi, useCommand } from '../../lib/hooks';
import { formatCompactNumber, formatDate, formatDateTime, labelize } from '../../lib/format';
import type { Overview, ReportExport } from '../../lib/types';

type ReportType = 'FINANCE' | 'BOOKINGS' | 'OPERATIONS';

interface ExportRow extends ReportExport {
  id: string;
  document?: { id: string; status: string } | null;
}

export default function ReportsPage() {
  const [range, setRange] = useState({ startDate: '', endDate: '', currency: '' });
  const summary = useApi<Overview>('/admin/reports/summary', {
    startDate: range.startDate || undefined,
    endDate: range.endDate || undefined,
    currency: range.currency || undefined,
  });

  const [exportOpen, setExportOpen] = useState(false);
  const [request, setRequest] = useState({
    reportType: 'FINANCE' as ReportType,
    format: 'CSV',
    startDate: '',
    endDate: '',
    currency: '',
  });
  const [tracked, setTracked] = useState<string[]>([]);
  const [lookupId, setLookupId] = useState('');

  const command = useCommand({ successMessage: false });

  const groups = summary.data?.currencyGroups ?? [];
  const focus = range.currency ? groups.filter((group) => group.currency === range.currency) : groups;

  const totals = useMemo(() => {
    const sum = (key: 'grossCaptured' | 'refundsSettled' | 'netCaptured' | 'contractedSales' | 'outstandingBalance') =>
      focus.reduce((total, group) => total + BigInt(group[key] ?? 0), 0n);
    return {
      captured: sum('grossCaptured'),
      refunds: sum('refundsSettled'),
      net: sum('netCaptured'),
      contracted: sum('contractedSales'),
      outstanding: sum('outstandingBalance'),
    };
  }, [focus]);

  const totalsCurrency = range.currency || (focus[0]?.currency ?? 'USD');

  const columns: Array<Column<Overview['currencyGroups'][number] & { id?: string }>> = [
    { key: 'currency', header: 'Currency', render: (row) => <StatusChip status={row.currency} label={row.currency} /> },
    {
      key: 'gross',
      header: 'Gross captured',
      align: 'end',
      render: (row) => <Money minor={row.grossCaptured} currency={row.currency} />,
    },
    {
      key: 'refunds',
      header: 'Refunds settled',
      align: 'end',
      render: (row) => <Money minor={row.refundsSettled} currency={row.currency} />,
    },
    {
      key: 'net',
      header: 'Net captured',
      align: 'end',
      render: (row) => <Money minor={row.netCaptured} currency={row.currency} className="font-medium" />,
    },
    {
      key: 'contracted',
      header: 'Contracted sales',
      align: 'end',
      hideBelow: 'lg',
      render: (row) => <Money minor={row.contractedSales} currency={row.currency} />,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'end',
      render: (row) => <Money minor={row.outstandingBalance} currency={row.currency} withSign />,
    },
  ];

  const pasted = useApi<ExportRow>(lookupId ? `/admin/reports/exports/${lookupId}` : null, {}, { enabled: Boolean(lookupId) });
  const trackedIds = useMemo(
    () => tracked.filter((id) => id !== lookupId || !pasted.data),
    [lookupId, pasted.data, tracked],
  );

  return (
    <Page
      eyebrow="Finance"
      title="Reports & exports"
      subtitle="Money summaries per currency book plus asynchronous CSV/PDF exports that expire 24 hours after they are generated."
      actions={
        <>
          <RefreshButton pending={summary.isFetching} onPress={() => void summary.refetch()} />
          <Button variant="primary" size="sm" onPress={() => setExportOpen(true)}>
            <Icon name="download" size={15} />
            New export
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Net captured"
          icon="card"
          tone="success"
          loading={summary.isLoading}
          value={<Money minor={totals.net.toString()} currency={totalsCurrency} compact />}
          hint="Captures less settled refunds"
        />
        <StatCard
          label="Contracted sales"
          icon="chart"
          tone="accent"
          loading={summary.isLoading}
          value={<Money minor={totals.contracted.toString()} currency={totalsCurrency} compact />}
          hint="Accepted sell total"
        />
        <StatCard
          label="Outstanding"
          icon="alert"
          tone="warning"
          loading={summary.isLoading}
          value={<Money minor={totals.outstanding.toString()} currency={totalsCurrency} compact />}
          hint="Still to collect"
        />
        <StatCard
          label="Refunds settled"
          icon="refresh"
          tone="danger"
          loading={summary.isLoading}
          value={<Money minor={totals.refunds.toString()} currency={totalsCurrency} compact />}
          hint="Funds returned"
        />
      </StatGrid>

      <FilterBar
        trailing={
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setRange({ startDate: '', endDate: '', currency: '' })}
          >
            Clear
          </Button>
        }
      >
        <FilterField label="From">
          <TextInput label="" type="date" value={range.startDate} onChange={(value) => setRange((c) => ({ ...c, startDate: value }))} />
        </FilterField>
        <FilterField label="To">
          <TextInput label="" type="date" value={range.endDate} onChange={(value) => setRange((c) => ({ ...c, endDate: value }))} />
        </FilterField>
        <FilterField label="Currency book">
          <SelectInput
            value={range.currency}
            onChange={(value) => setRange((c) => ({ ...c, currency: value }))}
            options={[{ value: '', label: 'All currencies' }, ...CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))]}
          />
        </FilterField>
      </FilterBar>

      {summary.isError ? (
        <ErrorPanel
          message="The finance summary could not be loaded."
          details={errorMessage(summary.error)}
          onRetry={() => void summary.refetch()}
        />
      ) : null}

      <Panel
        title="Currency books"
        description="Money never mixes across currencies. Each row is an independent book with its own captures and refunds."
        icon="chart"
      >
        <DataTable
          label="Currency books"
          columns={columns}
          rows={focus.map((group) => ({ ...group, id: group.currency }))}
          loading={summary.isLoading}
          emptyTitle="No money movements in this range"
          emptyDescription="Widen the date range or clear the currency filter."
        />
        <Separator className="my-3" />
        {definitionList(Object.entries(summary.data?.definitions ?? {}).map(([key, value]) => ({ label: labelize(key), value })))}
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Export tracker"
          description="Exports run in the background worker and are delivered as private, expiring documents."
          icon="download"
        >
          {trackedIds.length === 0 && !pasted.data ? (
            <EmptyState
              compact
              icon="download"
              title="No exports tracked in this session"
              description="Request an export, or paste an export id on the right to inspect an existing job."
            />
          ) : (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {pasted.data ? (
                <li className="px-3 py-2.5">
                  <ExportRowContent row={pasted.data} />
                </li>
              ) : null}
              {trackedIds.map((id) => (
                <ExportRowLoader key={id} id={id} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Inspect an export" description="Exports are private to the operator who requested them." icon="history">
          <div className="space-y-3">
            <TextInput label="Export id" value={lookupId} onChange={setLookupId} placeholder="Paste an export id" />
            <div className="flex gap-2">
              <Button variant="tertiary" size="sm" onPress={() => void pasted.refetch()} isDisabled={!lookupId}>
                <Icon name="search" size={15} />
                Check status
              </Button>
              {lookupId ? (
                <Button variant="ghost" size="sm" onPress={() => setLookupId('')}>
                  Clear
                </Button>
              ) : null}
            </div>
            {pasted.isError ? <p className="text-xs text-danger">{errorMessage(pasted.error)}</p> : null}
            {!lookupId && tracked.length > 0 ? (
              <button
                type="button"
                className="text-xs text-accent underline"
                onClick={() => setLookupId(tracked[0] ?? '')}
              >
                Inspect the most recent export
              </button>
            ) : null}
            <Separator />
            <p className="text-xs text-muted">
              Export files expire 24 hours after generation. Re-request the export instead of sharing a stale link.
            </p>
          </div>
        </Panel>
      </div>

      <FormDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Request a report export"
        description="The worker generates the file and attaches it as a private, expiring document."
        submitLabel="Queue export"
        onSubmit={async () => {
          const created = await command.run<ExportRow>('/admin/reports/exports', 'POST', {
            body: {
              reportType: request.reportType,
              filters: {
                currency: request.currency || undefined,
                startDate: request.startDate || undefined,
                endDate: request.endDate || undefined,
                format: request.format,
              },
            },
            successMessage: 'Export queued — it appears in the tracker shortly.',
          });
          if (created?.id) {
            setTracked((current) => [created.id, ...current]);
            setLookupId(created.id);
          }
        }}
      >
        <div className="space-y-3">
          <SelectInput
            label="Report"
            value={request.reportType}
            onChange={(value) => setRequest((c) => ({ ...c, reportType: value }))}
            options={[
              { value: 'FINANCE', label: 'Finance — captures, refunds and outstanding balances' },
              { value: 'BOOKINGS', label: 'Bookings — pipeline and status breakdown' },
              { value: 'OPERATIONS', label: 'Operations — trips, issues and dispatch' },
            ]}
          />
          <FieldGrid>
            <SelectInput
              label="Format"
              value={request.format}
              onChange={(value) => setRequest((c) => ({ ...c, format: value }))}
              options={[
                { value: 'CSV', label: 'CSV (spreadsheet)' },
                { value: 'PDF', label: 'PDF (print ready)' },
              ]}
            />
            <SelectInput
              label="Currency"
              value={request.currency}
              onChange={(value) => setRequest((c) => ({ ...c, currency: value }))}
              options={[{ value: '', label: 'All currencies' }, ...CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))]}
            />
          </FieldGrid>
          <FieldGrid>
            <TextInput label="From" type="date" value={request.startDate} onChange={(value) => setRequest((c) => ({ ...c, startDate: value }))} />
            <TextInput label="To" type="date" value={request.endDate} onChange={(value) => setRequest((c) => ({ ...c, endDate: value }))} />
          </FieldGrid>
          {command.pending ? <Skeleton className="h-2 rounded-full" /> : null}
          <p className="text-xs text-muted">
            Reconcile every download against the provider statement before filing — the console reports what the ledger holds.
          </p>
        </div>
      </FormDialog>
    </Page>
  );
}

function ExportRowContent({ row }: { row: ExportRow }) {
  const [downloading, setDownloading] = useState(false);

  async function grab() {
    if (!row.document?.id) return;
    setDownloading(true);
    try {
      const file = await download(`/documents/${row.document.id}/download`);
      saveBlob(file.blob, file.filename);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {labelize(row.reportType)} export
          <span className="ml-2 font-mono text-[11px] text-muted">{row.id.slice(0, 8)}</span>
        </p>
        <p className="truncate text-xs text-muted">
          requested {formatDateTime(row.createdAt)}
          {row.expiresAt ? ` · expires ${formatDate(row.expiresAt)}` : ''}
          {row.rowCount ? ` · ${formatCompactNumber(row.rowCount)} rows` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip status={row.status} />
        <Button size="sm" variant="tertiary" isDisabled={!row.document?.id || downloading} isPending={downloading} onPress={() => void grab()}>
          <Icon name="download" size={14} />
          Download
        </Button>
      </div>
    </div>
  );
}

function ExportRowLoader({ id }: { id: string }) {
  const lookup = useApi<ExportRow>(`/admin/reports/exports/${id}`);
  if (lookup.isLoading) {
    return (
      <li className="px-3 py-2.5">
        <Skeleton className="h-8 w-full rounded-lg" />
      </li>
    );
  }
  if (lookup.isError || !lookup.data) {
    return (
      <li className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="font-mono text-xs text-muted">{id.slice(0, 8)}</span>
        <span className="text-xs text-danger">{errorMessage(lookup.error)}</span>
      </li>
    );
  }
  return (
    <li className="px-3 py-2.5">
      <ExportRowContent row={lookup.data} />
    </li>
  );
}
