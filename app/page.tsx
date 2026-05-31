import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import LauncherRows, { type Row, type DrawerSpec } from '@/components/LauncherRows';
import {
  batteryFacts,
  drivingPoints,
  evVsRest,
  tcoRows,
  tcoTakeaways,
  maintenanceRows,
  noLongerNeeded,
  newModels,
  dealTips,
  chargingTypes,
  solarPoints,
  whatCanGoWrong,
  nightmareScenarios,
  faq,
  latestFeatures,
} from '@/data/content';
import { evModels } from '@/data/evModels';
import { freshArticles, popularArticles } from '@/data/articles';

export const metadata: Metadata = {
  title: `${SITE.name} — EV Ownership, one tap away`,
  description: SITE.tagline,
};

// Rows follow the ownership journey: Play → Learn → Shop → Plan/charge → Own →
// News. Reading/reference tiles carry a `drawerId` so they peek their content in
// a bottom sheet; interactive tiles (games, 3D, maps, calculators) keep opening
// their full pages. Each row caps at five tiles and scrolls horizontally.
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
      { href: '/guide/#battery', emoji: '🔋', label: 'Battery 101', sub: '10 things + quiz', drawerId: 'battery' },
      { href: '/guide/#power', emoji: '⚡', label: 'Drains & Charges', sub: 'What moves the needle' },
      { href: '/guide/#driving', emoji: '🚗', label: 'How to Drive', sub: 'One-pedal & more', drawerId: 'driving' },
      { href: '/guide/#science-lab', emoji: '🔬', label: 'Science Lab', sub: '6 physics animations' },
      { href: '/tutorials/', emoji: '🎓', label: 'Lessons', sub: 'Step-by-step tutorials' },
    ],
  },
  {
    title: 'Compare & shop',
    tiles: [
      { href: '/guide/#compare-evs', emoji: '⚖️', label: 'Compare EVs', sub: 'Models & model years', drawerId: 'compare-evs' },
      { href: '/guide/#compare-types', emoji: '🆚', label: 'EV vs Gas', sub: 'vs hybrid & gas', drawerId: 'compare-types' },
      { href: '/guide/#new-models', emoji: '🚙', label: 'New Models', sub: 'Trucks, SUVs, semis', drawerId: 'new-models' },
      { href: '/guide/#tco', emoji: '📊', label: 'Cost of Ownership', sub: 'EV vs gas, lifetime', drawerId: 'tco' },
      { href: '/guide/#deals', emoji: '💰', label: 'Best Deals', sub: 'Incentives & timing', drawerId: 'deals' },
    ],
  },
  {
    title: 'Plan & charge',
    tiles: [
      { href: '/stations/', emoji: '🔌', label: 'Find Chargers', sub: 'Stations near your ZIP' },
      { href: '/trip-planner/', emoji: '🗺️', label: 'Trip Planner', sub: 'Route + chargers on a map' },
      { href: '/calculators/', emoji: '🧮', label: 'Calculators', sub: 'Savings · charge · solar' },
      { href: '/guide/#charging-types', emoji: '🏡', label: 'Home Charging', sub: 'Garage vs the rest', drawerId: 'charging-types' },
      { href: '/guide/#solar', emoji: '☀️', label: 'Solar Setups', sub: 'Drive on sunshine', drawerId: 'solar' },
    ],
  },
  {
    title: 'Own your EV',
    tiles: [
      { href: '/guide/#maintenance', emoji: '🧰', label: 'Maintenance', sub: 'Upkeep & accessories', drawerId: 'maintenance' },
      { href: '/guide/#wrong', emoji: '🛟', label: 'What Goes Wrong', sub: 'Complaints, real talk', drawerId: 'wrong' },
      { href: '/guide/#nightmares', emoji: '😱', label: 'Nightmares', sub: 'Worst-case & fixes', drawerId: 'nightmares' },
      { href: '/guide/#faq', emoji: '❓', label: 'FAQ', sub: 'Quick answers', drawerId: 'faq' },
    ],
  },
  {
    title: 'News & more',
    tiles: [
      { href: '/articles/', emoji: '📰', label: 'Latest News', sub: 'Fresh this week', drawerId: 'news' },
      { href: '/guide/#latest', emoji: '🤖', label: 'Autonomy & Waymo', sub: 'Robotaxi rollout', drawerId: 'latest' },
      { href: '/guide/#popular', emoji: '🔥', label: 'Popular', sub: 'Most-read articles', drawerId: 'popular' },
      { href: '/guide/', emoji: '📖', label: 'Full Guide', sub: 'Everything, one page' },
    ],
  },
];

// Drawer content, built from the same editorial data the guide page renders.
// Everything here is plain JSON so it can cross to the client component.
const DRAWERS: Record<string, DrawerSpec> = {
  battery: {
    kicker: 'Learn the basics',
    title: 'Battery 101',
    href: '/guide/#battery',
    cta: 'Open in full guide → (levels + quiz)',
    blocks: [{ kind: 'facts', facts: batteryFacts }],
  },
  driving: {
    kicker: 'Learn the basics',
    title: 'How to drive an EV',
    href: '/guide/#driving',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: drivingPoints }],
  },
  'compare-evs': {
    kicker: 'Compare & shop',
    title: 'Compare popular EVs',
    href: '/guide/#compare-evs',
    cta: 'Open full comparison →',
    blocks: [
      {
        kind: 'table',
        headers: ['Model', 'Type', 'Range', '0–60', 'Fast charge', 'Connector', 'From'],
        rows: evModels.map((m) => [
          m.name,
          m.type,
          `${m.rangeMi} mi`,
          `${m.zeroToSixty}s`,
          `${m.fastChargeKw} kW`,
          m.charging,
          `$${m.startPriceUsd.toLocaleString()}`,
        ]),
      },
    ],
  },
  'compare-types': {
    kicker: 'Compare & shop',
    title: 'EV vs hybrid vs gas',
    href: '/guide/#compare-types',
    cta: 'Open in full guide →',
    blocks: [
      {
        kind: 'table',
        headers: ['Dimension', 'EV', 'Hybrid', 'Gas'],
        rows: evVsRest.map((r) => [r.dimension, r.ev, r.hybrid, r.gas]),
      },
    ],
  },
  'new-models': {
    kicker: 'Compare & shop',
    title: 'New models: trucks, SUVs & semis',
    href: '/guide/#new-models',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: newModels }],
  },
  tco: {
    kicker: 'Compare & shop',
    title: 'Total cost of ownership',
    href: '/guide/#tco',
    cta: 'Open in full guide →',
    blocks: [
      {
        kind: 'table',
        headers: ['Cost item', 'EV', 'Gas', 'Notes'],
        rows: tcoRows.map((r) => [r.item, r.ev, r.gas, r.note]),
      },
      { kind: 'facts', facts: tcoTakeaways },
    ],
  },
  deals: {
    kicker: 'Compare & shop',
    title: 'Where to get the best deals',
    href: '/guide/#deals',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: dealTips }],
  },
  'charging-types': {
    kicker: 'Plan & charge',
    title: 'Home charging in CA vs the rest',
    href: '/guide/#charging-types',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: chargingTypes }],
  },
  solar: {
    kicker: 'Plan & charge',
    title: 'Solar panel setups & cost',
    href: '/guide/#solar',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: solarPoints }],
  },
  maintenance: {
    kicker: 'Own your EV',
    title: 'Common maintenance & upgrades',
    href: '/guide/#maintenance',
    cta: 'Open in full guide →',
    blocks: [
      {
        kind: 'table',
        headers: ['Task', 'Interval', 'Typical cost', 'Why'],
        rows: maintenanceRows.map((m) => [m.task, m.interval, m.cost, m.why]),
      },
      { kind: 'list', variant: 'checks', heading: 'What you no longer pay for', items: noLongerNeeded },
    ],
  },
  wrong: {
    kicker: 'Own your EV',
    title: 'What can go wrong',
    href: '/guide/#wrong',
    cta: 'Open in full guide → (complaints ranked)',
    blocks: [{ kind: 'facts', facts: whatCanGoWrong }],
  },
  nightmares: {
    kicker: 'Own your EV',
    title: 'Nightmare scenarios (and how to dodge them)',
    href: '/guide/#nightmares',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: nightmareScenarios }],
  },
  faq: {
    kicker: 'Own your EV',
    title: 'Quick answers',
    href: '/guide/#faq',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: faq }],
  },
  news: {
    kicker: 'News & more',
    title: 'Fresh this week',
    href: '/articles/',
    cta: 'Browse all articles →',
    blocks: [{ kind: 'articles', items: freshArticles.slice(0, 10) }],
  },
  latest: {
    kicker: 'News & more',
    title: 'Autonomy & the robotaxi rollout',
    href: '/guide/#latest',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'facts', facts: latestFeatures }],
  },
  popular: {
    kicker: 'News & more',
    title: 'Top articles this week',
    href: '/guide/#popular',
    cta: 'Open in full guide →',
    blocks: [{ kind: 'articles', ranked: true, items: popularArticles.slice(0, 10) }],
  },
};

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

      <LauncherRows rows={ROWS} drawers={DRAWERS} />

      <p className="launcher-foot small muted">
        Swipe each row · tap a card to peek · free maps · saves progress on this device
      </p>
    </main>
  );
}
