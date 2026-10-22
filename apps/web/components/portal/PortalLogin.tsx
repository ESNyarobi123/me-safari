'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { PortalApiError, portalRequest } from '../../lib/portal/api';
import { portalErrorMessage, usePortalAuth } from '../../lib/portal/auth';
import { readQueryParam, safePortalNext } from '../../lib/portal/hooks';

type Mode = 'signin' | 'create';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_CUSTOMER_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_CUSTOMER_PASSWORD;

export default function PortalLogin() {
  const router = useRouter();
  const { status, pending, signIn } = usePortalAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [next, setNext] = useState('/portal/');

  useEffect(() => {
    setNext(safePortalNext(readQueryParam('next')));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [next, router, status]);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    try {
      await signIn(email, password);
      router.replace(next);
    } catch (failure) {
      setError(portalErrorMessage(failure));
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    if (name.trim().length < 2) {
      setFieldError('Enter the name we should use for your travel file.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    if (password.length < 12) {
      setFieldError('Choose a password with at least 12 characters.');
      return;
    }
    setCreating(true);
    try {
      await portalRequest<{ message: string }>('/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim(), password, locale: 'en' },
        anonymous: true,
        skipRefresh: true,
      });
      setRegistered(email.trim());
      setMode('signin');
    } catch (failure) {
      if (failure instanceof PortalApiError && failure.code === 'REGISTRATION_UNAVAILABLE') {
        setError('We could not create that account. Try signing in or resetting your password.');
      } else {
        setError(portalErrorMessage(failure));
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="ma ma-portal ma-portal-auth-page">
      <header className="ma-portal-auth-top">
        <div className="ma-portal-wrap ma-portal-auth-top-row">
          <a className="ma-portal-logo" href="/" aria-label="M&A Safaris home">
            <img src="/assets/brand-logo.png" alt="" width="42" height="42" />
            <span>
              M&amp;A Safaris
              <small>Arusha · Tanzania</small>
            </span>
          </a>
          <a className="ma-portal-browse" href="/#destinations">Browse journeys</a>
        </div>
      </header>

      <main className="ma-portal-wrap ma-portal-auth-layout">
        <section className="ma-portal-auth-story" aria-label="About your travel file">
          <p className="ma-portal-kicker">Private travel file</p>
          <h1>
            Your journey,
            <br />
            <em>one clear place.</em>
          </h1>
          <p>
            Read the written proposal from the Arusha desk, accept it when the plan is right, and
            pay your deposit securely. Your itinerary and receipts stay here for the road.
          </p>
          <ul className="ma-portal-auth-points">
            <li><b>01</b> Day-by-day itinerary and the confirmed price</li>
            <li><b>02</b> 30% deposit to reserve, balance before travel</li>
            <li><b>03</b> Receipts and documents in your travel file</li>
          </ul>
          <figure className="ma-portal-auth-photo">
            <img src="/assets/safari.jpg" alt="Safari vehicle crossing the Serengeti plains" width="720" height="480" />
            <figcaption>Planned by people in Arusha, not an algorithm.</figcaption>
          </figure>
        </section>

        <section className="ma-portal-auth-card" aria-labelledby="signInTitle">
          <div className="ma-portal-auth-tabs" role="tablist" aria-label="Sign in or create an account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'is-active' : undefined}
              onClick={() => { setMode('signin'); setError(null); setFieldError(null); }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              className={mode === 'create' ? 'is-active' : undefined}
              onClick={() => { setMode('create'); setError(null); setFieldError(null); }}
            >
              Create account
            </button>
          </div>

          <h2 id="signInTitle">{mode === 'signin' ? 'Welcome back' : 'Start your travel file'}</h2>
          <p className="ma-portal-auth-sub">
            {mode === 'signin'
              ? 'Sign in with the email you used with the desk.'
              : 'Create an account to keep proposals, trips and receipts together.'}
          </p>

          {registered ? (
            <div className="ma-portal-note is-success" role="status">
              <strong>Check your email.</strong>
              <span>
                We sent a verification link to {registered}. Verify it, then sign in to accept a
                proposal or pay a deposit.
              </span>
              <a className="ma-portal-inline-link" href={`/portal/verify/?email=${encodeURIComponent(registered)}`}>
                I have a verification code
              </a>
            </div>
          ) : null}

          {mode === 'signin' ? (
            <form className="ma-portal-form" onSubmit={handleSignIn}>
              <label className="ma-portal-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="ma-portal-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                />
              </label>
              <button className="ma-portal-btn is-primary is-block" type="submit" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in to my travel file'}
              </button>
              {DEMO_EMAIL && DEMO_PASSWORD ? (
                <button
                  className="ma-portal-btn is-quiet is-block"
                  type="button"
                  onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setError(null); }}
                >
                  Use the development demo account
                </button>
              ) : null}
            </form>
          ) : (
            <form className="ma-portal-form" onSubmit={handleCreate}>
              <label className="ma-portal-field">
                <span>Full name</span>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="As it appears on your passport"
                />
              </label>
              <label className="ma-portal-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="ma-portal-field">
                <span>Password <small>12+ characters</small></span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a strong password"
                />
              </label>
              <button className="ma-portal-btn is-primary is-block" type="submit" disabled={creating}>
                {creating ? 'Creating your account…' : 'Create my travel file'}
              </button>
              <p className="ma-portal-fineprint">
                We email a verification link. Verifying is required before accepting a proposal or
                paying a deposit.
              </p>
            </form>
          )}

          {fieldError ? <p className="ma-portal-note is-error" role="alert">{fieldError}</p> : null}
          {error ? <p className="ma-portal-note is-error" role="alert">{error}</p> : null}

          <p className="ma-portal-auth-help">
            Staff member? <a href="/admin/">Open the staff console</a>
          </p>
          <p className="ma-portal-auth-help">
            Trouble signing in? <a href="/contact/">Contact the Arusha desk</a>
          </p>
        </section>
      </main>
    </div>
  );
}
