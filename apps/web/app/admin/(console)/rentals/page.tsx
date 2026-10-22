'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  CheckInput,
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
import type { RentalRate, RentalServiceLine, VehicleRental } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_REQUEST', label: 'On request' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
];

const SEGMENT_OPTIONS = ['SUV', 'CROSSOVER', 'SEDAN', 'MINIBUS', 'VAN', 'VINTAGE', 'PICKUP'].map((value) => ({
  value,
  label: labelize(value),
}));

interface RentalForm {
  id: string | null;
  version: number;
  slug: string;
  brand: string;
  model: string;
  variant: string;
  modelYear: string;
  category: string;
  segment: string;
  seats: string;
  doors: string;
  luggageCapacity: string;
  transmission: string;
  fuel: string;
  chauffeurDriven: boolean;
  selfDriveAvailable: boolean;
  features: string[];
  serviceSlugs: string[];
  description: string;
  status: string;
  photo: string;
  rateCurrency: string;
  rateAmount: string;
  rateMinimumDays: string;
}

const EMPTY: RentalForm = {
  id: null,
  version: 0,
  slug: '',
  brand: '',
  model: '',
  variant: '',
  modelYear: '',
  category: 'Chauffeur driven',
  segment: 'SUV',
  seats: '5',
  doors: '4',
  luggageCapacity: '3',
  transmission: 'AUTOMATIC',
  fuel: 'PETROL',
  chauffeurDriven: true,
  selfDriveAvailable: false,
  features: [],
  serviceSlugs: [],
  description: '',
  status: 'AVAILABLE',
  photo: '',
  rateCurrency: 'USD',
  rateAmount: '',
  rateMinimumDays: '1',
};

export default function RentalVehiclesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<RentalForm | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<VehicleRental>('/admin/rentals/vehicles', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
    search: term || undefined,
  });
  const services = useList<RentalServiceLine>('/admin/rentals/services', { limit: 100 });
  const command = useCommand({ invalidate: [['list', '/admin/rentals/vehicles']], successMessage: false });

  const rows = list.data?.rows ?? [];
  const available = rows.filter((row) => row.status === 'AVAILABLE').length;
  const chauffeur = rows.filter((row) => row.chauffeurDriven).length;

  const columns: Array<Column<VehicleRental>> = useMemo(
    () => [
      {
        key: 'vehicle',
        header: 'Vehicle',
        isRowHeader: true,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-separator bg-surface-secondary/60 text-muted">
              {row.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <Icon name="car" size={16} />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {row.brand} {row.model}
                {row.variant ? ` ${row.variant}` : ''}
              </p>
              <p className="truncate text-xs text-muted">
                {row.modelYear ?? '—'} · {labelize(row.segment)} · /{row.slug}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'spec',
        header: 'Spec',
        render: (row) => (
          <div className="text-sm">
            {row.seats} seats · {row.doors ?? '—'} doors
            <p className="text-xs text-muted">
              {labelize(row.transmission ?? '')} · {labelize(row.fuel ?? '')}
            </p>
          </div>
        ),
      },
      {
        key: 'mode',
        header: 'Driving',
        render: (row) => (
          <div className="flex flex-col gap-1">
            {row.chauffeurDriven ? <StatusChip status="ACTIVE" label="Chauffeur" /> : null}
            {row.selfDriveAvailable ? <StatusChip status="PENDING" label="Self drive" /> : null}
          </div>
        ),
      },
      {
        key: 'price',
        header: 'From',
        align: 'end',
        render: (row) => (
          <div className="text-end">
            <Money minor={row.fromPrice?.amountMinor} currency={row.fromPrice?.currency ?? 'USD'} className="text-sm font-medium" />
            <p className="text-xs text-muted">{(row.rates ?? []).length} rate(s)</p>
          </div>
        ),
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

  async function save(state: RentalForm) {
    const payload: Record<string, unknown> = {
      slug: state.slug.trim(),
      brand: state.brand.trim(),
      model: state.model.trim(),
      ...(state.variant ? { variant: state.variant.trim() } : {}),
      ...(state.modelYear ? { modelYear: Number(state.modelYear) } : {}),
      category: state.category.trim() || 'Chauffeur driven',
      segment: state.segment,
      seats: Number(state.seats) || 4,
      ...(state.doors ? { doors: Number(state.doors) } : {}),
      ...(state.luggageCapacity ? { luggageCapacity: Number(state.luggageCapacity) } : {}),
      ...(state.transmission ? { transmission: state.transmission } : {}),
      ...(state.fuel ? { fuel: state.fuel } : {}),
      chauffeurDriven: state.chauffeurDriven,
      selfDriveAvailable: state.selfDriveAvailable,
      ...(state.features.length ? { features: state.features } : {}),
      ...(state.serviceSlugs.length ? { serviceSlugs: state.serviceSlugs } : {}),
      ...(state.description ? { description: state.description.trim() } : {}),
      ...(state.photo ? { photo: state.photo.trim() } : {}),
      status: state.status,
    };

    if (state.id) {
      await command.run(`/admin/rentals/vehicles/${state.id}`, 'PATCH', {
        body: { ...payload, expectedVersion: state.version },
        successMessage: 'Vehicle updated.',
      });
    } else {
      await command.run('/admin/rentals/vehicles', 'POST', {
        body: {
          ...payload,
          ...(state.rateAmount
            ? {
                rate: {
                  currency: state.rateCurrency,
                  amountMinor: toMinor(state.rateAmount, state.rateCurrency),
                  minimumDays: Number(state.rateMinimumDays) || 1,
                },
              }
            : {}),
        },
        successMessage: 'Vehicle added to the rental fleet.',
      });
    }
    void list.refetch();
  }

  const refresh = () => void list.refetch();

  return (
    <Page
      eyebrow="Safari AI Rentals"
      title="Rental vehicles"
      subtitle="The chauffeur-driven and self-drive fleet, its specifications, rates and publishing status."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <Button variant="primary" size="sm" onPress={() => setForm({ ...EMPTY })}>
            <Icon name="plus" size={15} />
            New vehicle
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Vehicles" icon="car" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard label="Available" icon="check" tone="success" loading={list.isLoading} value={available} hint="Bookable today" />
        <StatCard label="Chauffeur driven" icon="id" tone="default" loading={list.isLoading} value={chauffeur} hint="Includes a driver" />
        <StatCard
          label="Without a rate"
          icon="card"
          tone={rows.filter((row) => !(row.rates ?? []).length).length > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={rows.filter((row) => !(row.rates ?? []).length).length}
          hint="Cannot be quoted"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Brand, model or slug…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Rental vehicles could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Rental fleet" description="Open a row to add rate cards or retire the vehicle." icon="car" bodyClassName="px-0 py-0">
        <DataTable
          label="Rental vehicles"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No rental vehicles yet"
          emptyDescription="Add the first vehicle to open the Safari AI Rentals catalogue."
          footer={
            <TableFooter
              summary={`${rows.length} vehicle${rows.length === 1 ? '' : 's'}`}
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
          title={form.id ? 'Edit rental vehicle' : 'Add a rental vehicle'}
          description="Rates are optional at creation and can be added any time from the vehicle drawer."
          submitLabel={form.id ? 'Save changes' : 'Add vehicle'}
          size="lg"
          disabled={form.brand.trim().length < 2 || form.model.trim().length < 1 || form.slug.trim().length < 2}
          onSubmit={async () => {
            await save(form);
            setForm(null);
          }}
        >
          <FieldGrid columns={2}>
            <TextInput label="Brand" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} isRequired />
            <TextInput label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} isRequired />
            <TextInput label="Variant" value={form.variant} onChange={(value) => setForm({ ...form, variant: value })} />
            <TextInput
              label="Slug"
              value={form.slug}
              onChange={(value) => setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              isRequired
            />
            <TextInput
              label="Model year"
              value={form.modelYear}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, modelYear: value.replace(/[^\d]/g, '') })}
            />
            <SelectInput label="Segment" value={form.segment} onChange={(value) => setForm({ ...form, segment: value })} options={SEGMENT_OPTIONS} />
            <TextInput label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
            <TextInput
              label="Seats"
              value={form.seats}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, seats: value.replace(/[^\d]/g, '') })}
            />
            <TextInput
              label="Doors"
              value={form.doors}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, doors: value.replace(/[^\d]/g, '') })}
            />
            <TextInput
              label="Luggage capacity"
              value={form.luggageCapacity}
              inputMode="numeric"
              onChange={(value) => setForm({ ...form, luggageCapacity: value.replace(/[^\d]/g, '') })}
            />
            <SelectInput
              label="Transmission"
              value={form.transmission}
              onChange={(value) => setForm({ ...form, transmission: value })}
              options={[
                { value: 'AUTOMATIC', label: 'Automatic' },
                { value: 'MANUAL', label: 'Manual' },
              ]}
            />
            <SelectInput
              label="Fuel"
              value={form.fuel}
              onChange={(value) => setForm({ ...form, fuel: value })}
              options={[
                { value: 'PETROL', label: 'Petrol' },
                { value: 'DIESEL', label: 'Diesel' },
                { value: 'HYBRID', label: 'Hybrid' },
                { value: 'ELECTRIC', label: 'Electric' },
              ]}
            />
            <SelectInput
              label="Status"
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
              options={STATUS_OPTIONS.filter((option) => option.value).map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <TextInput label="Photo URL" value={form.photo} onChange={(value) => setForm({ ...form, photo: value })} />
          </FieldGrid>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <CheckInput
              label="Chauffeur driven"
              value={form.chauffeurDriven}
              onChange={(value) => setForm({ ...form, chauffeurDriven: value })}
            />
            <CheckInput
              label="Self drive available"
              value={form.selfDriveAvailable}
              onChange={(value) => setForm({ ...form, selfDriveAvailable: value })}
            />
          </div>

          <div className="mt-3">
            <TextAreaInput label="Description" rows={3} value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          </div>

          <div className="mt-3 space-y-3">
            <StringListInput label="Features" value={form.features} onChange={(value) => setForm({ ...form, features: value })} rows={3} />
            <StringListInput
              label="Service line slugs"
              value={form.serviceSlugs}
              onChange={(value) => setForm({ ...form, serviceSlugs: value })}
              rows={3}
              description={`Available: ${(services.data?.rows ?? []).map((service) => service.slug).join(', ') || 'none yet'}`}
            />
          </div>

          {form.id ? null : (
            <>
              <Separator className="my-4" />
              <p className="font-ui mb-2 text-[13px] font-semibold">Opening rate (optional)</p>
              <FieldGrid columns={3}>
                <SelectInput
                  label="Currency"
                  value={form.rateCurrency}
                  onChange={(value) => setForm({ ...form, rateCurrency: value })}
                  options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
                />
                <TextInput
                  label="Daily rate"
                  value={form.rateAmount}
                  inputMode="decimal"
                  onChange={(value) => setForm({ ...form, rateAmount: value })}
                />
                <TextInput
                  label="Minimum days"
                  value={form.rateMinimumDays}
                  inputMode="numeric"
                  onChange={(value) => setForm({ ...form, rateMinimumDays: value.replace(/[^\d]/g, '') })}
                />
              </FieldGrid>
            </>
          )}
        </FormDialog>
      ) : null}

      <RentalVehicleDetail
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onEdit={(row) =>
          setForm({
            ...EMPTY,
            id: row.id,
            version: row.version,
            slug: row.slug,
            brand: row.brand,
            model: row.model,
            variant: row.variant ?? '',
            modelYear: row.modelYear ? String(row.modelYear) : '',
            category: row.category,
            segment: row.segment,
            seats: String(row.seats),
            doors: row.doors ? String(row.doors) : '',
            luggageCapacity: row.luggageCapacity ? String(row.luggageCapacity) : '',
            transmission: row.transmission ?? 'AUTOMATIC',
            fuel: row.fuel ?? 'PETROL',
            chauffeurDriven: Boolean(row.chauffeurDriven),
            selfDriveAvailable: Boolean(row.selfDriveAvailable),
            features: row.features ?? [],
            serviceSlugs: row.serviceSlugs ?? [],
            description: row.description ?? '',
            status: row.status,
            photo: row.photoUrl ?? '',
          })
        }
      />
    </Page>
  );
}

function RentalVehicleDetail({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (row: VehicleRental) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'rates'>('overview');
  const vehicle = useApi<VehicleRental>(id ? `/admin/rentals/vehicles/${id}` : null);
  const command = useCommand({
    invalidate: [['api', `/admin/rentals/vehicles/${id}`], ['list', '/admin/rentals/vehicles']],
    successMessage: false,
  });
  const [rate, setRate] = useState({ rateType: 'DAILY', currency: 'USD', amount: '', minimumDays: '1' });
  const row = vehicle.data;

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row ? `${row.brand} ${row.model}${row.variant ? ` ${row.variant}` : ''}` : 'Rental vehicle'}
      subtitle={row ? `${labelize(row.segment)} · ${row.seats} seats · /${row.slug}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <>
            <Button size="sm" variant="tertiary" onPress={() => onEdit(row)}>
              <Icon name="edit" size={15} />
              Edit
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger" isDisabled={row.status === 'RETIRED'}>
                  Retire vehicle
                </Button>
              }
              title="Retire this rental vehicle"
              description="Retired vehicles stay in history but disappear from the public rentals catalogue."
              confirmLabel="Retire"
              onConfirm={async (reason) => {
                await command.run(`/admin/rentals/vehicles/${row.id}/retire`, 'POST', {
                  body: { expectedVersion: row.version, reason },
                  successMessage: 'Vehicle retired.',
                });
                void vehicle.refetch();
                onChanged();
              }}
            />
          </>
        ) : null
      }
    >
      {vehicle.isError ? <ErrorPanel message="This vehicle could not be loaded." details={errorMessage(vehicle.error)} /> : null}
      {vehicle.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'rates', label: 'Rate card', count: (row?.rates ?? []).length },
        ]}
      />

      {tab === 'overview' && row ? (
        <div className="space-y-4">
          {row.photoUrl ? (
            <div className="overflow-hidden rounded-2xl border border-separator">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.photoUrl} alt="" className="h-44 w-full object-cover" />
            </div>
          ) : null}
          {definitionList([
            { label: 'Slug', value: `/${row.slug}` },
            { label: 'Category', value: row.category },
            { label: 'Segment', value: labelize(row.segment) },
            { label: 'Model year', value: row.modelYear ?? '—' },
            { label: 'Seats', value: row.seats },
            { label: 'Doors', value: row.doors ?? '—' },
            { label: 'Luggage', value: row.luggageCapacity ?? '—' },
            { label: 'Transmission', value: labelize(row.transmission ?? '—') },
            { label: 'Fuel', value: labelize(row.fuel ?? '—') },
            { label: 'Version', value: row.version },
            { label: 'Features', value: (row.features ?? []).join(' · ') || 'None listed' },
            { label: 'Service lines', value: (row.serviceSlugs ?? []).join(', ') || 'None linked' },
            { label: 'Updated', value: row.updatedAt ? formatDateTime(row.updatedAt) : '—' },
          ])}
          {row.description ? <p className="text-sm text-muted">{row.description}</p> : null}
        </div>
      ) : null}

      {tab === 'rates' && row ? (
        <div className="space-y-4">
          {(row.rates ?? []).length === 0 ? (
            <EmptyState compact icon="card" title="No rates configured" description="A vehicle needs a rate to appear with a price." />
          ) : (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {(row.rates ?? []).map((entry: RentalRate) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      <Money minor={entry.amountMinor} currency={entry.currency} />
                      <span className="ml-2 text-xs text-muted">/ {labelize(entry.rateType).toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-muted">
                      min {entry.minimumDays ?? 1} day{(entry.minimumDays ?? 1) === 1 ? '' : 's'} · active from{' '}
                      {formatDate(entry.activeAt)}
                    </p>
                  </div>
                  {entry.note ? <p className="max-w-[220px] truncate text-xs text-muted">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          )}

          <Separator />
          <p className="font-ui text-[13px] font-semibold">Add a rate</p>
          <FieldGrid columns={2}>
            <SelectInput
              label="Rate type"
              value={rate.rateType}
              onChange={(value) => setRate((current) => ({ ...current, rateType: value }))}
              options={[
                { value: 'DAILY', label: 'Daily' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'MONTHLY', label: 'Monthly' },
              ]}
            />
            <SelectInput
              label="Currency"
              value={rate.currency}
              onChange={(value) => setRate((current) => ({ ...current, currency: value }))}
              options={['USD', 'TZS', 'EUR', 'GBP'].map((code) => ({ value: code, label: code }))}
            />
            <TextInput
              label="Amount"
              value={rate.amount}
              inputMode="decimal"
              onChange={(value) => setRate((current) => ({ ...current, amount: value }))}
            />
            <TextInput
              label="Minimum days"
              value={rate.minimumDays}
              inputMode="numeric"
              onChange={(value) => setRate((current) => ({ ...current, minimumDays: value.replace(/[^\d]/g, '') }))}
            />
          </FieldGrid>
          <Button
            size="sm"
            variant="primary"
            isPending={command.pending}
            isDisabled={!rate.amount}
            onPress={async () => {
              await command.run(`/admin/rentals/vehicles/${row.id}/rates`, 'POST', {
                body: {
                  rateType: rate.rateType,
                  currency: rate.currency,
                  amountMinor: toMinor(rate.amount, rate.currency),
                  minimumDays: Number(rate.minimumDays) || 1,
                },
                successMessage: 'Rate added.',
              });
              setRate((current) => ({ ...current, amount: '' }));
              void vehicle.refetch();
              onChanged();
            }}
          >
            <Icon name="plus" size={14} />
            Add rate
          </Button>
        </div>
      ) : null}
    </DetailDrawer>
  );
}
