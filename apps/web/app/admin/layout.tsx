import type { Metadata, Viewport } from 'next';
import { AdminProviders } from './lib/providers';
import './admin.css';

export const metadata: Metadata = {
  title: 'Admin Console — M&A Safaris',
  description: 'Operations, catalog, finance and access control for M&A Safaris and Safari AI Rentals.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ff7b00',
  width: 'device-width',
  initialScale: 1,
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminProviders>
      <div className="min-h-dvh bg-background text-foreground">{children}</div>
    </AdminProviders>
  );
}
