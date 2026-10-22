import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'M&A Safaris — Your gateway to authentic Tanzania',
  description:
    'Discover Tanzania with Me and Adventure Safaris. Wildlife, coast and mountain journeys, thoughtfully planned around you.',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/assets/brand-logo.png', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
