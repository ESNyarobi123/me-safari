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
import { formatDate, formatDateTime, labelize, truncate } from '../../lib/format';
import type { StaffMember, Trip, TripEvent, TripIssue, Vehicle } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EN_ROUTE_TO_PICKUP', label: 'En route to pickup' },
  { value: 'PICKED_UP', label: 'Picked up' },
  { value: 'SAFARI_STARTED', label: 'Safari started' },
  { value: 'ACTIVITY_REACHED', label: 'Activity reached' },
  { value: 'RETURNING', label: 'Returning' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PROGRESS_TARGETS = [
  'EN_ROUTE_TO_PICKUP',
  'PICKED_UP',
  'SAFARI_STARTED',
  'ACTIVITY_REACHED',
  'RETURNING',
] as const;

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<Trip>('/trips', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: status || undefined,
  });

  const rows = useMemo(() => {
    const all = list.data?.rows ?? [];
    if (!term) return all;
    const needle = term.toLowerCase();
    return all.filter((row) =>
      [row.reference, row.guide?.name, row.vehicle?.registration, row.booking?.reference]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [list.data, term]);

  const unassigned = rows.filter((row) => !row.guide || !row.vehicle).length;
  const openIssues = rows.reduce(
    (sum, row) => sum + (row.issues ?? []).filter((issue) => issue.status !== 'RESOLVED').length,
    0,
  );

  const columns: Array<Column<Trip>> = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Trip',
        isRowHeader: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.reference}</p>
            <p className="truncate text-xs text-muted">
              {row.travelerCount} traveller{row.travelerCount === 1 ? '' : 's'} ·{' '}
              {row.booking?.reference ?? 'No booking ref'}
            </p>
          </div>
        ),
      },
      {
        key: 'window',
        header: 'Operating window',
        render: (row) => (
          <div className="whitespace-nowrap text-sm">
            {formatDate(row.startsAt)}
            <span className="text-muted"> → {formatDate(row.endsAt)}</span>
            <p className="text-xs text-muted">{row.timezone}</p>
          </div>
        ),
      },
      {
        key: 'crew',
        header: 'Crew',
        render: (row) => (
          <div className="min-w-0 text-sm">
            <p className="truncate">{row.guide?.name ?? <span className="text-warning">No guide</span>}</p>
            <p className="truncate text-xs text-muted">
              {row.vehicle?.registration ?? <span className="text-warning">No vehicle</span>}
            </p>
          </div>
        ),
      },
      {
        key: 'issues',
        header: 'Issues',
        align: 'center',
        render: (row) => {
          const open = (row.issues ?? []).filter((issue) => issue.status !== 'RESOLVED').length;
          return open === 0 ? (
            <span className="text-xs text-muted">Clear</span>
          ) : (
            <StatusChip status={open > 1 ? 'HIGH' : 'MEDIUM'} label={`${open} open`} />
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
      title="Trips & dispatch"
      subtitle="Assign crews and vehicles, drive live progress, and close out issues before the next departure."
      actions={<RefreshButton pending={list.isFetching} onPress={refresh} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Trips on screen" icon="compass" tone="accent" loading={list.isLoading} value={rows.length} hint="Loaded page" />
        <StatCard
          label="Missing crew or vehicle"
          icon="alert"
          tone={unassigned > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={unassigned}
          hint="Assign before departure"
        />
        <StatCard
          label="Open issues"
          icon="buoy"
          tone={openIssues > 0 ? 'danger' : 'default'}
          loading={list.isLoading}
          value={openIssues}
          hint="Reported and unresolved"
        />
        <StatCard
          label="In motion"
          icon="bolt"
          tone="success"
          loading={list.isLoading}
          value={rows.filter((row) => row.status && !['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(row.status)).length}
          hint="Live right now"
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
          <SearchInput value={search} onChange={setSearch} placeholder="Trip, guide, plate or booking…" />
        </FilterField>
        <FilterField label="Status">
          <SelectInput value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Trips could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Dispatch board" description="Open a trip to assign, advance progress and log issues." icon="compass" bodyClassName="px-0 py-0">
        <DataTable
          label="Trips"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No trips match"
          emptyDescription="Trips are created automatically when a booking is confirmed."
          footer={
            <TableFooter
              summary={`${rows.length} trip${rows.length === 1 ? '' : 's'}`}
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

      <TripDetail id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail -- */

function TripDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<'overview' | 'assign' | 'progress' | 'issues' | 'handover'>('overview');
  const trip = useApi<Trip>(id ? `/trips/${id}` : null);
  const events = useList<TripEvent>(id ? `/trips/${id}/events` : null);
  const issues = useList<TripIssue>(id ? `/trips/${id}/issues` : null);
  const staff = useList<StaffMember>('/admin/staff', { limit: 100 });
  const vehicles = useList<Vehicle>('/admin/vehicles', { limit: 100 });
  const command = useCommand({
    invalidate: [['api', `/trips/${id}`], ['list', `/trips/${id}/issues`], ['list', `/trips/${id}/events`], ['list', '/trips']],
    successMessage: false,
  });

  const row = trip.data;
  const [assignment, setAssignment] = useState({ guideId: '', vehicleId: '', pickupAt: '', note: '' });
  const [progress, setProgress] = useState({ target: '', note: '' });
  const [issueDraft, setIssueDraft] = useState({ category: 'DELAY', severity: 'MEDIUM', description: '', share: false });
  const [handover, setHandover] = useState({ notes: '', travelersDroppedOff: false, vehicleChecked: false, issuesAcknowledged: false });
  const [message, setMessage] = useState('');

  async function act(
    path: string,
    body: Record<string, unknown>,
    toast: string,
    method: 'POST' | 'PATCH' = 'POST',
    reauth?: string,
  ) {
    await command.run(path, method, { body, successMessage: toast, ...(reauth ? { reauth } : {}) });
    void trip.refetch();
    void events.refetch();
    void issues.refetch();
    onChanged();
  }

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.reference ?? 'Trip'}
      subtitle={row ? `${row.travelerCount} travellers · ${formatDate(row.startsAt)} → ${formatDate(row.endsAt)}` : 'Loading…'}
      chip={row ? <StatusChip status={row.status} /> : null}
      footer={
        row ? (
          <Button size="sm" variant="tertiary" onPress={() => void trip.refetch()} isPending={trip.isFetching}>
            <Icon name="refresh" size={15} />
            Refresh
          </Button>
        ) : null
      }
    >
      {trip.isError ? <ErrorPanel message="This trip could not be loaded." details={errorMessage(trip.error)} /> : null}
      {trip.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'assign', label: 'Assignment' },
          { value: 'progress', label: 'Progress', count: events.data?.rows.length },
          { value: 'issues', label: 'Issues', count: issues.data?.rows.length },
          { value: 'handover', label: 'Handover' },
        ]}
      />

      {tab === 'overview' && row
        ? definitionList([
            { label: 'Reference', value: row.reference },
            { label: 'Status', value: <StatusChip status={row.status} /> },
            { label: 'Version', value: row.version },
            { label: 'Timezone', value: row.timezone },
            { label: 'Departs', value: formatDateTime(row.startsAt) },
            { label: 'Ends', value: formatDateTime(row.endsAt) },
            { label: 'Guide', value: row.guide ? `${row.guide.name}${row.guide.phone ? ` · ${row.guide.phone}` : ''}` : 'Unassigned' },
            { label: 'Vehicle', value: row.vehicle ? `${row.vehicle.registration ?? '—'} · ${row.vehicle.seats ?? '?'} seats` : 'Unassigned' },
            {
              label: 'Pickup',
              value: row.pickup ? (
                <span>
                  {row.pickup.label ?? '—'}
                  {row.pickup.pickupAt ? <span className="block text-xs text-muted">{formatDateTime(row.pickup.pickupAt)}</span> : null}
                </span>
              ) : (
                'Not set'
              ),
            },
            { label: 'Lead contact', value: row.leadContact?.name ?? '—' },
            { label: 'Phone', value: row.leadContact?.phone ?? '—' },
          ])
        : null}

      {tab === 'assign' && row ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Assignment is idempotent and re-checks availability. Existing allocations for the same window are rejected by the planner.
          </p>
          <FieldGrid columns={2}>
            <SelectInput
              label="Guide"
              value={assignment.guideId || row.guide?.id || ''}
              onChange={(value) => setAssignment((current) => ({ ...current, guideId: value }))}
              placeholder="Choose a guide"
              options={(staff.data?.rows ?? []).map((member) => ({
                value: member.id,
                label: `${member.displayName}${member.languages?.length ? ` · ${member.languages.join(', ')}` : ''}`,
              }))}
            />
            <SelectInput
              label="Vehicle"
              value={assignment.vehicleId || row.vehicle?.id || ''}
              onChange={(value) => setAssignment((current) => ({ ...current, vehicleId: value }))}
              placeholder="Choose a vehicle"
              options={(vehicles.data?.rows ?? [])
                .filter((vehicle) => vehicle.status === 'ACTIVE')
                .map((vehicle) => ({
                  value: vehicle.id,
                  label: `${vehicle.registration} · ${labelize(vehicle.type)} · ${vehicle.seats} seats`,
                }))}
            />
            <TextInput
              label="Pickup timestamp"
              value={assignment.pickupAt}
              onChange={(value) => setAssignment((current) => ({ ...current, pickupAt: value }))}
              placeholder="2026-11-02T06:30:00+03:00"
              description="ISO 8601 with offset. Defaults to the trip start when omitted."
            />
            <TextInput
              label="Note for the crew"
              value={assignment.note}
              onChange={(value) => setAssignment((current) => ({ ...current, note: value }))}
            />
          </FieldGrid>
          <Button
            variant="primary"
            size="sm"
            isPending={command.pending}
            isDisabled={!(assignment.guideId || row.guide?.id) || !(assignment.vehicleId || row.vehicle?.id)}
            onPress={async () => {
              const pickupAt = assignment.pickupAt || new Date(row.startsAt).toISOString();
              await act(
                `/trips/${row.id}/assignments`,
                {
                  expectedVersion: row.version,
                  guideId: assignment.guideId || row.guide?.id,
                  vehicleId: assignment.vehicleId || row.vehicle?.id,
                  pickupAt,
                  pickupTimezone: row.timezone ?? 'Africa/Dar_es_Salaam',
                  ...(assignment.note ? { note: assignment.note } : {}),
                  ...(row.guide?.id || row.vehicle?.id
                    ? {
                        reason:
                          (assignment.note ?? '').trim().length >= 10
                            ? assignment.note
                            : 'Crew reassignment recorded from the operations console.',
                      }
                    : {}),
                },
                'Crew assigned.',
                'POST',
                'assignment.manage',
              );
            }}
          >
            <Icon name="users" size={15} />
            Save assignment
          </Button>
        </div>
      ) : null}

      {tab === 'progress' && row ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Current status</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusChip status={row.status} />
              <span className="text-xs text-muted">version {row.version}</span>
            </div>
          </div>

          <FieldGrid columns={2}>
            <SelectInput
              label="Advance to"
              value={progress.target}
              onChange={(value) => setProgress((current) => ({ ...current, target: value }))}
              placeholder="Choose the next state"
              options={PROGRESS_TARGETS.map((target) => ({ value: target, label: labelize(target) }))}
            />
            <TextInput label="Note" value={progress.note} onChange={(value) => setProgress((current) => ({ ...current, note: value }))} />
          </FieldGrid>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              isPending={command.pending}
              isDisabled={!progress.target}
              onPress={() =>
                act(
                  `/trips/${row.id}/progress`,
                  {
                    expectedVersion: row.version,
                    eventType: 'STATUS_ADVANCE',
                    targetStatus: progress.target,
                    ...(progress.note ? { note: progress.note } : {}),
                  },
                  `Trip advanced to ${labelize(progress.target)}.`,
                )
              }
            >
              <Icon name="bolt" size={14} />
              Advance status
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              isPending={command.pending}
              isDisabled={progress.note.trim().length < 2}
              onPress={() =>
                act(
                  `/trips/${row.id}/progress`,
                  { expectedVersion: row.version, eventType: 'DAY_NOTE', note: progress.note },
                  'Day note recorded.',
                )
              }
            >
              Log day note
            </Button>
          </div>

          <Separator />

          <div>
            <p className="font-ui mb-2 text-[13px] font-semibold">Share an update with the traveller</p>
            <TextAreaInput label="Message" value={message} onChange={setMessage} rows={3} />
            <Button
              className="mt-2"
              size="sm"
              variant="tertiary"
              isPending={command.pending}
              isDisabled={message.trim().length < 2}
              onPress={async () => {
                await act(
                  `/trips/${row.id}/customer-updates`,
                  { expectedVersion: row.version, message: message.trim() },
                  'Traveller notified.',
                );
                setMessage('');
              }}
            >
              <Icon name="mail" size={14} />
              Send update
            </Button>
          </div>

          <Separator />

          <div>
            <p className="font-ui mb-2 text-[13px] font-semibold">Event stream</p>
            {events.isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (events.data?.rows ?? []).length === 0 ? (
              <EmptyState compact icon="clock" title="No events recorded yet" />
            ) : (
              <ol className="space-y-2">
                {(events.data?.rows ?? []).map((event) => (
                  <li key={event.id} className="flex gap-3 rounded-xl border border-separator px-3 py-2">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-default/70 text-muted">
                      <Icon name="bolt" size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{labelize(event.eventType ?? event.type ?? 'event')}</p>
                      {event.note ? <p className="truncate text-xs text-muted">{truncate(event.note, 100)}</p> : null}
                      <p className="text-[11px] text-muted">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'issues' && row ? (
        <div className="space-y-4">
          <FieldGrid columns={3}>
            <SelectInput
              label="Category"
              value={issueDraft.category}
              onChange={(value) => setIssueDraft((current) => ({ ...current, category: value }))}
              options={['DELAY', 'VEHICLE', 'CUSTOMER_NO_SHOW', 'MEDICAL_SAFETY', 'WEATHER_ROUTE', 'OTHER'].map((value) => ({
                value,
                label: labelize(value),
              }))}
            />
            <SelectInput
              label="Severity"
              value={issueDraft.severity}
              onChange={(value) => setIssueDraft((current) => ({ ...current, severity: value }))}
              options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => ({ value, label: labelize(value) }))}
            />
            <div className="pt-6">
              <CheckInput
                label="Share summary with traveller"
                value={issueDraft.share}
                onChange={(value) => setIssueDraft((current) => ({ ...current, share: value }))}
              />
            </div>
          </FieldGrid>
          <TextAreaInput
            label="What happened?"
            value={issueDraft.description}
            rows={3}
            onChange={(value) => setIssueDraft((current) => ({ ...current, description: value }))}
          />
          <Button
            size="sm"
            variant="primary"
            isPending={command.pending}
            isDisabled={issueDraft.description.trim().length < 5}
            onPress={async () => {
              await act(
                `/trips/${row.id}/issues`,
                {
                  category: issueDraft.category,
                  severity: issueDraft.severity,
                  description: issueDraft.description.trim(),
                  attachmentIds: [],
                  shareSummaryWithCustomer: issueDraft.share,
                },
                'Issue reported.',
              );
              setIssueDraft((current) => ({ ...current, description: '' }));
            }}
          >
            <Icon name="alert" size={14} />
            Report issue
          </Button>

          <Separator />

          {issues.isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (issues.data?.rows ?? []).length === 0 ? (
            <EmptyState compact icon="buoy" title="No issues reported" />
          ) : (
            <ul className="space-y-2">
              {(issues.data?.rows ?? []).map((issue) => (
                <li key={issue.id} className="rounded-xl border border-separator p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{labelize(issue.category)}</p>
                      <p className="truncate text-xs text-muted">{truncate(issue.description, 120)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={issue.severity} />
                      <StatusChip status={issue.status} />
                    </div>
                  </div>
                  {issue.status !== 'RESOLVED' ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['ACKNOWLEDGED', 'RESOLVED'] as const).map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === 'RESOLVED' ? 'primary' : 'tertiary'}
                          onPress={() =>
                            act(
                              `/trip-issues/${issue.id}`,
                              { expectedVersion: (issue as { version?: number }).version ?? row.version, status: next },
                              `Issue ${labelize(next).toLowerCase()}.`,
                              'PATCH',
                            )
                          }
                        >
                          {labelize(next)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'handover' && row ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Handover closes the trip. All three checks must be confirmed by the crew before the trip can be completed.
          </p>
          <div className="space-y-2">
            <CheckInput
              label="Travellers dropped off"
              value={handover.travelersDroppedOff}
              onChange={(value) => setHandover((current) => ({ ...current, travelersDroppedOff: value }))}
            />
            <CheckInput
              label="Vehicle checked and cleaned"
              value={handover.vehicleChecked}
              onChange={(value) => setHandover((current) => ({ ...current, vehicleChecked: value }))}
            />
            <CheckInput
              label="Issues acknowledged"
              value={handover.issuesAcknowledged}
              onChange={(value) => setHandover((current) => ({ ...current, issuesAcknowledged: value }))}
            />
          </div>
          <TextAreaInput
            label="Handover notes"
            value={handover.notes}
            rows={3}
            onChange={(value) => setHandover((current) => ({ ...current, notes: value }))}
          />
          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="primary"
                  isDisabled={
                    !handover.travelersDroppedOff || !handover.vehicleChecked || !handover.issuesAcknowledged || handover.notes.trim().length < 3
                  }
                >
                  <Icon name="check" size={14} />
                  Complete handover
                </Button>
              }
              title="Complete trip handover"
              description="The trip moves to Completed and the traveller is invited to leave a review."
              confirmLabel="Complete handover"
              destructive={false}
              onConfirm={(reason) =>
                act(
                  `/trips/${row.id}/handover`,
                  {
                    expectedVersion: row.version,
                    notes: `${handover.notes.trim()}${reason ? '' : ''}`,
                    checklist: {
                      travelersDroppedOff: handover.travelersDroppedOff,
                      vehicleChecked: handover.vehicleChecked,
                      issuesAcknowledged: handover.issuesAcknowledged,
                    },
                  },
                  'Trip completed.',
                )
              }
            />
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger">
                  <Icon name="x" size={14} />
                  Force status correction
                </Button>
              }
              title="Correct the trip status"
              description="Corrections are privileged, audited actions used when the live state drifted from reality."
              confirmLabel="Apply correction"
              onConfirm={(reason) =>
                act(
                  `/trips/${row.id}/progress-corrections`,
                  { expectedVersion: row.version, targetStatus: 'CANCELLED', reason },
                  'Status corrected.',
                  'POST',
                  'assignment.manage',
                )
              }
            />
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  );
}
