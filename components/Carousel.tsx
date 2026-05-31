'use client';

import { useRef } from 'react';

/**
 * Horizontal, scroll-snapping carousel with prev/next controls. Children render
 * as fixed-ish width cards in a scrollable track. Used for card rows that read
 * better swiped horizontally than stacked.
 */
export default function Carousel({
  children,
  itemMinWidth = 280,
}: {
  children: React.ReactNode;
  itemMinWidth?: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, itemMinWidth), behavior: 'smooth' });
  };

  return (
    <div className="carousel">
      <button className="carousel-btn left" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
        ‹
      </button>
      <div className="carousel-track" ref={trackRef} style={{ ['--item-min' as string]: `${itemMinWidth}px` }}>
        {children}
      </div>
      <button className="carousel-btn right" aria-label="Scroll right" onClick={() => scrollBy(1)}>
        ›
      </button>
    </div>
  );
}
