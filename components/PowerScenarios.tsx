'use client';

import { useEffect, useRef, useState } from 'react';
import { useGame } from './GameProvider';

interface Scenario {
  id: string;
  label: string;
  icon: string;
  kw: number; // negative = draining, positive = gaining
  tag: string;
  why: string;
}

// Approximate power flows for a typical ~75 kWh midsize EV. Negative = energy
// leaving the battery (driving loads); positive = energy entering it.
const SCENARIOS: Scenario[] = [
  { id: 'launch', label: 'Hard acceleration', icon: '🚀', kw: -160, tag: '0–60 mph launch', why: 'Pinning the pedal demands huge instantaneous power to accelerate the car’s mass — the biggest momentary drain. It’s brief, but it’s why spirited driving cuts range.' },
  { id: 'uphill', label: 'Uphill at 60 mph', icon: '⛰️', kw: -55, tag: '~6% grade, 60 mph', why: 'Climbing fights gravity on top of aerodynamic drag and rolling resistance, so the motor pulls heavy, sustained power the whole way up.' },
  { id: 'highway', label: 'Highway at 75 mph', icon: '🛣️', kw: -32, tag: 'flat road, 75 mph', why: 'Aerodynamic drag rises with the square of speed, so fast highway cruising is the single biggest steady drain. Dropping to 65 mph noticeably extends range.' },
  { id: 'cruise', label: 'Cruising at 60 mph', icon: '🚗', kw: -22, tag: 'flat road, 60 mph', why: 'A comfortable cruise — drag and rolling resistance only. This is close to most EVs’ efficiency sweet spot.' },
  { id: 'city', label: 'City driving 30 mph', icon: '🏙️', kw: -9, tag: 'flat road, 30 mph', why: 'Low speed means very little aerodynamic drag, so city cruising sips power. Stop-and-go also lets regen recover energy.' },
  { id: 'climate', label: 'Cabin heating (cold)', icon: '❄️', kw: -5, tag: 'parked or driving, winter', why: 'Heating the cabin and battery in the cold draws real power — a big reason winter range drops. Seat heaters and preconditioning on shore power soften the hit.' },
  { id: 'coast', label: 'Coasting', icon: '🍃', kw: -1, tag: 'foot off the pedal', why: 'With light or no regen, the car glides using almost no energy — momentum does the work.' },
  { id: 'downhill', label: 'Long downhill at 60', icon: '🏔️', kw: 30, tag: '~6% downgrade', why: 'Gravity now spins the motor as a generator. On a long descent you can actually gain range instead of using it.' },
  { id: 'regen', label: 'Regenerative braking', icon: '♻️', kw: 55, tag: 'slowing down', why: 'Lifting off or braking turns the motor into a generator, converting the car’s kinetic energy back into charge instead of wasting it as brake heat.' },
  { id: 'l2', label: 'Home Level 2 charging', icon: '🔌', kw: 7, tag: 'overnight, garage', why: 'A 240V home charger trickles in ~7 kW — enough to fully refill overnight, and the gentlest, cheapest way to charge.' },
  { id: 'dcfast', label: 'DC fast charging', icon: '⚡', kw: 150, tag: '10–50% state of charge', why: 'A fast charger pushes DC power straight into the pack. Speed peaks at low state of charge, then tapers to protect the battery as it fills.' },
];

const MAX_KW = 175;

export default function PowerScenarios() {
  const { record } = useGame();
  const [idx, setIdx] = useState(2); // start on "highway"
  const [playing, setPlaying] = useState(false);
  const chipRowRef = useRef<HTMLDivElement | null>(null);

  const s = SCENARIOS[idx];
  const draining = s.kw < 0;
  const mag = Math.abs(s.kw);
  const pct = Math.min(100, (mag / MAX_KW) * 100);
  const color = draining ? 'var(--danger)' : 'var(--accent)';
  // Faster flow for higher power.
  const flowDuration = Math.max(0.5, 2.4 - (mag / MAX_KW) * 1.9);

  useEffect(() => {
    record('feature:power');
  }, [record]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SCENARIOS.length), 2800);
    return () => clearInterval(t);
  }, [playing]);

  // Keep the active chip in view.
  useEffect(() => {
    const row = chipRowRef.current;
    const el = row?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    if (row && el) {
      row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [idx]);

  return (
    <div>
      {/* Scenario chips (horizontal scroller) */}
      <div className="chip-row" ref={chipRowRef}>
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            data-i={i}
            className={`scenario-chip ${i === idx ? 'active' : ''}`}
            onClick={() => {
              setIdx(i);
              record('feature:power');
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{sc.icon}</span> {sc.label}
          </button>
        ))}
      </div>

      <div className="grid cols-2" style={{ alignItems: 'stretch', marginTop: 16 }}>
        {/* Animated power visual */}
        <div className="card power-stage">
          <div className="power-flow" aria-hidden>
            {/* battery end */}
            <div className="power-end">
              <div className="mini-batt">
                <span style={{ width: `${draining ? 55 : 80}%`, background: color }} className={draining ? 'batt-drain' : 'batt-charge'} />
              </div>
              <div className="small muted">Battery</div>
            </div>

            {/* flowing energy lane */}
            <div className="power-lane">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={`${s.id}-${i}`}
                  className="flow-dot"
                  style={{
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    animationName: draining ? 'flow-ltr' : 'flow-rtl',
                    animationDuration: `${flowDuration}s`,
                    animationDelay: `${(i * flowDuration) / 9}s`,
                  }}
                />
              ))}
            </div>

            {/* source/sink end */}
            <div className="power-end">
              <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{s.icon}</div>
              <div className="small muted">{draining ? 'Driving load' : s.id === 'dcfast' || s.id === 'l2' ? 'Charger' : 'Recovering'}</div>
            </div>
          </div>

          {/* signed power gauge */}
          <div className="power-gauge">
            <div className="power-gauge-track">
              <div className="power-gauge-zero" />
              <div
                className="power-gauge-fill"
                style={{
                  background: color,
                  width: `${pct / 2}%`,
                  left: draining ? `${50 - pct / 2}%` : '50%',
                }}
              />
            </div>
            <div className="power-gauge-labels small muted">
              <span>← Draining</span>
              <span>0</span>
              <span>Charging →</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color }}>
              {draining ? '−' : '+'}{mag} kW
            </div>
            <div className="pill" style={{ color, borderColor: 'currentColor' }}>
              {draining ? '🔻 Draining' : '🔺 Gaining'} · {s.tag}
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2rem' }}>{s.icon}</div>
          <h3 style={{ margin: '8px 0' }}>{s.label}</h3>
          <p className="muted" style={{ margin: 0 }}>{s.why}</p>
          <div className="note" style={{ marginTop: 14, borderLeftColor: color }}>
            At <strong style={{ color }}>{draining ? '−' : '+'}{mag} kW</strong>, this scenario is{' '}
            <strong>{draining ? 'pulling energy out of' : 'putting energy into'}</strong> the battery
            {draining ? ` — about ${(mag / 7).toFixed(0)}× a home charger's input.` : '.'}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={() => setIdx((i) => (i - 1 + SCENARIOS.length) % SCENARIOS.length)}>‹ Prev</button>
            <button className="btn primary" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ Pause' : '▶ Auto-play'}</button>
            <button className="btn ghost" onClick={() => setIdx((i) => (i + 1) % SCENARIOS.length)}>Next ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
