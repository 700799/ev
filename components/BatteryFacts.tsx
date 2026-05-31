'use client';

import { useState } from 'react';
import type { Fact } from '@/data/content';
import { useGame } from './GameProvider';

export default function BatteryFacts({ beginner, advanced }: { beginner: Fact[]; advanced: Fact[] }) {
  const { record } = useGame();
  const [level, setLevel] = useState<'beginner' | 'advanced'>('advanced');
  const facts = level === 'advanced' ? advanced : beginner;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="muted small">Difficulty:</span>
        <button
          className={`btn ${level === 'beginner' ? 'primary' : 'ghost'}`}
          onClick={() => setLevel('beginner')}
          style={{ padding: '7px 14px' }}
        >
          🌱 Beginner
        </button>
        <button
          className={`btn ${level === 'advanced' ? 'primary' : 'ghost'}`}
          onClick={() => {
            setLevel('advanced');
            record('facts:advanced');
          }}
          style={{ padding: '7px 14px' }}
        >
          🎓 Advanced
        </button>
      </div>
      <div className="grid cols-3">
        {facts.map((f) => (
          <div className="card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
