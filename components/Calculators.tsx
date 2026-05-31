'use client';

import { useEffect, useState } from 'react';
import { useGame } from './GameProvider';

type Tab = 'savings' | 'charge' | 'solar';

function n(v: string, d = 0) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : d;
}

export default function Calculators() {
  const [tab, setTab] = useState<Tab>('savings');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <TabBtn active={tab === 'savings'} onClick={() => setTab('savings')}>💰 EV vs Gas Savings</TabBtn>
        <TabBtn active={tab === 'charge'} onClick={() => setTab('charge')}>🔌 Charge & Trip Cost</TabBtn>
        <TabBtn active={tab === 'solar'} onClick={() => setTab('solar')}>☀️ Solar Payback</TabBtn>
      </div>
      {tab === 'savings' && <SavingsCalc />}
      {tab === 'charge' && <ChargeCalc />}
      {tab === 'solar' && <SolarCalc />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`btn ${active ? 'primary' : 'ghost'}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card">
      <div className="num">{label}</div>
      <div className="result-strong" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

/* ---- Savings (annual + lifetime EV vs gas) ---- */
function SavingsCalc() {
  const { record } = useGame();
  useEffect(() => { record('calc:savings'); }, [record]);
  const [miles, setMiles] = useState('12000');
  const [eff, setEff] = useState('3.5'); // mi/kWh
  const [rate, setRate] = useState('0.18'); // $/kWh
  const [mpg, setMpg] = useState('28');
  const [gas, setGas] = useState('4.25');
  const [years, setYears] = useState('7');
  const [evMaint, setEvMaint] = useState('300');
  const [gasMaint, setGasMaint] = useState('900');

  const m = n(miles), e = n(eff, 3.5), r = n(rate), mg = n(mpg, 28), g = n(gas), y = n(years, 1);
  const evFuel = (m / e) * r;
  const gasFuel = (m / mg) * g;
  const evYear = evFuel + n(evMaint);
  const gasYear = gasFuel + n(gasMaint);
  const annualSave = gasYear - evYear;

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Miles / year" value={miles} set={setMiles} />
        <Field label="EV efficiency (mi/kWh)" value={eff} set={setEff} />
        <Field label="Electricity ($/kWh)" value={rate} set={setRate} />
        <Field label="Gas car MPG" value={mpg} set={setMpg} />
        <Field label="Gas price ($/gal)" value={gas} set={setGas} />
        <Field label="Years owned" value={years} set={setYears} />
        <Field label="EV maint / yr ($)" value={evMaint} set={setEvMaint} />
        <Field label="Gas maint / yr ($)" value={gasMaint} set={setGasMaint} />
      </div>
      <div className="grid cols-2">
        <Stat label="EV FUEL / YR" value={`$${evFuel.toFixed(0)}`} />
        <Stat label="GAS FUEL / YR" value={`$${gasFuel.toFixed(0)}`} accent="var(--warn)" />
        <Stat label="ANNUAL SAVINGS" value={`$${annualSave.toFixed(0)}`} accent="var(--accent)" />
        <Stat label={`${y}-YR SAVINGS`} value={`$${(annualSave * y).toFixed(0)}`} accent="var(--accent)" />
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="num">COST PER MILE</div>
          <p className="small">
            EV: <strong>{(evFuel / Math.max(1, m) * 100).toFixed(1)}¢/mi</strong> · Gas:{' '}
            <strong style={{ color: 'var(--warn)' }}>{(gasFuel / Math.max(1, m) * 100).toFixed(1)}¢/mi</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Charge & trip cost ---- */
function ChargeCalc() {
  const { record } = useGame();
  useEffect(() => { record('calc:charge'); }, [record]);
  const [battery, setBattery] = useState('75'); // kWh
  const [from, setFrom] = useState('20'); // %
  const [to, setTo] = useState('80'); // %
  const [rate, setRate] = useState('0.18');
  const [tripMiles, setTripMiles] = useState('250');
  const [eff, setEff] = useState('3.5');
  const [chargeType, setChargeType] = useState('home');

  const b = n(battery, 75), f = n(from), t = n(to), r = n(rate);
  const kwhAdded = Math.max(0, (t - f) / 100) * b;
  const chargeCost = kwhAdded * r;
  const milesAdded = kwhAdded * n(eff, 3.5);

  const trip = n(tripMiles), e2 = n(eff, 3.5);
  const tripKwh = trip / e2;
  const tripCost = tripKwh * r;

  const rateHint: Record<string, string> = {
    home: '≈ $0.12–0.22 (CA overnight EV rate)',
    public2: '≈ $0.20–0.35 (Level 2 public)',
    dcfast: '≈ $0.40–0.60 (DC fast charging)',
  };

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Charging type (sets a typical rate)</label>
          <select
            value={chargeType}
            onChange={(e) => {
              setChargeType(e.target.value);
              setRate(e.target.value === 'home' ? '0.18' : e.target.value === 'public2' ? '0.30' : '0.48');
            }}
          >
            <option value="home">Home / garage (Level 2)</option>
            <option value="public2">Public Level 2</option>
            <option value="dcfast">DC fast charging</option>
          </select>
          <span className="muted small">{rateHint[chargeType]}</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Battery size (kWh)" value={battery} set={setBattery} />
          <Field label="Rate ($/kWh)" value={rate} set={setRate} />
          <Field label="Charge from (%)" value={from} set={setFrom} />
          <Field label="Charge to (%)" value={to} set={setTo} />
          <Field label="Efficiency (mi/kWh)" value={eff} set={setEff} />
          <Field label="Trip distance (mi)" value={tripMiles} set={setTripMiles} />
        </div>
      </div>
      <div className="grid cols-2">
        <Stat label="ENERGY ADDED" value={`${kwhAdded.toFixed(1)} kWh`} />
        <Stat label="COST OF THIS CHARGE" value={`$${chargeCost.toFixed(2)}`} accent="var(--accent)" />
        <Stat label="RANGE ADDED" value={`${milesAdded.toFixed(0)} mi`} />
        <Stat label="THIS TRIP NEEDS" value={`${tripKwh.toFixed(1)} kWh`} />
        <Stat label="TRIP ENERGY COST" value={`$${tripCost.toFixed(2)}`} accent="var(--accent)" />
        <Stat label="TRIP ¢/MILE" value={`${(tripCost / Math.max(1, trip) * 100).toFixed(1)}¢`} />
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <p className="small muted">
            Tip: for daily driving, charging 20→80% (shown above) is gentler on the battery. Use the{' '}
            <a href="/trip-planner/">Trip Planner</a> for full long-trip routing with chargers on the map.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Solar payback ---- */
function SolarCalc() {
  const { record } = useGame();
  useEffect(() => { record('calc:solar'); }, [record]);
  const [size, setSize] = useState('8'); // kW
  const [costPerW, setCostPerW] = useState('3.00');
  const [sun, setSun] = useState('5'); // peak sun hours/day
  const [rate, setRate] = useState('0.32'); // utility $/kWh offset
  const [credit, setCredit] = useState('30'); // % federal credit

  const kw = n(size, 8), cpw = n(costPerW, 3), sh = n(sun, 5), r = n(rate, 0.3), c = n(credit);
  const gross = kw * 1000 * cpw;
  const net = gross * (1 - c / 100);
  const annualKwh = kw * sh * 365 * 0.8; // 0.8 system/derate factor
  const annualSavings = annualKwh * r;
  const payback = annualSavings > 0 ? net / annualSavings : 0;
  const evMilesPowered = annualKwh * 3.5;

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="System size (kW)" value={size} set={setSize} />
        <Field label="Cost per watt ($)" value={costPerW} set={setCostPerW} />
        <Field label="Peak sun hrs/day" value={sun} set={setSun} />
        <Field label="Utility rate ($/kWh)" value={rate} set={setRate} />
        <Field label="Federal credit (%)" value={credit} set={setCredit} />
      </div>
      <div className="grid cols-2">
        <Stat label="GROSS COST" value={`$${gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat label="NET AFTER CREDIT" value={`$${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="var(--accent-2)" />
        <Stat label="ANNUAL PRODUCTION" value={`${annualKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`} />
        <Stat label="ANNUAL SAVINGS" value={`$${annualSavings.toFixed(0)}`} accent="var(--accent)" />
        <Stat label="PAYBACK" value={`${payback.toFixed(1)} yrs`} accent="var(--accent)" />
        <Stat label="EV MILES / YR POWERED" value={`${evMilesPowered.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi`} />
      </div>
    </div>
  );
}

function Field({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="number" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
