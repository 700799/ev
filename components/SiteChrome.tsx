'use client';

import { usePathname } from 'next/navigation';
import { SITE, withBase } from '@/lib/site';
import FloatingMenu from './FloatingMenu';
import GameStatus from './GameStatus';

/**
 * Global chrome (top bar, quick-nav, level chip). Hidden on the launcher home
 * screen so the phone "app" view is a single clean grid of tiles.
 */
export default function SiteChrome() {
  const pathname = usePathname();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const path = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const isLauncher = path === '/' || path === '';

  if (isLauncher) return null;

  // The quick-nav FAB only makes sense on the long guide page (its anchors live
  // there). The level chip shows on every non-launcher screen.
  const isGuide = path === '/guide' || path === '/guide/';

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={withBase('/')}>
            <span className="dot" />
            {SITE.name}
          </a>
          <nav className="topnav">
            <a href={withBase('/stations/')}>Stations</a>
            <a href={withBase('/trip-planner/')}>Trip Planner</a>
            <a href={withBase('/calculators/')}>Calculators</a>
            <a href={withBase('/build/')}>Build</a>
            <a href={withBase('/explore/')}>Explore</a>
            <a href={withBase('/play/')}>Play</a>
            <a href={withBase('/guide/')}>Guide</a>
          </nav>
        </div>
      </header>
      {isGuide && <FloatingMenu />}
      <GameStatus />
    </>
  );
}
