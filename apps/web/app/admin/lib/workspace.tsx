'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Density = 'comfortable' | 'compact';

export interface WorkspaceContextValue {
  /** Reporting currency used by KPI cards, tables and the topbar switcher. */
  currency: string;
  setCurrency: (currency: string) => void;
  /** Sidebar rail state (desktop) — persisted so the console feels stable. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  /** Mobile navigation drawer. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  density: Density;
  setDensity: (density: Density) => void;
  /** Command palette (⌘K). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const STORAGE = {
  currency: 'ma.safaris.admin.currency',
  collapsed: 'ma.safaris.admin.sidebar',
  density: 'ma.safaris.admin.density',
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState('USD');
  const [collapsed, setCollapsedState] = useState(false);
  const [density, setDensityState] = useState<Density>('comfortable');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setCurrencyState(read(STORAGE.currency) ?? 'USD');
    setCollapsedState(read(STORAGE.collapsed) === 'true');
    setDensityState((read(STORAGE.density) as Density | null) ?? 'comfortable');
  }, []);

  const setCurrency = useCallback((next: string) => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE.currency, next);
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    window.localStorage.setItem(STORAGE.collapsed, String(next));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((previous) => {
      window.localStorage.setItem(STORAGE.collapsed, String(!previous));
      return !previous;
    });
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    window.localStorage.setItem(STORAGE.density, next);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currency,
      setCurrency,
      collapsed,
      toggleCollapsed,
      setCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      density,
      setDensity,
      paletteOpen,
      setPaletteOpen,
    }),
    [collapsed, currency, density, mobileNavOpen, paletteOpen, setCollapsed, setCurrency, setDensity, toggleCollapsed],
  );

  // ⌘K / Ctrl-K opens the command palette from anywhere in the console.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside <WorkspaceProvider>.');
  return context;
}
