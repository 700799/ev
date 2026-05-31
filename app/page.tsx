import type { Metadata } from 'next';
import { withBase, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} — EV Ownership, one tap away`,
  description: SITE.tagline,
};

interface Tile {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  accent?: boolean;
}

// Each tile opens one tool/section full-screen. Tools are standalone routes;
// learn/compare tiles deep-link into the single guide page via its anchors.
const TILES: Tile[] = [
  { href: '/play/', emoji: '🏎️', label: 'Play EV Dodge', sub: 'Drive, dodge & charge — start here!', accent: true },
  { href: '/stations/', emoji: '🔌', label: 'Find Chargers', sub: 'Stations near your ZIP' },
  { href: '/trip-planner/', emoji: '🗺️', label: 'Trip Planner', sub: 'Route + chargers' },
  { href: '/calculators/', emoji: '🧮', label: 'Calculators', sub: 'Savings · charge · solar' },
  { href: '/build/', emoji: '🛠️', label: 'Build Your EV', sub: '3D + budget & specs' },
  { href: '/explore/', emoji: '🌆', label: 'Drive & Explore', sub: 'Roam the city in your build' },
  { href: '/guide/#badges', emoji: '🏆', label: 'Badges', sub: 'Level up as you learn' },
  { href: '/guide/#battery', emoji: '🔋', label: 'Battery 101', sub: '10 things + quiz' },
  { href: '/guide/#power', emoji: '⚡', label: 'Drains & Charges', sub: 'What moves the needle' },
  { href: '/guide/#science-lab', emoji: '🔬', label: 'Science Lab', sub: '4 physics animations' },
  { href: '/guide/#compare-evs', emoji: '⚖️', label: 'Compare EVs', sub: 'Models & model years' },
  { href: '/guide/#wrong', emoji: '🛟', label: 'What Goes Wrong', sub: 'Complaints, real talk' },
  { href: '/articles/', emoji: '📰', label: 'Articles', sub: 'Fresh & trending' },
  { href: '/guide/', emoji: '📖', label: 'Full Guide', sub: 'Everything, one page' },
];

export default function Launcher() {
  return (
    <main className="launcher">
      <div className="launcher-head">
        <div className="launcher-brand">
          <span className="dot" /> {SITE.name}
        </div>
        <p className="launcher-tag">EV ownership — find chargers, plan trips, crunch savings, learn &amp; play.</p>
      </div>

      <nav className="tile-grid" aria-label="Sections">
        {TILES.map((t) => (
          <a key={t.href} href={withBase(t.href)} className={`tile${t.accent ? ' tile-accent' : ''}`}>
            <span className="tile-emoji">{t.emoji}</span>
            <span className="tile-label">{t.label}</span>
            <span className="tile-sub">{t.sub}</span>
          </a>
        ))}
      </nav>

      <p className="launcher-foot small muted">Tap a tile to open it · works offline-friendly on free maps</p>
    </main>
  );
}
