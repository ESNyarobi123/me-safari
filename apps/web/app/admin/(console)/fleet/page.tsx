'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
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
  TagPill,
  TextAreaInput,
  TextInput,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDate, formatDateTime, labelize } from '../../lib/format';
import type { Vehicle } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
];

const SEGMENTS = ['4x4 Land Cruiser', 'Minibus', 'Van', 'Saloon', 'Pickup', 'Open safari roof'];

interface VehicleDraft {
  registration: string;
  type: string;
  seats: string;
  luggageCapacity: string;
  capabilities: string[];
  photo: string;
  status: string;
}

const EMPTY_DRAFT: VehicleDraft = {
  registration: '',
  type: '',
  seats: '4',
  luggageCapacity: '4',
  capabilities: [],
  photo: '',
  status: 'ACTIVE',
};

interface MaintenanceBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  state: string;
  reason?: string | null;
}

export default function FleetPage() {
  const filters = useFilters({ search: '', status: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const vehicles = useList<Vehicle>('/admin/vehicles', { limit: pagination.limit, cursor: pagination.cursor });
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY_DRAFT);
  const [createOpen, setCreateOpen] = useState(false);
  const [maintenanceFor, setMaintenanceFor] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState({ startsAt: '', endsAt: '', reason: '' });

  const detail = useApi<Vehicle>(selected ? `/admin/vehicles/${selected.id}` : null, {}, { enabled: Boolean(selected) });

  const command = useCommand({ invalidate: [['list', '/admin/vehicles']], successMessage: false });

  const rows = useMemo(() => {
    const list = vehicles.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((vehicle) => {
      const matchesStatus = !filters.values.status || vehicle.status === filters.values.status;
      const matchesSearch =
        !term ||
        [vehicle.registration, vehicle.type, ...(vehicle.capabilities ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filters.values.status, search, vehicles.data]);

  const stats = useMemo(() => {
    const list = vehicles.data?.rows ?? [];
    return {
      total: list.length,
      active: list.filter((vehicle) => vehicle.status === 'ACTIVE').length,
      seats: list.reduce((total, vehicle) => total + (vehicle.seats ?? 0), 0),
      allocated: list.filter((vehicle) => (vehicle.allocations ?? []).length > 0).length,
    };
  }, [vehicles.data]);

  const blocks = (((detail.data?.maintenanceBlocks ?? detail.data?.allocations ?? []) as unknown) as MaintenanceBlock[]).map(
    (block) => ({
      id: block.id,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      state: block.state,
      reason: block.reason,
    }),
  );

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setDraft({
      registration: vehicle.registration,
      type: vehicle.type,
      seats: String(vehicle.seats ?? ''),
      luggageCapacity: String(vehicle.luggageCapacity ?? ''),
      capabilities: vehicle.capabilities ?? [],
      photo: vehicle.photo ?? '',
      status: vehicle.status ?? 'ACTIVE',
    });
  }

  async function saveVehicle() {
    const body = {
      registration: draft.registration.trim(),
      type: draft.type.trim(),
      seats: Number(draft.seats || 0),
      luggageCapacity: Number(draft.luggageCapacity || 0),
      capabilities: draft.capabilities,
      photo: draft.photo.trim() || undefined,
      ...(editing ? { status: draft.status, expectedVersion: editing.version } : {}),
    };
    await command.run(editing ? `/admin/vehicles/${editing.id}` : '/admin/vehicles', editing ? 'PATCH' : 'POST', {
      body,
      successMessage: editing ? 'Fleet vehicle updated.' : 'Fleet vehicle added.',
    });
    void vehicles.refetch();
    if (editing) void detail.refetch();
  }

  const columns: Array<Column<Vehicle>> = [
    {
      key: 'registration',
      header: 'Vehicle',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.registration}</p>
          <p className="truncate text-xs text-muted">{row.type || '—'}</p>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (row) => (
        <span className="text-sm">
          {row.seats} seats
          <span className="text-muted"> · {row.luggageCapacity ?? 0} bags</span>
        </span>
      ),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      hideBelow: 'lg',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.capabilities ?? []).slice(0, 3).map((capability) => (
            <TagPill key={capability}>{capability}</TagPill>
          ))}
          {(row.capabilities ?? []).length > 3 ? (
            <TagPill>+{(row.capabilities ?? []).length - 3}</TagPill>
          ) : null}
          {(row.capabilities ?? []).length === 0 ? <span className="text-xs text-muted">—</span> : null}
        </div>
      ),
    },
    {
      key: 'allocations',
      header: 'Upcoming',
      hideBelow: 'lg',
      render: (row) =>
        (row.allocations ?? []).length > 0 ? (
          <StatusChip status="COMMITTED" label={`${(row.allocations ?? []).length} bookings`} tone="accent" />
        ) : (
          <span className="text-xs text-muted">Free</span>
        ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusChip status={row.status ?? 'ACTIVE'} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
            <Icon name="eye" size={15} />
          </Button>
          <Button size="sm" variant="ghost" onPress={() => openEdit(row)}>
            <Icon name="edit" size={15} />
          </Button>
          <Button size="sm" variant="ghost" onPress={() => { setMaintenanceFor(row); setMaintenance({ startsAt: '', endsAt: '', reason: '' }); }}>
            <Icon name="clock" size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Fleet & team"
      title="Fleet"
      subtitle="Every safari vehicle with seats, luggage room and capability tags. Maintenance blocks reserve capacity so dispatch can never over-allocate."
      actions={
        <>
          <RefreshButton pending={vehicles.isFetching} onPress={() => void vehicles.refetch()} />
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setEditing(null);
              setDraft(EMPTY_DRAFT);
              setCreateOpen(true);
            }}
          >
            <Icon name="plus" size={15} />
            Add vehicle
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Vehicles" icon="truck" tone="accent" loading={vehicles.isLoading} value={stats.total} hint="In the fleet register" />
        <StatCard label="Active" icon="check" tone="success" loading={vehicles.isLoading} value={stats.active} hint="Available for allocation" />
        <StatCard label="Seat capacity" icon="users" tone="default" loading={vehicles.isLoading} value={stats.seats} hint="Across all vehicles" />
        <StatCard label="Committed" icon="calendar" tone="warning" loading={vehicles.isLoading} value={stats.allocated} hint="With active allocations" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput value={filters.values.search ?? ''} onChange={(value) => filters.set('search', value)} placeholder="Registration, type or capability" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput
            value={filters.values.status ?? ''}
            onChange={(value) => filters.set('status', value)}
            options={STATUS_OPTIONS}
          />
        </FilterField>
      </FilterBar>

      {vehicles.isError ? (
        <ErrorPanel message="The fleet register could not be loaded." details={errorMessage(vehicles.error)} onRetry={() => void vehicles.refetch()} />
      ) : null}

      <Panel title="Fleet register" description="Maintenance blocks and retirement keep availability honest." icon="truck">
        <DataTable
          label="Fleet vehicles"
          columns={columns}
          rows={rows}
          loading={vehicles.isLoading}
          onRowPress={(row) => setSelected(row)}
          emptyTitle="No vehicles yet"
          emptyDescription="Add the first vehicle so trips can be dispatched."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={vehicles.data?.meta.hasMore}
              pending={vehicles.isFetching}
              onNext={() => pagination.next(vehicles.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      {/* ------------------------------------------------------------ create / edit */}
      <FormDialog
        open={createOpen || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? `Edit ${editing.registration}` : 'Add a fleet vehicle'}
        description="Seats and luggage capacity drive allocation checks during dispatch."
        submitLabel={editing ? 'Save changes' : 'Add vehicle'}
        onSubmit={saveVehicle}
      >
        <div className="space-y-3">
          <FieldGrid>
            <TextInput label="Registration" value={draft.registration} isRequired onChange={(value) => setDraft((c) => ({ ...c, registration: value }))} placeholder="T 123 ABC" />
            <TextInput label="Type" value={draft.type} isRequired onChange={(value) => setDraft((c) => ({ ...c, type: value }))} placeholder="Land Cruiser 79" />
          </FieldGrid>
          <FieldGrid>
            <TextInput label="Seats" value={draft.seats} inputMode="numeric" onChange={(value) => setDraft((c) => ({ ...c, seats: value.replace(/[^\d]/g, '') }))} />
            <TextInput label="Luggage capacity" value={draft.luggageCapacity} inputMode="numeric" onChange={(value) => setDraft((c) => ({ ...c, luggageCapacity: value.replace(/[^\d]/g, '') }))} />
          </FieldGrid>
          <SelectInput
            label="Segment"
            value={draft.type || null}
            onChange={(value) => setDraft((c) => ({ ...c, type: value }))}
            options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
          />
          <StringListInput
            label="Capabilities"
            value={draft.capabilities}
            onChange={(value) => setDraft((c) => ({ ...c, capabilities: value }))}
            description="Popcorn roof, fridge, winch, wifi, charging points…"
          />
          <TextInput label="Photo URL" value={draft.photo} onChange={(value) => setDraft((c) => ({ ...c, photo: value }))} placeholder="https://…" />
          {editing ? (
            <SelectInput
              label="Status"
              value={draft.status}
              onChange={(value) => setDraft((c) => ({ ...c, status: value }))}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
                { value: 'RETIRED', label: 'Retired' },
              ]}
            />
          ) : null}
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------- maintenance */}
      <FormDialog
        open={Boolean(maintenanceFor)}
        onOpenChange={(open) => {
          if (!open) setMaintenanceFor(null);
        }}
        title={`Block maintenance — ${maintenanceFor?.registration ?? ''}`}
        description="The block removes the vehicle from availability for the selected window."
        submitLabel="Block availability"
        onSubmit={async () => {
          if (!maintenanceFor) return;
          await command.run(`/admin/vehicles/${maintenanceFor.id}/maintenance-blocks`, 'POST', {
            body: {
              startsAt: new Date(maintenance.startsAt).toISOString(),
              endsAt: new Date(maintenance.endsAt).toISOString(),
              reason: maintenance.reason,
            },
            successMessage: 'Maintenance block created.',
          });
          void vehicles.refetch();
          void detail.refetch();
        }}
        disabled={!maintenance.startsAt || !maintenance.endsAt || maintenance.reason.trim().length < 10}
      >
        <div className="space-y-3">
          <FieldGrid>
            <TextInput label="Starts at" type="datetime-local" value={maintenance.startsAt} onChange={(value) => setMaintenance((c) => ({ ...c, startsAt: value }))} />
            <TextInput label="Ends at" type="datetime-local" value={maintenance.endsAt} onChange={(value) => setMaintenance((c) => ({ ...c, endsAt: value }))} />
          </FieldGrid>
          <TextAreaInput label="Reason" rows={3} value={maintenance.reason} onChange={(value) => setMaintenance((c) => ({ ...c, reason: value }))} />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------------ detail */}
      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.registration ?? ''}
        subtitle={selected?.type}
        chip={selected ? <StatusChip status={selected.status ?? 'ACTIVE'} /> : null}
        fields={
          selected
            ? [
                { label: 'Seats', value: selected.seats },
                { label: 'Luggage', value: selected.luggageCapacity },
                { label: 'Version', value: `v${selected.version}` },
                { label: 'Updated', value: formatDateTime(selected.updatedAt) },
                { label: 'Capabilities', value: (selected.capabilities ?? []).join(' · ') || '—', full: true },
              ]
            : []
        }
        sections={[
          {
            title: 'Maintenance & allocations',
            content: detail.isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : blocks.length === 0 ? (
              <EmptyState compact icon="clock" title="No scheduled blocks" description="This vehicle is fully available." />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {blocks.map((block) => (
                  <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDate(block.startsAt)} → {formatDate(block.endsAt)}
                      </p>
                      <p className="truncate text-xs text-muted">{block.reason || 'No reason recorded'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={block.state} />
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={block.state !== 'ACTIVE'}
                        onPress={() => {
                          if (!selected) return;
                          void command.run(`/admin/vehicles/${selected.id}/maintenance-blocks/${block.id}/release`, 'POST', {
                            body: { reason: `Released by admin console on ${new Date().toISOString()}` },
                            successMessage: 'Maintenance block released.',
                          });
                          void detail.refetch();
                          void vehicles.refetch();
                        }}
                      >
                        Release
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
        footer={
          selected ? (
            <>
              <Button variant="tertiary" size="sm" onPress={() => { openEdit(selected); setSelected(null); }}>
                <Icon name="edit" size={15} />
                Edit vehicle
              </Button>
              <Button variant="tertiary" size="sm" onPress={() => { setMaintenanceFor(selected); setSelected(null); setMaintenance({ startsAt: '', endsAt: '', reason: '' }); }}>
                <Icon name="clock" size={15} />
                Block maintenance
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="danger" size="sm" isDisabled={selected.status === 'RETIRED'}>
                    <Icon name="trash" size={15} />
                    Retire
                  </Button>
                }
                title={`Retire ${selected.registration}`}
                description="Retired vehicles cannot be allocated to new trips. Existing allocations are unaffected."
                confirmLabel="Retire vehicle"
                onConfirm={async (reason) => {
                  await command.run(`/admin/vehicles/${selected.id}/retire`, 'POST', {
                    body: { expectedVersion: selected.version, reason },
                    successMessage: 'Vehicle retired.',
                  });
                  void vehicles.refetch();
                  setSelected(null);
                }}
              />
            </>
          ) : null
        }
      >
        {selected ? (
          <SingleVehicleSummary vehicle={selected} allocations={(detail.data?.allocations ?? []) as Array<Record<string, unknown>>} />
        ) : null}
      </DetailDrawer>
    </Page>
  );
}

function SingleVehicleSummary({
  vehicle,
  allocations,
}: {
  vehicle: Vehicle;
  allocations: Array<Record<string, unknown>>;
}) {
  return (
    <div className="space-y-4">
      <Panel variant="secondary" title="Availability" icon="calendar">
        {allocations.length === 0 ? (
          <p className="text-sm text-muted">No allocations recorded for this vehicle.</p>
        ) : (
          <>
            {definitionList([
              { label: 'Allocations', value: allocations.length },
              {
                label: 'Next departure',
                value: formatDate(allocations[0]?.startsAt as string) || '—',
              },
            ])}
            <Separator className="my-3" />
            <p className="text-xs text-muted">
              Every block is a resource allocation, so dispatch availability always reflects reality.
            </p>
          </>
        )}
      </Panel>
      {vehicle.photo ? (
        <Panel variant="secondary" title="Reference photo" icon="image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vehicle.photo} alt={vehicle.registration} className="max-h-56 w-full rounded-xl object-cover" />
        </Panel>
      ) : null}
    </div>
  );
}
