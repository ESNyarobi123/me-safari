'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  CopyButton,
  DataTable,
  DetailDrawer,
  EmptyState,
  ErrorPanel,
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
  useFilters,
} from '../../components/ui';
import { errorMessage, useApi, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, labelize } from '../../lib/format';
import type { Customer, SupportThread } from '../../lib/types';

interface ThreadMessage {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  authorId?: string;
}

interface ThreadDetail extends SupportThread {
  messages?: ThreadMessage[];
  participants?: string[];
}

export default function SupportPage() {
  const filters = useFilters({ search: '', status: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const threads = useList<SupportThread>('/support/threads', {
    limit: pagination.limit,
    cursor: pagination.cursor,
    status: filters.values.status || undefined,
  });

  const [selected, setSelected] = useState<SupportThread | null>(null);
  const [reply, setReply] = useState('');
  const [visibility, setVisibility] = useState('CUSTOMER');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ subject: '', customerId: '', customerSearch: '', message: '' });

  const detail = useApi<ThreadDetail>(selected ? `/support/threads/${selected.id}` : null, {}, { enabled: Boolean(selected) });
  const customers = useList<Customer>('/ops/customers', { search: draft.customerSearch, limit: 30 }, { enabled: createOpen });
  const command = useCommand({
    invalidate: [['list', '/support/threads'], ['api', `/support/threads/${selected?.id ?? ''}`]],
    successMessage: false,
  });

  const rows = useMemo(() => {
    const list = threads.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((thread) =>
      [thread.subject, thread.customer?.name, thread.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [search, threads.data]);

  const stats = useMemo(() => {
    const list = threads.data?.rows ?? [];
    const byStatus = (status: string) => list.filter((thread) => thread.status === status).length;
    return {
      total: list.length,
      open: byStatus('OPEN'),
      resolved: byStatus('RESOLVED'),
      closed: byStatus('CLOSED'),
    };
  }, [threads.data]);

  const customerOptions = useMemo(
    () =>
      (customers.data?.rows ?? []).slice(0, 40).map((customer) => ({
        value: customer.id,
        label: `${customer.name}${customer.email ? ` · ${customer.email}` : ''}`,
      })),
    [customers.data],
  );

  const columns: Array<Column<SupportThread>> = [
    {
      key: 'subject',
      header: 'Conversation',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.subject}</p>
          <p className="truncate text-xs text-muted">thread {row.id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => <span className="text-sm">{row.customer?.name ?? '—'}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'lg',
      render: (row) => (
        <span className="text-xs text-muted">{row.ownerStaffId ? `staff ${row.ownerStaffId.slice(0, 8)}` : 'Unassigned'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
    {
      key: 'updated',
      header: 'Last activity',
      hideBelow: 'lg',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.updatedAt ?? row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
          <Icon name="buoy" size={15} />
        </Button>
      ),
    },
  ];

  return (
    <Page
      eyebrow="Engagement"
      title="Support"
      subtitle="Traveller conversations. Customer-visible replies are emailed; internal notes stay between the team."
      actions={
        <>
          <RefreshButton pending={threads.isFetching} onPress={() => void threads.refetch()} />
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setDraft({ subject: '', customerId: '', customerSearch: '', message: '' });
              setCreateOpen(true);
            }}
          >
            <Icon name="plus" size={15} />
            New thread
          </Button>
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard label="Threads" icon="buoy" tone="accent" loading={threads.isLoading} value={stats.total} hint="Loaded on this page" />
        <StatCard label="Open" icon="inbox" tone="warning" loading={threads.isLoading} value={stats.open} hint="Needing a reply" />
        <StatCard label="Resolved" icon="check" tone="success" loading={threads.isLoading} value={stats.resolved} hint="Answered and closed off" />
        <StatCard label="Closed" icon="lock" tone="default" loading={threads.isLoading} value={stats.closed} hint="Archived conversations" />
      </StatGrid>

      <FilterBar>
        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <SearchInput
            value={filters.values.search ?? ''}
            onChange={(value) => filters.set('search', value)}
            placeholder="Subject, customer or thread id"
          />
        </FilterField>
        <FilterField label="Status">
          <SelectInput
            value={filters.values.status ?? ''}
            onChange={(value) => filters.set('status', value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'OPEN', label: 'Open' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
          />
        </FilterField>
      </FilterBar>

      {threads.isError ? (
        <ErrorPanel message="Support threads could not be loaded." details={errorMessage(threads.error)} onRetry={() => void threads.refetch()} />
      ) : null}

      <Panel title="Conversations" description="Threads link to bookings and customers so context travels with the message." icon="buoy">
        <DataTable
          label="Support threads"
          columns={columns}
          rows={rows}
          loading={threads.isLoading}
          onRowPress={(row) => setSelected(row)}
          emptyTitle="No conversations"
          emptyDescription="Threads open automatically from app messages and website contact forms."
          footer={
            <TableFooter
              summary={`${rows.length} shown`}
              page={pagination.page}
              atStart={pagination.atStart}
              hasMore={threads.data?.meta.hasMore}
              pending={threads.isFetching}
              onNext={() => pagination.next(threads.data?.meta.nextCursor)}
              onPrevious={pagination.previous}
            />
          }
        />
      </Panel>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Open a support thread"
        description="Use this for phone calls or walk-ins so every conversation lives in one place."
        submitLabel="Create thread"
        onSubmit={async () => {
          await command.run('/support/threads', 'POST', {
            body: {
              subject: draft.subject.trim(),
              customerId: draft.customerId,
              message: draft.message.trim() || undefined,
            },
            successMessage: 'Thread created.',
          });
          void threads.refetch();
        }}
        disabled={draft.subject.trim().length < 2 || !draft.customerId}
      >
        <div className="space-y-3">
          <TextInput label="Subject" value={draft.subject} isRequired onChange={(value) => setDraft((c) => ({ ...c, subject: value }))} />
          <TextInput
            label="Find customer"
            value={draft.customerSearch}
            onChange={(value) => setDraft((c) => ({ ...c, customerSearch: value }))}
            placeholder="Name or email"
          />
          {customers.isLoading ? <Skeleton className="h-12 rounded-xl" /> : null}
          <SelectInput
            label="Customer"
            value={draft.customerId || null}
            onChange={(value) => setDraft((c) => ({ ...c, customerId: value }))}
            options={customerOptions}
            placeholder="Select the traveller"
          />
          <TextAreaInput
            label="First message"
            rows={4}
            value={draft.message}
            onChange={(value) => setDraft((c) => ({ ...c, message: value }))}
            description="Optional — leave blank to open an empty thread."
          />
        </div>
      </FormDialog>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReply('');
          }
        }}
        title={selected?.subject ?? ''}
        subtitle={selected?.customer?.name ? `Traveller · ${selected.customer.name}` : undefined}
        chip={selected ? <StatusChip status={selected.status} /> : null}
        fields={
          selected
            ? [
                { label: 'Thread id', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Status', value: <StatusChip status={selected.status} /> },
                { label: 'Owner', value: selected.ownerStaffId ? `staff ${selected.ownerStaffId.slice(0, 8)}` : 'Unassigned' },
                { label: 'Opened', value: formatDateTime(selected.createdAt) },
                { label: 'Last activity', value: formatDateTime(selected.updatedAt ?? selected.createdAt) },
                { label: 'Version', value: `v${selected.version}` },
              ]
            : []
        }
        sections={[
          {
            title: 'Conversation',
            content: detail.isLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (detail.data?.messages ?? []).length === 0 ? (
              <EmptyState compact icon="buoy" title="No messages yet" description="Send the first reply below." />
            ) : (
              <ul className="space-y-3">
                {(detail.data?.messages ?? []).map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-xl border p-3 ${
                      message.visibility === 'INTERNAL'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-separator bg-surface-secondary/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <StatusChip
                        status={message.visibility}
                        label={message.visibility === 'INTERNAL' ? 'Internal note' : 'Customer visible'}
                        tone={message.visibility === 'INTERNAL' ? 'warning' : 'default'}
                      />
                      <span className="text-[11px] text-muted">{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            title: 'Reply',
            content: (
              <div className="space-y-3">
                <SelectInput
                  label="Visibility"
                  value={visibility}
                  onChange={setVisibility}
                  options={[
                    { value: 'CUSTOMER', label: 'Customer visible — sends an email to the traveller' },
                    { value: 'INTERNAL', label: 'Internal note — team only' },
                  ]}
                />
                <TextAreaInput label="Message" rows={4} value={reply} onChange={setReply} />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    isDisabled={reply.trim().length < 1}
                    isPending={command.pending}
                    onPress={async () => {
                      if (!selected) return;
                      await command.run(`/support/threads/${selected.id}/messages`, 'POST', {
                        body: { body: reply.trim(), visibility, attachmentIds: [] },
                        successMessage: visibility === 'INTERNAL' ? 'Internal note saved.' : 'Reply sent to the traveller.',
                      });
                      setReply('');
                      void detail.refetch();
                      void threads.refetch();
                    }}
                  >
                    <Icon name="mail" size={15} />
                    Send
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
        footer={
          selected ? (
            <>
              <CopyButton value={selected.id} label="Copy thread id" />
              <Button
                variant="tertiary"
                size="sm"
                isDisabled={selected.status === 'OPEN'}
                onPress={async () => {
                  await command.run(`/support/threads/${selected.id}`, 'PATCH', {
                    body: { expectedVersion: selected.version, status: 'OPEN' },
                    successMessage: 'Thread reopened.',
                  });
                  void threads.refetch();
                  setSelected(null);
                }}
              >
                <Icon name="refresh" size={15} />
                Reopen
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={selected.status !== 'OPEN'}
                onPress={async () => {
                  await command.run(`/support/threads/${selected.id}`, 'PATCH', {
                    body: { expectedVersion: selected.version, status: 'RESOLVED' },
                    successMessage: 'Thread resolved.',
                  });
                  void threads.refetch();
                  setSelected(null);
                }}
              >
                <Icon name="check" size={15} />
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={selected.status === 'CLOSED'}
                onPress={async () => {
                  await command.run(`/support/threads/${selected.id}`, 'PATCH', {
                    body: { expectedVersion: selected.version, status: 'CLOSED' },
                    successMessage: 'Thread closed.',
                  });
                  void threads.refetch();
                  setSelected(null);
                }}
              >
                <Icon name="lock" size={15} />
                Close
              </Button>
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Context" icon="ticket">
          {definitionList([
            { label: 'Customer', value: detail.data?.customer?.name ?? selected?.customer?.name ?? '—' },
            { label: 'Participants', value: (detail.data?.participants ?? []).length || 1 },
            { label: 'Messages', value: (detail.data?.messages ?? []).length },
            { label: 'Status', value: <StatusChip status={selected?.status ?? 'OPEN'} /> },
          ])}
          <Separator className="my-3" />
          <p className="text-xs text-muted">
            Internal notes are never emailed. Keep commercial or safety detail in notes, and keep customer-visible replies warm and specific.
          </p>
        </Panel>
      </DetailDrawer>
    </Page>
  );
}
