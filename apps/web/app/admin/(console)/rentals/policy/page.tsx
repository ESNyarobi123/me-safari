'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/icons';
import {
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  Page,
  Panel,
  RefreshButton,
  StatCard,
  StatGrid,
  StatusChip,
  TabStrip,
  TextAreaInput,
  TextInput,
  definitionList,
} from '../../../components/ui';
import { errorMessage, useApi, useCommand } from '../../../lib/hooks';
import { formatDateTime, labelize, truncate } from '../../../lib/format';
import type { RentalPolicyVersion, RentalPolicySnapshot } from '../../../lib/types';

const STARTER: Record<string, unknown> = {
  title: 'Safari AI Rentals — hire terms',
  summary: 'Chauffeur-driven and self-drive hire conditions for Tanzania.',
  depositBasisPoints: 3000,
  cancellation: [
    'Free cancellation up to 72 hours before pickup.',
    '50% of the hire is retained within 72 hours of pickup.',
    'No-show reservations are non-refundable.',
  ],
  requirements: {
    minimumAge: 23,
    licenceYears: 3,
    documents: ['Passport', 'Driving licence', 'International permit for self drive'],
  },
  inclusions: ['Fuel for chauffeur-driven hires', 'Comprehensive insurance', 'Airport meet and greet'],
};

export default function RentalPolicyPage() {
  const snapshot = useApi<RentalPolicySnapshot>('/admin/rentals/policy');
  const [tab, setTab] = useState<'editor' | 'json' | 'history'>('editor');
  const [fieldDraft, setFieldDraft] = useState({ title: '', summary: '', depositBasisPoints: '' });
  const [cancellation, setCancellation] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [raw, setRaw] = useState('{}');
  const [seeded, setSeeded] = useState(false);

  const command = useCommand({ invalidate: [['api', '/admin/rentals/policy']], successMessage: false });

  const draft = snapshot.data?.draft ?? null;
  const published = snapshot.data?.published ?? null;
  const history = snapshot.data?.history ?? [];

  useEffect(() => {
    if (!snapshot.data || seeded) return;
    const source = (snapshot.data.draft?.policy ?? snapshot.data.published?.policy ?? STARTER) as Record<string, unknown>;
    setFieldDraft({
      title: String(source.title ?? ''),
      summary: String(source.summary ?? ''),
      depositBasisPoints: String(source.depositBasisPoints ?? ''),
    });
    setCancellation(Array.isArray(source.cancellation) ? (source.cancellation as string[]).join('\n') : '');
    setInclusions(Array.isArray(source.inclusions) ? (source.inclusions as string[]).join('\n') : '');
    setRaw(JSON.stringify(source, null, 2));
    setSeeded(true);
  }, [seeded, snapshot.data]);

  function composePolicy(): Record<string, unknown> {
    const base =
      (draft?.policy as Record<string, unknown> | undefined) ??
      (published?.policy as Record<string, unknown> | undefined) ??
      STARTER;
    return {
      ...base,
      ...(fieldDraft.title ? { title: fieldDraft.title } : {}),
      ...(fieldDraft.summary ? { summary: fieldDraft.summary } : {}),
      ...(fieldDraft.depositBasisPoints ? { depositBasisPoints: Number(fieldDraft.depositBasisPoints) } : {}),
      cancellation: cancellation.split('\n').map((line) => line.trim()).filter(Boolean),
      inclusions: inclusions.split('\n').map((line) => line.trim()).filter(Boolean),
    };
  }

  async function saveDraft(policy: Record<string, unknown>, message: string) {
    await command.run('/admin/rentals/policy/draft', 'POST', {
      body: { expectedVersion: published?.version ?? draft?.version ?? 0, policy },
      successMessage: message,
    });
    void snapshot.refetch();
  }

  const loading = snapshot.isLoading;

  return (
    <Page
      eyebrow="Safari AI Rentals"
      title="Rental policy"
      subtitle="Hire terms, deposits and driver requirements. Drafts are versioned; publishing switches the public policy instantly."
      actions={
        <>
          <RefreshButton pending={snapshot.isFetching} onPress={() => void snapshot.refetch()} />
          <Button variant="tertiary" size="sm" isPending={command.pending} onPress={() => void saveDraft(composePolicy(), 'Draft saved.')}>
            <Icon name="edit" size={15} />
            Save draft
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="primary" size="sm" isDisabled={!draft && !published}>
                <Icon name="upload" size={15} />
                Publish
              </Button>
            }
            title="Publish the rental policy"
            description="Travellers accepting a hire agree to this exact version. Published policies are immutable."
            confirmLabel="Publish policy"
            destructive={false}
            reason={false}
            onConfirm={async () => {
              if (!draft) {
                await saveDraft(composePolicy(), 'Draft saved.');
              }
              await command.run('/admin/rentals/policy/publish', 'POST', {
                body: { expectedVersion: draft?.version ?? published?.version ?? 1 },
                successMessage: 'Rental policy published.',
              });
              void snapshot.refetch();
            }}
          />
        </>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Draft version"
          icon="edit"
          tone="accent"
          loading={loading}
          value={draft ? `v${draft.version}` : '—'}
          hint={draft ? `created ${formatDateTime(draft.createdAt)}` : 'No draft yet'}
        />
        <StatCard
          label="Published version"
          icon="shield"
          tone="success"
          loading={loading}
          value={published ? `v${published.version}` : '—'}
          hint={published?.publishedAt ? `live since ${formatDateTime(published.publishedAt)}` : 'Not published'}
        />
        <StatCard label="Versions" icon="history" tone="default" loading={loading} value={history.length} hint="Retained for audit" />
        <StatCard
          label="Policy keys"
          icon="sliders"
          tone="default"
          loading={loading}
          value={Object.keys((draft?.policy ?? published?.policy ?? {}) as Record<string, unknown>).length}
          hint="Top-level sections"
        />
      </StatGrid>

      <Panel
        title="Policy editor"
        description="Guided fields for the common sections, plus raw JSON for specialist terms."
        icon="shield"
      >
        {snapshot.isError ? (
          <ErrorPanel
            message="The rental policy could not be loaded."
            details={errorMessage(snapshot.error)}
            onRetry={() => void snapshot.refetch()}
          />
        ) : null}
        {loading ? <Skeleton className="h-40 rounded-2xl" /> : null}

        {!loading ? (
          <TabStrip
            value={tab}
            onChange={setTab}
            options={[
              { value: 'editor', label: 'Guided editor' },
              { value: 'json', label: 'Raw JSON' },
              { value: 'history', label: 'Version history', count: history.length },
            ]}
          />
        ) : null}

        {!loading && tab === 'editor' ? (
          <div className="mt-4 space-y-4">
            {!draft && !published ? (
              <EmptyState
                compact
                icon="shield"
                title="No policy exists yet"
                description="Saving a draft creates version 1 from the starter template."
              />
            ) : null}
            <TextInput label="Policy title" value={fieldDraft.title} onChange={(value) => setFieldDraft((c) => ({ ...c, title: value }))} />
            <TextAreaInput
              label="Summary shown at the top of the policy page"
              rows={3}
              value={fieldDraft.summary}
              onChange={(value) => setFieldDraft((c) => ({ ...c, summary: value }))}
            />
            <TextInput
              label="Deposit basis points"
              value={fieldDraft.depositBasisPoints}
              inputMode="numeric"
              description="3000 = 30% deposit at the time of booking."
              onChange={(value) => setFieldDraft((c) => ({ ...c, depositBasisPoints: value.replace(/[^\d]/g, '') }))}
            />
            <TextAreaInput
              label="Cancellation terms (one per line)"
              rows={5}
              value={cancellation}
              onChange={setCancellation}
            />
            <TextAreaInput label="Inclusions (one per line)" rows={5} value={inclusions} onChange={setInclusions} />
            <p className="text-xs text-muted">
              Driver requirements and any other nested sections are preserved from the current version — edit them in the raw JSON tab.
            </p>
          </div>
        ) : null}

        {!loading && tab === 'json' ? (
          <div className="mt-4 space-y-3">
            <textarea
              aria-label="Raw rental policy"
              spellCheck={false}
              className="admin-scroll focus:border-focus min-h-[420px] w-full rounded-xl border border-field-border bg-field px-3 py-2 font-mono text-xs text-field-foreground outline-none"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="primary"
                isPending={command.pending}
                onPress={async () => {
                  let parsed: Record<string, unknown>;
                  try {
                    parsed = JSON.parse(raw) as Record<string, unknown>;
                  } catch {
                    return;
                  }
                  await saveDraft(parsed, 'Draft saved from JSON.');
                }}
              >
                Validate &amp; save draft
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && tab === 'history' ? (
          <div className="mt-4">
            {history.length === 0 ? (
              <EmptyState compact icon="history" title="No policy versions yet" />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {history.map((version) => (
                  <li key={version.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">v{version.version}</p>
                      <p className="text-xs text-muted">
                        created {formatDateTime(version.createdAt)}
                        {version.publishedAt ? ` · published ${formatDateTime(version.publishedAt)}` : ''}
                      </p>
                    </div>
                    <StatusChip status={version.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Panel>

      <Panel title="What travellers see" description="A flat rendering of the published policy keys" icon="globe">
        {definitionList(
          Object.entries(((draft?.policy ?? published?.policy ?? STARTER) as Record<string, unknown>)).map(([key, value]) => ({
            label: labelize(key),
            value: Array.isArray(value)
              ? (value as string[]).join(' · ')
              : typeof value === 'object' && value !== null
                ? truncate(JSON.stringify(value), 160)
                : String(value),
          })),
        )}
        <Separator className="my-3" />
        <p className="text-xs text-muted">
          The public endpoint serves the published version only — drafts are visible here and in the audit trail.
        </p>
      </Panel>
    </Page>
  );
}
