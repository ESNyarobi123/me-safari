import type { Metadata } from 'next';
import PortalLogin from '../../../../components/portal/PortalLogin';

export const metadata: Metadata = {
  title: 'Sign in — My travel file | M&A Safaris',
  description: 'Sign in to review your safari proposal, accept it and pay your deposit.',
  robots: { index: false, follow: false },
};

export default function PortalLoginPage() {
  return <PortalLogin />;
}
