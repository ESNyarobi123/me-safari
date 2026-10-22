'use client';

import { Toast, useTheme } from '@heroui/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { AuthProvider } from './auth';
import { AdminQueryProvider } from './query';
import { ReauthProvider } from './reauth';
import { WorkspaceProvider } from './workspace';

/* ------------------------------------------------------------------ theme -- */

export type ThemeIntent = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The stored intent (`system` follows the operating system). */
  theme: ThemeIntent;
  /** The concrete theme currently applied to the document. */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeIntent) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function BrandThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useTheme('system');
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: (theme as ThemeIntent) ?? 'system',
      resolvedTheme: (resolvedTheme as 'light' | 'dark') ?? 'light',
      setTheme: (next) => setTheme(next),
      toggle: () => {
        const current = (resolvedTheme as 'light' | 'dark') ?? 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
      },
    }),
    [resolvedTheme, setTheme, theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useBrandTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useBrandTheme must be used inside <AdminProviders>.');
  return context;
}

/* -------------------------------------------------------------- composition */

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <AdminQueryProvider>
      <BrandThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ReauthProvider>
              {children}
              <Toast.Provider placement="top end" />
            </ReauthProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrandThemeProvider>
    </AdminQueryProvider>
  );
}
