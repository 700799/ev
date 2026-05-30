import type { ReactNode } from 'react';
import type { Fact } from '@/data/content';

export function Section({
  id,
  kicker,
  title,
  intro,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <div className="container">
        <div className="section-head">
          <div className="kicker">{kicker}</div>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function FactGrid({ facts, cols = 3 }: { facts: Fact[]; cols?: 2 | 3 | 4 }) {
  return (
    <div className={`grid cols-${cols}`}>
      {facts.map((f) => (
        <div className="card" key={f.title}>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </div>
      ))}
    </div>
  );
}
