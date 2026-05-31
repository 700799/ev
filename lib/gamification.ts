// Gamification model: badges unlock from recorded "events" (reading sections,
// using tools, passing the quiz, etc.). XP is the sum of earned badge XP, and
// levels derive from XP. Everything is evaluated client-side from a Set of
// event keys persisted in localStorage.

export interface Badge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  xp: number;
  check: (events: Set<string>) => boolean;
}

const countPrefix = (events: Set<string>, prefix: string) =>
  [...events].filter((e) => e.startsWith(prefix)).length;

export const BADGES: Badge[] = [
  { id: 'first-spark', name: 'First Spark', icon: '⚡', desc: 'Start exploring the guide.', xp: 20, check: (e) => e.size >= 1 },
  { id: 'explorer', name: 'Explorer', icon: '🧭', desc: 'Read 5 different sections.', xp: 50, check: (e) => countPrefix(e, 'section:') >= 5 },
  { id: 'scholar', name: 'Scholar', icon: '📚', desc: 'Read 12 different sections.', xp: 80, check: (e) => countPrefix(e, 'section:') >= 12 },
  { id: 'completionist', name: 'Completionist', icon: '🏁', desc: 'Read 18 different sections.', xp: 120, check: (e) => countPrefix(e, 'section:') >= 18 },
  { id: 'charger-hunter', name: 'Charger Hunter', icon: '🔌', desc: 'Find stations near a ZIP code.', xp: 60, check: (e) => e.has('tool:stations') },
  { id: 'trip-master', name: 'Trip Master', icon: '🗺️', desc: 'Plan a route with the trip planner.', xp: 60, check: (e) => e.has('tool:trip') },
  { id: 'number-cruncher', name: 'Number Cruncher', icon: '🔢', desc: 'Use any calculator.', xp: 50, check: (e) => countPrefix(e, 'calc:') >= 1 },
  { id: 'money-mind', name: 'Money Mind', icon: '💰', desc: 'Try all three calculators.', xp: 80, check: (e) => e.has('calc:savings') && e.has('calc:charge') && e.has('calc:solar') },
  { id: 'sun-seeker', name: 'Sun Seeker', icon: '☀️', desc: 'Model a solar payback.', xp: 50, check: (e) => e.has('calc:solar') },
  { id: 'pit-crew', name: 'Pit Crew', icon: '🛠️', desc: 'Charge the car in the 3D showroom.', xp: 40, check: (e) => e.has('3d:charge') },
  { id: 'custom-painter', name: 'Custom Painter', icon: '🎨', desc: 'Repaint the 3D car.', xp: 40, check: (e) => e.has('3d:paint') },
  { id: 'body-swapper', name: 'Body Swapper', icon: '🚙', desc: 'Switch the 3D body style.', xp: 40, check: (e) => e.has('3d:bodytype') },
  { id: 'battery-scientist', name: 'Battery Scientist', icon: '🔬', desc: 'Toggle the lithium-ion scene.', xp: 60, check: (e) => e.has('3d:science') },
  { id: 'energy-detective', name: 'Energy Detective', icon: '🔋', desc: 'Explore what drains and charges the battery.', xp: 60, check: (e) => e.has('feature:power') },
  { id: 'troubleshooter', name: 'Troubleshooter', icon: '🔧', desc: 'Dig into the mid-advanced failure modes.', xp: 60, check: (e) => e.has('failures:advanced') },
  { id: 'designer', name: 'Custom Builder', icon: '🛠️', desc: 'Build an EV in the 3D configurator.', xp: 60, check: (e) => e.has('feature:configurator') },
  { id: 'test-driver', name: 'Test Driver', icon: '🏎️', desc: 'Play the EV Dodge mini-game.', xp: 50, check: (e) => e.has('feature:drivegame') },
  { id: 'road-warrior', name: 'Road Warrior', icon: '🏆', desc: 'Score 500+ in EV Dodge.', xp: 120, check: (e) => e.has('drive:500') },
  { id: 'turbo-charged', name: 'Turbo Charged', icon: '🚀', desc: 'Grab a turbo boost in EV Dodge.', xp: 50, check: (e) => e.has('drive:turbo') },
  { id: 'beyond-beginner', name: 'Beyond Beginner', icon: '🎓', desc: 'Switch the battery facts to Advanced.', xp: 60, check: (e) => e.has('facts:advanced') },
  { id: 'quiz-whiz', name: 'Quiz Whiz', icon: '🧠', desc: 'Pass the advanced battery quiz.', xp: 100, check: (e) => e.has('quiz:battery:pass') },
  { id: 'year-analyst', name: 'Year Analyst', icon: '📅', desc: 'Compare EV model years.', xp: 60, check: (e) => e.has('feature:modelyears') },
  { id: 'bookworm', name: 'Bookworm', icon: '🐛', desc: 'Read 3 full articles.', xp: 70, check: (e) => countPrefix(e, 'article:') >= 3 },
];

export const TOTAL_XP = BADGES.reduce((s, b) => s + b.xp, 0);

export interface LevelTier {
  min: number;
  title: string;
}

export const LEVELS: LevelTier[] = [
  { min: 0, title: 'Curious Driver' },
  { min: 100, title: 'EV Apprentice' },
  { min: 250, title: 'EV Enthusiast' },
  { min: 450, title: 'Charge Master' },
  { min: 700, title: 'EV Expert' },
  { min: 1000, title: 'EV Guru' },
];

export interface LevelInfo {
  level: number; // 1-based
  title: string;
  xp: number;
  current: number; // xp into this level
  span: number; // xp needed to fill this level
  toNext: number; // xp remaining to next level (0 if maxed)
  isMax: boolean;
}

export function levelInfo(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const isMax = idx === LEVELS.length - 1;
  const base = LEVELS[idx].min;
  const nextMin = isMax ? base : LEVELS[idx + 1].min;
  const span = isMax ? 1 : nextMin - base;
  const current = xp - base;
  return {
    level: idx + 1,
    title: LEVELS[idx].title,
    xp,
    current,
    span,
    toNext: isMax ? 0 : nextMin - xp,
    isMax,
  };
}
