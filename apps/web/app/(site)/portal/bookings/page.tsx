import type { Metadata } from 'next';
import PortalBookings from '../../../../components/portal/PortalBookings';
import { PortalGuard } from '../../../../lib/portal/auth';

export const metadata: Metadata = {
  title: 'My trips — My travel file | M&A Safaris',
  robots: { index: false, follow: false },
};

export default function PortalBookingsPage() {
  return (
    <PortalGuard>
      <PortalBookings />
    </PortalGuard>
  );
}
