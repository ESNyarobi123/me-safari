import type { Metadata } from 'next';
import PortalVerify from '../../../../components/portal/PortalVerify';

export const metadata: Metadata = {
  title: 'Verify your email — My travel file | M&A Safaris',
  robots: { index: false, follow: false },
};

export default function PortalVerifyPage() {
  return <PortalVerify />;
}
