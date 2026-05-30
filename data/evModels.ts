// Representative 2025–2026 EVs for the comparison table.
// Figures are approximate manufacturer/EPA-style estimates for orientation, not quotes.

export interface EvModel {
  name: string;
  type: 'Sedan' | 'SUV' | 'Truck' | 'Crossover' | 'Luxury' | 'Performance';
  origin: 'US' | 'Korea' | 'Europe' | 'China';
  rangeMi: number;
  startPriceUsd: number;
  fastChargeKw: number;
  zeroToSixty: number; // seconds
  charging: 'NACS' | 'CCS' | 'NACS (adapter)';
  highlight: string;
}

export const evModels: EvModel[] = [
  { name: 'Tesla Model 3', type: 'Sedan', origin: 'US', rangeMi: 363, startPriceUsd: 42000, fastChargeKw: 250, zeroToSixty: 4.9, charging: 'NACS', highlight: 'Efficiency + Supercharger network benchmark.' },
  { name: 'Tesla Model Y', type: 'SUV', origin: 'US', rangeMi: 337, startPriceUsd: 45000, fastChargeKw: 250, zeroToSixty: 4.8, charging: 'NACS', highlight: 'Best-selling EV; practical all-rounder.' },
  { name: 'Hyundai Ioniq 5', type: 'Crossover', origin: 'Korea', rangeMi: 318, startPriceUsd: 43000, fastChargeKw: 235, zeroToSixty: 4.5, charging: 'NACS', highlight: '800V — 10–80% in ~18 min.' },
  { name: 'Kia EV9', type: 'SUV', origin: 'Korea', rangeMi: 304, startPriceUsd: 56000, fastChargeKw: 210, zeroToSixty: 4.5, charging: 'NACS', highlight: 'Three-row family hauler, 800V.' },
  { name: 'Ford F-150 Lightning', type: 'Truck', origin: 'US', rangeMi: 320, startPriceUsd: 55000, fastChargeKw: 155, zeroToSixty: 4.0, charging: 'NACS (adapter)', highlight: 'Powers your home (V2H); real work truck.' },
  { name: 'Rivian R1S', type: 'SUV', origin: 'US', rangeMi: 410, startPriceUsd: 78000, fastChargeKw: 220, zeroToSixty: 3.0, charging: 'NACS (adapter)', highlight: 'Adventure SUV with serious off-road chops.' },
  { name: 'Chevrolet Equinox EV', type: 'Crossover', origin: 'US', rangeMi: 319, startPriceUsd: 34000, fastChargeKw: 150, zeroToSixty: 5.9, charging: 'NACS (adapter)', highlight: 'Affordability leader for a roomy EV.' },
  { name: 'Lucid Air', type: 'Luxury', origin: 'US', rangeMi: 420, startPriceUsd: 71000, fastChargeKw: 300, zeroToSixty: 3.0, charging: 'NACS (adapter)', highlight: 'Range + charging-speed champion.' },
  { name: 'BMW i4', type: 'Sedan', origin: 'Europe', rangeMi: 318, startPriceUsd: 58000, fastChargeKw: 205, zeroToSixty: 3.7, charging: 'NACS (adapter)', highlight: 'Driver-focused, refined sedan.' },
  { name: 'Volkswagen ID.4', type: 'Crossover', origin: 'Europe', rangeMi: 291, startPriceUsd: 41000, fastChargeKw: 175, zeroToSixty: 5.4, charging: 'NACS (adapter)', highlight: 'Comfortable, mainstream family EV.' },
  { name: 'Polestar 3', type: 'SUV', origin: 'Europe', rangeMi: 315, startPriceUsd: 67000, fastChargeKw: 250, zeroToSixty: 4.8, charging: 'NACS (adapter)', highlight: 'Scandinavian design, strong tech.' },
  { name: 'Tesla Cybertruck', type: 'Truck', origin: 'US', rangeMi: 320, startPriceUsd: 70000, fastChargeKw: 250, zeroToSixty: 4.1, charging: 'NACS', highlight: '800V-class truck, polarizing design.' },
];
