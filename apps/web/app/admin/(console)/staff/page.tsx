'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  CheckInput,
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
import type { StaffMember } from '../../lib/types';

type StaffRole = 'OPERATIONS' | 'DRIVER_GUIDE';

const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'DRIVER_GUIDE', label: 'Driver / guide' },
];

interface StaffDetail extends StaffMember {
  assignments?: Array<{ id: string; tripId: string }>;
}

interface InviteDraft {
  name: string;
  email: string;
  phone: string;
  operations: boolean;
  driverGuide: boolean;
  languages: string[];
  capabilities: string[];
  reason: string;
}

const EMPTY_INVITE: InviteDraft = {
  name: '',
  email: '',
  phone: '',
  operations: true,
  driverGuide: false,
  languages: [],
  capabilities: [],
  reason: '',
};

export default function StaffPage() {
  const filters = useFilters({ search: '', role: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const staff = useList<StaffMember>('/admin/staff', { limit: pagination.limit, cursor: pagination.cursor });
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InviteDraft>(EMPTY_INVITE);
  const [edit, setEdit] = useState({ displayName: '', phone: '', languages: '', capabilities: '' });
  const [availabilityFor, setAvailabilityFor] = useState<StaffMember | null>(null);
  const [availability, setAvailability] = useState({ startsAt: '', endsAt: '', type: 'AVAILABLE', note: '' });

  const detail = useApi<StaffDetail>(selected ? `/admin/staff/${selected.id}` : null, {}, { enabled: Boolean(selected) });
  const command = useCommand({ invalidate: [['list', '/admin/staff']], successMessage: false });

  const rows = useMemo(() => {
    const list = staff.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((member) => {
      const roles = (member.user?.roles ?? []).map((grant) => grant.role);
      const matchesRole = !filters.values.role || roles.includes(filters.values.role);
      const matchesSearch =
        !term ||
        [member.displayName, member.user?.email, ...(member.languages ?? []), ...(member.capabilities ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesRole && matchesSearch;
    });
  }, [filters.values.role, search, staff.data]);

  const stats = useMemo(() => {
    const list = staff.data?.rows ?? [];
    const withRole = (role: string) => list.filter((member) => (member.user?.roles ?? []).some((grant) => grant.role === role));
    return {
      total: list.length,
      active: list.filter((member) => member.active !== false).length,
      guides: withRole('DRIVER_GUIDE').length,
      operations: withRole('OPERATIONS').length,
    };
  }, [staff.data]);

  async function saveEdit() {
    if (!editing) return;
    await command.run(`/admin/staff/${editing.id}`, 'PATCH', {
      body: {
        expectedVersion: editing.version,
        displayName: edit.displayName.trim(),
        phone: edit.phone.trim() || undefined,
        languages: edit.languages.split(',').map((value) => value.trim()).filter(Boolean),
        capabilities: edit.capabilities.split(',').map((value) => value.trim()).filter(Boolean),
      },
      successMessage: 'Staff profile updated.',
    });
    void staff.refetch();
    void detail.refetch();
  }

  const columns: Array<Column<StaffMember>> = [
    {
      key: 'name',
      header: 'Team member',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.displayName}</p>
          <p className="truncate text-xs text-muted">{row.user?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.user?.roles ?? []).map((grant) => (
            <StatusChip key={grant.role} status={grant.role} label={labelize(grant.role)} />
          ))}
          {(row.user?.roles ?? []).length === 0 ? <span className="text-xs text-muted">—</span> : null}
        </div>
      ),
    },
    {
      key: 'languages',
      header: 'Languages',
      hideBelow: 'lg',
      render: (row) => (
        <span className="text-sm text-muted">{(row.languages ?? []).join(', ') || '—'}</span>
      ),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      hideBelow: 'xl',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.capabilities ?? []).slice(0, 2).map((capability) => (
            <TagPill key={capability}>{capability}</TagPill>
          ))}
          {(row.capabilities ?? []).length > 2 ? <TagPill>+{(row.capabilities ?? []).length - 2}</TagPill> : null}
          {(row.capabilities ?? []).length === 0 ? <span className="text-xs text-muted">—</span> : null}
        </div>
      ),
    },
    {
      key: 'identity',
      header: 'Identity',
      render: (row) => <StatusChip status={row.user?.status ?? 'ACTIVE'} />,
    },
    {
      key: 'active',
      header: 'Deployable',
      render: (row) => <StatusChip status={row.active === false ? 'SUSPENDED' : 'ACTIVE'} label={row.active === false ? 'Suspended' : 'Available'} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
            <Icon name="eye" size={15} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setEditing(row);
              setEdit({
                displayName: row.displayName,
                phone: row.phone ?? '',
                languages: (row.languages ?? []).join(', '),
                capabilities: (row.capabilities ?? []).join(', '),
              });
            }}
          >
            <Icon name="edit" size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Fleet & team"
      title="Staff & guides"
      subtitle="Guides, drivers and operations staff. Roles decide what each person can do; availability and leave decide who can be dispatched."
      actions={
        <>
          <RefreshButton pending={staff.isFetching} onPress={() => void staff.refetch()} />
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setInvite(EMPTY_INVITE);
              setInviteOpen(true);
            }}
          >
            <Icon name="plus" size={15} />
            Invite staff
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Team" icon="id" tone="accent" loading={staff.isLoading} value={stats.total} hint="Staff profiles" />
        <StatCard label="Deployable" icon="check" tone="success" loading={staff.isLoading} value={stats.active} hint="Not suspended" />
        <StatCard label="Guides & drivers" icon="compass" tone="default" loading={staff.isLoading} value={stats.guides} hint="DRIVER_GUIDE role" />
        <StatCard label="Operations" icon="buoy" tone="default" loading={staff.isLoading} value={stats.operations} hint="OPERATIONS role" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput value={filters.values.search ?? ''} onChange={(value) => filters.set('search', value)} placeholder="Name, email, language or capability" />
        </FilterField>
        <FilterField label="Role">
          <SelectInput
            value={filters.values.role ?? ''}
            onChange={(value) => filters.set('role', value)}
            options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
          />
        </FilterField>
      </FilterBar>

      {staff.isError ? (
        <ErrorPanel message="The staff directory could not be loaded." details={errorMessage(staff.error)} onRetry={() => void staff.refetch()} />
      ) : null}

      <Panel title="Directory" description="Invitations create the identity; access is managed from Access & roles." icon="id">
        <DataTable
          label="Staff directory"
          columns={columns}
          rows={rows}
          loading={staff.isLoading}
          onRowPress={(row) => setSelected(row)}
          emptyTitle="No staff yet"
          emptyDescription="Invite a guide, driver or operations colleague to get started."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={staff.data?.meta.hasMore}
              pending={staff.isFetching}
              onNext={() => pagination.next(staff.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      {/* ------------------------------------------------------------------ invite */}
      <FormDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite a team member"
        description="The invitee receives a secure link, sets a password and lands with the roles you pick."
        submitLabel="Send invitation"
        onSubmit={async () => {
          const roles: StaffRole[] = [];
          if (invite.operations) roles.push('OPERATIONS');
          if (invite.driverGuide) roles.push('DRIVER_GUIDE');
          await command.run('/admin/staff/invitations', 'POST', {
            body: {
              name: invite.name.trim(),
              email: invite.email.trim(),
              phone: invite.phone.trim() || undefined,
              roles,
              languages: invite.languages,
              capabilities: invite.capabilities,
              reason: invite.reason,
            },
            reauth: 'staff.manage',
            successMessage: 'Invitation sent.',
          });
          void staff.refetch();
        }}
        disabled={
          invite.name.trim().length < 2 ||
          !invite.email.includes('@') ||
          (!invite.operations && !invite.driverGuide) ||
          invite.reason.trim().length < 10
        }
      >
        <div className="space-y-3">
          <FieldGrid>
            <TextInput label="Full name" value={invite.name} isRequired onChange={(value) => setInvite((c) => ({ ...c, name: value }))} />
            <TextInput label="Work email" type="email" value={invite.email} isRequired inputMode="email" onChange={(value) => setInvite((c) => ({ ...c, email: value }))} />
          </FieldGrid>
          <TextInput label="Phone" value={invite.phone} inputMode="tel" onChange={(value) => setInvite((c) => ({ ...c, phone: value }))} />
          <div className="space-y-2">
            <CheckInput
              label="Operations"
              value={invite.operations}
              onChange={(value) => setInvite((c) => ({ ...c, operations: value }))}
              description="Quotes, bookings, dispatch and finance workflows."
            />
            <CheckInput
              label="Driver / guide"
              value={invite.driverGuide}
              onChange={(value) => setInvite((c) => ({ ...c, driverGuide: value }))}
              description="Assigned trips, progress, issues and handover."
            />
          </div>
          <StringListInput label="Languages" value={invite.languages} onChange={(value) => setInvite((c) => ({ ...c, languages: value }))} rows={3} />
          <StringListInput
            label="Capabilities"
            value={invite.capabilities}
            onChange={(value) => setInvite((c) => ({ ...c, capabilities: value }))}
            description="Kili trek, birding, photography, zanzibar transfers…"
            rows={3}
          />
          <TextAreaInput
            label="Reason (recorded in the audit log)"
            rows={3}
            value={invite.reason}
            onChange={(value) => setInvite((c) => ({ ...c, reason: value }))}
            description="At least 10 characters."
          />
        </div>
      </FormDialog>

      {/* -------------------------------------------------------------------- edit */}
      <FormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={`Edit ${editing?.displayName ?? ''}`}
        submitLabel="Save profile"
        onSubmit={saveEdit}
      >
        <div className="space-y-3">
          <TextInput label="Display name" value={edit.displayName} isRequired onChange={(value) => setEdit((c) => ({ ...c, displayName: value }))} />
          <TextInput label="Phone" value={edit.phone} inputMode="tel" onChange={(value) => setEdit((c) => ({ ...c, phone: value }))} />
          <TextInput label="Languages (comma separated)" value={edit.languages} onChange={(value) => setEdit((c) => ({ ...c, languages: value }))} />
          <TextInput label="Capabilities (comma separated)" value={edit.capabilities} onChange={(value) => setEdit((c) => ({ ...c, capabilities: value }))} />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------ availability */}
      <FormDialog
        open={Boolean(availabilityFor)}
        onOpenChange={(open) => {
          if (!open) setAvailabilityFor(null);
        }}
        title={`Availability — ${availabilityFor?.displayName ?? ''}`}
        description="Blocks reserve a person's time so dispatch cannot double-book them."
        submitLabel="Save availability"
        onSubmit={async () => {
          if (!availabilityFor) return;
          await command.run(`/admin/staff/${availabilityFor.id}/availability`, 'POST', {
            body: {
              startsAt: new Date(availability.startsAt).toISOString(),
              endsAt: new Date(availability.endsAt).toISOString(),
              type: availability.type,
              note: availability.note || undefined,
            },
            successMessage: 'Availability saved.',
          });
          void detail.refetch();
        }}
        disabled={!availability.startsAt || !availability.endsAt}
      >
        <div className="space-y-3">
          <SelectInput
            label="Type"
            value={availability.type}
            onChange={(value) => setAvailability((c) => ({ ...c, type: value }))}
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'LEAVE', label: 'Leave' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]}
          />
          <FieldGrid>
            <TextInput label="Starts at" type="datetime-local" value={availability.startsAt} onChange={(value) => setAvailability((c) => ({ ...c, startsAt: value }))} />
            <TextInput label="Ends at" type="datetime-local" value={availability.endsAt} onChange={(value) => setAvailability((c) => ({ ...c, endsAt: value }))} />
          </FieldGrid>
          <TextAreaInput label="Note" rows={2} value={availability.note} onChange={(value) => setAvailability((c) => ({ ...c, note: value }))} />
        </div>
      </FormDialog>

      {/* ------------------------------------------------------------------ detail */}
      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.displayName ?? ''}
        subtitle={selected?.user?.email}
        chip={selected ? <StatusChip status={selected.active === false ? 'SUSPENDED' : 'ACTIVE'} /> : null}
        fields={
          selected
            ? [
                { label: 'Roles', value: (selected.user?.roles ?? []).map((grant) => labelize(grant.role)).join(' · ') || '—' },
                { label: 'Identity', value: selected.user?.status ?? '—' },
                { label: 'Phone', value: selected.phone || '—' },
                { label: 'Languages', value: (selected.languages ?? []).join(', ') || '—' },
                { label: 'Capabilities', value: (selected.capabilities ?? []).join(' · ') || '—', full: true },
                { label: 'Profile version', value: `v${selected.version}` },
                { label: 'Onboarded', value: formatDateTime(selected.createdAt) },
              ]
            : []
        }
        sections={[
          {
            title: 'Availability & assignments',
            content: detail.isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <div className="space-y-4">
                {(detail.data?.availability ?? []).length === 0 ? (
                  <EmptyState compact icon="calendar" title="No availability windows" description="Add leave or blocked time so dispatch respects it." />
                ) : (
                  <ul className="divide-y divide-separator rounded-xl border border-separator">
                    {(detail.data?.availability ?? []).map((window) => (
                      <li key={window.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {formatDate(window.startsAt)} → {formatDate(window.endsAt)}
                          </p>
                          <p className="truncate text-xs text-muted">{window.note || 'No note'}</p>
                        </div>
                        <StatusChip status={window.type} />
                      </li>
                    ))}
                  </ul>
                )}
                <Separator />
                <Panel variant="secondary" title="Open assignments" icon="compass">
                  {(detail.data?.assignments ?? []).length === 0 ? (
                    <p className="text-sm text-muted">Not currently assigned to any trip.</p>
                  ) : (
                    definitionList([
                      { label: 'Active trips', value: (detail.data?.assignments ?? []).length },
                      {
                        label: 'Trip ids',
                        value: (detail.data?.assignments ?? []).map((assignment) => assignment.tripId.slice(0, 8)).join(', '),
                      },
                    ])
                  )}
                </Panel>
              </div>
            ),
          },
        ]}
        footer={
          selected ? (
            <>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  setEditing(selected);
                  setEdit({
                    displayName: selected.displayName,
                    phone: selected.phone ?? '',
                    languages: (selected.languages ?? []).join(', '),
                    capabilities: (selected.capabilities ?? []).join(', '),
                  });
                  setSelected(null);
                }}
              >
                <Icon name="edit" size={15} />
                Edit profile
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  setAvailabilityFor(selected);
                  setAvailability({ startsAt: '', endsAt: '', type: 'AVAILABLE', note: '' });
                  setSelected(null);
                }}
              >
                <Icon name="calendar" size={15} />
                Add availability
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant={selected.active === false ? 'primary' : 'danger'} size="sm">
                    <Icon name={selected.active === false ? 'check' : 'lock'} size={15} />
                    {selected.active === false ? 'Reactivate' : 'Suspend'}
                  </Button>
                }
                title={`${selected.active === false ? 'Reactivate' : 'Suspend'} ${selected.displayName}`}
                description={
                  selected.active === false
                    ? 'The team member becomes deployable again.'
                    : 'Suspended staff cannot be assigned to trips and lose session access.'
                }
                confirmLabel={selected.active === false ? 'Reactivate' : 'Suspend'}
                destructive={selected.active !== false}
                onConfirm={async (reason) => {
                  await command.run(
                    `/admin/staff/${selected.id}/${selected.active === false ? 'reactivate' : 'suspend'}`,
                    'POST',
                    { body: { expectedVersion: selected.version, reason }, reauth: 'staff.manage', successMessage: 'Staff status updated.' },
                  );
                  void staff.refetch();
                  setSelected(null);
                }}
              />
            </>
          ) : null
        }
      >
        {selected ? (
          <Panel variant="secondary" title="Dispatch readiness" icon="check">
            {definitionList([
              { label: 'Deployable', value: selected.active === false ? 'No — suspended' : 'Yes' },
              { label: 'Languages', value: (selected.languages ?? []).join(', ') || '—' },
              { label: 'Open windows', value: (detail.data?.availability ?? []).length },
            ])}
          </Panel>
        ) : null}
      </DetailDrawer>
    </Page>
  );
}
