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
  ApiError,
  clearTokens,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  onTokenChange,
  readAccess,
  type AdminUser,
  type Role,
} from './api';

export type AuthStatus = 'booting' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AdminUser | null;
  roles: Role[];
  permissions: string[];
  /** True while a sign-in request is in flight. */
  pending: boolean;
  signIn: (email: string, password: string) => Promise<AdminUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Roles allowed into the console at all. */
export const CONSOLE_ROLES: Role[] = ['ADMIN', 'OPERATIONS'];

export class NotAuthorizedError extends Error {
  constructor(message = 'This account does not have console access.') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('booting');
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
      const roles = me.roles ?? [];
      if (!roles.some((role) => CONSOLE_ROLES.includes(role))) {
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

  // Bootstrap once, then react to token changes coming from the API client
  // (for example when a refresh fails and every token is dropped).
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

  const signIn = useCallback(
    async (email: string, password: string) => {
      setPending(true);
      try {
        const tokens = await apiLogin(email.trim(), password, 'Admin console · web');
        const roles = tokens.user?.roles ?? [];
        if (!roles.some((role) => CONSOLE_ROLES.includes(role))) {
          await apiLogout().catch(() => clearTokens());
          throw new NotAuthorizedError();
        }
        const me = await fetchMe().catch(() => tokens.user);
        setUser(me);
        setStatus('authenticated');
        return me;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('anonymous');
    router.replace('/admin/login/');
  }, [router]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = user?.permissions ?? [];
    const roles = user?.roles ?? [];
    const granted = new Set(permissions);
    return {
      status,
      user,
      roles,
      permissions,
      pending,
      signIn,
      signOut,
      refresh,
      can: (permission: string) => roles.includes('ADMIN') || granted.has(permission),
      canAny: (...list: string[]) => roles.includes('ADMIN') || list.some((permission) => granted.has(permission)),
    };
  }, [pending, refresh, signIn, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

/** Human-readable message for any auth failure. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof NotAuthorizedError) return error.message;
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'AUTHENTICATION_FAILED':
      case 'INVALID_CREDENTIALS':
        return 'That email and password combination is not recognised.';
      case 'ACCOUNT_LOCKED':
      case 'ACCOUNT_SUSPENDED':
        return 'This account is locked. Contact another administrator.';
      case 'RATE_LIMITED':
        return 'Too many attempts. Wait a minute and try again.';
      case 'DEPENDENCY_UNAVAILABLE':
        return 'The service is temporarily unavailable. Try again shortly.';
      default:
        return error.message;
    }
  }
  if (error instanceof TypeError) return 'Cannot reach the API. Check that the backend is running.';
  return 'Sign-in failed. Try again.';
}
