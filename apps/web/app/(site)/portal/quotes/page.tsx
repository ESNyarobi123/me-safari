import type { Metadata } from 'next';
import PortalQuotes from '../../../../components/portal/PortalQuotes';
import { PortalGuard } from '../../../../lib/portal/auth';

export const metadata: Metadata = {
  title: 'Proposals — My travel file | M&A Safaris',
  robots: { index: false, follow: false },
};

export default function PortalQuotesPage() {
  return (
    <PortalGuard>
      <PortalQuotes />
    </PortalGuard>
  );
}
