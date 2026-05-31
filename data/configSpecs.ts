// Cost + physics model for the 3D EV configurator.
// Lets the builder show how each choice affects price, weight, drag, range,
// acceleration, and cornering grip. Numbers are plausible, rounded estimates
// for an educational feel — not a manufacturer spec sheet.

export type BodyType = 'sedan' | 'suv' | 'pickup';
export type WheelStyle = 'sport' | 'aero' | 'turbine' | 'offroad' | 'gold';

export interface BodySpec {
  price: number; // base MSRP
  weightKg: number; // curb weight
  cd: number; // drag coefficient
  areaM2: number; // frontal area
  batteryKwh: number;
  motorKw: number; // peak power (for 0-60)
  baseGrip: number; // peak lateral g on road tires
}

export const BODY_SPECS: Record<BodyType, BodySpec> = {
  sedan: { price: 42000, weightKg: 1800, cd: 0.23, areaM2: 2.3, batteryKwh: 75, motorKw: 250, baseGrip: 0.95 },
  suv: { price: 50000, weightKg: 2100, cd: 0.3, areaM2: 2.8, batteryKwh: 82, motorKw: 290, baseGrip: 0.88 },
  pickup: { price: 62000, weightKg: 2900, cd: 0.45, areaM2: 3.4, batteryKwh: 131, motorKw: 430, baseGrip: 0.8 },
};

export interface PartSpec {
  cost: number; // $
  weightKg: number; // added mass
  cdDelta: number; // change to drag coefficient
  gripDelta?: number; // change to peak lateral g
}

// Wheel choices: cost, weight delta, drag delta, grip delta vs the sport baseline.
export const WHEEL_SPECS: Record<WheelStyle, PartSpec> = {
  sport: { cost: 0, weightKg: 0, cdDelta: 0, gripDelta: 0.02 },
  aero: { cost: 500, weightKg: -8, cdDelta: -0.02, gripDelta: -0.01 },
  turbine: { cost: 1200, weightKg: 4, cdDelta: -0.005, gripDelta: 0.03 },
  offroad: { cost: 1500, weightKg: 30, cdDelta: 0.05, gripDelta: -0.08 },
  gold: { cost: 3500, weightKg: 2, cdDelta: 0, gripDelta: 0.04 },
};

// Accessory cost + aero/weight penalties. cdDelta is the big lever for range.
export const ACCESSORY_SPECS: Record<string, PartSpec & { label: string }> = {
  roofrack: { label: '🧰 Roof Rack', cost: 350, weightKg: 8, cdDelta: 0.02 },
  roofbox: { label: '📦 Cargo Box', cost: 600, weightKg: 18, cdDelta: 0.06 },
  lightbar: { label: '🔦 Light Bar', cost: 400, weightKg: 6, cdDelta: 0.03 },
  bullbar: { label: '🐂 Bull Bar', cost: 900, weightKg: 25, cdDelta: 0.04, gripDelta: -0.01 },
  spoiler: { label: '🪽 Rear Spoiler', cost: 700, weightKg: 7, cdDelta: 0.005, gripDelta: 0.02 },
  towhitch: { label: '🪝 Tow Hitch', cost: 500, weightKg: 15, cdDelta: 0.005 },
  underglow: { label: '🌈 Underglow', cost: 300, weightKg: 3, cdDelta: 0 },
  stripe: { label: '🏁 Racing Stripe', cost: 250, weightKg: 1, cdDelta: 0 },
  mudflaps: { label: '🛡️ Mud Flaps', cost: 120, weightKg: 3, cdDelta: 0.01 },
  tint: { label: '🕶️ Window Tint', cost: 400, weightKg: 4, cdDelta: 0 },
  skirack: { label: '🎿 Ski Rack', cost: 450, weightKg: 9, cdDelta: 0.04 },
  bikerack: { label: '🚲 Bike Rack', cost: 380, weightKg: 12, cdDelta: 0.05 },
  sharkfin: { label: '📡 Shark-Fin Antenna', cost: 150, weightKg: 1, cdDelta: 0.002 },
  sunroof: { label: '☀️ Pano Roof', cost: 1500, weightKg: 35, cdDelta: 0.003, gripDelta: -0.01 },
  runningboards: { label: '🪜 Running Boards', cost: 700, weightKg: 22, cdDelta: 0.02 },
};

export interface BuildStats {
  price: number;
  weightKg: number;
  cd: number;
  rangeMi: number;
  baseRangeMi: number;
  whPerMile: number;
  zeroToSixty: number;
  baseZeroToSixty: number;
  grip: number; // peak lateral g
  cornerMph: number; // speed through a ~50m radius bend at that grip
  accessoryCost: number;
  accessoryWeight: number;
}

// Physics constants for a steady-65-mph range estimate.
const RHO = 1.225; // air density kg/m^3
const V = 29.06; // 65 mph in m/s
const G = 9.81;
const CRR = 0.012; // rolling resistance coefficient
const DRIVETRAIN_EFF = 0.88;
const MILE_M = 1609.34;
const CORNER_RADIUS_M = 50;

function rangeFor(batteryKwh: number, weightKg: number, cd: number, area: number): { rangeMi: number; whPerMile: number } {
  const fAero = 0.5 * RHO * cd * area * V * V; // N
  const fRoll = CRR * weightKg * G; // N
  const joulesPerMile = ((fAero + fRoll) * MILE_M) / DRIVETRAIN_EFF;
  const whPerMile = joulesPerMile / 3600;
  const rangeMi = (batteryKwh * 1000) / whPerMile;
  return { rangeMi, whPerMile };
}

function zeroToSixtyFor(weightKg: number, motorKw: number): number {
  // Rough empirical fit: heavier and less powerful = slower. Tuned so a
  // ~1800 kg / 250 kW sedan lands near ~4.8 s.
  const t = (weightKg / motorKw) * 0.62;
  return Math.max(2.8, t);
}

export function computeStats(
  body: BodyType,
  wheel: WheelStyle,
  accessories: Set<string> | string[],
): BuildStats {
  const b = BODY_SPECS[body];
  const w = WHEEL_SPECS[wheel];
  const accList = Array.from(accessories as Iterable<string>);

  let weightKg = b.weightKg + w.weightKg;
  let cd = b.cd + w.cdDelta;
  let grip = b.baseGrip + (w.gripDelta || 0);
  let accessoryCost = 0;
  let accessoryWeight = 0;

  for (const id of accList) {
    const a = ACCESSORY_SPECS[id];
    if (!a) continue;
    weightKg += a.weightKg;
    accessoryWeight += a.weightKg;
    accessoryCost += a.cost;
    cd += a.cdDelta;
    if (a.gripDelta) grip += a.gripDelta;
  }
  weightKg += w.weightKg < 0 ? 0 : 0; // (wheel weight already applied)

  const price = b.price + w.cost + accessoryCost;
  const { rangeMi, whPerMile } = rangeFor(b.batteryKwh, weightKg, cd, b.areaM2);
  const base = rangeFor(b.batteryKwh, b.weightKg, b.cd, b.areaM2);
  const zeroToSixty = zeroToSixtyFor(weightKg, b.motorKw);
  const baseZeroToSixty = zeroToSixtyFor(b.weightKg, b.motorKw);

  // Max cornering speed (m/s) = sqrt(grip * g * r), then to mph.
  const cornerMph = Math.sqrt(Math.max(0.1, grip) * G * CORNER_RADIUS_M) * 2.23694;

  return {
    price,
    weightKg,
    cd: Math.round(cd * 1000) / 1000,
    rangeMi: Math.round(rangeMi),
    baseRangeMi: Math.round(base.rangeMi),
    whPerMile: Math.round(whPerMile),
    zeroToSixty: Math.round(zeroToSixty * 10) / 10,
    baseZeroToSixty: Math.round(baseZeroToSixty * 10) / 10,
    grip: Math.round(grip * 100) / 100,
    cornerMph: Math.round(cornerMph),
    accessoryCost,
    accessoryWeight: Math.round(accessoryWeight),
  };
}
