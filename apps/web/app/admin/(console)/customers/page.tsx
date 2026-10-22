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
  StatCard,
  StatGrid,
  StatusChip,
  TabStrip,
  TableFooter,
  TextInput,
  UserCell,
  definitionList,
  type Column,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDate, formatDateTime, labelize } from '../../lib/format';
import type { Customer } from '../../lib/types';

interface CustomerDetail extends Omit<Customer, 'bookings'> {
  bookings?: Array<{
    id: string;
    reference?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    currency?: string;
    totalMinor?: string;
  }>;
  requests?: Array<{ id: string; status?: string; serviceId?: string }>;
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const term = useDebounced(search, 300);
  const pagination = usePagination(25);

  const list = useList<Customer>('/ops/customers', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    search: term || undefined,
  });

  const rows = list.data?.rows ?? [];
  const verified = rows.filter((row) => row.user?.emailVerifiedAt).length;
  const invited = rows.filter((row) => row.user?.status === 'INVITED').length;

  const columns: Array<Column<Customer>> = useMemo(
    () => [
      {
        key: 'name',
        header: 'Customer',
        isRowHeader: true,
        render: (row) => <UserCell name={row.name} secondary={row.email ?? row.phone ?? 'No contact'} />,
      },
      {
        key: 'location',
        header: 'Country',
        render: (row) => (
          <div className="text-sm">
            {row.country ?? '—'}
            <p className="text-xs text-muted">v{row.version}</p>
          </div>
        ),
      },
      {
        key: 'identity',
        header: 'Identity',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <StatusChip status={row.user?.status ?? 'NO_ACCOUNT'} />
            {row.user?.emailVerifiedAt ? (
              <span className="text-[11px] text-muted">Verified {formatDate(row.user.emailVerifiedAt)}</span>
            ) : (
              <span className="text-[11px] text-muted">Not verified</span>
            )}
          </div>
        ),
      },
      {
        key: 'joined',
        header: 'Joined',
        align: 'end',
        render: (row) => (
          <div className="text-end text-sm">
            {formatDate(row.createdAt, true)}
            <p className="text-xs text-muted">{row.phone ?? 'No phone'}</p>
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
      title="Customers"
      subtitle="Traveller profiles, identities, booking history and console invitations."
      actions={
        <>
          <RefreshButton pending={list.isFetching} onPress={refresh} />
          <NewCustomerDialog onCreated={refresh} />
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Profiles loaded" icon="users" tone="accent" loading={list.isLoading} value={rows.length} hint="Current page" />
        <StatCard label="Verified identities" icon="shield" tone="success" loading={list.isLoading} value={verified} hint="Email confirmed" />
        <StatCard
          label="Invitations pending"
          icon="mail"
          tone={invited > 0 ? 'warning' : 'default'}
          loading={list.isLoading}
          value={invited}
          hint="Invited but not claimed"
        />
        <StatCard
          label="With app access"
          icon="phone"
          tone="default"
          loading={list.isLoading}
          value={rows.filter((row) => row.userId).length}
          hint="Linked to an identity"
        />
      </StatGrid>

      <FilterBar
        leading={
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-default/70 text-muted">
            <Icon name="search" size={16} />
          </span>
        }
      >
        <FilterField label="Search">
          <SearchInput value={search} onChange={setSearch} placeholder="Name or email…" />
        </FilterField>
      </FilterBar>

      {list.isError ? (
        <ErrorPanel message="Customers could not be loaded." details={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : null}

      <Panel title="Traveller directory" description="Open a row for history, editing and invitations." icon="users" bodyClassName="px-0 py-0">
        <DataTable
          label="Customers"
          columns={columns}
          rows={rows}
          loading={list.isLoading}
          onRowPress={(row) => setOpenId(row.id)}
          emptyTitle="No customers match"
          emptyDescription="Customers are created by website bookings, app sign-ups or manually from this console."
          footer={
            <TableFooter
              summary={`${rows.length} profile${rows.length === 1 ? '' : 's'}`}
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

      <CustomerDetail id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail -- */

function CustomerDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<'profile' | 'history' | 'edit'>('profile');
  const customer = useApi<CustomerDetail>(id ? `/ops/customers/${id}` : null);
  const command = useCommand({
    invalidate: [['api', `/ops/customers/${id}`], ['list', '/ops/customers']],
    successMessage: false,
  });

  const row = customer.data;
  const [draft, setDraft] = useState({ name: '', phone: '', country: '' });
  const [seeded, setSeeded] = useState(false);

  if (row && !seeded) {
    setDraft({ name: row.name ?? '', phone: row.phone ?? '', country: row.country ?? '' });
    setSeeded(true);
  }

  const bookings = row?.bookings ?? [];
  const lifetime = bookings.reduce((sum, booking) => sum + Number(booking.totalMinor ?? 0), 0);

  return (
    <DetailDrawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row?.name ?? 'Customer'}
      subtitle={row ? (row.email ?? row.phone ?? 'No contact on file') : 'Loading…'}
      chip={row ? <StatusChip status={row.user?.status ?? 'NO_ACCOUNT'} /> : null}
      footer={
        row ? (
          <>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="tertiary">
                  <Icon name="mail" size={15} />
                  Send invitation
                </Button>
              }
              title="Invite this customer"
              description="An invitation email is queued so the traveller can set a password and see their bookings in the app."
              confirmLabel="Send invitation"
              destructive={false}
              reason={false}
              onConfirm={async () => {
                await command.run(`/ops/customers/${row.id}/invite`, 'POST', { successMessage: 'Invitation queued.' });
                void customer.refetch();
                onChanged();
              }}
            />
            <Button size="sm" variant="tertiary" onPress={() => void customer.refetch()} isPending={customer.isFetching}>
              <Icon name="refresh" size={15} />
              Refresh
            </Button>
          </>
        ) : null
      }
    >
      {customer.isError ? (
        <ErrorPanel message="This customer could not be loaded." details={errorMessage(customer.error)} />
      ) : null}
      {customer.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { value: 'profile', label: 'Profile' },
          { value: 'history', label: 'History', count: bookings.length + (row?.requests?.length ?? 0) },
          { value: 'edit', label: 'Edit' },
        ]}
      />

      {tab === 'profile' && row
        ? definitionList([
            { label: 'Name', value: row.name },
            { label: 'Email', value: row.email ?? '—' },
            { label: 'Phone', value: row.phone ?? '—' },
            { label: 'Country', value: row.country ?? '—' },
            { label: 'Version', value: row.version },
            { label: 'Joined', value: formatDateTime(row.createdAt, true) },
            { label: 'Identity status', value: <StatusChip status={row.user?.status ?? 'NO_ACCOUNT'} /> },
            { label: 'Email verified', value: row.user?.emailVerifiedAt ? formatDateTime(row.user.emailVerifiedAt) : 'Not yet' },
          ])
        : null}

      {tab === 'profile' && row?.preferences && Object.keys(row.preferences).length ? (
        <>
          <Separator className="my-4" />
          <p className="font-ui mb-2 text-[13px] font-semibold">Preferences</p>
          {definitionList(
            Object.entries(row.preferences as Record<string, unknown>).map(([key, value]) => ({
              label: labelize(key),
              value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—'),
            })),
          )}
        </>
      ) : null}

      {tab === 'history' && row ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
              <p className="text-[11px] tracking-wide text-muted uppercase">Bookings</p>
              <p className="font-ui text-lg font-semibold tabular-nums">{bookings.length}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
              <p className="text-[11px] tracking-wide text-muted uppercase">Requests</p>
              <p className="font-ui text-lg font-semibold tabular-nums">{row.requests?.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3">
              <p className="text-[11px] tracking-wide text-muted uppercase">Lifetime</p>
              <p className="font-ui text-lg font-semibold tabular-nums">
                <Money minor={String(lifetime)} currency={bookings[0]?.currency ?? 'USD'} compact />
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <EmptyState compact icon="ticket" title="No bookings yet" description="This profile has no booking history." />
          ) : (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {bookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{booking.reference ?? booking.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted">
                      {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Money minor={booking.totalMinor} currency={booking.currency ?? 'USD'} className="text-sm" />
                    <StatusChip status={booking.status ?? 'PENDING'} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(row.requests?.length ?? 0) > 0 ? (
            <>
              <Separator />
              <p className="font-ui text-[13px] font-semibold">Custom requests</p>
              <ul className="space-y-2">
                {(row.requests ?? []).map((request) => (
                  <li key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-separator px-3 py-2">
                    <span className="text-sm">Request {request.id.slice(0, 8)}</span>
                    <StatusChip status={request.status ?? 'REQUESTED'} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'edit' && row ? (
        <div className="space-y-4">
          <FieldGrid columns={2}>
            <TextInput label="Name" value={draft.name} onChange={(value) => setDraft((c) => ({ ...c, name: value }))} />
            <TextInput label="Phone" value={draft.phone} onChange={(value) => setDraft((c) => ({ ...c, phone: value }))} />
            <TextInput label="Country" value={draft.country} onChange={(value) => setDraft((c) => ({ ...c, country: value }))} />
          </FieldGrid>
          <ConfirmDialog
            trigger={
              <Button variant="primary" size="sm" isDisabled={draft.name.trim().length < 2}>
                Save profile
              </Button>
            }
            title="Save customer profile"
            description="Profile changes are versioned and written to the audit log with your reason."
            confirmLabel="Save changes"
            destructive={false}
            onConfirm={async (reason) => {
              await command.run(`/ops/customers/${row.id}`, 'PATCH', {
                body: {
                  expectedVersion: row.version,
                  name: draft.name.trim(),
                  ...(draft.phone ? { phone: draft.phone.trim() } : {}),
                  ...(draft.country ? { country: draft.country.trim() } : {}),
                  reason,
                },
                successMessage: 'Customer updated.',
              });
              void customer.refetch();
              onChanged();
            }}
          />
          <p className="text-xs text-muted">
            Email changes must be confirmed by the traveller through the secure identity flow — use the invitation for that.
          </p>
        </div>
      ) : null}
    </DetailDrawer>
  );
}

/* --------------------------------------------------------------------- new -- */

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', country: '' });
  const [invite, setInvite] = useState(true);
  const command = useCommand({ invalidate: [['list', '/ops/customers']], successMessage: false });

  return (
    <FormDialog
      trigger={
        <Button variant="primary" size="sm">
          <Icon name="plus" size={15} />
          New customer
        </Button>
      }
      title="Create a customer profile"
      description="Profiles captured here can be linked to bookings, quotes and invitations."
      submitLabel="Create profile"
      size="lg"
      disabled={draft.name.trim().length < 2}
      onSubmit={async () => {
        await command.run('/ops/customers', 'POST', {
          body: {
            name: draft.name.trim(),
            ...(draft.email ? { email: draft.email.trim() } : {}),
            ...(draft.phone ? { phone: draft.phone.trim() } : {}),
            ...(draft.country ? { country: draft.country.trim() } : {}),
            invite: invite && Boolean(draft.email),
          },
          successMessage: 'Customer profile created.',
        });
        onCreated();
      }}
    >
      <FieldGrid columns={2}>
        <TextInput label="Full name" value={draft.name} onChange={(value) => setDraft((c) => ({ ...c, name: value }))} isRequired />
        <TextInput label="Email" type="email" value={draft.email} onChange={(value) => setDraft((c) => ({ ...c, email: value }))} />
        <TextInput label="Phone" value={draft.phone} onChange={(value) => setDraft((c) => ({ ...c, phone: value }))} inputMode="tel" />
        <TextInput label="Country" value={draft.country} onChange={(value) => setDraft((c) => ({ ...c, country: value }))} />
      </FieldGrid>
      <div className="mt-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={invite}
            onChange={(event) => setInvite(event.target.checked)}
            className="mt-0.5 size-4 rounded border-border"
          />
          <span>
            Queue an invitation email
            <span className="block text-xs text-muted">Requires an email address. The traveller sets their own password.</span>
          </span>
        </label>
      </div>
    </FormDialog>
  );
}
