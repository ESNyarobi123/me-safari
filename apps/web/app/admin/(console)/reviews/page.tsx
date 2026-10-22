'use client';

import { Button, Separator } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  Column,
  ConfirmDialog,
  CopyButton,
  DataTable,
  DetailDrawer,
  EmptyState,
  ErrorPanel,
  FilterBar,
  FilterField,
  MetricBar,
  Page,
  Panel,
  RefreshButton,
  SearchInput,
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  TableFooter,
  TagPill,
  definitionList,
  useFilters,
} from '../../components/ui';
import { errorMessage, useCommand, useDebounced, useList, usePagination } from '../../lib/hooks';
import { formatDateTime, labelize } from '../../lib/format';

interface AdminReview {
  id: string;
  bookingId?: string;
  customerId?: string;
  stars: number;
  text: string;
  version: number;
  moderationStatus?: string;
  moderationReason?: string | null;
  status?: string;
  createdAt?: string;
  customer?: { id?: string; name?: string } | null;
  booking?: { id?: string; reference?: string } | null;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          key={index}
          name="star"
          size={13}
          className={index < value ? 'text-brand-orange' : 'text-muted/40'}
        />
      ))}
      <span className="ml-1 text-xs text-muted tabular-nums">{value}.0</span>
    </span>
  );
}

export default function ReviewsPage() {
  const filters = useFilters({ search: '', status: '', stars: '' });
  const search = useDebounced(filters.values.search ?? '');
  const pagination = usePagination(25);

  const reviews = useList<AdminReview>('/admin/reviews', { limit: pagination.limit, cursor: pagination.cursor });
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const command = useCommand({ invalidate: [['list', '/admin/reviews']], successMessage: false });

  const statusOf = (review: AdminReview) => review.moderationStatus ?? review.status ?? 'PUBLISHED';

  const rows = useMemo(() => {
    const list = reviews.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((review) => {
      const matchesStatus = !filters.values.status || statusOf(review) === filters.values.status;
      const matchesStars = !filters.values.stars || review.stars === Number(filters.values.stars);
      const matchesSearch =
        !term ||
        [review.text, review.customer?.name, review.booking?.reference]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesStars && matchesSearch;
    });
  }, [filters.values.stars, filters.values.status, reviews.data, search]);

  const stats = useMemo(() => {
    const list = reviews.data?.rows ?? [];
    const average = list.length === 0 ? 0 : list.reduce((total, review) => total + review.stars, 0) / list.length;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: list.filter((review) => review.stars === star).length,
    }));
    return {
      total: list.length,
      average,
      published: list.filter((review) => statusOf(review) === 'PUBLISHED').length,
      hidden: list.filter((review) => statusOf(review) === 'HIDDEN').length,
      distribution,
    };
  }, [reviews.data]);

  const columns: Array<Column<AdminReview>> = [
    {
      key: 'traveller',
      header: 'Traveller',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.customer?.name ?? 'Guest traveller'}</p>
          <p className="truncate text-xs text-muted">{row.booking?.reference ? `booking ${row.booking.reference}` : 'No booking linked'}</p>
        </div>
      ),
    },
    { key: 'stars', header: 'Rating', render: (row) => <Stars value={row.stars} /> },
    {
      key: 'text',
      header: 'Feedback',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 text-xs text-muted">{row.text}</span>,
    },
    {
      key: 'status',
      header: 'Visibility',
      render: (row) => <StatusChip status={statusOf(row)} />,
    },
    {
      key: 'created',
      header: 'Submitted',
      hideBelow: 'lg',
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) => (
        <Button size="sm" variant="ghost" onPress={() => setSelected(row)}>
          <Icon name="eye" size={15} />
        </Button>
      ),
    },
  ];

  const selectedStatus = selected ? statusOf(selected) : '';

  return (
    <Page
      eyebrow="Engagement"
      title="Reviews"
      subtitle="Traveller feedback with moderation. Hiding a review removes it from the public site and records your reason in the audit log."
      actions={<RefreshButton pending={reviews.isFetching} onPress={() => void reviews.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Reviews" icon="star" tone="accent" loading={reviews.isLoading} value={stats.total} hint="On this page" />
        <StatCard
          label="Average rating"
          icon="trending-up"
          tone="success"
          loading={reviews.isLoading}
          value={stats.total === 0 ? '—' : stats.average.toFixed(1)}
          hint="Out of 5.0"
        />
        <StatCard label="Published" icon="eye" tone="default" loading={reviews.isLoading} value={stats.published} hint="Visible on the site" />
        <StatCard label="Hidden" icon="x" tone="warning" loading={reviews.isLoading} value={stats.hidden} hint="Moderated away" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <FilterBar>
            <FilterField label="Search" className="min-w-[240px] flex-[2]">
              <SearchInput
                value={filters.values.search ?? ''}
                onChange={(value) => filters.set('search', value)}
                placeholder="Feedback text, traveller or booking"
              />
            </FilterField>
            <FilterField label="Visibility">
              <SelectInput
                value={filters.values.status ?? ''}
                onChange={(value) => filters.set('status', value)}
                options={[
                  { value: '', label: 'All visibility' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'HIDDEN', label: 'Hidden' },
                ]}
              />
            </FilterField>
            <FilterField label="Stars">
              <SelectInput
                value={filters.values.stars ?? ''}
                onChange={(value) => filters.set('stars', value)}
                options={[
                  { value: '', label: 'Any rating' },
                  ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} star${star === 1 ? '' : 's'}` })),
                ]}
              />
            </FilterField>
          </FilterBar>

          {reviews.isError ? (
            <ErrorPanel message="Reviews could not be loaded." details={errorMessage(reviews.error)} onRetry={() => void reviews.refetch()} />
          ) : null}

          <Panel title="Moderation queue" description="Moderating keeps the public story honest without deleting traveller feedback." icon="star">
            <DataTable
              label="Traveller reviews"
              columns={columns}
              rows={rows}
              loading={reviews.isLoading}
              onRowPress={(row) => setSelected(row)}
              emptyTitle="No reviews yet"
              emptyDescription="Feedback arrives automatically once trips are completed."
              footer={
                <TableFooter
                  summary={`${rows.length} shown`}
                  page={pagination.page}
                  atStart={pagination.atStart}
                  hasMore={reviews.data?.meta.hasMore}
                  pending={reviews.isFetching}
                  onNext={() => pagination.next(reviews.data?.meta.nextCursor)}
                  onPrevious={pagination.previous}
                />
              }
            />
          </Panel>
        </div>

        <Panel title="Rating distribution" description="Based on the reviews loaded on this page." icon="chart">
          <div className="space-y-3">
            {stats.distribution.map((bucket) => (
              <div key={bucket.star} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{bucket.star} star</span>
                  <span className="text-muted tabular-nums">{bucket.count}</span>
                </div>
                <MetricBar value={bucket.count} max={Math.max(1, stats.total)} tone="accent" />
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          {definitionList([
            { label: 'Average', value: stats.total === 0 ? '—' : `${stats.average.toFixed(2)} / 5` },
            { label: 'Hidden', value: `${stats.hidden} of ${stats.total}` },
          ])}
          <p className="mt-3 text-xs text-muted">
            Reviews with 1–2 stars deserve a follow-up conversation — open the linked booking from the drawer before hiding anything.
          </p>
        </Panel>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.customer?.name ?? 'Guest traveller'}
        subtitle={selected?.booking?.reference ? `booking ${selected.booking.reference}` : undefined}
        chip={selected ? <StatusChip status={selectedStatus} /> : null}
        fields={
          selected
            ? [
                { label: 'Rating', value: <Stars value={selected.stars} /> },
                { label: 'Visibility', value: <StatusChip status={selectedStatus} /> },
                { label: 'Submitted', value: formatDateTime(selected.createdAt) },
                { label: 'Version', value: `v${selected.version}` },
                { label: 'Moderation note', value: selected.moderationReason || '—', full: true },
              ]
            : []
        }
        sections={[
          {
            title: 'Feedback',
            content: (
              <blockquote className="rounded-xl border border-separator bg-surface-secondary/60 p-3 text-sm text-foreground">
                {selected?.text || 'No text provided.'}
              </blockquote>
            ),
          },
        ]}
        footer={
          selected ? (
            <>
              <CopyButton value={selected.id} label="Copy review id" />
              {selectedStatus === 'HIDDEN' ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="primary" size="sm">
                      <Icon name="eye" size={15} />
                      Publish
                    </Button>
                  }
                  title="Publish this review"
                  description="The review becomes visible on the public site again."
                  confirmLabel="Publish review"
                  destructive={false}
                  onConfirm={async (reason) => {
                    await command.run(`/admin/reviews/${selected.id}/moderation`, 'PATCH', {
                      body: { expectedVersion: selected.version, status: 'PUBLISHED', reason },
                      successMessage: 'Review published.',
                    });
                    void reviews.refetch();
                    setSelected(null);
                  }}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      <Icon name="x" size={15} />
                      Hide
                    </Button>
                  }
                  title="Hide this review"
                  description="Hidden reviews stay on record for the traveller but disappear from the public site."
                  confirmLabel="Hide review"
                  onConfirm={async (reason) => {
                    await command.run(`/admin/reviews/${selected.id}/moderation`, 'PATCH', {
                      body: { expectedVersion: selected.version, status: 'HIDDEN', reason },
                      successMessage: 'Review hidden.',
                    });
                    void reviews.refetch();
                    setSelected(null);
                  }}
                />
              )}
            </>
          ) : null
        }
      >
        <Panel variant="secondary" title="Related records" icon="ticket">
          {selected && (selected.booking || selected.customer) ? (
            definitionList([
              { label: 'Booking', value: selected.booking?.reference ?? '—' },
              { label: 'Traveller', value: selected.customer?.name ?? '—' },
              { label: 'Rating', value: <TagPill icon="star">{`${selected.stars}/5`}</TagPill> },
              { label: 'Moderation', value: <StatusChip status={selectedStatus} /> },
            ])
          ) : (
            <EmptyState compact icon="ticket" title="No linked booking" description="Direct feedback without a booking reference." />
          )}
        </Panel>
      </DetailDrawer>
    </Page>
  );
}
