'use client';

import { useEffect } from 'react';
import { useGame } from './GameProvider';
import { NAV_SECTIONS } from '@/lib/site';

/**
 * Watches the page's anchored sections and records a "section:<id>" event the
 * first time each scrolls into view, powering the reading-milestone badges.
 */
export default function ReadTracker() {
  const { record } = useGame();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            record(`section:${entry.target.id}`);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [record]);

  return null;
}
