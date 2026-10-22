'use client';

import { Button, Separator, Skeleton } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../components/icons';
import {
  CheckInput,
  ConfirmDialog,
  ErrorPanel,
  FieldGrid,
  FormDialog,
  Page,
  Panel,
  RefreshButton,
  SelectInput,
  StatCard,
  StatGrid,
  StatusChip,
  TabStrip,
  TagPill,
  TextAreaInput,
  TextInput,
  definitionList,
} from '../../components/ui';
import { errorMessage, useApi, useCommand } from '../../lib/hooks';
import { formatDateTime, labelize } from '../../lib/format';
import type { CompanySettings, IntegrationStatus } from '../../lib/types';

interface PolicyVersion {
  id: string;
  version: number;
  depositBasisPoints: number;
  balanceDaysBefore: number;
  previewMinutes: number;
  quoteDays: number;
  effectiveAt: string;
  createdAt?: string;
  rules?: Record<string, unknown>;
}

interface SettingsSnapshot extends CompanySettings {
  integrations?: IntegrationStatus;
}

interface CompanyDraft {
  name: string;
  email: string;
  phone: string;
  appStoreUrl: string;
  playStoreUrl: string;
  timezone: string;
  english: boolean;
  swahili: boolean;
  emailChannel: boolean;
  pushChannel: boolean;
}

const DEFAULT_DRAFT: CompanyDraft = {
  name: '',
  email: '',
  phone: '',
  appStoreUrl: '',
  playStoreUrl: '',
  timezone: 'Africa/Dar_es_Salaam',
  english: true,
  swahili: true,
  emailChannel: true,
  pushChannel: false,
};

export default function SettingsPage() {
  const snapshot = useApi<SettingsSnapshot>('/admin/settings');
  const [tab, setTab] = useState<'company' | 'policies' | 'notifications'>('company');
  const [draft, setDraft] = useState<CompanyDraft>(DEFAULT_DRAFT);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policy, setPolicy] = useState({
    depositBasisPoints: '3000',
    balanceDaysBefore: '30',
    previewMinutes: '15',
    quoteDays: '14',
    effectiveAt: '',
    rules: '{\n  "freeCancellationDays": 3,\n  "childDiscountBasisPoints": 7000\n}',
    reason: '',
  });
  const [notificationReason, setNotificationReason] = useState('');

  const command = useCommand({ invalidate: [['api', '/admin/settings']], successMessage: false });

  const company = snapshot.data?.company;
  const settings = (company?.settings ?? {}) as Record<string, unknown>;
  const policies = (snapshot.data?.policies ?? []) as unknown as PolicyVersion[];
  const integrations = snapshot.data?.integrations;

  useEffect(() => {
    if (!company || draft.name) return;
    const channels = (settings.notificationChannels ?? {}) as { email?: boolean; push?: boolean };
    const locales = (settings.locales ?? ['en', 'sw']) as string[];
    setDraft({
      name: String(settings.name ?? ''),
      email: String(settings.email ?? ''),
      phone: String(settings.phone ?? ''),
      appStoreUrl: String(settings.appStoreUrl ?? ''),
      playStoreUrl: String(settings.playStoreUrl ?? ''),
      timezone: String(settings.timezone ?? 'Africa/Dar_es_Salaam'),
      english: locales.includes('en'),
      swahili: locales.includes('sw'),
      emailChannel: channels.email ?? true,
      pushChannel: channels.push ?? false,
    });
  }, [company, draft.name, settings]);

  function composeSettings(): Record<string, unknown> {
    return {
      ...settings,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      appStoreUrl: draft.appStoreUrl.trim() || null,
      playStoreUrl: draft.playStoreUrl.trim() || null,
      timezone: draft.timezone.trim(),
      locales: [draft.english ? 'en' : null, draft.swahili ? 'sw' : null].filter(Boolean),
      notificationChannels: { email: draft.emailChannel, push: draft.pushChannel },
    };
  }

  async function saveCompany(reason: string) {
    await command.run('/admin/settings/company', 'PATCH', {
      body: { expectedVersion: company?.version ?? 0, settings: composeSettings(), reason },
      reauth: 'settings.manage',
      successMessage: 'Company settings published as a new version.',
    });
    void snapshot.refetch();
  }

  const latestPolicy = policies[0];

  return (
    <Page
      eyebrow="Governance"
      title="Settings"
      subtitle="Company identity, booking policy versions and notification channels. Every change creates a new immutable version with a reason."
      actions={<RefreshButton pending={snapshot.isFetching} onPress={() => void snapshot.refetch()} />}
    >
      <StatGrid columns={4}>
        <StatCard
          label="Settings version"
          icon="sliders"
          tone="accent"
          loading={snapshot.isLoading}
          value={company ? `v${company.version}` : '—'}
          hint={company ? `published ${formatDateTime((company as { createdAt?: string }).createdAt)}` : 'Not configured'}
        />
        <StatCard
          label="Policy versions"
          icon="shield"
          tone="default"
          loading={snapshot.isLoading}
          value={policies.length}
          hint={latestPolicy ? `latest v${latestPolicy.version}` : 'None recorded'}
        />
        <StatCard
          label="Deposit"
          icon="card"
          tone="success"
          loading={snapshot.isLoading}
          value={latestPolicy ? `${(latestPolicy.depositBasisPoints / 100).toFixed(1)}%` : '—'}
          hint={latestPolicy ? `balance due ${latestPolicy.balanceDaysBefore} days before travel` : 'Default applies'}
        />
        <StatCard
          label="Channels"
          icon="plug"
          tone="warning"
          loading={snapshot.isLoading}
          value={`${draft.emailChannel ? 'Email' : ''}${draft.emailChannel && draft.pushChannel ? ' + ' : ''}${draft.pushChannel ? 'Push' : ''}` || 'None'}
          hint={integrations ? `payments ${labelize(integrations.payments.status)}` : 'Not checked'}
        />
      </StatGrid>

      {snapshot.isError ? (
        <ErrorPanel message="Settings could not be loaded." details={errorMessage(snapshot.error)} onRetry={() => void snapshot.refetch()} />
      ) : null}

      {snapshot.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : null}

      {!snapshot.isLoading ? (
        <>
          <TabStrip
            value={tab}
            onChange={setTab}
            options={[
              { value: 'company', label: 'Company' },
              { value: 'policies', label: 'Booking policies', count: policies.length },
              { value: 'notifications', label: 'Notifications' },
            ]}
          />

          {tab === 'company' ? (
            <Panel
              title="Company profile"
              description="Public identity used on documents, receipts and the published site."
              icon="building"
              action={
                <ConfirmDialog
                  trigger={
                    <Button variant="primary" size="sm">
                      <Icon name="check" size={15} />
                      Publish changes
                    </Button>
                  }
                  title="Publish company settings"
                  description="A new settings version is created; the previous version stays on record."
                  confirmLabel="Publish version"
                  destructive={false}
                  onConfirm={async (reason) => {
                    await saveCompany(reason);
                  }}
                >
                  <p className="text-sm text-muted">
                    Review the values below before publishing — documents issued after this point use the new identity.
                  </p>
                  <Separator className="my-3" />
                  {definitionList(
                    Object.entries(composeSettings()).map(([key, value]) => ({
                      label: labelize(key),
                      value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—'),
                    })),
                  )}
                </ConfirmDialog>
              }
            >
              <div className="space-y-3">
                <FieldGrid>
                  <TextInput label="Company name" value={draft.name} isRequired onChange={(value) => setDraft((c) => ({ ...c, name: value }))} />
                  <TextInput label="Public email" type="email" value={draft.email} inputMode="email" onChange={(value) => setDraft((c) => ({ ...c, email: value }))} />
                </FieldGrid>
                <FieldGrid>
                  <TextInput label="Phone" value={draft.phone} inputMode="tel" onChange={(value) => setDraft((c) => ({ ...c, phone: value }))} />
                  <TextInput
                    label="Timezone"
                    value={draft.timezone}
                    onChange={(value) => setDraft((c) => ({ ...c, timezone: value }))}
                    description="All dispatch times are interpreted in this zone."
                  />
                </FieldGrid>
                <FieldGrid>
                  <TextInput
                    label="App Store URL"
                    value={draft.appStoreUrl}
                    onChange={(value) => setDraft((c) => ({ ...c, appStoreUrl: value }))}
                    description="Must be an https://apps.apple.com link."
                  />
                  <TextInput
                    label="Play Store URL"
                    value={draft.playStoreUrl}
                    onChange={(value) => setDraft((c) => ({ ...c, playStoreUrl: value }))}
                    description="Must be an https://play.google.com link."
                  />
                </FieldGrid>
                <Separator />
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Published languages</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <CheckInput label="English (en)" value={draft.english} onChange={(value) => setDraft((c) => ({ ...c, english: value }))} />
                  <CheckInput label="Kiswahili (sw)" value={draft.swahili} onChange={(value) => setDraft((c) => ({ ...c, swahili: value }))} />
                </div>
                <Separator />
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Applicable in the console</p>
                {definitionList([
                  { label: 'Settings version', value: company ? `v${company.version}` : '—' },
                  { label: 'Stored keys', value: Object.keys(settings).length },
                  { label: 'Email provider', value: integrations?.email.status ? labelize(integrations.email.status) : '—' },
                ])}
              </div>
            </Panel>
          ) : null}

          {tab === 'policies' ? (
            <Panel
              title="Booking policy versions"
              description="Deposits, balance windows and quote validity. A new version applies from its effective date."
              icon="shield"
              action={
                <Button variant="primary" size="sm" onPress={() => setPolicyOpen(true)}>
                  <Icon name="plus" size={15} />
                  New policy version
                </Button>
              }
            >
              {policies.length === 0 ? (
                <p className="text-sm text-muted">No policy versions recorded yet — the platform defaults apply.</p>
              ) : (
                <ul className="divide-y divide-separator rounded-xl border border-separator">
                  {policies.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Version {entry.version}
                          {entry.id === latestPolicy?.id ? <TagPill icon="check">Latest</TagPill> : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          deposit {(entry.depositBasisPoints / 100).toFixed(1)}% · balance {entry.balanceDaysBefore}d before travel · quote
                          valid {entry.quoteDays}d · preview {entry.previewMinutes}m
                        </p>
                        <p className="text-xs text-muted">
                          effective {formatDateTime(entry.effectiveAt)}
                          {entry.createdAt ? ` · created ${formatDateTime(entry.createdAt)}` : ''}
                        </p>
                      </div>
                      <StatusChip
                        status={entry.id === latestPolicy?.id ? 'ACTIVE' : 'SUPERSEDED'}
                        label={entry.id === latestPolicy?.id ? 'Current' : 'Superseded'}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {latestPolicy?.rules && Object.keys(latestPolicy.rules).length > 0 ? (
                <>
                  <Separator className="my-4" />
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Current policy rules</p>
                  <pre className="admin-scroll max-h-60 overflow-auto rounded-xl border border-separator bg-surface-secondary/60 p-3 font-mono text-[11px] text-muted">
                    {JSON.stringify(latestPolicy.rules, null, 2)}
                  </pre>
                </>
              ) : null}
            </Panel>
          ) : null}

          {tab === 'notifications' ? (
            <Panel
              title="Notification channels"
              description="Which channels the platform may use for traveller and staff messaging."
              icon="bell"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <CheckInput
                    label="Email"
                    value={draft.emailChannel}
                    onChange={(value) => setDraft((c) => ({ ...c, emailChannel: value }))}
                    description="Invitations, quotes, receipts and trip updates."
                  />
                  <CheckInput
                    label="Push notifications"
                    value={draft.pushChannel}
                    onChange={(value) => setDraft((c) => ({ ...c, pushChannel: value }))}
                    description="Only enable once the push provider is verified."
                  />
                </div>
                <TextAreaInput
                  label="Reason for this notification change"
                  rows={3}
                  value={notificationReason}
                  onChange={setNotificationReason}
                  description="At least 10 characters; recorded in the audit log."
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    isDisabled={notificationReason.trim().length < 10}
                    isPending={command.pending}
                    onPress={async () => {
                      await saveCompany(notificationReason);
                      setNotificationReason('');
                    }}
                  >
                    <Icon name="bell" size={15} />
                    Save channels
                  </Button>
                </div>
                <Separator />
                {integrations ? (
                  definitionList([
                    { label: 'Email provider', value: <StatusChip status={integrations.email.status} label={labelize(integrations.email.status)} /> },
                    { label: 'Push provider', value: <StatusChip status={integrations.push.status} label={labelize(integrations.push.status)} /> },
                    { label: 'Payments', value: <StatusChip status={integrations.payments.status} label={labelize(integrations.payments.status)} /> },
                    { label: 'Storage', value: <StatusChip status={integrations.storage.status} label={labelize(integrations.storage.status)} /> },
                  ])
                ) : (
                  <p className="text-xs text-muted">Integration readiness is not available in this snapshot.</p>
                )}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}

      <FormDialog
        open={policyOpen}
        onOpenChange={setPolicyOpen}
        title="Create a booking policy version"
        description="New versions apply from their effective date and never rewrite history."
        submitLabel="Create version"
        onSubmit={async () => {
          let rules: Record<string, unknown> = {};
          try {
            rules = JSON.parse(policy.rules) as Record<string, unknown>;
          } catch {
            rules = {};
          }
          await command.run('/admin/settings/booking-policies', 'POST', {
            body: {
              depositBasisPoints: Number(policy.depositBasisPoints),
              balanceDaysBefore: Number(policy.balanceDaysBefore),
              previewMinutes: Number(policy.previewMinutes),
              quoteDays: Number(policy.quoteDays),
              rules,
              effectiveAt: new Date(policy.effectiveAt).toISOString(),
              reason: policy.reason,
            },
            reauth: 'settings.manage',
            successMessage: 'Policy version created.',
          });
          void snapshot.refetch();
        }}
        disabled={!policy.effectiveAt || policy.reason.trim().length < 10}
      >
        <div className="space-y-3">
          <FieldGrid>
            <TextInput
              label="Deposit basis points"
              value={policy.depositBasisPoints}
              inputMode="numeric"
              description="3000 = 30% deposit at booking."
              onChange={(value) => setPolicy((c) => ({ ...c, depositBasisPoints: value.replace(/[^\d]/g, '') }))}
            />
            <TextInput
              label="Balance days before travel"
              value={policy.balanceDaysBefore}
              inputMode="numeric"
              onChange={(value) => setPolicy((c) => ({ ...c, balanceDaysBefore: value.replace(/[^\d]/g, '') }))}
            />
          </FieldGrid>
          <FieldGrid>
            <TextInput
              label="Quote validity (days)"
              value={policy.quoteDays}
              inputMode="numeric"
              onChange={(value) => setPolicy((c) => ({ ...c, quoteDays: value.replace(/[^\d]/g, '') }))}
            />
            <TextInput
              label="Pricing preview validity (minutes)"
              value={policy.previewMinutes}
              inputMode="numeric"
              onChange={(value) => setPolicy((c) => ({ ...c, previewMinutes: value.replace(/[^\d]/g, '') }))}
            />
          </FieldGrid>
          <TextInput
            label="Effective at"
            type="datetime-local"
            value={policy.effectiveAt}
            onChange={(value) => setPolicy((c) => ({ ...c, effectiveAt: value }))}
          />
          <TextAreaInput
            label="Rules (JSON)"
            rows={7}
            value={policy.rules}
            onChange={(value) => setPolicy((c) => ({ ...c, rules: value }))}
            description="Free cancellation windows, child discount basis points, and any other structured rule."
          />
          <TextAreaInput
            label="Reason (recorded in the audit log)"
            rows={3}
            value={policy.reason}
            onChange={(value) => setPolicy((c) => ({ ...c, reason: value }))}
          />
        </div>
      </FormDialog>
    </Page>
  );
}
