import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import ExploreDriveClient from '@/components/babylon/ExploreDriveClient';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Drive & Explore Your EV',
  description: 'Take the EV you built for a free-roam drive through a city of changing landscapes.',
};

export default function ExplorePage() {
  return (
    <main>
      <Section
        id="explore"
        kicker="Play · free roam"
        title="Drive & explore the EV you built"
        intro="This is the exact car from your build. Cruise an open city and pass through six landscapes — downtown, neon district, waterfront, forest park, desert highway, and a mountain pass. Steer with ← → / A–D, accelerate with ↑ / W or the GO button."
      >
        <ExploreDriveClient />
        <div className="note" style={{ marginTop: 16 }}>
          Want to change the car? <a href={withBase('/build/')}>Back to the builder</a> · or the{' '}
          <a href={withBase('/')}>home screen</a>.
        </div>
      </Section>
    </main>
  );
}
