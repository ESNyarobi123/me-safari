'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PortalApiError, portalRequest } from '../../lib/portal/api';
import { portalErrorMessage, usePortalAuth } from '../../lib/portal/auth';
import { readQueryParam } from '../../lib/portal/hooks';

export default function PortalVerify() {
  const { status, refresh } = usePortalAuth();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    setToken(readQueryParam('token') ?? '');
    setEmail(readQueryParam('email') ?? '');
  }, []);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (token.trim().length < 10) {
      setError('Paste the verification code from your email.');
      return;
    }
    setBusy(true);
    try {
      await portalRequest('/auth/email/verification/complete', {
        method: 'POST',
        body: { token: token.trim() },
        anonymous: true,
        skipRefresh: true,
      });
      setDone(true);
      if (status === 'authenticated') await refresh();
    } catch (failure) {
      if (failure instanceof PortalApiError && failure.code === 'TOKEN_INVALID') {
        setError('That code is not valid or has already been used. Request a fresh one below.');
      } else {
        setError(portalErrorMessage(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address you registered with.');
      return;
    }
    setResending(true);
    setResent(false);
    try {
      await portalRequest('/auth/email/verification/request', {
        method: 'POST',
        body: { email: email.trim() },
        anonymous: true,
        skipRefresh: true,
      });
      setResent(true);
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setResending(false);
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
          <a className="ma-portal-browse" href="/portal/login/">Sign in</a>
        </div>
      </header>

      <main className="ma-portal-wrap ma-portal-auth-layout is-single">
        <section className="ma-portal-auth-card" aria-labelledby="verifyTitle">
          <p className="ma-portal-kicker">Email verification</p>
          <h1 id="verifyTitle">{done ? 'You are verified' : 'Confirm your email'}</h1>

          {done ? (
            <>
              <p className="ma-portal-auth-sub">
                Thank you. Your travel file is ready — you can accept a proposal and pay a deposit.
              </p>
              <a className="ma-portal-btn is-primary is-block" href={status === 'authenticated' ? '/portal/' : '/portal/login/'}>
                {status === 'authenticated' ? 'Go to my travel file' : 'Sign in'}
              </a>
            </>
          ) : (
            <>
              <p className="ma-portal-auth-sub">
                Paste the code from the verification email. Codes expire after 24 hours.
              </p>
              <form className="ma-portal-form" onSubmit={handleVerify}>
                <label className="ma-portal-field">
                  <span>Verification code</span>
                  <input
                    name="token"
                    required
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Paste the code from your email"
                    autoComplete="one-time-code"
                  />
                </label>
                <button className="ma-portal-btn is-primary is-block" type="submit" disabled={busy}>
                  {busy ? 'Verifying…' : 'Verify my email'}
                </button>
              </form>

              <div className="ma-portal-verify-resend">
                <p>Need a new code? Enter your email and we will send another link.</p>
                <div className="ma-portal-inline-form">
                  <input
                    type="email"
                    aria-label="Email for a new verification code"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                  <button className="ma-portal-btn is-quiet" type="button" onClick={() => void handleResend()} disabled={resending}>
                    {resending ? 'Sending…' : 'Resend code'}
                  </button>
                </div>
                {resent ? (
                  <p className="ma-portal-note is-success" role="status">
                    If that account exists, a fresh verification email is on its way.
                  </p>
                ) : null}
              </div>
            </>
          )}

          {error ? <p className="ma-portal-note is-error" role="alert">{error}</p> : null}

          <p className="ma-portal-auth-help">
            <a href="/portal/login/">Back to sign in</a> · <a href="/contact/">Contact the desk</a>
          </p>
        </section>
      </main>
    </div>
  );
}
