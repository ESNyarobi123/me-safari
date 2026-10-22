import type { Metadata } from 'next';
import PortalOverview from '../../../components/portal/PortalOverview';
import { PortalGuard } from '../../../lib/portal/auth';

export const metadata: Metadata = {
  title: 'Overview — My travel file | M&A Safaris',
  robots: { index: false, follow: false },
};

export default function PortalHomePage() {
  return (
    <PortalGuard>
      <PortalOverview />
    </PortalGuard>
  );
}
