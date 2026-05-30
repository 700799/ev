import type { Metadata } from 'next';
import './globals.css';
import { SITE, withBase } from '@/lib/site';
import FloatingMenu from '@/components/FloatingMenu';

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
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href={withBase('/')}>
              <span className="dot" />
              {SITE.name}
            </a>
            <nav className="topnav">
              <a href={withBase('/#stations')}>Stations</a>
              <a href={withBase('/trip-planner/')}>Trip Planner</a>
              <a href={withBase('/calculators/')}>Calculators</a>
              <a href={withBase('/tutorials/')}>Tutorials</a>
              <a href={withBase('/articles/')}>Articles</a>
            </nav>
          </div>
        </header>
        {children}
        <FloatingMenu />
      </body>
    </html>
  );
}
