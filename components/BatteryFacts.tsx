'use client';

import { useState } from 'react';
import type { Fact } from '@/data/content';
import Carousel from './Carousel';
import { useGame } from './GameProvider';

type Level = 'beginner' | 'intermediate' | 'advanced';

export default function BatteryFacts({
  beginner,
  intermediate,
  advanced,
}: {
  beginner: Fact[];
  intermediate: Fact[];
  advanced: Fact[];
}) {
  const { record } = useGame();
  const [level, setLevel] = useState<Level>('intermediate');
  const facts = level === 'advanced' ? advanced : level === 'intermediate' ? intermediate : beginner;

  const tabs: { id: Level; label: string }[] = [
    { id: 'beginner', label: '🌱 Beginner' },
    { id: 'intermediate', label: '📘 Intermediate' },
    { id: 'advanced', label: '🎓 Advanced' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="muted small">Difficulty:</span>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn ${level === t.id ? 'primary' : 'ghost'}`}
            onClick={() => {
              setLevel(t.id);
              if (t.id === 'advanced') record('facts:advanced');
              if (t.id === 'intermediate') record('facts:intermediate');
            }}
            style={{ padding: '7px 14px' }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Carousel itemMinWidth={300}>
        {facts.map((f) => (
          <div className="card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </Carousel>
    </div>
  );
}
