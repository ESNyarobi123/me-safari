'use client';

import { Button, Skeleton } from '@heroui/react';
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
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDate, labelize } from '../../lib/format';
import type { Destination } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface DestinationForm {
  id: string | null;
  version: number;
  slug: string;
  title: string;
  description: string;
  region: string;
  gallery: string[];
}

const EMPTY: DestinationForm = {
  id: null,
  version: 0,
  slug: '',
  title: '',
  description: '',
  region: '',
  gallery: [],
};

export default function DestinationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationForm | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<Destination>('/admin/destinations', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
    search: term || undefined,
  });
  const command = useCommand({ invalidate: [['list', '/admin/destinations']], successMessage: false });

  const rows = list.data?.rows ?? [];
  const published = rows.filter((row) => row.status === 'PUBLISHED').length;
  const regions = new Set(rows.map((row) => row.region).filter(Boolean)).size;

  const columns: Array<Column<Destination>> = useMemo(
    () => [
      {
        key: 'title',
        header: 'Destination',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.title}</p>
            <p className="truncate text-xs text-muted">/{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'region',
        header: 'Region',
        render: (row) => <span className="text-sm">{row.region ?? '—'}</span>,
      },
      {
        key: 'packages',
        header: 'Used by',
        render: (row) => (
          <span className="text-sm">
            {(row.packages ?? []).length} package{(row.packages ?? []).length === 1 ? '' : 's'}
          </span>
        ),
      },
      {
        key: 'gallery',
        header: 'Media',
        align: 'center',
        render: (row) => <span className="text-sm tabular-nums">{(row.gallery ?? []).length}</span>,
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

  async function save(state: DestinationForm) {
    const payload = {
      slug: state.slug.trim(),
      title: state.title.trim(),
      description: state.description.trim(),
      ...(state.region ? { region: state.region.trim() } : {}),
      ...(state.gallery.length ? { gallery: state.gallery } : {}),
    };
    if (state.id) {
      await command.run(`/admin/destinations/${state.id}`, 'PATCH', {
        body: { ...payload, expectedVersion: state.version },
        successMessage: 'Destination updated.',
      });
    } else {
      await command.run('/admin/destinations', 'POST', { body: payload, successMessage: 'Destination created.' });
    }
    void list.refetch();
  }

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Catalog & content"
      title="Destinations"
      subtitle="Parks, towns, islands and the media that sells them."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <Button variant="primary" size="sm" onPress={() => setForm({ ...EMPTY })}>
            <Icon name="plus" size={15} />
            New destination
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Destinations" icon="pin" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard label="Published" icon="globe" tone="success" loading={list.isLoading} value={published} hint="Visible publicly" />
        <StatCard label="Regions covered" icon="compass" tone="default" loading={list.isLoading} value={regions} hint="Distinct regions" />
        <StatCard
          label="Drafts"
          icon="edit"
          tone={rows.length - published > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={rows.length - published}
          hint="Not publicly listed"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Title…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Destinations could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Destination catalogue" description="Open a row to review, publish or edit." icon="pin" bodyClassName="px-0 py-0">
        <DataTable
          label="Destinations"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No destinations yet"
          emptyDescription="Destinations anchor packages on the map and in search."
          footer={
            <TableFooter
              summary={`${rows.length} destination${rows.length === 1 ? '' : 's'}`}
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
          title={form.id ? 'Edit destination' : 'Create a destination'}
          description="Descriptions and media power the public A–Z pages."
          submitLabel={form.id ? 'Save changes' : 'Create destination'}
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
            <TextInput label="Region" value={form.region} onChange={(value) => setForm({ ...form, region: value })} />
          </FieldGrid>
          <div className="mt-3">
            <TextAreaInput
              label="Description"
              rows={4}
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </div>
          <div className="mt-3">
            <StringListInput
              label="Gallery image URLs"
              value={form.gallery}
              onChange={(value) => setForm({ ...form, gallery: value })}
              rows={4}
            />
          </div>
        </FormDialog>
      ) : null}

      <DestinationDetail
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
            region: row.region ?? '',
            gallery: row.gallery ?? [],
          })
        }
      />
    </Page>
  );
}

function DestinationDetail({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (row: Destination) => void;
}) {
  const destination = useApi<Destination>(id ? `/admin/destinations/${id}` : null);
  const command = useCommand({
    invalidate: [['api', `/admin/destinations/${id}`], ['list', '/admin/destinations']],
    successMessage: false,
  });
  const row = destination.data;

  async function transition(action: 'publish' | 'archive') {
    if (!row) return;
    await command.run(`/admin/destinations/${row.id}/${action}`, 'POST', {
      body: { expectedVersion: row.version },
      successMessage: `Destination ${action}d.`,
    });
    void destination.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.title ?? 'Destination'}
      subtitle={row ? `/${row.slug}${row.region ? ` · ${row.region}` : ''}` : 'Loading…'}
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
              title="Archive this destination"
              description="Archived destinations disappear from the public site and from package pickers."
              confirmLabel="Archive"
              reason={false}
              onConfirm={() => transition('archive')}
            />
          </>
        ) : null
      }
    >
      {destination.isError ? (
        <ErrorPanel message="This destination could not be loaded." details={errorMessage(destination.error)} />
      ) : null}
      {destination.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : null}

      {row
        ? definitionList([
            { label: 'Slug', value: `/${row.slug}` },
            { label: 'Region', value: row.region ?? '—' },
            { label: 'Version', value: row.version },
            { label: 'Gallery items', value: (row.gallery ?? []).length },
            { label: 'Linked packages', value: (row.packages ?? []).map((p) => p.title).join(', ') || 'None yet' },
          ])
        : null}

      {row ? <p className="mt-4 text-sm text-muted">{row.description}</p> : null}

      {row && (row.gallery ?? []).length ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(row.gallery ?? []).map((url) => (
            <div key={url} className="overflow-hidden rounded-xl border border-separator bg-surface-secondary/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <p className="truncate px-2 py-1 text-[11px] text-muted">{labelize(url.split('/').pop() ?? '')}</p>
            </div>
          ))}
        </div>
      ) : row ? (
        <div className="mt-4">
          <EmptyState compact icon="image" title="No media yet" description="Add gallery URLs to enrich the public pages." />
        </div>
      ) : null}

      {row?.localized ? (
        <p className="mt-3 text-[11px] text-muted">
          Localised content present for {Object.keys(row.localized as Record<string, unknown>).join(', ')} · updated{' '}
          {formatDate(row.createdAt)}
        </p>
      ) : null}
    </DetailDrawer>
  );
}
