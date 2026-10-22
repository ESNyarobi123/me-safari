'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
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
  TabStrip,
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDate, formatDateTime, labelize, moneyValue, toMinor } from '../../lib/format';
import type { CustomRequest, Quote, ServiceLine, StaffMember } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function CustomRequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<CustomRequest>('/custom-requests', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
  });
  const services = useList<ServiceLine>('/admin/services', { limit: 100 });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    if (!term) return all;
    const needle = term.toLowerCase();
    return all.filter((row) =>
      [row.reference, row.customer?.name, row.customer?.email, row.service?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [list.data, term]);

  const quoted = rows.filter((row) => (row.quotes ?? []).length > 0).length;
  const pipeline = rows.reduce(
    (sum, row) => sum + moneyValue(row.quotes?.[0]?.totalMinor, row.quotes?.[0]?.currency ?? row.currency ?? 'USD'),
    0,
  );

  const columns: Array<Column<CustomRequest>> = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Request',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.reference ?? row.id.slice(0, 8)}</p>
            <p className="truncate text-xs text-muted">{row.service?.title ?? 'Unclassified service'}</p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.customer?.name ?? '—'}</p>
            <p className="truncate text-xs text-muted">{row.customer?.email ?? ''}</p>
          </div>
        ),
      },
      {
        key: 'window',
        header: 'Window',
        render: (row) => (
          <div className="whitespace-nowrap text-sm">
            {row.startDate ? formatDate(row.startDate) : 'Flexible'}
            {row.endDate ? <span className="text-muted"> → {formatDate(row.endDate)}</span> : null}
            <p className="text-xs text-muted">
              {row.adults ?? 0} adults{row.children ? ` · ${row.children} children` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'budget',
        header: 'Budget / quote',
        align: 'end',
        render: (row) => {
          const quote = row.quotes?.[0];
          return (
            <div className="text-end">
              <Money
                minor={quote?.totalMinor ?? row.budgetMinor}
                currency={quote?.currency ?? row.currency ?? 'USD'}
                className="text-sm font-medium"
              />
              <p className="text-xs text-muted">{quote ? `v${quote.version} · ${labelize(quote.status)}` : 'No quote yet'}</p>
            </div>
          );
        },
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

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Operations"
      title="Custom requests"
      subtitle="Tailor-made enquiries, quote builder, revisions and assignment — from first contact to signed itinerary."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <NewRequestDialog services={services.data?.rows ?? []} onCreated={refresh} />
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Requests on screen"
          icon="file"
          tone="accent"
          loading={list.isLoading}
          value={rows.length}
          hint={list.data?.meta.hasMore ? 'more available' : 'end of queue'}
        />
        <StatCard
          label="With a quote"
          icon="chart"
          tone="success"
          loading={list.isLoading}
          value={quoted}
          hint="Quotes drafted or sent"
        />
        <StatCard
          label="Quote value"
          icon="card"
          tone="default"
          loading={list.isLoading}
          value={<Money minor={toMinor(pipeline, 'USD')} currency="USD" compact />}
          hint="Latest quote per request, USD-normalised"
        />
        <StatCard
          label="Unassigned"
          icon="users"
          tone={(rows.filter((row) => !row.ownerStaffId).length ?? 0) > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={rows.filter((row) => !row.ownerStaffId).length}
          hint="No owner on the request"
        />
      </StatGrid>

      <FilterBar
        leading={
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-default/70 text-muted">
            <Icon name="filter" size={16} />
          </span>
        }
      >
        <FilterField label="Search">
          <SearchInput value={search} onChange={setSearch} placeholder="Reference, customer or service…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel
          message="Custom requests could not be loaded."
          details={errorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      <Panel title="Request queue" description="Open a row to build or revise its quote." icon="file" bodyClassName="px-0 py-0">
        <DataTable
          label="Custom requests"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No custom requests match"
          emptyDescription="New tailor-made enquiries from the app and website land here."
          footer={
            <TableFooter
              summary={`${rows.length} request${rows.length === 1 ? '' : 's'}`}
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

      <RequestDetail id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail -- */

function RequestDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'quotes'>('overview');
  const request = useApi<CustomRequest>(id ? `/custom-requests/${id}` : null);
  const staff = useList<StaffMember>('/admin/staff', { limit: 100 });
  const command = useCommand({
    invalidate: [['api', `/custom-requests/${id}`], ['list', '/custom-requests']],
    successMessage: false,
  });

  const row = request.data;
  const quotes = row?.quotes ?? [];

  async function act(path: string, body: Record<string, unknown>, message: string) {
    await command.run(`/custom-requests/${id}${path}`, 'POST', { body, successMessage: message });
    void request.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.reference ?? 'Custom request'}
      subtitle={row ? `${row.customer?.name ?? 'Unknown'} · ${row.service?.title ?? 'Service'}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <ConfirmDialog
            trigger={
              <Button variant="tertiary" size="sm">
                <Icon name="refresh" size={15} />
                Request revision
              </Button>
            }
            title="Ask the traveller for a revision"
            description="The request moves back to review and the customer is notified."
            confirmLabel="Request revision"
            destructive={false}
            onConfirm={(reason) => act('/revision-requests', { expectedVersion: row.version, reason }, 'Revision requested.')}
          />
        ) : null
      }
    >
      {request.isError ? (
        <ErrorPanel message="This request could not be loaded." details={errorMessage(request.error)} />
      ) : null}

      {request.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'quotes', label: 'Quotes', count: quotes.length },
        ]}
      />

      {tab === 'overview' && row
        ? definitionList([
            { label: 'Reference', value: row.reference ?? row.id.slice(0, 8) },
            { label: 'Version', value: row.version },
            { label: 'Service', value: row.service?.title ?? '—' },
            { label: 'Customer', value: row.customer?.name ?? '—' },
            { label: 'Contact', value: row.customer?.email ?? '—' },
            { label: 'Window', value: `${formatDate(row.startDate, true)} → ${formatDate(row.endDate, true)}` },
            { label: 'Party', value: `${row.adults ?? 0} adults · ${row.children ?? 0} children` },
            {
              label: 'Budget',
              value: <Money minor={row.budgetMinor} currency={row.currency ?? 'USD'} />,
            },
            { label: 'Created', value: row.createdAt ? formatDateTime(row.createdAt) : '—' },
            { label: 'Owned by', value: row.ownerStaffId ? row.ownerStaffId.slice(0, 8) : 'Unassigned' },
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

      {tab === 'overview' && row ? (
        <>
          <Separator className="my-4" />
          <AssignOwner
            staff={staff.data?.rows ?? []}
            current={row.ownerStaffId ?? ''}
            onAssign={(staffId) => act('/assign', { expectedVersion: row.version, staffId }, 'Owner assigned.')}
          />
        </>
      ) : null}

      {tab === 'quotes' && row ? (
        <QuotePanel
          request={row}
          onSend={(quoteId, version) =>
            command
              .run(`/quotes/${quoteId}/send`, 'POST', {
                body: { expectedVersion: version, reason: `Send quote for ${row.reference ?? row.id}` },
                successMessage: 'Quote sent to the traveller.',
              })
              .then(() => {
                void request.refetch();
                onChanged();
              })
          }
          onReject={(quoteId, version, reason) =>
            command
              .run(`/quotes/${quoteId}/reject`, 'POST', {
                body: { expectedVersion: version, reason },
                successMessage: 'Quote rejected.',
              })
              .then(() => {
                void request.refetch();
                onChanged();
              })
          }
          onCreate={async (body) => {
            await command.run(`/custom-requests/${row.id}/quotes`, 'POST', { body, successMessage: 'Quote created.' });
            void request.refetch();
            onChanged();
          }}
        />
      ) : null}
    </DetailDrawer>
  );
}

/* ------------------------------------------------------------------ quotes -- */

function AssignOwner({
  staff,
  current,
  onAssign,
}: {
  staff: StaffMember[];
  current: string;
  onAssign: (staffId: string) => Promise<void>;
}) {
  const [value, setValue] = useState(current);
  const command = useCommand({ successMessage: false });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <SelectInput
          label="Request owner"
          value={value}
          onChange={setValue}
          placeholder="Choose a staff member"
          options={staff.map((member) => ({ value: member.id, label: member.displayName }))}
        />
      </div>
      <Button
        size="sm"
        variant="primary"
        isDisabled={!value || value === current}
        isPending={command.pending}
        onPress={() => void onAssign(value)}
      >
        <Icon name="users" size={14} />
        Assign
      </Button>
    </div>
  );
}

interface QuoteLineDraft {
  description: string;
  quantity: string;
  unitAmountMinor: string;
}

interface DayDraft {
  day: string;
  title: string;
  description: string;
}

function QuotePanel({
  request,
  onCreate,
  onSend,
  onReject,
}: {
  request: CustomRequest;
  onCreate: (body: Record<string, unknown>) => Promise<void>;
  onSend: (quoteId: string, version: number) => Promise<unknown>;
  onReject: (quoteId: string, version: number, reason: string) => Promise<unknown>;
}) {
  const currency = request.currency ?? 'USD';
  const [lines, setLines] = useState<QuoteLineDraft[]>([{ description: 'Safari package', quantity: '1', unitAmountMinor: '' }]);
  const [days, setDays] = useState<DayDraft[]>([{ day: '1', title: 'Arrival & briefing', description: '' }]);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  const totalMinor = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0;
    const unit = Number(line.unitAmountMinor) || 0;
    return sum + quantity * Math.round(unit * 100);
  }, 0);

  const quotes = request.quotes ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="font-ui mb-2 text-[13px] font-semibold">Quote versions</p>
        {quotes.length === 0 ? (
          <EmptyState compact icon="file" title="No quotes yet" description="Build the first version below." />
        ) : (
          <ul className="space-y-2">
            {quotes.map((quote: Quote) => (
              <li key={quote.id} className="rounded-xl border border-separator p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Version {quote.version}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(quote.createdAt)}
                      {quote.expiresAt ? ` · expires ${formatDate(quote.expiresAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money minor={quote.totalMinor} currency={quote.currency} className="text-sm font-medium" />
                    <StatusChip status={quote.status} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="tertiary">
                        <Icon name="mail" size={14} />
                        Send
                      </Button>
                    }
                    title={`Send quote version ${quote.version}`}
                    description="The traveller receives the itinerary and can accept or decline."
                    confirmLabel="Send quote"
                    destructive={false}
                    onConfirm={() => onSend(quote.id, quote.version).then(() => undefined)}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="danger">
                        Reject
                      </Button>
                    }
                    title="Reject this quote"
                    confirmLabel="Reject quote"
                    onConfirm={(reason) => onReject(quote.id, quote.version, reason).then(() => undefined)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div>
        <p className="font-ui mb-2 text-[13px] font-semibold">Build a new version</p>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="rounded-xl border border-separator p-3">
              <FieldGrid columns={3}>
                <TextInput
                  label="Description"
                  value={line.description}
                  onChange={(value) =>
                    setLines((current) => current.map((row, position) => (position === index ? { ...row, description: value } : row)))
                  }
                />
                <TextInput
                  label="Quantity"
                  value={line.quantity}
                  inputMode="numeric"
                  onChange={(value) =>
                    setLines((current) =>
                      current.map((row, position) =>
                        position === index ? { ...row, quantity: value.replace(/[^\d]/g, '') } : row,
                      ),
                    )
                  }
                />
                <TextInput
                  label={`Unit price (${currency})`}
                  value={line.unitAmountMinor}
                  inputMode="decimal"
                  onChange={(value) =>
                    setLines((current) =>
                      current.map((row, position) => (position === index ? { ...row, unitAmountMinor: value } : row)),
                    )
                  }
                />
              </FieldGrid>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted">
                  Line total <Money minor={toMinor((Number(line.quantity) || 0) * (Number(line.unitAmountMinor) || 0), currency)} currency={currency} />
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Remove line"
                  onPress={() => setLines((current) => current.filter((_, position) => position !== index))}
                >
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="tertiary"
          className="mt-2"
          onPress={() => setLines((current) => [...current, { description: '', quantity: '1', unitAmountMinor: '' }])}
        >
          <Icon name="plus" size={14} />
          Add line
        </Button>
      </div>

      <div>
        <p className="font-ui mb-2 text-[13px] font-semibold">Itinerary days</p>
        {days.map((day, index) => (
          <div key={index} className="mb-2 rounded-xl border border-separator p-3">
            <FieldGrid columns={2}>
              <TextInput
                label="Day number"
                value={day.day}
                inputMode="numeric"
                onChange={(value) =>
                  setDays((current) =>
                    current.map((row, position) =>
                      position === index ? { ...row, day: value.replace(/[^\d]/g, '') } : row,
                    ),
                  )
                }
              />
              <TextInput
                label="Title"
                value={day.title}
                onChange={(value) =>
                  setDays((current) => current.map((row, position) => (position === index ? { ...row, title: value } : row)))
                }
              />
            </FieldGrid>
            <div className="mt-2">
              <TextAreaInput
                label="Description"
                value={day.description}
                rows={2}
                onChange={(value) =>
                  setDays((current) =>
                    current.map((row, position) => (position === index ? { ...row, description: value } : row)),
                  )
                }
              />
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="tertiary"
          onPress={() =>
            setDays((current) => [...current, { day: String(current.length + 1), title: '', description: '' }])
          }
        >
          <Icon name="plus" size={14} />
          Add day
        </Button>
      </div>

      <FieldGrid columns={2}>
        <TextInput label="Expires at (ISO)" value={expiresAt} onChange={setExpiresAt} placeholder="2026-12-01T09:00:00+03:00" />
        <div className="flex items-end">
          <div className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2">
            <p className="text-[11px] tracking-wide text-muted uppercase">Quote total</p>
            <p className="font-ui text-lg font-semibold tabular-nums">
              <Money minor={toMinor(totalMinor / 100, currency)} currency={currency} />
            </p>
          </div>
        </div>
      </FieldGrid>

      <Button
        variant="primary"
        isPending={busy}
        isDisabled={lines.some((line) => line.description.trim().length < 2 || !line.unitAmountMinor)}
        onPress={async () => {
          setBusy(true);
          try {
            await onCreate({
              currency,
              lines: lines.map((line) => ({
                description: line.description.trim(),
                quantity: Number(line.quantity) || 1,
                unitAmountMinor: toMinor(line.unitAmountMinor, currency),
              })),
              itinerary: {
                days: days.map((day) => ({
                  day: Math.max(1, Number(day.day) || 1),
                  title: day.title.trim() || `Day ${day.day}`,
                  ...(day.description.trim() ? { description: day.description.trim() } : {}),
                })),
              },
              ...(request.startDate ? { startDate: request.startDate.slice(0, 10) } : {}),
              ...(request.endDate ? { endDate: request.endDate.slice(0, 10) } : {}),
              ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
            });
            setLines([{ description: 'Safari package', quantity: '1', unitAmountMinor: '' }]);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Icon name="plus" size={15} />
        Create quote version
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- new request -- */

function NewRequestDialog({ services, onCreated }: { services: ServiceLine[]; onCreated: () => void }) {
  const [serviceId, setServiceId] = useState('');
  const [destinations, setDestinations] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const command = useCommand({ invalidate: [['list', '/custom-requests']], successMessage: false });

  return (
    <FormDialog
      trigger={
        <Button variant="primary" size="sm">
          <Icon name="plus" size={15} />
          New request
        </Button>
      }
      title="Log a tailor-made request"
      description="Capture the traveller brief now — you can price it into a quote afterwards."
      submitLabel="Create request"
      size="lg"
      disabled={!serviceId}
      onSubmit={async () => {
        await command.run('/custom-requests', 'POST', {
          body: {
            serviceId,
            destinations: destinations
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            adults: Number(adults) || 1,
            children: Number(children) || 0,
            ...(budget ? { budgetMinor: toMinor(budget, currency) } : {}),
            currency,
            requirements: notes ? { notes } : {},
          },
          successMessage: 'Request logged.',
        });
        onCreated();
      }}
    >
      <FieldGrid columns={2}>
        <SelectInput
          label="Service line"
          value={serviceId}
          onChange={setServiceId}
          placeholder="Choose a service"
          options={services.map((service) => ({ value: service.id, label: service.title }))}
        />
        <TextInput
          label="Destinations"
          value={destinations}
          onChange={setDestinations}
          placeholder="Serengeti, Ngorongoro"
          description="Comma separated."
        />
        <TextInput label="Start date" type="date" value={startDate} onChange={setStartDate} />
        <TextInput label="End date" type="date" value={endDate} onChange={setEndDate} />
        <TextInput label="Adults" value={adults} inputMode="numeric" onChange={(value) => setAdults(value.replace(/[^\d]/g, ''))} />
        <TextInput label="Children" value={children} inputMode="numeric" onChange={(value) => setChildren(value.replace(/[^\d]/g, ''))} />
        <TextInput label={`Budget (${currency})`} value={budget} inputMode="decimal" onChange={setBudget} />
        <SelectInput
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
        />
      </FieldGrid>
      <div className="mt-3">
        <TextAreaInput label="Brief" value={notes} onChange={setNotes} rows={3} placeholder="Travel style, dietary needs, pace…" />
      </div>
    </FormDialog>
  );
}
