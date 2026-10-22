'use client';

import { Button, Skeleton, Switch } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  ConfirmDialog,
  DataTable,
  DetailDrawer,
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
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { labelize } from '../../lib/format';
import type { ServiceLine } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const MODE_OPTIONS = [
  { value: 'CUSTOM', label: 'Custom request (quote flow)' },
  { value: 'PACKAGE', label: 'Package (instant booking)' },
];

interface ServiceForm {
  id: string | null;
  version: number;
  slug: string;
  title: string;
  description: string;
  requestMode: string;
  sortOrder: string;
}

const EMPTY: ServiceForm = {
  id: null,
  version: 0,
  slug: '',
  title: '',
  description: '',
  requestMode: 'CUSTOM',
  sortOrder: '0',
};

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<ServiceLine>('/admin/services', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
  });
  const command = useCommand({ invalidate: [['list', '/admin/services']], successMessage: false });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    if (!term) return all;
    return all.filter(
      (row) =>
        row.title.toLowerCase().includes(term.toLowerCase()) ||
        row.slug.includes(term.toLowerCase()) ||
        labelize(row.requestMode).toLowerCase().includes(term.toLowerCase()),
    );
  }, [list.data, term]);

  const columns: Array<Column<ServiceLine>> = useMemo(
    () => [
      {
        key: 'title',
        header: 'Service line',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.title}</p>
            <p className="truncate text-xs text-muted">/{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'mode',
        header: 'Request mode',
        render: (row) => (
          <StatusChip
            status={row.requestMode === 'PACKAGE' ? 'ACTIVE' : 'PENDING'}
            label={labelize(row.requestMode)}
          />
        ),
      },
      {
        key: 'order',
        header: 'Sort',
        align: 'center',
        render: (row) => <span className="text-sm tabular-nums">{row.sortOrder}</span>,
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => <p className="max-w-[360px] truncate text-sm text-muted">{row.description}</p>,
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

  async function save(state: ServiceForm) {
    const payload = {
      slug: state.slug.trim(),
      title: state.title.trim(),
      description: state.description.trim(),
      requestMode: state.requestMode,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (state.id) {
      await command.run(`/admin/services/${state.id}`, 'PATCH', {
        body: { ...payload, expectedVersion: state.version },
        successMessage: 'Service updated.',
      });
    } else {
      await command.run('/admin/services', 'POST', { body: payload, successMessage: 'Service created.' });
    }
    void list.refetch();
  }

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Catalog & content"
      title="Services"
      subtitle="Service lines decide how customers buy — instant package booking or a tailor-made quote."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <Button variant="primary" size="sm" onPress={() => setForm({ ...EMPTY })}>
            <Icon name="plus" size={15} />
            New service line
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Service lines" icon="sparkles" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard
          label="Published"
          icon="globe"
          tone="success"
          loading={list.isLoading}
          value={rows.filter((row) => row.status === 'PUBLISHED').length}
          hint="Live on the website"
        />
        <StatCard
          label="Quote-based"
          icon="file"
          tone="default"
          loading={list.isLoading}
          value={rows.filter((row) => row.requestMode === 'CUSTOM').length}
          hint="Custom request flow"
        />
        <StatCard
          label="Instant booking"
          icon="bolt"
          tone="default"
          loading={list.isLoading}
          value={rows.filter((row) => row.requestMode === 'PACKAGE').length}
          hint="Package flow"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Title, slug or mode…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Services could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Service lines" description="Ordering controls how they appear in the app." icon="sparkles" bodyClassName="px-0 py-0">
        <DataTable
          label="Service lines"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No services yet"
          emptyDescription="Services are the entry point for both booking flows."
          footer={
            <TableFooter
              summary={`${rows.length} service${rows.length === 1 ? '' : 's'}`}
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

      {form ? (
        <FormDialog
          open
          onOpenChange={(next) => {
            if (!next) setForm(null);
          }}
          title={form.id ? 'Edit service line' : 'Create a service line'}
          description="Request mode is enforced by the API — switching it changes the customer journey."
          submitLabel={form.id ? 'Save changes' : 'Create service'}
          size="lg"
          disabled={form.title.trim().length < 2 || form.slug.trim().length < 2}
          onSubmit={async () => {
            await save(form);
            setForm(null);
          }}
        >
          <FieldGrid columns={2}>
            <TextInput label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} isRequired />
            <TextInput
              label="Slug"
              value={form.slug}
              onChange={(value) => setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              isRequired
            />
            <SelectInput
              label="Request mode"
              value={form.requestMode}
              onChange={(value) => setForm({ ...form, requestMode: value })}
              options={MODE_OPTIONS}
            />
            <TextInput
              label="Sort order"
              value={form.sortOrder}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, sortOrder: value.replace(/[^\d]/g, '') })}
            />
          </FieldGrid>
          <div className="mt-3">
            <TextAreaInput
              label="Description"
              rows={4}
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </div>
        </FormDialog>
      ) : null}

      <ServiceDetail
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onEdit={(row) =>
          setForm({
            id: row.id,
            version: row.version,
            slug: row.slug,
            title: row.title,
            description: row.description,
            requestMode: row.requestMode,
            sortOrder: String(row.sortOrder),
          })
        }
      />
    </Page>
  );
}

function ServiceDetail({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (row: ServiceLine) => void;
}) {
  const service = useApi<ServiceLine>(id ? `/admin/services/${id}` : null);
  const command = useCommand({
    invalidate: [['api', `/admin/services/${id}`], ['list', '/admin/services']],
    successMessage: false,
  });
  const row = service.data;

  async function transition(action: 'publish' | 'archive') {
    if (!row) return;
    await command.run(`/admin/services/${row.id}/${action}`, 'POST', {
      body: { expectedVersion: row.version },
      successMessage: `Service ${action}ed.`,
    });
    void service.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.title ?? 'Service line'}
      subtitle={row ? `/${row.slug} · ${labelize(row.requestMode)}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <>
            <Button size="sm" variant="tertiary" onPress={() => onEdit(row)}>
              <Icon name="edit" size={15} />
              Edit
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={row.status === 'PUBLISHED'}
              isPending={command.pending}
              onPress={() => void transition('publish')}
            >
              <Icon name="upload" size={15} />
              Publish
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger" isDisabled={row.status === 'ARCHIVED'}>
                  Archive
                </Button>
              }
              title="Archive this service line"
              description="Archived services disappear from the app and the website navigation."
              confirmLabel="Archive"
              reason={false}
              onConfirm={() => transition('archive')}
            />
          </>
        ) : null
      }
    >
      {service.isError ? (
        <ErrorPanel message="This service could not be loaded." details={errorMessage(service.error)} />
      ) : null}
      {service.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}

      {row ? (
        <div className="space-y-4">
          {definitionList([
            { label: 'Slug', value: `/${row.slug}` },
            { label: 'Request mode', value: labelize(row.requestMode) },
            { label: 'Sort order', value: row.sortOrder },
            { label: 'Version', value: row.version },
          ])}
          <p className="text-sm text-muted">{row.description}</p>
          <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Quote-first journey</p>
                <p className="text-xs text-muted">
                  {row.requestMode === 'CUSTOM'
                    ? 'Customers are routed into the custom request and quote flow.'
                    : 'Customers book instantly against a published package and rate.'}
                </p>
              </div>
              <Switch isSelected={row.requestMode === 'CUSTOM'} isDisabled aria-label="Request mode">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  );
}
