'use client';

import { Separator } from '@heroui/react';
import { Icon } from '../../components/icons';
import { ErrorPanel, Page, Panel, RefreshButton, StatCard, StatGrid, StatusChip, TagPill, definitionList } from '../../components/ui';
import { errorMessage, useApi } from '../../lib/hooks';
import { labelize } from '../../lib/format';
import type { IntegrationStatus } from '../../lib/types';

interface Channel {
  provider?: string;
  driver?: string;
  status: string;
}

const EXPLAINERS: Record<string, string> = {  payments: 'Card and mobile-money capture. Development simulations never move real money.',
  email: 'Transactional mail for invitations, quotes, receipts and trip updates.',
  push: 'Mobile push delivery for trips, payments and support replies.',
  storage: 'Where private media, receipts and exports are kept.',
  malwareScanning: 'Scanning for untrusted uploads before they are served.',
  stores: 'App Store and Google Play release readiness.',
};

function toneForStatus(status: string) {
  const normalised = status.toUpperCase();
  if (['READY', 'ENABLED', 'ACTIVE', 'LOCAL_MAILPIT', 'LOCAL_PRIVATE'].includes(normalised)) return 'success' as const;
  if (['AWAITING_VERIFICATION', 'AWAITING_RELEASE', 'DEVELOPMENT_ONLY'].includes(normalised)) return 'warning' as const;
  if (['DISABLED', 'UNCONFIGURED'].includes(normalised)) return 'danger' as const;
  return 'default' as const;
}

export default function IntegrationsPage() {
  const snapshot = useApi<IntegrationStatus>('/admin/integrations/status');
  const data = snapshot.data;

  const entries = data ? (Object.entries(data) as Array<[string, Channel]>) : [];

  const ready = entries.filter(([, value]) => toneForStatus(value.status) === 'success').length;
  const attention = entries.filter(([, value]) => toneForStatus(value.status) === 'warning').length;
  const blocked = entries.filter(([, value]) => toneForStatus(value.status) === 'danger').length;

  return (
    <Page
      eyebrow="Governance"
      title="Integrations"
      subtitle="Environment readiness for everything the platform depends on. Statuses reflect configuration, never wishful thinking."
      actions={<RefreshButton pending={snapshot.isFetching} onPress={() => void snapshot.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard label="Channels" icon="plug" tone="accent" loading={snapshot.isLoading} value={entries.length} hint="Watched dependencies" />
        <StatCard label="Ready" icon="check" tone="success" loading={snapshot.isLoading} value={ready} hint="Configured and local" />
        <StatCard label="Awaiting setup" icon="clock" tone="warning" loading={snapshot.isLoading} value={attention} hint="Needs verification or release" />
        <StatCard label="Disabled" icon="alert" tone="danger" loading={snapshot.isLoading} value={blocked} hint="Not enabled in this environment" />
      </StatGrid>

      {snapshot.isError ? (
        <ErrorPanel message="Integration status could not be loaded." details={errorMessage(snapshot.error)} onRetry={() => void snapshot.refetch()} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map(([key, value]) => (
          <Panel
            key={key}
            title={labelize(key)}
            description={EXPLAINERS[key] ?? undefined}
            icon="plug"
            action={<StatusChip status={value.status} label={labelize(value.status)} tone={toneForStatus(value.status)} />}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted uppercase">Provider</span>
                <TagPill icon="building">{String(value.provider ?? value.driver ?? '—')}</TagPill>
              </div>
              <Separator />
              {definitionList([
                { label: 'Status', value: <StatusChip status={value.status} label={labelize(value.status)} tone={toneForStatus(value.status)} /> },
                { label: 'Configured value', value: String(value.provider ?? value.driver ?? '—') },
              ])}
              {toneForStatus(value.status) !== 'success' ? (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                  {toneForStatus(value.status) === 'warning'
                    ? 'Works locally but must be verified before production traffic is trusted.'
                    : 'Disabled here — enabling it requires configuration outside the console.'}
                </p>
              ) : null}
            </div>
          </Panel>
        ))}
        {!snapshot.isLoading && entries.length === 0 ? (
          <Panel title="No integrations reported" icon="plug">
            <p className="text-sm text-muted">The API returned an empty integration snapshot.</p>
          </Panel>
        ) : null}
      </div>

      <Panel title="Operating rules" description="Why these statuses are deliberately blunt." icon="shield">
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-success" />
            Development payment simulation is local only. Never describe it to a traveller as a real capture.
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-success" />
            Receipts and exports are private documents served through authorised downloads, never public links.
          </li>
          <li className="flex gap-2">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-warning" />
            When a channel is disabled, tell the traveller what still works instead of promising a silent retry.
          </li>
        </ul>
      </Panel>
    </Page>
  );
}
