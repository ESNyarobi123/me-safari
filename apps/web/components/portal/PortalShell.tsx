'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { usePortalAuth } from '../../lib/portal/auth';
import { initials, statusLabel, statusTone } from '../../lib/portal/format';

export type PortalSection = 'overview' | 'quotes' | 'bookings';

const TABS: Array<{ id: PortalSection; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: '/portal/' },
  { id: 'quotes', label: 'Proposals', href: '/portal/quotes/' },
  { id: 'bookings', label: 'My trips', href: '/portal/bookings/' },
];

export function PortalShell({
  active,
  children,
}: {
  active: PortalSection;
  children: ReactNode;
}) {
  const { user, signOut } = usePortalAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      router.replace('/portal/login/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ma ma-portal">
      <a className="ma-portal-skip" href="#portalMain">Skip to your travel file</a>

      <header className="ma-portal-top">
        <div className="ma-portal-wrap ma-portal-top-row">
          <a className="ma-portal-logo" href="/portal/" aria-label="M&A Safaris customer portal home">
            <img src="/assets/brand-logo.png" alt="" width="42" height="42" />
            <span>
              M&amp;A Safaris
              <small>Your travel file</small>
            </span>
          </a>

          <nav className="ma-portal-nav" aria-label="Customer portal">
            {TABS.map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                className={tab.id === active ? 'is-active' : undefined}
                aria-current={tab.id === active ? 'page' : undefined}
              >
                {tab.label}
              </a>
            ))}
          </nav>

          <div className="ma-portal-top-tools">
            <a className="ma-portal-browse" href="/#destinations">Browse journeys</a>
            <span className="ma-portal-avatar" aria-hidden="true">{initials(user?.name)}</span>
            <span className="ma-portal-user-name">{user?.name ?? 'Traveller'}</span>
            <button className="ma-portal-signout" type="button" onClick={() => void handleSignOut()} disabled={busy}>
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main id="portalMain" className="ma-portal-wrap ma-portal-main">
        {children}
      </main>

      <footer className="ma-portal-footer">
        <div className="ma-portal-wrap ma-portal-footer-row">
          <p>
            <strong>M&amp;A Safaris</strong> · Arusha, Tanzania
            <span>Private travel file — only you and the Arusha desk can see this.</span>
          </p>
          <nav aria-label="Portal footer">
            <a href="/contact/">Talk to the desk</a>
            <a href="/#destinations">Journeys</a>
            <a href="/admin/">Staff console</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function PortalPageHead({
  kicker,
  title,
  intro,
  actions,
}: {
  kicker: string;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ma-portal-head">
      <div>
        <p className="ma-portal-kicker">{kicker}</p>
        <h1>{title}</h1>
        {intro ? <p className="ma-portal-intro">{intro}</p> : null}
      </div>
      {actions ? <div className="ma-portal-head-actions">{actions}</div> : null}
    </div>
  );
}

export function StatusChip({ status, label }: { status?: string | null; label?: string }) {
  return <span className={`ma-portal-chip is-${statusTone(status)}`}>{label ?? statusLabel(status)}</span>;
}

