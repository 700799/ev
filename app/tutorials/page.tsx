import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'In-Depth EV Tutorials',
  description: 'Deep dives: installing a home charger, mastering road-trip charging, and buying a used EV.',
};

const chargerInstall = [
  { h: 'Check your electrical panel', p: 'A Level 2 charger needs a 240V circuit, typically 40–60A. Have an electrician confirm your panel has spare capacity; older homes may need a panel upgrade or a load-management device that shares an existing circuit.' },
  { h: 'Choose hardwired vs plug-in', p: 'A NEMA 14-50 outlet lets you plug in a portable charger (and take it with you). Hardwiring supports higher continuous current and is required for some 48A+ units. Outdoor installs need a weatherproof, GFCI-protected setup.' },
  { h: 'Pull the permit', p: 'Most jurisdictions require an electrical permit and inspection for EV charging circuits. Your electrician usually handles this. It protects you and keeps insurance valid.' },
  { h: 'Pick the charger', p: 'Look for UL listing, the amperage your car can actually accept, Wi-Fi scheduling, and a cable long enough to reach your charge port from the wall. Energy-Star units may qualify for rebates.' },
  { h: 'Claim incentives', p: 'The federal home-charging credit covers a share of hardware + install in eligible areas; many utilities add rebates and discounted overnight EV rates. Stack them.' },
  { h: 'Set up smart charging', p: 'Schedule charging for off-peak hours, set an 80% daily limit, and if you have solar, consider charging midday when the panels are producing.' },
];

const roadTrip = [
  { h: 'Plan around the charge curve', p: 'Charging is fastest at low state of charge. Plan to roll into stops near 10% and leave around 60–80% rather than waiting for 100%. Several short stops beat one long one.' },
  { h: 'Precondition before every fast charge', p: 'Set the charger as your nav destination so the car warms the battery. A cold pack can cut charging speed by half or more.' },
  { h: 'Always have a backup charger', p: 'Pin a primary and a backup at each stop, and check live status/recent check-ins before leaving the previous station. This single habit prevents most "stranded" stories.' },
  { h: 'Drive the efficient speed', p: 'Dropping from 80 to 70 mph can add meaningful range thanks to aerodynamic drag. In a pinch, slowing down is your emergency reserve.' },
  { h: 'Mind weather and elevation', p: 'Cold, headwinds, and climbs all increase consumption. Pad your buffer to 15–20% in winter or in the mountains.' },
  { h: 'Use the Trip Planner', p: 'Map the route, see chargers along the way, and estimate stops and cost before you leave.' },
];

const usedBuying = [
  { h: 'Pull the battery state-of-health', p: 'Ask for a SoH report or run a battery check. A healthy used EV retains ~85–95% of original capacity in its first few years. Big drops are a red flag.' },
  { h: 'Review fast-charge history', p: 'A car that lived on DC fast charging may have aged faster than one charged at home. Some apps/dealers can show charging history.' },
  { h: 'Confirm remaining battery warranty', p: 'Most packs are warranted 8 yr / 100k mi to ~70% capacity. Buying with years left on that warranty de-risks the purchase.' },
  { h: 'Check charging standard & adapters', p: 'Confirm the connector (CCS vs NACS) and which adapters you will need for the networks you will use.' },
  { h: 'Inspect tires and brakes', p: 'EVs wear tires faster; brakes often last longer thanks to regen. Budget for tires if they are near the wear bars.' },
  { h: 'Verify software & recalls', p: 'Ensure the car is on current software and all recalls are closed. Account transfer (for connected features) should be clean.' },
];

function Steps({ items }: { items: { h: string; p: string }[] }) {
  return (
    <ol className="steps">
      {items.map((s) => (
        <li key={s.h}>
          <h4>{s.h}</h4>
          <p>{s.p}</p>
        </li>
      ))}
    </ol>
  );
}

export default function TutorialsPage() {
  return (
    <main>
      <Section
        id="install"
        kicker="Tutorial · in depth"
        title="Installing a Level 2 home charger"
        intro="The home charging setup is the single biggest factor in happy EV ownership. Here is the end-to-end process."
      >
        <Steps items={chargerInstall} />
      </Section>

      <Section
        id="roadtrip"
        kicker="Tutorial · in depth"
        title="Mastering road-trip charging"
        intro="Long trips are easy once you understand the charge curve and plan backups."
      >
        <Steps items={roadTrip} />
      </Section>

      <Section
        id="used"
        kicker="Tutorial · in depth"
        title="Buying a used EV without regret"
        intro="A used EV can be the value sweet spot — if you check the right things."
      >
        <Steps items={usedBuying} />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>full EV ownership guide</a>, or jump to the{' '}
          <a href={withBase('/calculators/')}>calculators</a>.
        </div>
      </Section>
    </main>
  );
}
