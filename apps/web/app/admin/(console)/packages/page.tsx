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
  StringListInput,
  TabStrip,
  TableFooter,
  TextAreaInput,
  TextInput,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDate, formatDateTime, labelize, toMinor } from '../../lib/format';
import type { CatalogPackage, Departure, Destination, Price, ServiceLine } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface PackageFormState {
  id: string | null;
  version: number;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  durationDays: string;
  cover: string;
  gallery: string[];
  inclusions: string[];
  exclusions: string[];
  goodToKnow: string[];
  destinationIds: string[];
  itinerary: Array<{ day: string; title: string; description: string }>;
}

function emptyForm(): PackageFormState {
  return {
    id: null,
    version: 0,
    slug: '',
    title: '',
    description: '',
    categoryId: '',
    durationDays: '5',
    cover: '',
    gallery: [],
    inclusions: [],
    exclusions: [],
    goodToKnow: [],
    destinationIds: [],
    itinerary: [],
  };
}

export default function PackagesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageFormState | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<CatalogPackage>('/admin/packages', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
  });
  const services = useList<ServiceLine>('/admin/services', { limit: 100 });
  const destinations = useList<Destination>('/admin/destinations', { limit: 100 });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    if (!term) return all;
    return all.filter((row) => row.title.toLowerCase().includes(term.toLowerCase()) || row.slug.includes(term.toLowerCase()));
  }, [list.data, term]);

  const published = rows.filter((row) => row.status === 'PUBLISHED').length;
  const withRates = rows.filter((row) => (row.prices ?? []).length > 0).length;

  const columns: Array<Column<CatalogPackage>> = useMemo(
    () => [
      {
        key: 'title',
        header: 'Package',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.title}</p>
            <p className="truncate text-xs text-muted">/{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'duration',
        header: 'Duration',
        render: (row) => (
          <div className="text-sm">
            {row.durationDays} day{row.durationDays === 1 ? '' : 's'}
            <p className="text-xs text-muted">{(row.destinations ?? []).length} destinations</p>
          </div>
        ),
      },
      {
        key: 'rates',
        header: 'Rates',
        render: (row) => {
          const rates = row.prices ?? [];
          if (rates.length === 0) return <span className="text-xs text-warning">No rate configured</span>;
          const newest = rates[0]!;
          return (
            <div className="text-sm">
              <Money minor={newest.adultMinor} currency={newest.currency} className="font-medium" />
              <p className="text-xs text-muted">
                {newest.currency} · from {formatDate(newest.startsAt)}
              </p>
            </div>
          );
        },
      },
      {
        key: 'version',
        header: 'Version',
        align: 'center',
        render: (row) => <span className="text-sm tabular-nums">v{row.version}</span>,
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

  const command = useCommand({ invalidate: [['list', '/admin/packages']], successMessage: false });

  async function savePackage(state: PackageFormState) {
    const payload: Record<string, unknown> = {
      slug: state.slug.trim(),
      title: state.title.trim(),
      description: state.description.trim(),
      categoryId: state.categoryId,
      durationDays: Number(state.durationDays) || 1,
      ...(state.cover ? { cover: state.cover.trim() } : {}),
      ...(state.gallery.length ? { gallery: state.gallery } : {}),
      ...(state.inclusions.length ? { inclusions: state.inclusions } : {}),
      ...(state.exclusions.length ? { exclusions: state.exclusions } : {}),
      ...(state.goodToKnow.length ? { goodToKnow: state.goodToKnow } : {}),
      ...(state.destinationIds.length ? { destinationIds: state.destinationIds } : {}),
      ...(state.itinerary.length
        ? {
            itinerary: {
              days: state.itinerary.map((day) => ({
                day: Math.max(1, Number(day.day) || 1),
                title: day.title.trim() || `Day ${day.day}`,
                ...(day.description.trim() ? { description: day.description.trim() } : {}),
              })),
            },
          }
        : {}),
    };

    if (state.id) {
      await command.run(`/admin/packages/${state.id}`, 'PATCH', {
        body: { ...payload, expectedVersion: state.version },
        successMessage: 'Package updated.',
      });
    } else {
      await command.run('/admin/packages', 'POST', { body: payload, successMessage: 'Package created as a draft.' });
    }
    void list.refetch();
  }

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Catalog & content"
      title="Packages"
      subtitle="Safari products, itineraries, rate cards, departures and publishing state."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <Button variant="primary" size="sm" onPress={() => setForm(emptyForm())}>
            <Icon name="plus" size={15} />
            New package
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Packages loaded" icon="compass" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard label="Live on the site" icon="globe" tone="success" loading={list.isLoading} value={published} hint="Published" />
        <StatCard
          label="Missing rates"
          icon="card"
          tone={rows.length - withRates > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={rows.length - withRates}
          hint="Cannot be booked without a rate"
        />
        <StatCard
          label="Drafts"
          icon="edit"
          tone="default"
          loading={list.isLoading}
          value={rows.filter((row) => row.status === 'DRAFT').length}
          hint="Not visible to travellers"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Title or slug…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Packages could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Product catalogue" description="Open a row to price, schedule departures or publish." icon="compass" bodyClassName="px-0 py-0">
        <DataTable
          label="Packages"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No packages yet"
          emptyDescription="Create your first safari package to start selling departures."
          footer={
            <TableFooter
              summary={`${rows.length} package${rows.length === 1 ? '' : 's'}`}
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
        <PackageForm
          key={form.id ?? 'new'}
          initial={form}
          services={services.data?.rows ?? []}
          destinations={destinations.data?.rows ?? []}
          onClose={() => setForm(null)}
          onSubmit={savePackage}
        />
      ) : null}

      <PackageDetail
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
            categoryId: row.categoryId,
            durationDays: String(row.durationDays),
            cover: row.cover ?? '',
            gallery: row.gallery ?? [],
            inclusions: row.inclusions ?? [],
            exclusions: row.exclusions ?? [],
            goodToKnow: row.goodToKnow ?? [],
            destinationIds: (row.destinations ?? []).map((destination) => destination.id),
            itinerary: [],
          })
        }
      />
    </Page>
  );
}

/* -------------------------------------------------------------- form modal -- */

function PackageForm({
  initial,
  services,
  destinations,
  onClose,
  onSubmit,
}: {
  initial: PackageFormState;
  services: ServiceLine[];
  destinations: Destination[];
  onClose: () => void;
  onSubmit: (state: PackageFormState) => Promise<void>;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);

  const patch = (next: Partial<PackageFormState>) => setState((current) => ({ ...current, ...next }));

  return (
    <FormDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={state.id ? 'Edit package' : 'Create a package'}
      description="Drafts stay private until published. Rates are added afterwards from the package drawer."
      submitLabel={state.id ? 'Save changes' : 'Create draft'}
      size="lg"
      disabled={state.title.trim().length < 2 || state.slug.trim().length < 2 || !state.categoryId}
      onSubmit={async () => {
        setBusy(true);
        try {
          await onSubmit(state);
          onClose();
        } finally {
          setBusy(false);
        }
      }}
    >
      <FieldGrid columns={2}>
        <TextInput label="Title" value={state.title} onChange={(value) => patch({ title: value })} isRequired />
        <TextInput
          label="Slug"
          value={state.slug}
          onChange={(value) => patch({ slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          placeholder="serengeti-classic"
          isRequired
        />
        <SelectInput
          label="Service line"
          value={state.categoryId}
          onChange={(value) => patch({ categoryId: value })}
          placeholder="Choose a service"
          options={services.map((service) => ({ value: service.id, label: service.title }))}
        />
        <TextInput
          label="Duration (days)"
          value={state.durationDays}
          inputMode="numeric"
          onChange={(value) => patch({ durationDays: value.replace(/[^\d]/g, '') })}
        />
      </FieldGrid>

      <div className="mt-3">
        <TextAreaInput
          label="Description"
          value={state.description}
          rows={4}
          onChange={(value) => patch({ description: value })}
        />
      </div>

      <div className="mt-3">
        <TextInput label="Cover image URL" value={state.cover} onChange={(value) => patch({ cover: value })} />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-sm">Destinations</p>
        <div className="admin-scroll flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-separator p-3">
          {destinations.length === 0 ? (
            <p className="text-xs text-muted">Create destinations first.</p>
          ) : (
            destinations.map((destination) => {
              const selected = state.destinationIds.includes(destination.id);
              return (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() =>
                    patch({
                      destinationIds: selected
                        ? state.destinationIds.filter((id) => id !== destination.id)
                        : [...state.destinationIds, destination.id],
                    })
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    selected
                      ? 'border-brand-orange/40 bg-brand-orange/12 text-brand-orange-ink dark:text-brand-orange'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {destination.title}
                </button>
              );
            })
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          Free text is not accepted — the API only links ids that exist in the destination catalogue.
        </p>
      </div>

      <div className="mt-3 space-y-3">
        <StringListInput label="Inclusions" value={state.inclusions} onChange={(value) => patch({ inclusions: value })} rows={3} />
        <StringListInput label="Exclusions" value={state.exclusions} onChange={(value) => patch({ exclusions: value })} rows={3} />
        <StringListInput label="Good to know" value={state.goodToKnow} onChange={(value) => patch({ goodToKnow: value })} rows={3} />
        <StringListInput label="Gallery image URLs" value={state.gallery} onChange={(value) => patch({ gallery: value })} rows={3} />
      </div>

      <Separator className="my-4" />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-ui text-[13px] font-semibold">Itinerary template</p>
          <Button
            size="sm"
            variant="tertiary"
            onPress={() =>
              patch({
                itinerary: [...state.itinerary, { day: String(state.itinerary.length + 1), title: '', description: '' }],
              })
            }
          >
            <Icon name="plus" size={14} />
            Add day
          </Button>
        </div>
        {state.itinerary.length === 0 ? (
          <EmptyState
            compact
            icon="calendar"
            title="No itinerary days yet"
            description="Optional at creation — add days to publish a day-by-day plan."
          />
        ) : (
          <div className="space-y-2">
            {state.itinerary.map((day, index) => (
              <div key={index} className="rounded-xl border border-separator p-3">
                <FieldGrid columns={2}>
                  <TextInput
                    label="Day"
                    value={day.day}
                    inputMode="numeric"
                    onChange={(value) =>
                      patch({
                        itinerary: state.itinerary.map((entry, position) =>
                          position === index ? { ...entry, day: value.replace(/[^\d]/g, '') } : entry,
                        ),
                      })
                    }
                  />
                  <TextInput
                    label="Title"
                    value={day.title}
                    onChange={(value) =>
                      patch({
                        itinerary: state.itinerary.map((entry, position) =>
                          position === index ? { ...entry, title: value } : entry,
                        ),
                      })
                    }
                  />
                </FieldGrid>
                <div className="mt-2">
                  <TextAreaInput
                    label="Description"
                    rows={2}
                    value={day.description}
                    onChange={(value) =>
                      patch({
                        itinerary: state.itinerary.map((entry, position) =>
                          position === index ? { ...entry, description: value } : entry,
                        ),
                      })
                    }
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label="Remove day"
                    onPress={() => patch({ itinerary: state.itinerary.filter((_, position) => position !== index) })}
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {busy ? <p className="mt-3 text-xs text-muted">Saving…</p> : null}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ detail -- */

function PackageDetail({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (row: CatalogPackage) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'rates' | 'departures'>('overview');
  const pkg = useApi<CatalogPackage>(id ? `/admin/packages/${id}` : null);
  const departures = useList<Departure>(id ? `/admin/packages/${id}/departures` : null);
  const command = useCommand({
    invalidate: [['api', `/admin/packages/${id}`], ['list', `/admin/packages/${id}/departures`], ['list', '/admin/packages']],
    successMessage: false,
  });

  const row = pkg.data;
  const [rate, setRate] = useState({ currency: 'USD', adultMinor: '', childBasisPoints: '7000', startsAt: '', endsAt: '' });
  const [departure, setDeparture] = useState({ startDate: '', capacity: '12', status: 'DRAFT' });

  async function publish(path: string, message: string) {
    if (!row) return;
    await command.run(path, 'POST', { body: { expectedVersion: row.version }, successMessage: message });
    void pkg.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.title ?? 'Package'}
      subtitle={row ? `/${row.slug} · ${row.durationDays} days · v${row.version}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <>
            <Button size="sm" variant="tertiary" onPress={() => onEdit(row)}>
              <Icon name="edit" size={15} />
              Edit draft
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="primary" isDisabled={row.status === 'PUBLISHED'}>
                  <Icon name="upload" size={15} />
                  Publish
                </Button>
              }
              title="Publish this package"
              description="Publishing exposes the package and its rates on the public website and app."
              confirmLabel="Publish package"
              destructive={false}
              reason={false}
              onConfirm={() => publish(`/admin/packages/${row.id}/publish`, 'Package published.')}
            />
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger" isDisabled={row.status === 'ARCHIVED'}>
                  Archive
                </Button>
              }
              title="Archive this package"
              description="Archived packages become read-only and disappear from the website."
              confirmLabel="Archive"
              reason={false}
              onConfirm={() => publish(`/admin/packages/${row.id}/archive`, 'Package archived.')}
            />
          </>
        ) : null
      }
    >
      {pkg.isError ? <ErrorPanel message="This package could not be loaded." details={errorMessage(pkg.error)} /> : null}
      {pkg.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'rates', label: 'Rates', count: (row?.prices ?? []).length },
          { value: 'departures', label: 'Departures', count: departures.data?.rows.length },
        ]}
      />

      {tab === 'overview' && row ? (
        <div className="space-y-4">
          {definitionList([
            { label: 'Slug', value: `/${row.slug}` },
            { label: 'Duration', value: `${row.durationDays} days` },
            { label: 'Destinations', value: (row.destinations ?? []).map((d) => d.title).join(', ') || 'None' },
            { label: 'Created', value: row.createdAt ? formatDateTime(row.createdAt) : '—' },
            { label: 'Updated', value: row.updatedAt ? formatDateTime(row.updatedAt) : '—' },
          ])}
          <Separator />
          <p className="text-sm text-muted">{row.description}</p>
          {(row.inclusions ?? []).length ? (
            <div>
              <p className="font-ui mb-1 text-[13px] font-semibold">Inclusions</p>
              <ul className="list-inside list-disc text-sm text-muted">
                {(row.inclusions ?? []).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'rates' && row ? (
        <div className="space-y-4">
          {(row.prices ?? []).length === 0 ? (
            <EmptyState compact icon="card" title="No rates yet" description="A package needs at least one active rate to be bookable." />
          ) : (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {(row.prices ?? []).map((price: Price) => (
                <li key={price.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <Money minor={price.adultMinor} currency={price.currency} />
                      <span className="ml-2 text-xs text-muted">per adult</span>
                    </p>
                    <p className="text-xs text-muted">
                      Valid {formatDate(price.startsAt)} → {price.endsAt ? formatDate(price.endsAt) : 'open'}
                    </p>
                  </div>
                  <div className="text-end text-xs text-muted">
                    <p>
                      Child {price.childMinAge}–{price.childMaxAge}y at {(price.childBasisPoints / 100).toFixed(0)}%
                    </p>
                    <StatusChip status={price.active === false ? 'ARCHIVED' : 'ACTIVE'} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Separator />
          <p className="font-ui text-[13px] font-semibold">Add a rate</p>
          <FieldGrid columns={2}>
            <SelectInput
              label="Currency"
              value={rate.currency}
              onChange={(value) => setRate((current) => ({ ...current, currency: value }))}
              options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
            />
            <TextInput
              label={`Adult rate (${rate.currency})`}
              value={rate.adultMinor}
              inputMode="decimal"
              onChange={(value) => setRate((current) => ({ ...current, adultMinor: value }))}
            />
            <TextInput
              label="Child basis points"
              value={rate.childBasisPoints}
              inputMode="numeric"
              description="7000 = 70% of the adult rate."
              onChange={(value) => setRate((current) => ({ ...current, childBasisPoints: value.replace(/[^\d]/g, '') }))}
            />
            <TextInput
              label="Valid from"
              type="date"
              value={rate.startsAt}
              onChange={(value) => setRate((current) => ({ ...current, startsAt: value }))}
            />
            <TextInput
              label="Valid to (optional)"
              type="date"
              value={rate.endsAt}
              onChange={(value) => setRate((current) => ({ ...current, endsAt: value }))}
            />
          </FieldGrid>
          <Button
            size="sm"
            variant="primary"
            isPending={command.pending}
            isDisabled={!rate.adultMinor || !rate.startsAt}
            onPress={async () => {
              await command.run(`/admin/packages/${row.id}/prices`, 'POST', {
                body: {
                  expectedVersion: row.version,
                  currency: rate.currency,
                  adultMinor: toMinor(rate.adultMinor, rate.currency),
                  childBasisPoints: Number(rate.childBasisPoints) || 7000,
                  startsAt: rate.startsAt,
                  ...(rate.endsAt ? { endsAt: rate.endsAt } : {}),
                },
                successMessage: 'Rate added.',
              });
              setRate((current) => ({ ...current, adultMinor: '' }));
              void pkg.refetch();
            }}
          >
            <Icon name="plus" size={14} />
            Add rate
          </Button>
        </div>
      ) : null}

      {tab === 'departures' && row ? (
        <div className="space-y-4">
          {departures.isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (departures.data?.rows ?? []).length === 0 ? (
            <EmptyState compact icon="calendar" title="No departures scheduled" />
          ) : (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {(departures.data?.rows ?? []).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatDate(entry.startDate)}</p>
                    <p className="text-xs text-muted">
                      ends {formatDate(entry.endDate)} · {entry.capacity} seats
                    </p>
                  </div>
                  <StatusChip status={entry.status} />
                </li>
              ))}
            </ul>
          )}

          <Separator />
          <p className="font-ui text-[13px] font-semibold">Schedule a departure</p>
          <p className="text-xs text-muted">
            The end date is derived from the package duration of {row.durationDays} days.
          </p>
          <FieldGrid columns={3}>
            <TextInput
              label="Start date"
              type="date"
              value={departure.startDate}
              onChange={(value) => setDeparture((current) => ({ ...current, startDate: value }))}
            />
            <TextInput
              label="Capacity"
              value={departure.capacity}
              inputMode="numeric"
              onChange={(value) => setDeparture((current) => ({ ...current, capacity: value.replace(/[^\d]/g, '') }))}
            />
            <SelectInput
              label="Status"
              value={departure.status}
              onChange={(value) => setDeparture((current) => ({ ...current, status: value }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </FieldGrid>
          <Button
            size="sm"
            variant="primary"
            isPending={command.pending}
            isDisabled={!departure.startDate}
            onPress={async () => {
              await command.run(`/admin/packages/${row.id}/departures`, 'POST', {
                body: {
                  startDate: departure.startDate,
                  capacity: Number(departure.capacity) || 1,
                  status: departure.status,
                },
                successMessage: 'Departure scheduled.',
              });
              void departures.refetch();
            }}
          >
            <Icon name="calendar" size={14} />
            Schedule departure
          </Button>
        </div>
      ) : null}
    </DetailDrawer>
  );
}
