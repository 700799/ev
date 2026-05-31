import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import DriveGameClient from '@/components/babylon/DriveGameClient';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'EV Dodge — Driving Mini-Game',
  description: 'Drive your EV, dodge cones and deer, and grab charge to keep going. How far can you get?',
};

export default function PlayPage() {
  return (
    <main>
      <Section
        id="drive-game"
        kicker="Play · mini-game"
        title="EV Dodge — drive, dodge & charge"
        intro="Switch lanes to dodge cones and deer, grab charge bolts to keep your battery alive, and see how far you can go. Arrows / A–D, buttons, or swipe to steer."
      >
        <DriveGameClient />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>home screen</a>.
        </div>
      </Section>
    </main>
  );
}
