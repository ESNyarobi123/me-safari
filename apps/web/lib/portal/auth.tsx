'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  PortalApiError,
  clearTokens,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  onTokenChange,
  readAccess,
  type PortalUser,
} from './api';

export type PortalAuthStatus = 'booting' | 'authenticated' | 'anonymous';

interface PortalAuthContextValue {
  status: PortalAuthStatus;
  user: PortalUser | null;
  pending: boolean;
  signIn: (email: string, password: string) => Promise<PortalUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export class StaffAccountError extends Error {
  constructor() {
    super('This is a staff account. Use the staff console to manage journeys.');
    this.name = 'StaffAccountError';
  }
}

const isCustomer = (user: PortalUser) => (user.roles ?? []).includes('CUSTOMER');

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [status, setStatus] = useState<PortalAuthStatus>('booting');
  const [pending, setPending] = useState(false);
  const bootstrapToken = useRef<string | null>(null);

  const load = useCallback(async () => {
    const token = readAccess();
    if (!token) {
      setUser(null);
      setStatus('anonymous');
      return;
    }
    try {
      const me = await fetchMe();
      if (!isCustomer(me)) {
        clearTokens();
        setUser(null);
        setStatus('anonymous');
        return;
      }
      setUser(me);
      setStatus('authenticated');
    } catch {
      clearTokens();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    bootstrapToken.current = readAccess();
    void load();
    const unsubscribe = onTokenChange(({ accessToken }) => {
      if (accessToken === bootstrapToken.current) return;
      bootstrapToken.current = accessToken;
      if (!accessToken) {
        setUser(null);
        setStatus('anonymous');
      }
    });
    return unsubscribe;
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    setPending(true);
    try {
      const tokens = await apiLogin(email.trim(), password);
      if (!isCustomer(tokens.user)) {
        await apiLogout().catch(() => clearTokens());
        throw new StaffAccountError();
      }
      const me = await fetchMe().catch(() => tokens.user);
      setUser(me);
      setStatus('authenticated');
      return me;
    } finally {
      setPending(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const value = useMemo<PortalAuthContextValue>(
    () => ({ status, user, pending, signIn, signOut, refresh }),
    [pending, refresh, signIn, signOut, status, user],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth(): PortalAuthContextValue {
  const context = useContext(PortalAuthContext);
  if (!context) throw new Error('usePortalAuth must be used inside <PortalAuthProvider>.');
  return context;
}

export function portalErrorMessage(error: unknown): string {
  if (error instanceof StaffAccountError) return error.message;
  if (error instanceof PortalApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
      case 'AUTHENTICATION_FAILED':
        return 'That email and password combination is not recognised.';
      case 'ACCOUNT_LOCKED':
      case 'ACCOUNT_SUSPENDED':
        return 'This account is locked. Contact the Arusha desk so we can help.';
      case 'RATE_LIMITED':
        return 'Too many attempts. Wait a minute and try again.';
      case 'DEPENDENCY_UNAVAILABLE':
        return 'The service is temporarily unavailable. Try again shortly.';
      case 'EMAIL_VERIFICATION_REQUIRED':
        return 'Verify your email address first — then you can accept a proposal and pay a deposit.';
      case 'QUOTE_SUPERSEDED':
        return 'A newer version of this proposal was sent. Reload the page to read it.';
      case 'QUOTE_EXPIRED':
        return 'This proposal has expired. Ask the desk for an updated one.';
      case 'PAYMENT_ALREADY_PENDING':
        return 'A payment is already awaiting verification. Check the status before starting another.';
      case 'PAYMENT_NOT_REQUIRED':
        return 'No payment is required on this trip right now.';
      case 'INVALID_TRANSITION':
        return 'That action is no longer available. Reload and try again.';
      default:
        return error.message;
    }
  }
  if (error instanceof TypeError) return 'Cannot reach the M&A Safaris service. Check your connection and try again.';
  return 'Something went wrong. Try again.';
}

/** Client-side guard for portal pages. Redirects guests to sign in and back. */
export function PortalGuard({ children }: { children: ReactNode }) {
  const { status } = usePortalAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'anonymous') return;
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(`/portal/login/?next=${encodeURIComponent(here)}`);
  }, [router, status]);

  if (status === 'authenticated') return <>{children}</>;
  if (status === 'booting') {
    return (
      <div className="ma ma-portal">
        <div className="ma-portal-wrap ma-portal-boot" role="status" aria-live="polite">
          <div className="ma-portal-skeleton ma-portal-skeleton-wide" />
          <div className="ma-portal-skeleton" />
          <span className="ma-portal-sr">Opening your secure travel file…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="ma ma-portal">
      <div className="ma-portal-wrap ma-portal-boot" role="status">
        <p>Taking you to sign in…</p>
      </div>
    </div>
  );
}
