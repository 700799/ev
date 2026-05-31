import type { Metadata } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { GameProvider } from '@/components/GameProvider';
import SiteChrome from '@/components/SiteChrome';

export const metadata: Metadata = {
  title: `${SITE.name} — The Complete EV Ownership Guide`,
  description: SITE.tagline,
  keywords: [
    'EV ownership',
    'electric vehicle guide',
    'EV charging',
    'EV vs gas',
    'EV trip planner',
    'EV savings calculator',
    'solar EV charging',
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    title: `${SITE.name} — The Complete EV Ownership Guide`,
    description: SITE.tagline,
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameProvider>
          <SiteChrome />
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
