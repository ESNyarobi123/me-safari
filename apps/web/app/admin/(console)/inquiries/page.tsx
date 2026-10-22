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
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, formatRelative, labelize, truncate } from '../../lib/format';
import type { Customer, Inquiry, InternalNote, ServiceLine } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CLOSED', label: 'Closed' },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'Mobile app' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'EMAIL', label: 'Email' },
];

export default function InquiriesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<Inquiry>('/ops/inquiries', {
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
      [row.customer?.name, row.customer?.email, row.service?.title, JSON.stringify(row.contact ?? {}), JSON.stringify(row.requirements ?? {})]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [list.data, term]);

  const newCount = rows.filter((row) => row.status === 'NEW').length;
  const owned = rows.filter((row) => row.ownerStaffId).length;

  const columns: Array<Column<Inquiry>> = useMemo(
    () => [
      {
        key: 'contact',
        header: 'Contact',
        isRowHeader: true,
        render: (row) => {
          const contact = (row.contact ?? {}) as Record<string, unknown>;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {labelize(contact.name ?? row.customer?.name ?? 'Unknown contact')}
              </p>
              <p className="truncate text-xs text-muted">
                {String(contact.email ?? row.customer?.email ?? contact.phone ?? '')}
              </p>
            </div>
          );
        },
      },
      {
        key: 'source',
        header: 'Source',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{labelize(row.source)}</p>
            <p className="truncate text-xs text-muted">{row.service?.title ?? 'No service'}</p>
          </div>
        ),
      },
      {
        key: 'brief',
        header: 'Brief',
        render: (row) => {
          const contact = (row.contact ?? {}) as Record<string, unknown>;
          const requirements = (row.requirements ?? {}) as Record<string, unknown>;
          return <p className="max-w-[280px] text-sm text-muted">{truncate(String(requirements.message ?? contact.message ?? '—'), 90)}</p>;
        },
      },
      {
        key: 'arrived',
        header: 'Arrived',
        align: 'end',
        render: (row) => (
          <div className="text-end text-sm">
            {formatDateTime(row.createdAt, true)}
            <p className="text-xs text-muted">{formatRelative(row.createdAt)}</p>
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
            {row.ownerStaffId ? null : <span className="text-[11px] text-muted">Unowned</span>}
          </div>
        ),
      },
    ],
    [],
  );

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Operations"
      title="Inquiries"
      subtitle="Website, app, phone and walk-in leads. Triage, own and convert them into priced custom requests."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <NewInquiryDialog services={services.data?.rows ?? []} onCreated={refresh} />
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Inquiries on screen" icon="inbox" tone="accent" loading={list.isLoading} value={rows.length} hint="Loaded page" />
        <StatCard
          label="New, untouched"
          icon="alert"
          tone={newCount > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={newCount}
          hint="Waiting for first triage"
        />
        <StatCard label="Owned" icon="users" tone="success" loading={list.isLoading} value={owned} hint="Assigned to an operator" />
        <StatCard
          label="Conversion ready"
          icon="arrow-right"
          tone="default"
          loading={list.isLoading}
          value={rows.filter((row) => row.status === 'IN_REVIEW').length}
          hint="In review — convert to a request"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email, phone or brief…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Inquiries could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Lead inbox" description="Open a lead to triage, note and convert." icon="inbox" bodyClassName="px-0 py-0">
        <DataTable
          label="Inquiries"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No inquiries match"
          emptyDescription="New website and app leads land here within seconds of submission."
          footer={
            <TableFooter
              summary={`${rows.length} lead${rows.length === 1 ? '' : 's'}`}
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

      <InquiryDetail id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail -- */

function InquiryDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<'overview' | 'notes' | 'convert'>('overview');
  const inquiry = useApi<Inquiry & { internalNotes?: InternalNote[] }>(id ? `/ops/inquiries/${id}` : null);
  const staff = useList<{ id: string; displayName: string }>('/admin/staff', { limit: 100 });
  const customers = useList<Customer>('/ops/customers', { limit: 100 });
  const services = useList<ServiceLine>('/admin/services', { limit: 100 });
  const command = useCommand({
    invalidate: [['api', `/ops/inquiries/${id}`], ['list', '/ops/inquiries']],
    successMessage: false,
  });

  const [note, setNote] = useState('');
  const [convert, setConvert] = useState({
    customerId: '',
    serviceId: '',
    adults: '2',
    children: '0',
    currency: 'USD',
    startDate: '',
    endDate: '',
  });

  const row = inquiry.data;

  async function patch(body: Record<string, unknown>, message: string) {
    await command.run(`/ops/inquiries/${id}`, 'PATCH', { body, successMessage: message });
    void inquiry.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row ? labelize((row.contact as Record<string, unknown>)?.name ?? 'Inquiry') : 'Inquiry'}
      subtitle={row ? `${labelize(row.source)} · ${row.service?.title ?? 'No service'}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <div className="flex flex-wrap gap-2">
            {(['IN_REVIEW', 'CLOSED'] as const).map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === 'CLOSED' ? 'danger' : 'tertiary'}
                isDisabled={row.status === next}
                onPress={() => void patch({ status: next, expectedVersion: row.version }, `Marked ${labelize(next)}.`)}
              >
                {labelize(next)}
              </Button>
            ))}
          </div>
        ) : null
      }
    >
      {inquiry.isError ? (
        <ErrorPanel message="This inquiry could not be loaded." details={errorMessage(inquiry.error)} />
      ) : null}
      {inquiry.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'notes', label: 'Internal notes', count: row?.internalNotes?.length ?? 0 },
          { value: 'convert', label: 'Convert' },
        ]}
      />

      {tab === 'overview' && row
        ? definitionList([
            { label: 'Status', value: <StatusChip status={row.status} /> },
            { label: 'Source', value: labelize(row.source) },
            { label: 'Service interest', value: row.service?.title ?? '—' },
            { label: 'Customer record', value: row.customer?.name ?? 'Not linked' },
            { label: 'Arrived', value: formatDateTime(row.createdAt, true) },
            { label: 'Last touched', value: row.updatedAt ? formatRelative(row.updatedAt) : '—' },
          ])
        : null}

      {tab === 'overview' && row ? (
        <>
          <Separator className="my-4" />
          <p className="font-ui mb-2 text-[13px] font-semibold">Captured contact</p>
          {definitionList(
            Object.entries((row.contact ?? {}) as Record<string, unknown>).map(([key, value]) => ({
              label: labelize(key),
              value: String(value ?? '—'),
            })),
          )}
        </>
      ) : null}

      {tab === 'overview' && row ? (() => {
        const requirements = (row.requirements ?? {}) as Record<string, unknown>;
        const utm = (requirements.utm ?? {}) as Record<string, unknown>;
        const brief = [
          ...(requirements.message ? [{ label: 'Message', value: String(requirements.message) }] : []),
          ...(requirements.travelDate ? [{ label: 'Travel date', value: String(requirements.travelDate) }] : []),
          ...(requirements.adults !== undefined ? [{ label: 'Adults', value: String(requirements.adults) }] : []),
          ...(requirements.children !== undefined ? [{ label: 'Children', value: String(requirements.children) }] : []),
          ...(requirements.packageTitle || requirements.packageSlug ? [{ label: 'Package', value: String(requirements.packageTitle ?? requirements.packageSlug) }] : []),
          ...(requirements.page ? [{ label: 'Submitted from', value: String(requirements.page) }] : []),
          ...(Object.keys(utm).length ? [{ label: 'Campaign', value: Object.entries(utm).map(([key, value]) => `${key}=${String(value)}`).join(' · ') }] : []),
        ];
        return brief.length ? (
          <>
            <Separator className="my-4" />
            <p className="font-ui mb-2 text-[13px] font-semibold">Traveller brief</p>
            {definitionList(brief)}
          </>
        ) : null;
      })() : null}

      {tab === 'overview' && row ? (
        <>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <SelectInput
                label="Owner"
                value={row.ownerStaffId ?? ''}
                onChange={(value) => void patch({ expectedVersion: row.version, ownerStaffId: value }, 'Owner updated.')}
                placeholder="Choose an operator"
                options={(staff.data?.rows ?? []).map((member) => ({ value: member.id, label: member.displayName }))}
              />
            </div>
          </div>
        </>
      ) : null}

      {tab === 'notes' ? (
        <div className="space-y-4">
          <TextAreaInput label="Add an internal note" value={note} onChange={setNote} rows={3} />
          <Button
            size="sm"
            variant="primary"
            isDisabled={note.trim().length < 2}
            isPending={command.pending}
            onPress={async () => {
              await command.run(`/ops/records/inquiry/${id}/notes`, 'POST', {
                body: { body: note.trim() },
                successMessage: 'Note recorded.',
              });
              setNote('');
              void inquiry.refetch();
            }}
          >
            <Icon name="plus" size={14} />
            Save note
          </Button>
          <Separator />
          {(row?.internalNotes ?? []).length === 0 ? (
            <EmptyState compact icon="history" title="No internal notes yet" />
          ) : (
            <ul className="space-y-3">
              {(row?.internalNotes ?? []).map((entry) => (
                <li key={entry.id} className="rounded-xl border border-separator p-3">
                  <p className="text-sm text-foreground">{entry.body}</p>
                  <p className="mt-1 text-[11px] text-muted">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'convert' && row ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Conversion opens a priced custom request, links the inquiry and moves it to Converted. The brief is carried across.
            Leave the customer empty and the desk creates a customer record from this lead automatically.
          </p>
          <FieldGrid columns={2}>
            <SelectInput
              label="Customer"
              value={convert.customerId || row.customerId || ''}
              onChange={(value) => setConvert((current) => ({ ...current, customerId: value }))}
              placeholder={row.customer?.name ?? 'Create from this lead automatically'}
              options={(customers.data?.rows ?? []).map((customer) => ({
                value: customer.id,
                label: customer.name,
              }))}
            />
            <SelectInput
              label="Service line"
              value={convert.serviceId || row.serviceId || ''}
              onChange={(value) => setConvert((current) => ({ ...current, serviceId: value }))}
              placeholder={row.service?.title ?? 'Choose a service'}
              options={(services.data?.rows ?? []).map((service) => ({ value: service.id, label: service.title }))}
            />
            <TextInput
              label="Adults"
              value={convert.adults}
              inputMode="numeric"
              onChange={(value) => setConvert((current) => ({ ...current, adults: value.replace(/[^\d]/g, '') }))}
            />
            <TextInput
              label="Children"
              value={convert.children}
              inputMode="numeric"
              onChange={(value) => setConvert((current) => ({ ...current, children: value.replace(/[^\d]/g, '') }))}
            />
            <TextInput
              label="Start date"
              type="date"
              value={convert.startDate}
              onChange={(value) => setConvert((current) => ({ ...current, startDate: value }))}
            />
            <TextInput
              label="End date"
              type="date"
              value={convert.endDate}
              onChange={(value) => setConvert((current) => ({ ...current, endDate: value }))}
            />
            <SelectInput
              label="Currency"
              value={convert.currency}
              onChange={(value) => setConvert((current) => ({ ...current, currency: value }))}
              options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
            />
          </FieldGrid>

          <ConfirmDialog
            trigger={
              <Button
                variant="primary"
                isDisabled={
                  !(convert.serviceId || row.serviceId)
                }
              >
                <Icon name="arrow-right" size={15} />
                Convert to custom request
              </Button>
            }
            title="Convert inquiry"
            description="The inquiry is marked Converted and a custom request is created for quoting."
            confirmLabel="Convert"
            destructive={false}
            onConfirm={async () => {
              await command.run(`/ops/inquiries/${id}/convert`, 'POST', {
                body: {
                  expectedVersion: row.version,
                  ...(convert.customerId || row.customerId ? { customerId: convert.customerId || row.customerId } : {}),
                  serviceId: convert.serviceId || row.serviceId,
                  adults: Number(convert.adults) || 1,
                  children: Number(convert.children) || 0,
                  currency: convert.currency,
                  ...(convert.startDate ? { startDate: convert.startDate } : {}),
                  ...(convert.endDate ? { endDate: convert.endDate } : {}),
                },
                successMessage: 'Inquiry converted.',
              });
              void inquiry.refetch();
              onChanged();
            }}
          />
        </div>
      ) : null}
    </DetailDrawer>
  );
}

/* --------------------------------------------------------------------- new -- */

function NewInquiryDialog({ services, onCreated }: { services: ServiceLine[]; onCreated: () => void }) {
  const [source, setSource] = useState('WEBSITE');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [brief, setBrief] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const command = useCommand({ invalidate: [['list', '/ops/inquiries']], successMessage: false });

  return (
    <FormDialog
      trigger={
        <Button variant="primary" size="sm">
          <Icon name="plus" size={15} />
          Log inquiry
        </Button>
      }
      title="Log an inquiry"
      description="Record a phone call, walk-in or partner referral so nothing is lost outside the inbox."
      submitLabel="Log inquiry"
      size="lg"
      disabled={name.trim().length < 2 || brief.trim().length < 2}
      onSubmit={async () => {
        await command.run('/ops/inquiries', 'POST', {
          body: {
            source,
            ...(serviceId ? { serviceId } : {}),
            contact: {
              name: name.trim(),
              ...(email ? { email: email.trim() } : {}),
              ...(phone ? { phone: phone.trim() } : {}),
              message: brief.trim(),
            },
            requirements: requirements.length ? { notes: requirements.join(' · ') } : {},
          },
          successMessage: 'Inquiry logged.',
        });
        onCreated();
      }}
    >
      <FieldGrid columns={2}>
        <SelectInput label="Source" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        <SelectInput
          label="Service interest"
          value={serviceId}
          onChange={setServiceId}
          placeholder="Optional"
          options={services.map((service) => ({ value: service.id, label: service.title }))}
        />
        <TextInput label="Contact name" value={name} onChange={setName} isRequired />
        <TextInput label="Email" value={email} onChange={setEmail} type="email" />
        <TextInput label="Phone" value={phone} onChange={setPhone} inputMode="tel" />
      </FieldGrid>
      <div className="mt-3">
        <TextAreaInput label="What did they ask for?" value={brief} onChange={setBrief} rows={3} />
      </div>
      <div className="mt-3">
        <StringListInput
          label="Requirements captured"
          value={requirements}
          onChange={setRequirements}
          rows={3}
          description="One requirement per line — dietary, accessibility, pace, occasions."
        />
      </div>
    </FormDialog>
  );
}
