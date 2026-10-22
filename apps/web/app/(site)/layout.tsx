import type { Metadata, Viewport } from 'next';
import '../reference.css';
import '../globals.css';
import '../landing.css';

export const metadata: Metadata = {
  title: 'M&A Safaris — Your gateway to authentic Tanzania',
  description:
    'Discover Tanzania with Me and Adventure Safaris. Wildlife, coast and mountain journeys, thoughtfully planned around you.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FF7B00' };

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
