'use client';

import { Button, Separator } from '@heroui/react';
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
  FilterBar,
  FilterField,
  Page,
  Panel,
  RefreshButton,
  SearchInput,
  StatCard,
  StatGrid,
  StatusChip,
  TabStrip,
  TagPill,
  TextAreaInput,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useApi, useCommand } from '../../lib/hooks';
import { labelize } from '../../lib/format';
import type { AccessSnapshot } from '../../lib/types';

type RoleName = 'OPERATIONS' | 'DRIVER_GUIDE' | 'ADMIN' | 'CUSTOMER';

interface AccessUser {
  id: string;
  email: string;
  status: string;
  version: number;
  roles: Array<{ role: RoleName }>;
  permissionOverrides?: Array<{ action: string; allow: boolean; reason?: string | null }>;
  staff?: { displayName?: string } | null;
  customer?: { name?: string } | null;
}

const ROLES: RoleName[] = ['OPERATIONS', 'DRIVER_GUIDE', 'ADMIN'];

/** Group permissions into readable families for the override matrix. */
function groupPermissions(permissions: string[]) {
  const groups = new Map<string, string[]>();
  for (const permission of permissions) {
    const [family] = permission.split('.');
    groups.set(family ?? 'other', [...(groups.get(family ?? 'other') ?? []), permission]);
  }
  return [...groups.entries()]
    .map(([family, actions]) => ({ family, actions: actions.sort() }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

export default function AccessPage() {
  const snapshot = useApi<AccessSnapshot>('/admin/access');
  const filters = useFilters({ search: '' });
  const [selected, setSelected] = useState<AccessUser | null>(null);
  const [tab, setTab] = useState<'overview' | 'roles' | 'permissions'>('overview');
  const [draft, setDraft] = useState<{ roles: RoleName[]; overrides: Record<string, boolean>; reason: string }>({
    roles: [],
    overrides: {},
    reason: '',
  });

  const command = useCommand({ invalidate: [['api', '/admin/access']], successMessage: false });

  const users = useMemo(() => ((snapshot.data?.users ?? []) as unknown as AccessUser[]), [snapshot.data]);

  const rows = useMemo(() => {
    const term = (filters.values.search ?? '').trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.email, user.staff?.displayName, user.customer?.name, ...user.roles.map((grant) => grant.role)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [filters.values.search, users]);

  const stats = useMemo(() => {
    const byRole = (role: RoleName) => users.filter((user) => user.roles.some((grant) => grant.role === role)).length;
    return {
      total: users.length,
      admins: byRole('ADMIN'),
      staff: byRole('OPERATIONS') + byRole('DRIVER_GUIDE'),
      customers: byRole('CUSTOMER'),
      permissionCount: (snapshot.data?.permissions ?? []).length,
    };
  }, [snapshot.data, users]);

  const roleDefaults = (snapshot.data?.roleDefaults ?? {}) as Record<string, string[]>;
  const permissionGroups = useMemo(() => groupPermissions(snapshot.data?.permissions ?? []), [snapshot.data]);

  function openEditor(user: AccessUser) {
    setSelected(user);
    setTab('overview');
    setDraft({
      roles: user.roles.map((grant) => grant.role).filter((role): role is RoleName => role !== 'CUSTOMER'),
      overrides: Object.fromEntries((user.permissionOverrides ?? []).map((override) => [override.action, override.allow])),
      reason: '',
    });
  }

  const columns: Array<Column<AccessUser>> = [
    {
      key: 'identity',
      header: 'Identity',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.staff?.displayName ?? row.customer?.name ?? row.email}</p>
          <p className="truncate text-xs text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.length === 0 ? <span className="text-xs text-muted">No roles</span> : null}
          {row.roles.map((grant) => (
            <StatusChip key={grant.role} status={grant.role} label={labelize(grant.role)} />
          ))}
        </div>
      ),
    },
    {
      key: 'overrides',
      header: 'Overrides',
      hideBelow: 'lg',
      render: (row) =>
        (row.permissionOverrides ?? []).length === 0 ? (
          <span className="text-xs text-muted">Role defaults</span>
        ) : (
          <TagPill icon="sliders">{(row.permissionOverrides ?? []).length} custom</TagPill>
        ),
    },
    { key: 'status', header: 'Identity status', render: (row) => <StatusChip status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button size="sm" variant="ghost" onPress={() => openEditor(row)}>
          <Icon name="shield" size={15} />
        </Button>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Governance"
      title="Access & roles"
      subtitle="Roles grant the base permission set; per-user overrides fine-tune it. Sensitive changes require a password confirmation and are audited."
      actions={<RefreshButton pending={snapshot.isFetching} onPress={() => void snapshot.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Identities" icon="users" tone="accent" loading={snapshot.isLoading} value={stats.total} hint="First 50 accounts" />
        <StatCard label="Admins" icon="shield" tone="danger" loading={snapshot.isLoading} value={stats.admins} hint="Unrestricted access" />
        <StatCard label="Staff" icon="id" tone="default" loading={snapshot.isLoading} value={stats.staff} hint="Operations & guides" />
        <StatCard
          label="Permissions"
          icon="sliders"
          tone="success"
          loading={snapshot.isLoading}
          value={stats.permissionCount}
          hint="Granular actions available"
        />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Email, name or role"
          />
        </FilterField>
      </FilterBar>

      {snapshot.isError ? (
        <ErrorPanel message="The access snapshot could not be loaded." details={errorMessage(snapshot.error)} onRetry={() => void snapshot.refetch()} />
      ) : null}

      <Panel title="Identities" description="Role defaults apply first; overrides win on a per-action basis." icon="shield">
        <DataTable
          label="Access directory"
          columns={columns}
          rows={rows}
          loading={snapshot.isLoading}
          onRowPress={openEditor}
          emptyTitle="No identities"
          emptyDescription="Invite staff from the Staff page to create the first identity."
        />
      </Panel>

      <Panel title="Role defaults" description="What each role can do before any per-user override is applied." icon="cog">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(roleDefaults).map(([role, actions]) => (
            <div key={role} className="rounded-xl border border-separator bg-surface-secondary/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{labelize(role)}</p>
                <TagPill>{actions.length}</TagPill>
              </div>
              <div className="flex flex-wrap gap-1">
                {actions.map((action) => (
                  <TagPill key={action}>{action}</TagPill>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.staff?.displayName ?? selected?.customer?.name ?? selected?.email ?? ''}
        subtitle={selected?.email}
        chip={selected ? <StatusChip status={selected.roles[0]?.role ?? 'NO_ROLE'} label={labelize(selected.roles[0]?.role ?? 'No role')} /> : null}
        footer={
          selected ? (
            <ConfirmDialog
              trigger={
                <Button variant="primary" size="sm">
                  <Icon name="shield" size={15} />
                  Apply access changes
                </Button>
              }
              title="Confirm the access change"
              description="Removing the last admin is blocked by the API. Your password confirms the intent and the change is audited."
              confirmLabel="Apply changes"
              destructive={false}
              onConfirm={async (reason) => {
                await command.run(`/admin/access/users/${selected.id}`, 'PATCH', {
                  body: {
                    expectedVersion: selected.version,
                    roles: draft.roles,
                    overrides: Object.entries(draft.overrides).map(([action, allow]) => ({ action, allow })),
                    reason,
                  },
                  reauth: 'access.manage',
                  successMessage: 'Access updated.',
                });
                void snapshot.refetch();
                setSelected(null);
              }}
            />
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <TabStrip
              value={tab}
              onChange={setTab}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'roles', label: 'Roles', count: draft.roles.length },
                { value: 'permissions', label: 'Overrides', count: Object.keys(draft.overrides).length },
              ]}
            />

            {tab === 'overview' ? (
              <Panel variant="secondary" title="Identity" icon="id">
                {definitionList([
                  { label: 'Email', value: selected.email },
                  { label: 'Account status', value: <StatusChip status={selected.status} /> },
                  { label: 'Profile', value: selected.staff?.displayName ? 'Staff' : selected.customer?.name ? 'Customer' : '—' },
                  { label: 'Version', value: `v${selected.version}` },
                  {
                    label: 'Current overrides',
                    value:
                      (selected.permissionOverrides ?? []).length === 0
                        ? 'Role defaults only'
                        : (selected.permissionOverrides ?? [])
                            .map((override) => `${override.allow ? '+' : '−'}${override.action}`)
                            .join(' · '),
                  },
                ])}
              </Panel>
            ) : null}

            {tab === 'roles' ? (
              <Panel variant="secondary" title="Granted roles" icon="shield">
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <CheckInput
                      key={role}
                      label={labelize(role)}
                      value={draft.roles.includes(role)}
                      onChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          roles: checked ? [...current.roles.filter((entry) => entry !== role), role] : current.roles.filter((entry) => entry !== role),
                        }))
                      }
                      description={`${(roleDefaults[role] ?? []).length} default permissions`}
                    />
                  ))}
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted">
                  At least one role is required. Removing ADMIN from the final administrator is rejected by the API.
                </p>
              </Panel>
            ) : null}

            {tab === 'permissions' ? (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Overrides apply on top of the role defaults. Tick to grant, clear to inherit the role default.
                </p>
                {permissionGroups.map((group) => (
                  <Panel key={group.family} variant="secondary" title={labelize(group.family)} icon="sliders">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {group.actions.map((action) => (
                        <div key={action} className="flex items-center justify-between gap-2 rounded-lg border border-separator px-3 py-2">
                          <span className="truncate font-mono text-[11px] text-muted">{action}</span>
                          <input
                            type="checkbox"
                            aria-label={action}
                            className="size-4 accent-[var(--brand-orange)]"
                            checked={draft.overrides[action] ?? false}
                            onChange={(event) =>
                              setDraft((current) => {
                                const next = { ...current.overrides };
                                if (event.target.checked) next[action] = true;
                                else delete next[action];
                                return { ...current, overrides: next };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </Panel>
                ))}
                {permissionGroups.length === 0 ? (
                  <EmptyState compact icon="sliders" title="No permissions reported" description="The API did not return a permission catalogue." />
                ) : null}
              </div>
            ) : null}

            <Panel variant="secondary" title="Change note" icon="edit">
              <TextAreaInput
                label="Why are these access changes being made?"
                rows={3}
                value={draft.reason}
                onChange={(value) => setDraft((current) => ({ ...current, reason: value }))}
                description="Recorded with the audit entry. The confirmation dialog also captures a reason."
              />
            </Panel>
          </div>
        ) : null}
      </DetailDrawer>
    </Page>
  );
}
