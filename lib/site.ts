// Small shared site helpers.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefix an internal asset/href path with the configured base path. */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${BASE_PATH}${path}`;
}

export const SITE = {
  name: 'Volt & Mile',
  tagline: 'The complete, no-nonsense guide to living with an electric vehicle.',
  year: 2026,
};

// Anchor sections used by the floating menu.
export interface NavSection {
  id: string;
  label: string;
  group: 'Tools' | 'Learn' | 'Compare' | 'More';
}

export const NAV_SECTIONS: NavSection[] = [
  { id: 'badges', label: 'Badges & Progress', group: 'Tools' },
  { id: 'stations', label: 'Find Stations', group: 'Tools' },
  { id: 'trip', label: 'Trip Planner', group: 'Tools' },
  { id: 'calculators', label: 'Calculators', group: 'Tools' },
  { id: 'battery', label: '10 Battery Facts', group: 'Learn' },
  { id: 'science', label: 'The Science', group: 'Learn' },
  { id: 'power', label: 'Drains & Charges', group: 'Learn' },
  { id: 'performance', label: 'Performance Tips', group: 'Learn' },
  { id: 'driving', label: 'How to Drive', group: 'Learn' },
  { id: 'pro-driving', label: 'Pro Techniques', group: 'Learn' },
  { id: 'tutorial', label: 'In-Depth Tutorial', group: 'Learn' },
  { id: 'compare-types', label: 'EV vs Hybrid vs Gas', group: 'Compare' },
  { id: 'compare-evs', label: 'Compare EVs', group: 'Compare' },
  { id: 'model-years', label: 'Compare Model Years', group: 'Compare' },
  { id: 'foreign', label: 'Foreign vs US', group: 'Compare' },
  { id: 'new-models', label: 'New Models', group: 'Compare' },
  { id: 'avoid', label: 'What to Avoid', group: 'More' },
  { id: 'wrong', label: 'What Can Go Wrong', group: 'More' },
  { id: 'nightmares', label: 'Nightmare Scenarios', group: 'More' },
  { id: 'deals', label: 'Best Deals', group: 'More' },
  { id: 'charging-types', label: 'Garage vs Other Charging', group: 'More' },
  { id: 'solar', label: 'Solar Setups', group: 'More' },
  { id: 'teens', label: 'Teens & Autopilot', group: 'More' },
  { id: 'latest', label: 'Latest & Autonomy', group: 'More' },
  { id: 'faq', label: 'FAQ', group: 'More' },
  { id: 'popular', label: 'Popular This Week', group: 'More' },
  { id: 'fresh', label: 'Fresh Articles', group: 'More' },
];
