import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import TripPlannerClient from '@/components/TripPlannerClient';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'EV Trip Planner — Free Maps & Chargers Along Your Route',
  description: 'Plan EV road trips on free maps with charging stations along the way, plus stop, energy, and cost estimates.',
};

export default function TripPlannerPage() {
  return (
    <main>
      <Section
        id="trip"
        kicker="Tool"
        title="EV Trip Planner"
        intro="Enter a start and destination (ZIP or city). We route you on free maps, find chargers along the way, and estimate stops, energy, and cost for short and long trips."
      >
        <TripPlannerClient />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>full EV ownership guide</a>.
        </div>
      </Section>
    </main>
  );
}
