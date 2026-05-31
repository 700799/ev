import type { Metadata } from 'next';
import { withBase, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} — EV Ownership, one tap away`,
  description: SITE.tagline,
};

interface Tile { href: string; emoji: string; label: string; sub: string; accent?: boolean; }
interface Row { title: string; tiles: Tile[]; }

// Grouped rows so everything is reachable — tools, play, lessons, news/articles,
// and the deep-dive guide. Each row scrolls horizontally on a phone.
const ROWS: Row[] = [
  {
    title: 'Play',
    tiles: [
      { href: '/play/', emoji: '🏎️', label: 'EV Dodge', sub: 'Dodge, drift & charge', accent: true },
      { href: '/explore/', emoji: '🌆', label: 'Drive & Explore', sub: 'Winding city, your build' },
      { href: '/build/', emoji: '🛠️', label: 'Build Your EV', sub: '3D + budget & specs' },
      { href: '/guide/#badges', emoji: '🏆', label: 'Badges', sub: 'Level up as you learn' },
    ],
  },
  {
    title: 'Plan & calculate',
    tiles: [
      { href: '/stations/', emoji: '🔌', label: 'Find Chargers', sub: 'Stations near your ZIP' },
      { href: '/trip-planner/', emoji: '🗺️', label: 'Trip Planner', sub: 'Route + chargers on a map' },
      { href: '/calculators/', emoji: '🧮', label: 'Calculators', sub: 'Savings · charge · solar' },
    ],
  },
  {
    title: 'Learn the basics',
    tiles: [
      { href: '/guide/#battery', emoji: '🔋', label: 'Battery 101', sub: '10 things + quiz' },
      { href: '/guide/#power', emoji: '⚡', label: 'Drains & Charges', sub: 'What moves the needle' },
      { href: '/guide/#science-lab', emoji: '🔬', label: 'Science Lab', sub: '6 physics animations' },
      { href: '/guide/#driving', emoji: '🚗', label: 'How to Drive', sub: 'One-pedal & more' },
      { href: '/tutorials/', emoji: '🎓', label: 'Lessons', sub: 'Step-by-step tutorials' },
    ],
  },
  {
    title: 'Compare & shop',
    tiles: [
      { href: '/guide/#compare-evs', emoji: '⚖️', label: 'Compare EVs', sub: 'Models & model years' },
      { href: '/guide/#compare-types', emoji: '🆚', label: 'EV vs Gas', sub: 'vs hybrid & gas' },
      { href: '/guide/#deals', emoji: '💰', label: 'Best Deals', sub: 'Incentives & timing' },
      { href: '/guide/#tco', emoji: '📊', label: 'Cost of Ownership', sub: 'EV vs gas, lifetime' },
      { href: '/guide/#maintenance', emoji: '🧰', label: 'Maintenance', sub: 'Upkeep & accessories' },
      { href: '/guide/#new-models', emoji: '🚙', label: 'New Models', sub: 'Trucks, SUVs, semis' },
    ],
  },
  {
    title: 'Tips & gotchas',
    tiles: [
      { href: '/guide/#wrong', emoji: '🛟', label: 'What Goes Wrong', sub: 'Complaints, real talk' },
      { href: '/guide/#nightmares', emoji: '😱', label: 'Nightmares', sub: 'Worst-case & fixes' },
      { href: '/guide/#charging-types', emoji: '🏡', label: 'Home Charging', sub: 'Garage vs the rest' },
      { href: '/guide/#solar', emoji: '☀️', label: 'Solar Setups', sub: 'Drive on sunshine' },
      { href: '/guide/#faq', emoji: '❓', label: 'FAQ', sub: 'Quick answers' },
    ],
  },
  {
    title: 'News & articles',
    tiles: [
      { href: '/articles/', emoji: '📰', label: 'Latest News', sub: 'Fresh this week' },
      { href: '/guide/#latest', emoji: '🤖', label: 'Autonomy & Waymo', sub: 'Robotaxi rollout' },
      { href: '/guide/#popular', emoji: '🔥', label: 'Popular', sub: 'Most-read articles' },
      { href: '/guide/', emoji: '📖', label: 'Full Guide', sub: 'Everything, one page' },
    ],
  },
];

export default function Launcher() {
  return (
    <main className="launcher launcher-rows">
      <div className="launcher-head">
        <div className="launcher-brand">
          <span className="brand-logo" aria-hidden>⚡</span> {SITE.name}
        </div>
        <p className="launcher-tag">EV ownership — play, plan, learn &amp; keep up with the news.</p>
      </div>

      {ROWS.map((row) => (
        <section key={row.title} className="launch-row" aria-label={row.title}>
          <h2 className="launch-row-title">{row.title}</h2>
          <div className="launch-rail">
            {row.tiles.map((t) => (
              <a key={t.href} href={withBase(t.href)} className={`tile${t.accent ? ' tile-accent' : ''}`}>
                <span className="tile-emoji">{t.emoji}</span>
                <span className="tile-label">{t.label}</span>
                <span className="tile-sub">{t.sub}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="launcher-foot small muted">Swipe each row · free maps · saves progress on this device</p>
    </main>
  );
}
