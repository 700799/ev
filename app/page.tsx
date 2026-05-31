import type { Metadata } from 'next';
import { withBase, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} — EV Ownership, one tap away`,
  description: SITE.tagline,
};

interface Tile { href: string; emoji: string; label: string; sub: string; accent?: boolean; }
interface Row { title: string; tiles: Tile[]; }

// Rows follow the ownership journey: Play → Learn → Shop → Plan/charge → Own →
// News. Each group holds only tiles that belong together (e.g. all charging
// lives in "Plan & charge", all costs/upkeep in "Own your EV") and is capped at
// five tiles so no row sprawls. Each row scrolls horizontally on a phone.
const ROWS: Row[] = [
  {
    title: 'Play',
    tiles: [
      { href: '/play/', emoji: '🏎️', label: 'EV Dodge', sub: 'Dodge, drift & charge', accent: true },
      { href: '/explore/', emoji: '🌆', label: 'Drive & Explore', sub: 'Winding city, your build' },
      { href: '/build/', emoji: '🛠️', label: 'Build Your EV', sub: '3D + budget & specs' },
    ],
  },
  {
    title: 'Learn the basics',
    tiles: [
      { href: '/guide/#battery', emoji: '🔋', label: 'Battery 101', sub: '10 things + quiz' },
      { href: '/guide/#power', emoji: '⚡', label: 'Drains & Charges', sub: 'What moves the needle' },
      { href: '/guide/#driving', emoji: '🚗', label: 'How to Drive', sub: 'One-pedal & more' },
      { href: '/guide/#science-lab', emoji: '🔬', label: 'Science Lab', sub: '6 physics animations' },
      { href: '/tutorials/', emoji: '🎓', label: 'Lessons', sub: 'Step-by-step tutorials' },
    ],
  },
  {
    title: 'Compare & shop',
    tiles: [
      { href: '/guide/#compare-evs', emoji: '⚖️', label: 'Compare EVs', sub: 'Models & model years' },
      { href: '/guide/#compare-types', emoji: '🆚', label: 'EV vs Gas', sub: 'vs hybrid & gas' },
      { href: '/guide/#new-models', emoji: '🚙', label: 'New Models', sub: 'Trucks, SUVs, semis' },
      { href: '/guide/#tco', emoji: '📊', label: 'Cost of Ownership', sub: 'EV vs gas, lifetime' },
      { href: '/guide/#deals', emoji: '💰', label: 'Best Deals', sub: 'Incentives & timing' },
    ],
  },
  {
    title: 'Plan & charge',
    tiles: [
      { href: '/stations/', emoji: '🔌', label: 'Find Chargers', sub: 'Stations near your ZIP' },
      { href: '/trip-planner/', emoji: '🗺️', label: 'Trip Planner', sub: 'Route + chargers on a map' },
      { href: '/calculators/', emoji: '🧮', label: 'Calculators', sub: 'Savings · charge · solar' },
      { href: '/guide/#charging-types', emoji: '🏡', label: 'Home Charging', sub: 'Garage vs the rest' },
      { href: '/guide/#solar', emoji: '☀️', label: 'Solar Setups', sub: 'Drive on sunshine' },
    ],
  },
  {
    title: 'Own your EV',
    tiles: [
      { href: '/guide/#maintenance', emoji: '🧰', label: 'Maintenance', sub: 'Upkeep & accessories' },
      { href: '/guide/#wrong', emoji: '🛟', label: 'What Goes Wrong', sub: 'Complaints, real talk' },
      { href: '/guide/#nightmares', emoji: '😱', label: 'Nightmares', sub: 'Worst-case & fixes' },
      { href: '/guide/#faq', emoji: '❓', label: 'FAQ', sub: 'Quick answers' },
    ],
  },
  {
    title: 'News & more',
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
        <span className="brand-logo" aria-hidden>⚡</span>
        <div className="launcher-headtext">
          <span className="launcher-brand">{SITE.name}</span>
          <span className="launcher-tag">Play, plan, learn &amp; keep up with EV news.</span>
        </div>
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
