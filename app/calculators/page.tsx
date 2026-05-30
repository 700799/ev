import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import Calculators from '@/components/Calculators';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'EV Calculators — Savings, Charge Cost & Solar Payback',
  description: 'Calculate EV-vs-gas savings, the cost of a charge or trip, and rooftop solar payback.',
};

export default function CalculatorsPage() {
  return (
    <main>
      <Section
        id="calculators"
        kicker="Tool"
        title="EV Calculators"
        intro="Run the numbers on going electric: savings versus gas, the cost of any charge or trip, and how quickly solar pays for itself."
      >
        <Calculators />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>full EV ownership guide</a>.
        </div>
      </Section>
    </main>
  );
}
