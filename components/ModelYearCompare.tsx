'use client';

import { useEffect, useState } from 'react';
import { modelLines } from '@/data/modelYears';
import { useGame } from './GameProvider';

export default function ModelYearCompare() {
  const { record } = useGame();
  const [selected, setSelected] = useState(modelLines[0].id);
  const line = modelLines.find((m) => m.id === selected) || modelLines[0];

  // Award the "Year Analyst" badge once the tool is on screen / interacted.
  useEffect(() => {
    record('feature:modelyears');
  }, [record]);

  const baseYear = line.years[0];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {modelLines.map((m) => (
          <button
            key={m.id}
            className={`btn ${selected === m.id ? 'primary' : 'ghost'}`}
            onClick={() => {
              setSelected(m.id);
              record('feature:modelyears');
            }}
          >
            {m.name}
          </button>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 0 }}>{line.blurb}</p>

      {/* Spec delta table */}
      <div className="table-wrap" style={{ marginBottom: 18 }}>
        <table>
          <thead>
            <tr>
              <th>Model year</th>
              <th>Range</th>
              <th>0–60</th>
              <th>Start price</th>
              <th>Δ Range vs {baseYear.year}</th>
              <th>Δ Price vs {baseYear.year}</th>
            </tr>
          </thead>
          <tbody>
            {line.years.map((y) => {
              const dRange = y.rangeMi - baseYear.rangeMi;
              const dPrice = y.startPriceUsd - baseYear.startPriceUsd;
              return (
                <tr key={y.year}>
                  <td>
                    <strong>{y.year}</strong>
                    {y.tag && <><br /><span className="pill" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>{y.tag}</span></>}
                  </td>
                  <td>{y.rangeMi} mi</td>
                  <td>{y.zeroToSixty}s</td>
                  <td>${y.startPriceUsd.toLocaleString()}</td>
                  <td style={{ color: dRange > 0 ? 'var(--accent)' : dRange < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                    {dRange === 0 ? '—' : `${dRange > 0 ? '+' : ''}${dRange} mi`}
                  </td>
                  <td style={{ color: dPrice < 0 ? 'var(--accent)' : dPrice > 0 ? 'var(--warn)' : 'var(--muted)' }}>
                    {dPrice === 0 ? '—' : `${dPrice > 0 ? '+' : '-'}$${Math.abs(dPrice).toLocaleString()}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Year-by-year change timeline */}
      <div className="grid cols-3">
        {line.years.map((y) => (
          <div className="card" key={y.year}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0 }}>{y.year}</h3>
              {y.tag && <span className="pill" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>{y.tag}</span>}
            </div>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {y.changes.map((c, i) => (
                <li key={i} className="small" style={{ marginBottom: 6, color: 'var(--muted)' }}>{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
