import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import StationFinderClient from '@/components/StationFinderClient';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Find EV Charging Stations Near You',
  description: 'Enter a ZIP code to find nearby EV charging stations on a live map, with pricing and availability.',
};

export default function StationsPage() {
  return (
    <main>
      <Section
        id="stations"
        kicker="Tool"
        title="Find chargers near you"
        intro="Enter your ZIP code to pull up nearby charging stations on a live map — with pricing and availability from Open Charge Map."
      >
        <StationFinderClient />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>home screen</a>.
        </div>
      </Section>
    </main>
  );
}
