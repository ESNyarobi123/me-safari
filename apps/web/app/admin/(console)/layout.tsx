'use client';

import { RequireAuth } from '../components/AppShell';

export default function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RequireAuth>{children}</RequireAuth>;
}
