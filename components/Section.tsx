import type { ReactNode } from 'react';
import type { Fact } from '@/data/content';
import Carousel from './Carousel';

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

export function FactGrid({
  facts,
  cols = 3,
  carousel = false,
}: {
  facts: Fact[];
  cols?: 2 | 3 | 4;
  carousel?: boolean;
}) {
  const cards = facts.map((f) => (
    <div className="card" key={f.title}>
      <h3>{f.title}</h3>
      <p>{f.body}</p>
    </div>
  ));

  if (carousel) return <Carousel>{cards}</Carousel>;
  return <div className={`grid cols-${cols}`}>{cards}</div>;
}
