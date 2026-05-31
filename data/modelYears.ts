// Year-over-year evolution of popular EVs. Specs are approximate, US-market
// estimates for orientation — the point is how much a single nameplate changes
// across model years (e.g., the 2024 Model 3 "Highland" vs the 2022 car).

export interface ModelYearSpec {
  year: number;
  rangeMi: number; // representative trim EPA-ish range
  startPriceUsd: number; // approximate starting price for the year
  zeroToSixty: number;
  changes: string[]; // what's new / different vs the prior year
  tag?: string; // e.g., "Major refresh"
}

export interface ModelLine {
  id: string;
  name: string;
  blurb: string;
  years: ModelYearSpec[];
}

export const modelLines: ModelLine[] = [
  {
    id: 'tesla-model-3',
    name: 'Tesla Model 3',
    blurb: 'The 2024 "Highland" refresh makes a same-named car feel genuinely different from a 2022.',
    years: [
      { year: 2022, rangeMi: 272, startPriceUsd: 46990, zeroToSixty: 5.8, changes: ['Radar fully dropped for camera-only "Tesla Vision"', 'Center console refresh carried over', 'Prices rose sharply through the year', 'Heat pump standard (from 2021)'] },
      { year: 2023, rangeMi: 272, startPriceUsd: 40240, zeroToSixty: 5.8, changes: ['Big early-year price cuts', 'Qualified for federal tax credit at lower price', 'Ultrasonic parking sensors removed (vision-based parking)', 'Minor software/feature tweaks'] },
      { year: 2024, rangeMi: 272, startPriceUsd: 38990, zeroToSixty: 4.9, tag: 'Major refresh ("Highland")', changes: ['New sleeker front/rear styling and slimmer lights', 'Turn-signal & gear stalks removed (buttons on wheel)', 'Quieter cabin, acoustic glass, better ride', 'Ventilated front seats + 8" rear screen', 'Native NACS port', 'Improved aero and efficiency'] },
    ],
  },
  {
    id: 'tesla-model-y',
    name: 'Tesla Model Y',
    blurb: 'Mostly iterative until the 2025 "Juniper" — but pricing and hardware shifted a lot year to year.',
    years: [
      { year: 2022, rangeMi: 330, startPriceUsd: 62990, zeroToSixty: 4.8, changes: ['Optional third row (7-seat)', 'Tesla Vision rollout', 'Steep price increases mid-year', 'Some cars shipped with 4680 structural pack (Austin)'] },
      { year: 2023, rangeMi: 330, startPriceUsd: 47490, zeroToSixty: 4.8, changes: ['Major price cuts opened up the tax credit', 'Matrix/adaptive headlights enabled', 'Parking via vision (no ultrasonic sensors)', 'Wider availability of LR/Performance'] },
      { year: 2024, rangeMi: 337, startPriceUsd: 44990, zeroToSixty: 4.8, changes: ['Range bump on Long Range AWD', 'New wheel designs and minor comfort tweaks', 'Native NACS port', 'Ambient interior lighting added'] },
    ],
  },
  {
    id: 'hyundai-ioniq-5',
    name: 'Hyundai Ioniq 5',
    blurb: 'Addressed early gripes with a bigger battery, a rear wiper, and (in 2025) a native NACS port.',
    years: [
      { year: 2022, rangeMi: 303, startPriceUsd: 39950, zeroToSixty: 5.0, changes: ['Launch year on 800V E-GMP platform', '10–80% fast charge in ~18 min', 'CCS port', 'No rear wiper (a common complaint)'] },
      { year: 2024, rangeMi: 303, startPriceUsd: 41800, zeroToSixty: 5.0, tag: 'Mid-cycle update', changes: ['Larger 84 kWh battery option (~318 mi on some trims)', 'Rear wiper finally added', 'Revised interior trim and tech', 'Still CCS (NACS arrives 2025)'] },
      { year: 2025, rangeMi: 318, startPriceUsd: 43000, zeroToSixty: 5.0, tag: 'NACS + Ioniq 5 N', changes: ['Native NACS charge port + Supercharger access', 'Higher-output Ioniq 5 N performance variant', 'Suspension and refinement tweaks', 'Updated driver-assist'] },
    ],
  },
  {
    id: 'ford-mustang-mach-e',
    name: 'Ford Mustang Mach-E',
    blurb: 'Quietly improved range, charging, and price every year — plus a NACS transition.',
    years: [
      { year: 2022, rangeMi: 314, startPriceUsd: 43895, zeroToSixty: 5.2, changes: ['Range/charging software improvements', 'Supply-limited; prices climbed', 'BlueCruise hands-free highway assist available'] },
      { year: 2023, rangeMi: 320, startPriceUsd: 45995, zeroToSixty: 5.2, changes: ['Standard-range cars moved to LFP batteries', 'Faster peak DC charging on some trims', 'Price adjustments through the year'] },
      { year: 2024, rangeMi: 320, startPriceUsd: 39895, zeroToSixty: 5.2, tag: 'Big value year', changes: ['Notable price drops', 'NACS adapter access to Tesla Superchargers', 'Improved BlueCruise (expanded roads)', 'Trim and range tweaks'] },
    ],
  },
];
