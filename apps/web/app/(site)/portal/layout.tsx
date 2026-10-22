import type { Metadata } from 'next';
import '../../portal.css';
import { PortalAuthProvider } from '../../../lib/portal/auth';

export const metadata: Metadata = {
  title: 'My travel file — M&A Safaris',
  description: 'Review your written safari proposal, accept it and pay your deposit securely.',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalAuthProvider>{children}</PortalAuthProvider>;
}
