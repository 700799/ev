'use client';

import { useState } from 'react';
import type { Fact, Complaint } from '@/data/content';
import Carousel from './Carousel';
import { useGame } from './GameProvider';

const sevColor = (s: Complaint['severity']) =>
  s === 'High' ? 'var(--danger)' : s === 'Medium' ? 'var(--warn)' : 'var(--accent)';

export default function WhatGoesWrong({
  basic,
  advanced,
  complaints,
}: {
  basic: Fact[];
  advanced: Fact[];
  complaints: Complaint[];
}) {
  const { record } = useGame();
  const [depth, setDepth] = useState<'overview' | 'advanced'>('advanced');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="muted small">Depth:</span>
        <button
          className={`btn ${depth === 'overview' ? 'primary' : 'ghost'}`}
          onClick={() => setDepth('overview')}
          style={{ padding: '7px 14px' }}
        >
          🌱 Overview
        </button>
        <button
          className={`btn ${depth === 'advanced' ? 'primary' : 'ghost'}`}
          onClick={() => {
            setDepth('advanced');
            record('failures:advanced');
          }}
          style={{ padding: '7px 14px' }}
        >
          🔧 Mid-Advanced
        </button>
      </div>

      {depth === 'overview' ? (
        <Carousel>
          {basic.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </Carousel>
      ) : (
        <>
          <Carousel>
            {advanced.map((f) => (
              <div className="card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </Carousel>

          <h3 style={{ margin: '26px 0 6px' }}>The biggest complaints, ranked &amp; reality-checked</h3>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 14 }}>
            Severity reflects how much it actually bites a typical owner — including the ones that are{' '}
            <span style={{ color: 'var(--accent)' }}>overblown</span>.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Complaint</th>
                  <th>Severity</th>
                  <th>The reality</th>
                  <th>How to mitigate</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.rank}>
                    <td><strong>{c.rank}</strong></td>
                    <td><strong>{c.title}</strong></td>
                    <td>
                      <span className="pill" style={{ color: sevColor(c.severity), borderColor: 'currentColor' }}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="muted small">{c.reality}</td>
                    <td className="muted small">{c.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
