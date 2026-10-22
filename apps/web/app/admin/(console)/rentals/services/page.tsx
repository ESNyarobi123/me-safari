'use client';

import { Button, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../../components/icons';
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
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../../lib/hooks';
import { labelize } from '../../../lib/format';
import type { RentalServiceLine } from '../../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface ServiceForm {
  id: string | null;
  version: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  useCases: string[];
  sortOrder: string;
}

const EMPTY: ServiceForm = {
  id: null,
  version: 0,
  slug: '',
  title: '',
  tagline: '',
  description: '',
  icon: 'car',
  useCases: [],
  sortOrder: '0',
};

export default function RentalServicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<RentalServiceLine>('/admin/rentals/services', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
  });
  const command = useCommand({ invalidate: [['list', '/admin/rentals/services']], successMessage: false });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    if (!term) return all;
    return all.filter(
      (row) =>
        row.title.toLowerCase().includes(term.toLowerCase()) ||
        row.tagline.toLowerCase().includes(term.toLowerCase()) ||
        row.slug.includes(term.toLowerCase()),
    );
  }, [list.data, term]);

  const columns: Array<Column<RentalServiceLine>> = useMemo(
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
        key: 'tagline',
        header: 'Tagline',
        render: (row) => <p className="max-w-[320px] truncate text-sm text-muted">{row.tagline}</p>,
      },
      {
        key: 'useCases',
        header: 'Use cases',
        align: 'center',
        render: (row) => <span className="text-sm tabular-nums">{(row.useCases ?? []).length}</span>,
      },
      {
        key: 'order',
        header: 'Sort',
        align: 'center',
        render: (row) => <span className="text-sm tabular-nums">{row.sortOrder ?? 0}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        align: 'end',
        render: (row) => <StatusChip status={row.status ?? 'PUBLISHED'} />,
      },
    ],
    [],
  );

  async function save(state: ServiceForm) {
    const payload: Record<string, unknown> = {
      slug: state.slug.trim(),
      title: state.title.trim(),
      tagline: state.tagline.trim(),
      description: state.description.trim(),
      ...(state.icon ? { icon: state.icon } : {}),
      ...(state.useCases.length ? { useCases: state.useCases } : {}),
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (state.id) {
      await command.run(`/admin/rentals/services/${state.id}`, 'PATCH', {
        body: { ...payload, expectedVersion: state.version },
        successMessage: 'Service line updated.',
      });
    } else {
      await command.run('/admin/rentals/services', 'POST', { body: payload, successMessage: 'Service line created.' });
    }
    void list.refetch();
  }

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Safari AI Rentals"
      title="Rental services"
      subtitle="Signature service lines shown on the rentals hub — airport transfers, safaris, corporate travel and more."
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
      <StatGrid columns={3}>
        <StatCard label="Service lines" icon="bolt" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard
          label="With use cases"
          icon="check"
          tone="success"
          loading={list.isLoading}
          value={rows.filter((row) => (row.useCases ?? []).length > 0).length}
          hint="Enriched marketing copy"
        />
        <StatCard
          label="Highest sort order"
          icon="sort"
          tone="default"
          loading={list.isLoading}
          value={rows.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), 0)}
          hint="Controls display position"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Title, tagline or slug…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel
          message="Rental services could not be loaded."
          details={errorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      <Panel title="Signature services" description="Open a row to review or edit the copy." icon="bolt" bodyClassName="px-0 py-0">
        <DataTable
          label="Rental services"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No rental services yet"
          emptyDescription="Service lines group vehicles by the journey the traveller wants."
          footer={
            <TableFooter
              summary={`${rows.length} service line${rows.length === 1 ? '' : 's'}`}
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
          title={form.id ? 'Edit rental service line' : 'Create a rental service line'}
          description="Taglines appear on cards; use cases power the detail page bullets."
          submitLabel={form.id ? 'Save changes' : 'Create service line'}
          size="lg"
          disabled={form.title.trim().length < 2 || form.slug.trim().length < 2 || form.tagline.trim().length < 2}
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
            <TextInput label="Tagline" value={form.tagline} onChange={(value) => setForm({ ...form, tagline: value })} isRequired />
            <TextInput
              label="Sort order"
              value={form.sortOrder}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, sortOrder: value.replace(/[^\d]/g, '') })}
            />
          </FieldGrid>
          <div className="mt-3 space-y-3">
            <TextAreaInput label="Description" rows={4} value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
            <StringListInput
              label="Use cases"
              value={form.useCases}
              onChange={(value) => setForm({ ...form, useCases: value })}
              rows={4}
              description="One scenario per line, e.g. “Airport pickup at Kilimanjaro”."
            />
          </div>
        </FormDialog>
      ) : null}

      <RentalServiceDetail
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onEdit={(row) =>
          setForm({
            id: row.id,
            version: row.version,
            slug: row.slug,
            title: row.title,
            tagline: row.tagline,
            description: row.description,
            icon: row.icon ?? 'car',
            useCases: row.useCases ?? [],
            sortOrder: String(row.sortOrder ?? 0),
          })
        }
      />
    </Page>
  );
}

function RentalServiceDetail({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (row: RentalServiceLine) => void;
}) {
  const service = useApi<RentalServiceLine>(id ? `/admin/rentals/services/${id}` : null);
  const command = useCommand({
    invalidate: [['api', `/admin/rentals/services/${id}`], ['list', '/admin/rentals/services']],
    successMessage: false,
  });
  const row = service.data;

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.title ?? 'Rental service line'}
      subtitle={row?.tagline ?? 'Loading…'}
      chip={row ? <StatusChip status={row.status ?? 'PUBLISHED'} /> : null}
      footer={
        row ? (
          <>
            <Button size="sm" variant="tertiary" onPress={() => onEdit(row)}>
              <Icon name="edit" size={15} />
              Edit copy
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={(row.status ?? 'PUBLISHED') === 'PUBLISHED'}
              isPending={command.pending}
              onPress={async () => {
                await command.run(`/admin/rentals/services/${row.id}`, 'PATCH', {
                  body: { expectedVersion: row.version, status: 'PUBLISHED' },
                  successMessage: 'Service line published.',
                });
                void service.refetch();
                onChanged();
              }}
            >
              <Icon name="upload" size={15} />
              Publish
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger" isDisabled={(row.status ?? '') === 'ARCHIVED'}>
                  Archive
                </Button>
              }
              title="Archive this service line"
              description="Archived lines disappear from the public rentals hub."
              confirmLabel="Archive"
              reason={false}
              onConfirm={async () => {
                await command.run(`/admin/rentals/services/${row.id}`, 'PATCH', {
                  body: { expectedVersion: row.version, status: 'ARCHIVED' },
                  successMessage: 'Service line archived.',
                });
                void service.refetch();
                onChanged();
              }}
            />
          </>
        ) : null
      }
    >
      {service.isError ? <ErrorPanel message="This service line could not be loaded." details={errorMessage(service.error)} /> : null}
      {service.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : null}

      {row ? (
        <div className="space-y-4">
          {definitionList([
            { label: 'Slug', value: `/${row.slug}` },
            { label: 'Icon', value: labelize(row.icon ?? 'car') },
            { label: 'Sort order', value: row.sortOrder ?? 0 },
            { label: 'Version', value: row.version },
          ])}
          <p className="text-sm text-muted">{row.description}</p>
          {(row.useCases ?? []).length ? (
            <ul className="list-inside list-disc text-sm text-muted">
              {(row.useCases ?? []).map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="bolt" title="No use cases yet" />
          )}
        </div>
      ) : null}
    </DetailDrawer>
  );
}
