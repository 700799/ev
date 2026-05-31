import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import ConfiguratorClient from '@/components/babylon/ConfiguratorClient';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Build Your EV in 3D',
  description: 'Design your dream EV: pick a body, paint, and wheels, and tack on up to 15 accessories in 3D.',
};

export default function BuildPage() {
  return (
    <main>
      <Section
        id="configurator"
        kicker="Play · build your EV"
        title="Design your dream EV in 3D"
        intro="Pick a body, paint, and wheel style, then tack on up to 15 accessories. Watch the live budget, and see how each add-on's weight and aerodynamic drag changes your range, 0–60, and cornering grip."
      >
        <ConfiguratorClient />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>home screen</a>.
        </div>
      </Section>
    </main>
  );
}
