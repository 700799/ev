// Core editorial content for the EV Ownership guide.
// Everything here is plain data so pages stay declarative and easy to update.

export interface Fact {
  title: string;
  body: string;
}

export interface NamedList {
  heading: string;
  items: string[];
}

// 1. Ten things to know about battery & charging
export const batteryFacts: Fact[] = [
  {
    title: '1. You rarely charge to 100%',
    body: 'For daily driving, charge to 80%. Lithium-ion cells age fastest when held at a very high or very low state of charge. Save 100% for the morning of a long road trip and set a charge limit in the car for every other day.',
  },
  {
    title: '2. The 20–80% sweet spot',
    body: 'Keeping the pack between roughly 20% and 80% dramatically slows calendar and cycle aging. Most EVs let you set this limit once and forget it.',
  },
  {
    title: '3. DC fast charging is for trips, not every day',
    body: 'Level 3 (DC fast) charging adds heat and stress. It is fantastic on road trips, but charging at home on Level 2 overnight is gentler on the battery and far cheaper.',
  },
  {
    title: '4. Charging slows down as it fills',
    body: 'A fast charger that hits 250 kW at 10% may drop below 50 kW past 80%. That tapering "charge curve" is why road-trip charging stops are short and to ~80%, not full.',
  },
  {
    title: '5. Cold weather temporarily cuts range',
    body: 'Cold reduces both range and charging speed because the chemistry slows down and the car spends energy on heating. Preconditioning the cabin and battery while plugged in recovers most of it.',
  },
  {
    title: '6. Preconditioning matters',
    body: 'Telling the car you are heading to a fast charger warms the battery to its ideal temperature on the way, so you get full charging speed when you plug in instead of a slow, cold session.',
  },
  {
    title: '7. Batteries degrade slowly — and predictably',
    body: 'Modern packs typically lose around 1–2% of capacity per year. Most manufacturers warrant the battery for 8 years / 100,000 miles to retain at least 70% capacity.',
  },
  {
    title: '8. Regenerative braking recharges as you slow',
    body: 'Lifting off the accelerator turns the motor into a generator, feeding energy back to the battery and saving your brake pads. One-pedal driving maximizes this.',
  },
  {
    title: '9. State of charge ≠ battery health',
    body: 'A low charge today does not harm the battery. What matters long term is avoiding constant extremes, extreme heat, and habitual 100% fast charges.',
  },
  {
    title: '10. Plug in often, not deeply',
    body: 'EVs are happiest topped up with small, frequent charges rather than run to empty and back. Plug in when you park; you are not "wasting" a charge cycle.',
  },
];

// 1b. Advanced ("beyond beginner") version of the battery facts
export const batteryFactsAdvanced: Fact[] = [
  {
    title: '1. Calendar aging usually beats cycle aging',
    body: 'For most drivers, time and average state of charge degrade the pack more than miles do. A cell parked at 90% in summer heat ages faster than one cycled daily between 30–70%. Optimize for average SoC and temperature, not just cycle count.',
  },
  {
    title: '2. LFP’s flat voltage curve confuses the SoC meter',
    body: 'Lithium iron phosphate has a very flat discharge curve, so the BMS struggles to estimate state of charge in the middle. That’s why makers tell LFP owners to charge to 100% weekly — it lets the BMS recalibrate the top reference point.',
  },
  {
    title: '3. C-rate, not just kW, drives heat and wear',
    body: 'Charging stress scales with C-rate (current relative to pack capacity). A 70 kWh pack at 150 kW is ~2.1C; the same 150 kW into a 100 kWh pack is 1.5C and gentler. Bigger packs fast-charge more comfortably for the same kW.',
  },
  {
    title: '4. The charge curve is a thermal/anode-potential dance',
    body: 'Tapering past ~50–80% isn’t arbitrary: as the anode fills, accepting more current risks lithium plating, so the BMS throttles power. Preconditioning and lower starting SoC keep you on the fat part of the curve longer.',
  },
  {
    title: '5. Lithium plating is the cold-charging villain',
    body: 'Fast-charging a cold cell can deposit metallic lithium on the anode (plating), permanently losing capacity and risking shorts. This is the real reason cold packs charge slowly — and why preconditioning matters beyond convenience.',
  },
  {
    title: '6. Cell balancing happens near full charge',
    body: 'Packs are hundreds of cells in series; tiny capacity differences drift over time. The BMS balances them (usually by bleeding the highest cells) mainly near the top of charge — another reason an occasional higher charge can be healthy.',
  },
  {
    title: '7. SoH ≠ usable range, thanks to the buffer',
    body: 'Makers hide a buffer above 100% and below 0%. Early “degradation” is often the buffer absorbing loss so your usable range holds, then range drops once the buffer is consumed. Read raw cell data, not just the range estimate.',
  },
  {
    title: '8. Regen is capped by SoC, temp, and C-rate',
    body: 'A full or cold battery can’t absorb regen — that’s why a freshly 100%-charged car coasts instead of braking, and why one-pedal feel changes with conditions. The pack limits charge current the same way it limits fast charging.',
  },
  {
    title: '9. 800V cuts I²R losses, not just charge time',
    body: 'Doubling voltage halves current for the same power, and resistive losses scale with current squared. 800V architectures run cooler, use thinner/lighter conductors, and sustain peak power longer — efficiency, not just bragging rights.',
  },
  {
    title: '10. Thermal management is the real longevity lever',
    body: 'Liquid-cooled packs that hold cells in a tight temperature window (and precondition for charging) routinely outlast passively cooled designs. When comparing EVs, the cooling strategy predicts long-term battery health better than chemistry alone.',
  },
];


export const sciencePoints: Fact[] = [
  {
    title: 'How a lithium-ion cell works',
    body: 'During charging, lithium ions move from the cathode to the anode through an electrolyte; while driving they move back, releasing electrons that flow through the motor. No combustion, far fewer moving parts.',
  },
  {
    title: 'kWh is your "fuel tank"',
    body: 'Battery capacity is measured in kilowatt-hours (kWh). A 75 kWh pack at ~3.5 mi/kWh efficiency yields roughly 260 miles. Efficiency, not just pack size, decides real range.',
  },
  {
    title: 'kW is the speed of charging',
    body: 'Power (kW) is how fast energy flows. A 7 kW home charger adds ~25–30 mi/hr; a 150 kW DC charger can add 150+ miles in 20 minutes when conditions are right.',
  },
  {
    title: 'LFP vs NMC chemistry',
    body: 'Lithium iron phosphate (LFP) packs are cheaper, longer-lived, and happy charging to 100% daily, but slightly less energy-dense. Nickel-based (NMC/NCA) packs pack more range into less weight. Many entry EVs now use LFP.',
  },
  {
    title: 'Thermal management is everything',
    body: 'Liquid-cooled packs hold cells in their ideal temperature window, which protects longevity and unlocks fast charging. It is one of the biggest differences between a cheap EV and a great one.',
  },
  {
    title: '400V vs 800V architecture',
    body: 'Newer 800-volt cars (Hyundai E-GMP, Porsche, Kia, Lucid) can fast-charge at higher power with less heat — think 10–80% in ~18 minutes versus ~30+ on older 400V platforms.',
  },
];

// 3. Performance tips (efficiency / getting the most range)
export const performanceTips: string[] = [
  'Use Eco mode and gentle acceleration — the largest range drain is hard launches and high speed.',
  'Drive 65 instead of 80 on the highway; aerodynamic drag rises with the square of speed and can cost 20%+ range.',
  'Keep tires at the recommended pressure; under-inflation silently kills efficiency.',
  'Precondition the cabin while still plugged in so the battery, not the road, pays for heating/cooling.',
  'Use seat heaters instead of cabin heat in winter — they use a fraction of the energy.',
  'Lean on one-pedal / max regen in city driving to recover energy at every stop.',
  'Remove roof boxes and bike racks when not in use; they wreck aerodynamics.',
  'Plan routes that let you arrive at a fast charger with ~10% rather than crawling in at 1%.',
];

// 4. How to drive an EV
export const drivingPoints: Fact[] = [
  {
    title: 'Instant torque, smooth power',
    body: 'EVs deliver full torque from a standstill. Acceleration is immediate and linear — squeeze the pedal smoothly rather than stabbing it, especially in the wet.',
  },
  {
    title: 'One-pedal driving',
    body: 'In high-regen mode the car slows firmly when you lift off. After a day you will rarely touch the brake pedal in town. It is smoother and recovers energy.',
  },
  {
    title: 'Quiet means stay alert',
    body: 'Pedestrians may not hear you at low speed. Modern EVs play an external sound under ~19 mph, but stay extra aware in parking lots.',
  },
  {
    title: 'Weight changes handling',
    body: 'Battery packs sit low in the floor, giving a low center of gravity and planted cornering — but EVs are heavy, so braking distances and tire wear can be higher.',
  },
];

// 5. EV vs Hybrid vs Gas
export interface ComparisonRow {
  dimension: string;
  ev: string;
  hybrid: string;
  gas: string;
}

export const evVsRest: ComparisonRow[] = [
  { dimension: 'Fuel/energy cost per mile', ev: 'Lowest (≈3–5¢ home charging)', hybrid: 'Low–medium', gas: 'Highest' },
  { dimension: 'Routine maintenance', ev: 'Minimal — no oil, fewer parts', hybrid: 'Moderate (still has engine)', gas: 'Highest' },
  { dimension: 'Upfront price', ev: 'Higher (falling fast)', hybrid: 'Medium', gas: 'Lowest' },
  { dimension: 'Refuel/charge time', ev: 'Mins at home, 20–40 min on trips', hybrid: '5 min', gas: '5 min' },
  { dimension: 'Long-trip convenience', ev: 'Needs planning', hybrid: 'Excellent', gas: 'Excellent' },
  { dimension: 'Tailpipe emissions', ev: 'Zero', hybrid: 'Reduced', gas: 'Full' },
  { dimension: 'Best fit', ev: 'Home charging + commuting', hybrid: 'No home charging / lots of road trips', gas: 'Very low mileage / lowest budget' },
];

// 6. What to avoid
export const thingsToAvoid: string[] = [
  'Habitually charging to 100% and leaving the car sitting full for days.',
  'Routinely running the battery down to 0% — deep discharges stress the pack.',
  'Relying only on DC fast charging when home/Level 2 is available.',
  'Parking at very high state of charge in extreme heat for long periods.',
  'Ignoring tire pressure and rotation — EVs eat tires faster when neglected.',
  'Cheap, uncertified home charging hardware or worn outlets on 120V.',
  'Trusting the GPS range estimate without a buffer in cold weather or mountains.',
  'Treating driver-assist (Autopilot/FSD/BlueCruise) as full self-driving — it is not.',
];

// 7. What can go wrong
export const whatCanGoWrong: Fact[] = [
  { title: '12-volt battery death', body: 'Ironically, the small 12V accessory battery (not the main pack) is a top cause of EVs that "won\'t start." It runs the computers and can fail like any car battery. Replace it proactively around 3–4 years.' },
  { title: 'Charging station reliability', body: 'Public chargers can be broken, occupied, or slow. Always have a backup stop, and use apps that report live status and recent check-ins.' },
  { title: 'Range anxiety vs. reality', body: 'Most "stranded EV" stories are planning failures, not battery failures. The fix is a buffer and a backup charger — not worry.' },
  { title: 'Software bugs', body: 'EVs are computers on wheels. Over-the-air updates fix a lot, but occasionally introduce quirks. Keep software current and report issues.' },
  { title: 'Expensive collision repair', body: 'Structural battery packs and sensors can make even minor crashes costly. Check insurance rates before buying.' },
  { title: 'Tire wear', body: 'Heavy, torquey EVs wear tires faster. Budget for it and rotate on schedule.' },
];

// 7b. Mid-advanced: deeper failure modes & the biggest owner complaints
export const whatCanGoWrongAdvanced: Fact[] = [
  {
    title: 'Charging-curve disappointment, not battery failure',
    body: 'The #1 "my EV is broken" complaint is usually physics: a cold or high-SoC pack tapers charging hard, so a "350 kW" station delivers 70 kW. Preconditioning and arriving at 10–20% fixes most of it. Read the session curve, not the station’s headline number.',
  },
  {
    title: 'Public network reliability & payment failures',
    body: 'Beyond Tesla, the top systemic gripe is broken stalls, failed handshakes, and dead payment terminals. Non-Tesla CCS reliability has measured well below 80% in studies. Mitigation: favor networks with live status + recent check-ins, carry two RFID/app accounts, and always pin a backup site.',
  },
  {
    title: 'Phantom drain & vampire loss',
    body: 'Sentry/guard cameras, frequent app pings, and constant preconditioning can quietly pull several percent a day while parked. Owners who "lost range overnight" usually left always-on features running. Disable cabin overheat protection and sentry when parked long-term.',
  },
  {
    title: '12V battery: the silent stranding',
    body: 'A huge share of "won’t turn on" tickets trace to the cheap 12V (or small Li) accessory battery that runs the computers and door actuators — not the traction pack. It fails like any 12V, often around years 3–4, and can lock you out of the frunk. Replace proactively.',
  },
  {
    title: 'Heat-pump gaps & resistive-heat range hits',
    body: 'EVs without a heat pump (or with an undersized one) can lose 30–40% winter range to cabin heat. Even heat-pump cars struggle below ~15°F. The fix is preconditioning on shore power and seat/wheel heat — but it’s a legitimate cold-climate complaint, not a myth.',
  },
  {
    title: 'OTA updates that change behavior',
    body: 'Software giveth and taketh: updates have altered regen feel, removed features, throttled charging on flagged packs, or introduced UI bugs. Read release notes, delay major updates a few days, and keep a note of settings that reset.',
  },
  {
    title: 'Depreciation & price-cut whiplash',
    body: 'Aggressive new-car price cuts crater used values overnight — a top financial complaint. Early adopters who financed at high prices got hit hardest. Mitigation: buy used past the steep curve, or lease to cap residual risk to the bank.',
  },
  {
    title: 'Insurance & collision-repair cost shocks',
    body: 'Structural packs, calibrated sensors, and "replace not repair" policies make minor hits expensive, and some insurers total EVs over small battery damage. Premiums can run higher. Check insurance and repair-network coverage before buying a given model.',
  },
  {
    title: 'Tire and suspension wear from mass + torque',
    body: 'Heavy, torquey EVs eat tires (sometimes 25–30% faster) and stress bushings. Owners are surprised by $1,200–$1,800 tire bills. Rotate religiously, hold exact pressures, and budget for EV-rated rubber.',
  },
  {
    title: 'Apartment/condo charging access',
    body: 'No reliable home charging turns ownership into a chore and pushes you onto pricey DC fast charging — a leading regret for renters. "Right to charge" laws help but installs stall on landlords/HOAs. Confirm a real daily charging plan before buying.',
  },
  {
    title: 'Battery degradation edge cases',
    body: 'Most packs age gracefully, but heat-soaked climates, habitual 100% DC fast charging, and a few specific model years degrade faster. The mid-advanced move: pull a state-of-health reading and fast-charge history rather than trusting the dashboard range.',
  },
  {
    title: 'Connector fragmentation during the NACS transition',
    body: 'Mid-transition pain: adapters that throttle or fail to handshake, Superchargers not yet opened to your car, and stalls too short to reach a side-port. Use automaker-certified adapters and verify a site supports your car before relying on it.',
  },
];

// 7c. Ranked "biggest complaints" with how-real / how-to-mitigate framing
export interface Complaint {
  rank: number;
  title: string;
  severity: 'High' | 'Medium' | 'Overblown';
  reality: string;
  mitigation: string;
}

export const biggestComplaints: Complaint[] = [
  {
    rank: 1,
    title: 'Public fast-charging reliability',
    severity: 'High',
    reality: 'Broken stalls, failed payments, and ICE’d/occupied spots are the most cited real-world frustration outside the Tesla network.',
    mitigation: 'Use live-status apps, keep two charging accounts, prefer high-rated sites, and always have a backup stop pinned.',
  },
  {
    rank: 2,
    title: 'Winter range loss',
    severity: 'High',
    reality: 'Cold can cut 20–40% range and slow charging; cars without a heat pump suffer most.',
    mitigation: 'Precondition on shore power, use seat/wheel heat, pad your buffer to 15–20% in winter.',
  },
  {
    rank: 3,
    title: 'Depreciation & price cuts',
    severity: 'High',
    reality: 'New-model price cuts and fast tech turnover hammer resale values, especially on financed early-adopter cars.',
    mitigation: 'Buy 2–3 years used, or lease to push residual risk onto the lender.',
  },
  {
    rank: 4,
    title: 'Home-charging access (renters)',
    severity: 'High',
    reality: 'Without a home plug, ownership leans on expensive, less convenient public charging.',
    mitigation: 'Confirm reliable L2 in your routine before buying; pursue right-to-charge / workplace charging.',
  },
  {
    rank: 5,
    title: 'Up-front price & incentive complexity',
    severity: 'Medium',
    reality: 'Sticker prices still skew high and credit eligibility (income/price/assembly caps) is confusing.',
    mitigation: 'Use the point-of-sale credit, the lease path, and stack utility/state rebates.',
  },
  {
    rank: 6,
    title: 'Tire & repair costs',
    severity: 'Medium',
    reality: 'Mass and torque accelerate tire wear; specialized repairs and insurance can cost more.',
    mitigation: 'Rotate on schedule, hold pressures, budget for EV tires, and check insurance before buying.',
  },
  {
    rank: 7,
    title: 'Software bugs & forced changes',
    severity: 'Medium',
    reality: 'OTA updates occasionally remove features or change regen/charging behavior.',
    mitigation: 'Read release notes, delay big updates briefly, and report regressions.',
  },
  {
    rank: 8,
    title: '“They catch fire” fear',
    severity: 'Overblown',
    reality: 'Per mile, EVs ignite less often than gas cars; fires are rarer but harder to extinguish, which drives coverage.',
    mitigation: 'Follow charging best practices; no special action needed beyond normal care.',
  },
  {
    rank: 9,
    title: '“The battery will die in a few years”',
    severity: 'Overblown',
    reality: 'Real-world data shows ~1–2%/yr typical loss with 8-yr/100k-mi warranties; most packs outlast fears.',
    mitigation: 'Avoid habitual 100% DC charging and extreme heat; check SoH on used cars.',
  },
];


export const dealTips: Fact[] = [
  { title: 'Federal & state incentives', body: 'In the US the federal clean-vehicle credit (up to $7,500 new / $4,000 used, income and price caps apply) can often be applied at the point of sale. States like California add rebates and clean-fuel programs on top.' },
  { title: 'Lease loophole', body: 'Leases frequently qualify for the commercial credit regardless of the car\'s origin, so a lease can be cheaper than financing even if you plan to buy out the lease later.' },
  { title: 'End-of-quarter & model-year-end', body: 'Dealers and direct-sale brands discount hardest at quarter and year end to hit targets. Watch for price cuts and inventory deals.' },
  { title: 'Buy lightly used (2–3 yrs)', body: 'EVs depreciate steeply in the first years, so a 2–3 year-old EV with most of its battery warranty left is often the value sweet spot.' },
  { title: 'Utility & charger rebates', body: 'Many utilities offer rebates on home Level 2 chargers plus cheap overnight EV rates. Stack these with the federal home-charger credit.' },
  { title: 'Check the battery report', body: 'On a used EV, pull a battery health/state-of-health report and review fast-charge history before you commit.' },
];

// 10. Nightmare scenarios + how to avoid them
export const nightmareScenarios: Fact[] = [
  { title: 'Stranded at 0% in the cold', body: 'Cold slashes range and the last charger was "ICE\'d" or broken. Avoid it: keep a 15–20% buffer in winter, precondition, and always pin a backup charger.' },
  { title: 'Road trip with a dead charging network', body: 'You arrive and every stall is down. Avoid it: pick routes with high-reliability networks (Tesla Supercharger access, well-reviewed sites) and verify live status before you leave the previous stop.' },
  { title: 'Surprise depreciation', body: 'A price cut on new models tanks your trade-in value. Avoid it: buy used past the steep curve, or lease to cap residual risk.' },
  { title: 'Apartment with no charging', body: 'No home plug turns daily charging into a chore. Avoid it: confirm reliable Level 2 within your routine (work, gym, grocery) before buying, or push your building/HOA for chargers.' },
  { title: '$2,000 tire/repair shock', body: 'Performance EV burns through tires or needs costly out-of-warranty work. Avoid it: budget for tires, buy the right trim, and keep up the warranty maintenance.' },
];

// 11. Garage / home charging vs other charging (CA emphasis)
export const chargingTypes: Fact[] = [
  { title: 'Level 1 (120V wall outlet)', body: 'A standard household plug adds ~3–5 miles of range per hour. Fine for plug-in hybrids and very low-mileage drivers, painfully slow for big-battery EVs.' },
  { title: 'Level 2 (240V home charger)', body: 'The gold standard for home/garage charging: ~20–40 miles per hour, full overnight charge. Needs a 240V circuit (like a dryer/EV outlet). Most owners install one.' },
  { title: 'Garage charging in California', body: 'California rewards home charging: utilities (PG&E, SCE, SDG&E) offer EV time-of-use plans where overnight power can be dramatically cheaper. Combined with rooftop solar, a CA garage charge can cost a few cents per mile — far below gas.' },
  { title: 'Why CA differs', body: 'High daytime electricity prices but cheap overnight EV rates, generous rebates, and strong solar adoption make home garage charging especially advantageous in CA versus states with flat rates.' },
  { title: 'DC fast charging (Level 3)', body: 'Public 50–350 kW stations for road trips. Convenient and quick but the most expensive per kWh and the hardest on the battery if overused.' },
  { title: 'Workplace & destination charging', body: 'Level 2 at work, hotels, and shopping centers quietly tops you up while parked — often the most painless way to "never visit a gas station" again.' },
];

// 12. Solar setups & cost
export const solarPoints: Fact[] = [
  { title: 'Why pair solar with an EV', body: 'Charging from your own rooftop solar can drop your "fuel" cost toward zero and insulate you from rising utility rates — especially in sunny, high-rate states like California.' },
  { title: 'Typical system size', body: 'Covering a home plus one EV usually needs ~7–11 kW of panels. A rough rule: every 1,000 EV miles/year adds ~0.3 kW of panels to offset.' },
  { title: 'Cost & payback', body: 'A residential system runs roughly $2.50–$3.50 per watt before incentives — about $18,000–$30,000 for 8 kW. The 30% federal solar tax credit cuts that sharply; payback is often 6–10 years and faster when it offsets EV charging.' },
  { title: 'Battery storage (optional)', body: 'Home batteries (e.g., Powerwall) store daytime solar to charge the car at night and provide backup power. They add cost but boost self-consumption and resilience, valuable where time-of-use rates or outages bite.' },
  { title: 'Solar + EV time-of-use', body: 'Best play in many areas: size solar to your daytime use, then charge the EV on a cheap overnight EV rate — or charge midday off solar if you are home and on net metering.' },
];

// "Should teens start on EVs + autopilot?"
export const teensAndAutopilot: Fact[] = [
  { title: 'The case for', body: 'EVs are smooth, quiet, and have no clutch or gear shifts — easy to learn on. Modern safety tech (automatic emergency braking, blind-spot and lane-keep assist) genuinely helps new drivers avoid common crashes.' },
  { title: 'The case for caution', body: 'Instant torque can surprise an inexperienced driver, and acceleration is addictive. Driver-assist features can breed overconfidence and inattention — the opposite of what a learner needs.' },
  { title: 'The verdict on autopilot for teens', body: 'No current "autopilot/FSD/BlueCruise" system is full self-driving; all require an attentive driver. Experts broadly advise new drivers master the fundamentals first and keep advanced assist off (or strictly supervised) until skills are solid.' },
  { title: 'Practical setup', body: 'If a teen drives an EV: enable a speed/acceleration limit or valet/chill mode, keep automatic emergency braking on, and disable hands-off assist until they have a year of unaided experience.' },
];

// Latest features + autonomy rollout
export const latestFeatures: Fact[] = [
  { title: 'Hands-free highway assist', body: 'Systems like Ford BlueCruise, GM Super Cruise, and Tesla\'s assist suite now allow hands-free driving on mapped highways with eye-tracking to keep you attentive. They are advanced driver assistance — not autonomy.' },
  { title: 'NACS becomes the US standard', body: 'Nearly every automaker has adopted Tesla\'s North American Charging Standard (NACS) connector and is opening Supercharger access, vastly expanding reliable fast charging for non-Tesla EVs.' },
  { title: 'Bidirectional charging (V2H/V2G)', body: 'Trucks and SUVs like the F-150 Lightning and several Hyundai/Kia models can power your home in an outage or sell energy back to the grid.' },
  { title: 'Waymo robotaxis scaling up', body: 'Waymo runs fully driverless paid rides in Phoenix, San Francisco, Los Angeles, and Austin, and is expanding to new cities — the most mature true autonomous-taxi service in the US.' },
  { title: 'The broader robotaxi race', body: 'Tesla is rolling out a robotaxi service, Amazon\'s Zoox is testing purpose-built driverless shuttles, and players like China\'s Baidu Apollo Go and WeRide operate large fleets abroad. Regulation and safety records vary widely by city.' },
  { title: 'Smarter batteries & range', body: 'New LFP and emerging solid-state-adjacent chemistries, plus 800V platforms, are pushing 300+ mile range and 10–80% charges under 20 minutes into the mainstream.' },
];

// Foreign vs US EVs
export const foreignVsUs: Fact[] = [
  { title: 'China leads on price & pace', body: 'BYD overtook Tesla as the world\'s top EV maker by volume and sells capable EVs at prices US buyers rarely see. Tariffs and trade policy currently keep most Chinese EVs out of the US market.' },
  { title: 'Europe: premium & engineering', body: 'VW, BMW, Mercedes, Porsche, Audi, and Volvo/Polestar field refined, fast-charging EVs (many on 800V), often at a premium. Hyundai and Kia (Korea) punch above their price on tech and charging speed.' },
  { title: 'US strengths', body: 'Tesla\'s software, efficiency, and Supercharger network remain benchmarks; Rivian and Lucid lead on trucks/SUVs and luxury range respectively; legacy US makers field strong electric trucks.' },
  { title: 'What it means for you', body: 'US buyers get fewer ultra-cheap options than China but a maturing, increasingly interoperable (NACS) market. The global pressure from BYD and others is pushing prices and quality in your favor.' },
];

// New models: trucks, SUVs, semis
export const newModels: Fact[] = [
  { title: 'Electric trucks', body: 'Ford F-150 Lightning, Rivian R1T, Chevrolet Silverado EV, GMC Sierra/Hummer EV, and Tesla Cybertruck cover everything from work-truck value to off-road and towing — though towing sharply cuts range.' },
  { title: 'SUVs & crossovers', body: 'The hottest segment: Tesla Model Y, Hyundai Ioniq 5/9, Kia EV9 (3-row), Chevy Equinox/Blazer EV (value), Rivian R1S, Volvo EX90, and the Cadillac Lyriq/Optiq.' },
  { title: 'Affordable EVs', body: 'A wave of sub-$35k EVs (Chevy Equinox EV, updated Bolt, Hyundai/Kia entry trims, and promised compact models) is finally bringing electric driving down-market.' },
  { title: 'Electric semis & commercial', body: 'Tesla Semi, Freightliner eCascadia, Volvo VNR Electric, and others are electrifying regional freight, while electric vans (Ford E-Transit, Rivian EDV, Brightdrop) reshape last-mile delivery.' },
];

// FAQ / "anything else"
export const faq: Fact[] = [
  { title: 'Can I charge in the rain?', body: 'Yes. EV connectors are designed and tested to be safe in rain and at car washes. The system will not energize until a secure, sealed connection is confirmed.' },
  { title: 'What happens in a flood or deep water?', body: 'EV battery packs are sealed and generally handle water at least as well as gas cars. Never drive through deep/moving water in any vehicle, but submersion fires are rare and well-publicized precisely because they are unusual.' },
  { title: 'How long do EVs last?', body: 'Drivetrains have very few wearing parts and routinely exceed 200,000 miles. Battery longevity is the limiting factor, and real-world data shows most packs aging far more gracefully than early fears suggested.' },
  { title: 'Do I still need oil changes?', body: 'No engine oil, ever. Maintenance is mostly tires, brake fluid, cabin filter, and occasional coolant — a fraction of a gas car\'s upkeep.' },
  { title: 'Can I tow with an EV?', body: 'Yes, and the instant torque is great for it — but expect range to drop 30–50% while towing, so plan charging stops carefully.' },
  { title: 'Are EVs more likely to catch fire?', body: 'Data consistently shows EVs catch fire less often than gas cars per mile driven. EV fires are harder to extinguish, which is why they get outsized news coverage.' },
];
