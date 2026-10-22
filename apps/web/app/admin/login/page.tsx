'use client';

import { Alert, Button, Checkbox, Label, Separator, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../components/icons';
import { TextInput } from '../components/ui';
import { authErrorMessage, useAuth } from '../lib/auth';
import { useBrandTheme } from '../lib/providers';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? '';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? '';
const HAS_DEMO = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const HIGHLIGHTS = [
  {
    num: '01',
    icon: 'chart',
    title: 'One screen for the business',
    copy: 'Money, bookings, trips and exceptions in a single control room.',
  },
  {
    num: '02',
    icon: 'car',
    title: 'Safari AI Rentals built in',
    copy: 'Chauffeur fleet, rates, service lines and published policy.',
  },
  {
    num: '03',
    icon: 'shield',
    title: 'Every privileged action logged',
    copy: 'Scoped roles, permission overrides and an immutable audit trail.',
  },
] as const;

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, status, pending } = useAuth();
  const { resolvedTheme, toggle } = useBrandTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/admin/');
  }, [router, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/admin/');
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  return (
    <div className="admin-login-shell">
      {/* --------------------------------------------------- Top Hero UI Nav */}
      <header className="admin-login-topbar">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/assets/brand-logo.png"
              alt="Me and Adventure Safaris"
              width={44}
              height={44}
              className="size-11 rounded-full border-2 border-[#ff7b00]/35 bg-[#0c0d0b] object-cover shadow-md"
            />
            <div className="leading-tight">
              <p className="font-ui text-[15px] font-extrabold tracking-tight text-[#0a2540] dark:text-white">
                M&amp;A Safaris
              </p>
              <p className="font-ui text-[10px] font-extrabold tracking-[0.16em] text-[#ff7b00] uppercase">
                Admin Console
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0a2540]/10 bg-[#fffdfa] px-3.5 py-1.5 text-xs font-bold text-[#0a2540] shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-white">
              <span className="size-2 rounded-full bg-[#ff7b00] shadow-[0_0_0_3px_rgba(255,123,0,0.22)]" />
              Arusha HQ · Africa/Dar_es_Salaam
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0a2540]/10 bg-[#fffdfa] px-3 py-1.5 text-xs font-bold text-[#5e6358] shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-white/80">
              <Icon name="car" size={13} />
              32 Safari AI Vehicles
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#0a2540]/12 bg-[#fffdfa] px-3.5 text-xs font-bold text-[#0a2540] shadow-xs transition hover:border-[#ff7b00] dark:border-white/15 dark:bg-white/10 dark:text-white"
              aria-label="Toggle color theme"
            >
              <Icon name={resolvedTheme === 'dark' ? 'moon' : 'sun'} size={14} />
              <span className="hidden sm:inline">
                {resolvedTheme === 'dark' ? 'Dark interface' : 'Light interface'}
              </span>
            </button>

            <Link
              href="/"
              className="inline-flex min-h-[38px] items-center gap-2 rounded-full bg-[#0a2540] py-1 pr-1.5 pl-3.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#143558]"
            >
              <span>Back to the website</span>
              <span className="grid size-7 place-items-center rounded-full bg-[#ff7b00] text-white">
                <Icon name="external" size={12} />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- Main Grid */}
      <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-10">
        {/* -------------------------------------------- Left Hero UI Showcase */}
        <section className="flex flex-col justify-between">
          <div>
            <p className="admin-login-badge">
              <span>Tanzania · More than a destination</span>
              <span className="admin-login-badge-dot" aria-hidden="true">
                <Icon name="compass" size={14} />
              </span>
            </p>

            <h1 className="admin-login-h1 mt-4">
              Run the whole safari <em>business from one calm workspace.</em>
            </h1>

            <p className="mt-3.5 max-w-xl text-[15.5px] leading-relaxed text-[#5e6358] dark:text-white/75">
              Packages, destinations and landing content. Bookings, quotes and dispatch. Payments, refunds and
              reconciliation. Fleet, guides and chauffeur rentals. All governed, all audited.
            </p>
          </div>

          {/* Hero UI 3D Circular Plate + Orange Pedestal Stage */}
          <div className="admin-hero-stage" aria-hidden="true">
            <div className="admin-hero-plate">
              <div className="admin-hero-plate-inner">
                <img src="/assets/safari-1200.webp" alt="" width={420} height={420} />
              </div>
            </div>

            <div className="admin-hero-orb admin-hero-orb-a">
              <img src="/assets/vehicle-640.webp" alt="" width={80} height={80} />
              <span>
                <Icon name="car" size={12} />
              </span>
            </div>

            <div className="admin-hero-orb admin-hero-orb-b">
              <img src="/assets/zanzibar-640.webp" alt="" width={80} height={80} />
              <span>
                <Icon name="sparkles" size={12} />
              </span>
            </div>

            <div className="admin-hero-offer">
              <span className="admin-hero-offer-tag">Live Control Room</span>
              <span className="admin-hero-offer-thumb">
                <img src="/assets/kilimanjaro-640.webp" alt="" width={56} height={56} />
              </span>
              <div className="min-w-0 leading-tight">
                <strong className="font-ui block truncate text-xs font-extrabold text-[#0a2540]">
                  Safaris &amp; AI Rentals
                </strong>
                <span className="block text-[11px] tracking-wider text-[#f59e0b]">★★★★★</span>
                <small className="font-ui block text-[11px] font-extrabold text-[#ff7b00]">
                  4 branches · 32 vehicles
                </small>
              </div>
            </div>

            <div className="admin-hero-pedestal">
              <p className="admin-hero-pedestal-bar">Governed &amp; audited across every department:</p>
              <div className="admin-hero-pedestal-pills">
                <span>
                  <i>✓</i> Role-scoped sessions
                </span>
                <span>
                  <i>✓</i> Immutable audit log
                </span>
                <span>
                  <i>✓</i> Africa/Dar_es_Salaam
                </span>
              </div>
            </div>
          </div>

          {/* 3 Hero UI Feature Cards (01 - 03) */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-[#0a2540]/8 bg-[#fffdfa] p-4 shadow-[0_14px_32px_rgba(10,37,64,0.06)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff7b00] to-[#ff9526] text-white shadow-[0_8px_16px_rgba(255,123,0,0.25)]">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="font-ui rounded-full bg-[#fff2e5] px-2.5 py-0.5 text-[11px] font-extrabold text-[#a94700] dark:bg-[#ff7b00]/20 dark:text-[#ffb366]">
                    {item.num}
                  </span>
                </div>
                <p className="font-ui text-[14px] leading-snug font-extrabold text-[#0a2540] dark:text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5e6358] dark:text-white/70">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------- Right Sign-In Card */}
        <section className="order-first flex flex-col items-center justify-center lg:order-none">
          <div className="w-full max-w-[460px]">
            <div className="admin-signin-card">
              <span className="admin-signin-tag">Administrator &amp; Operations Desk</span>

              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-ui text-[28px] leading-tight font-extrabold tracking-tight text-[#0a2540] dark:text-white">
                    Sign <span className="text-[#ff7b00]">in.</span>
                  </h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5e6358] dark:text-white/70">
                    Use your M&amp;A Safaris administrator account. Console access requires the Administrator or
                    Operations role.
                  </p>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff2e5] text-[#ff7b00] shadow-inner dark:bg-[#ff7b00]/20">
                  <Icon name="shield" size={22} />
                </span>
              </div>

              {/* Role scope chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0a2540] px-3 py-1 text-[11px] font-extrabold text-white">
                  <Icon name="lock" size={11} />
                  Administrator
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f3ed] px-3 py-1 text-[11px] font-bold text-[#0a2540] dark:bg-white/10 dark:text-white">
                  <Icon name="compass" size={11} />
                  Operations Desk
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5f5] px-3 py-1 text-[11px] font-bold text-[#085856] dark:bg-[#0d7c79]/25 dark:text-[#6ee7b7]">
                  <Icon name="car" size={11} />
                  Safari AI Fleet
                </span>
              </div>

              {error ? (
                <div className="mt-4">
                  <Alert status="danger">
                    <Alert.Indicator>
                      <Icon name="alert" size={16} />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>Could not sign you in</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              ) : null}

              <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
                <div className="rounded-2xl border border-[#0a2540]/8 bg-[#f6f3ed]/65 p-3.5 transition focus-within:border-[#ff7b00] focus-within:bg-[#fffdfa] dark:border-white/10 dark:bg-white/5">
                  <TextInput
                    label="Work email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    inputMode="email"
                    placeholder="you@meandadventure.com"
                    isRequired
                    autoFocus
                  />
                </div>

                <div className="rounded-2xl border border-[#0a2540]/8 bg-[#f6f3ed]/65 p-3.5 transition focus-within:border-[#ff7b00] focus-within:bg-[#fffdfa] dark:border-white/10 dark:bg-white/5">
                  <TextInput
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    isRequired
                    description={
                      <button
                        type="button"
                        className="font-ui mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff2e5] px-2.5 py-0.5 text-[11px] font-extrabold text-[#a94700] transition hover:bg-[#ff7b00] hover:text-white dark:bg-[#ff7b00]/20 dark:text-[#ffb366]"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        <Icon name="eye" size={12} />
                        {showPassword ? 'Hide password' : 'Show password'}
                      </button>
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Checkbox isSelected={remember} onChange={setRemember} className="items-center">
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <Label className="text-sm font-medium">Keep me signed in on this device</Label>
                    </Checkbox.Content>
                  </Checkbox>

                  <span className="rounded-full bg-[#f6f3ed] px-2.5 py-1 text-[11px] font-bold text-[#5e6358] dark:bg-white/10 dark:text-white/75">
                    Encrypted session
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isPending={pending}
                  size="lg"
                  className="admin-signin-submit"
                >
                  {pending ? <Spinner size="sm" color="current" /> : <Icon name="lock" size={16} />}
                  <span>Sign in to console</span>
                  <span className="admin-signin-submit-arrow" aria-hidden="true">
                    <Icon name="arrow-right" size={14} />
                  </span>
                </Button>
              </form>

              {HAS_DEMO ? (
                <div className="mt-5 rounded-2xl border border-[#ff7b00]/25 bg-[#fff2e5] p-3.5 dark:bg-[#ff7b00]/12">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-ui text-[10px] font-extrabold tracking-[0.14em] text-[#a94700] uppercase dark:text-[#ffb366]">
                      Development Quick-Fill
                    </span>
                    <span className="rounded-full bg-[#ff7b00] px-2 py-0.5 text-[10px] font-extrabold text-white">
                      Local Seed
                    </span>
                  </div>
                  <Button
                    variant="tertiary"
                    fullWidth
                    className="rounded-full border border-[#0a2540]/12 bg-[#fffdfa] font-bold text-[#0a2540] shadow-xs hover:border-[#ff7b00] dark:bg-white/10 dark:text-white"
                    onPress={() => {
                      setEmail(DEMO_EMAIL);
                      setPassword(DEMO_PASSWORD);
                      setError(null);
                    }}
                  >
                    <Icon name="bolt" size={15} />
                    Fill seeded demo administrator
                  </Button>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#5e6358] dark:text-white/70">
                    The demo account is created by the local seed script and is disabled outside development.
                  </p>
                </div>
              ) : null}

              <Separator className="my-5" />

              {/* Footer inside Sign-In Card */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5e6358] dark:text-white/70">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="grid size-6 place-items-center rounded-full bg-[#fff2e5] text-[#ff7b00] dark:bg-white/10">
                    <Icon name="shield" size={12} />
                  </span>
                  Trouble signing in? Reset in <strong className="text-[#0a2540] dark:text-white">Access &amp; roles</strong>
                </span>

                <Link
                  href="/"
                  className="font-ui inline-flex items-center gap-1 font-extrabold text-[#0d7c79] hover:underline dark:text-[#5eead4]"
                >
                  Back to the website
                  <Icon name="external" size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
