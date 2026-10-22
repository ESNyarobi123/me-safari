'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  Page,
  Panel,
  RefreshButton,
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  StringListInput,
  TabStrip,
  TextInput,
  definitionList,
} from '../../components/ui';
import { errorMessage, useApi, useCommand } from '../../lib/hooks';
import { formatDateTime, labelize, truncate } from '../../lib/format';
import type { LandingSnapshot, LandingVersion } from '../../lib/types';

type BlockMap = Record<string, Record<string, unknown>>;

const BLOCK_ORDER = ['hero', 'story', 'services', 'divisions', 'destinations', 'rentals', 'contact', 'gallery', 'download'];

export default function LandingPage() {
  const [locale, setLocale] = useState('en');
  const [tab, setTab] = useState<'blocks' | 'json' | 'history'>('blocks');
  const snapshot = useApi<LandingSnapshot & { history?: LandingVersion[] }>('/admin/landing', { locale });
  const [blocks, setBlocks] = useState<BlockMap>({});
  const [raw, setRaw] = useState('{}');
  const [seeded, setSeeded] = useState(0);

  const draft = snapshot.data?.draft ?? null;
  const published = snapshot.data?.published ?? null;
  const history = snapshot.data?.history ?? [];

  useEffect(() => {
    if (!snapshot.data) return;
    const source = (snapshot.data.draft?.blocks ?? snapshot.data.published?.blocks ?? {}) as BlockMap;
    setBlocks(structuredClone(source));
    setRaw(JSON.stringify(source, null, 2));
    setSeeded((value) => value + 1);
  }, [snapshot.data]);

  const command = useCommand({
    invalidate: [['api', '/admin/landing']],
    successMessage: false,
  });

  const orderedBlocks = useMemo(() => {
    const keys = Object.keys(blocks);
    return [
      ...BLOCK_ORDER.filter((key) => keys.includes(key)),
      ...keys.filter((key) => !BLOCK_ORDER.includes(key)),
    ];
  }, [blocks]);

  function setBlockField(block: string, key: string, value: unknown) {
    setBlocks((current) => {
      const next = { ...current, [block]: { ...current[block], [key]: value } };
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
  }

  async function save(message: string) {
    await command.run('/admin/landing', 'PATCH', {
      body: {
        locale,
        expectedVersion: snapshot.data?.draft ? snapshot.data.draft.version : (published?.version ?? 0),
        blocks,
      },
      successMessage: message,
    });
    void snapshot.refetch();
  }

  const loading = snapshot.isLoading;

  return (
    <Page
      eyebrow="Catalog & content"
      title="Landing content"
      subtitle="The typed blocks behind the public website. Drafts are versioned, then published atomically."
      actions={
        <>
          <RefreshButton pending={snapshot.isFetching} onPress={() => void snapshot.refetch()} />
          <Button
            variant="tertiary"
            size="sm"
            isPending={command.pending}
            onPress={() => void save('Draft saved.')}
          >
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
            title="Publish landing content"
            description="The public website switches to this draft immediately. Visitors see the change on their next load."
            confirmLabel="Publish now"
            destructive={false}
            reason={false}
            onConfirm={async () => {
              if (!draft) {
                await save('Draft saved.');
              }
              await command.run('/admin/landing/publish', 'POST', {
                body: { locale, expectedVersion: draft?.version ?? published?.version ?? 1 },
                successMessage: 'Landing content published.',
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
          hint={draft ? `saved ${formatDateTime(draft.createdAt)}` : 'No unsaved draft'}
        />
        <StatCard
          label="Published version"
          icon="globe"
          tone="success"
          loading={loading}
          value={published ? `v${published.version}` : '—'}
          hint={published?.publishedAt ? `live since ${formatDateTime(published.publishedAt)}` : 'Nothing published yet'}
        />
        <StatCard
          label="Blocks"
          icon="layout"
          tone="default"
          loading={loading}
          value={Object.keys(blocks).length}
          hint={`${BLOCK_ORDER.length} supported block types`}
        />
        <StatCard
          label="Versions kept"
          icon="history"
          tone="default"
          loading={loading}
          value={history.length}
          hint="Newest first"
        />
      </StatGrid>

      <Panel
        title="Editing"
        description="Guided fields for text and lists; raw JSON for anything nested."
        icon="layout"
        action={
          <div className="w-40">
            <SelectInput
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'en', label: 'English' },
                { value: 'sw', label: 'Kiswahili' },
              ]}
            />
          </div>
        }
      >
        {snapshot.isError ? (
          <ErrorPanel
            message="Landing content could not be loaded."
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
              { value: 'blocks', label: 'Guided blocks', count: orderedBlocks.length },
              { value: 'json', label: 'Raw JSON' },
              { value: 'history', label: 'History', count: history.length },
            ]}
          />
        ) : null}

        {!loading && tab === 'blocks' ? (
          orderedBlocks.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="layout"
                title="No landing content found"
                description="Seed the blocks from the raw JSON tab, or run the catalogue seed to import the current site copy."
              />
            </div>
          ) : (
            <div key={seeded} className="mt-4 space-y-4">
              {orderedBlocks.map((name) => (
                <LandingBlock
                  key={`${locale}-${name}`}
                  name={name}
                  block={blocks[name] ?? {}}
                  onChange={(key, value) => setBlockField(name, key, value)}
                />
              ))}
            </div>
          )
        ) : null}

        {!loading && tab === 'json' ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">
              Keys must be one of {BLOCK_ORDER.join(', ')}. Executable content, script tags and secrets are rejected by the API.
            </p>
            <textarea
              aria-label="Raw landing blocks"
              spellCheck={false}
              className="admin-scroll focus:border-focus min-h-[420px] w-full rounded-xl border border-field-border bg-field px-3 py-2 font-mono text-xs text-field-foreground outline-none"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="tertiary"
                onPress={() => {
                  try {
                    const parsed = JSON.parse(raw) as BlockMap;
                    setBlocks(parsed);
                    setSeeded((value) => value + 1);
                  } catch {
                    /* handled by the validity note below */
                  }
                }}
              >
                Apply JSON to the guided editor
              </Button>
              <Button
                size="sm"
                variant="primary"
                isPending={command.pending}
                onPress={async () => {
                  let parsed: BlockMap;
                  try {
                    parsed = JSON.parse(raw) as BlockMap;
                  } catch {
                    return;
                  }
                  setBlocks(parsed);
                  await save('Draft saved from JSON.');
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
              <EmptyState compact icon="history" title="No content versions yet" />
            ) : (
              <ul className="divide-y divide-separator rounded-xl border border-separator">
                {history.map((version) => (
                  <li key={version.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        v{version.version} · {labelize(version.status)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {thousands(version)} · created {formatDateTime(version.createdAt)}
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

      <Panel title="Block coverage" description="Which sections the public site can render" icon="layout">
        {definitionList(
          BLOCK_ORDER.map((name) => ({
            label: labelize(name),
            value: blocks[name] ? (
              <span className="text-success">Present</span>
            ) : (
              <span className="text-muted">Not in this version</span>
            ),
          })),
        )}
      </Panel>
    </Page>
  );
}

function thousands(version: LandingVersion): string {
  const count = Object.keys(version.blocks ?? {}).length;
  return `${count} block${count === 1 ? '' : 's'}`;
}

function LandingBlock({
  name,
  block,
  onChange,
}: {
  name: string;
  block: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const entries = Object.entries(block);

  return (
    <div className="rounded-2xl border border-separator bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-orange/12 text-brand-orange">
            <Icon name="layout" size={14} />
          </span>
          <p className="font-ui text-[14px] font-semibold">{labelize(name)}</p>
        </div>
        <span className="text-[11px] text-muted">{entries.length} field{entries.length === 1 ? '' : 's'}</span>
      </div>

      <Separator className="my-3" />

      {entries.length === 0 ? (
        <p className="text-xs text-muted">This block is empty. Add fields from the raw JSON tab.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, value]) => {
            if (typeof value === 'string') {
              return (
                <TextInput
                  key={key}
                  label={labelize(key)}
                  value={value}
                  onChange={(next) => onChange(key, next)}
                  description={value.length > 120 ? truncate(value, 120) : undefined}
                />
              );
            }
            if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
              return (
                <StringListInput
                  key={key}
                  label={labelize(key)}
                  value={value as string[]}
                  rows={3}
                  onChange={(next) => onChange(key, next)}
                />
              );
            }
            return (
              <div key={key}>
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{labelize(key)}</p>
                <textarea
                  aria-label={`${name}.${key}`}
                  spellCheck={false}
                  rows={4}
                  className="admin-scroll focus:border-focus w-full resize-y rounded-xl border border-field-border bg-field px-3 py-2 font-mono text-[11px] text-field-foreground outline-none"
                  value={JSON.stringify(value, null, 2)}
                  onChange={(event) => {
                    try {
                      onChange(key, JSON.parse(event.target.value));
                    } catch {
                      /* keep the previous structure until the JSON parses */
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
