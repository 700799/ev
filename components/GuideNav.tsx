'use client';

import { useEffect, useMemo, useState } from 'react';
import { NAV_SECTIONS, type NavSection } from '@/lib/site';

// Three rows, each merging related groups so the bar stays compact.
const ROWS: { label: string; groups: NavSection['group'][] }[] = [
  { label: 'Do', groups: ['Tools', 'Play'] },
  { label: 'Learn', groups: ['Learn'] },
  { label: 'Compare & tips', groups: ['Compare', 'Tips'] },
];

/**
 * Sticky multi-row section nav for the guide page. Renders the guide's anchored
 * sections as rows of chips; the chip for the section currently in view is
 * highlighted (IntersectionObserver) and auto-scrolled into view in its row.
 */
export default function GuideNav() {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top that's intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Keep the active chip scrolled into view within its row.
  useEffect(() => {
    if (!active) return;
    const chip = document.querySelector<HTMLElement>(`[data-guidenav="${active}"]`);
    chip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const rows = useMemo(
    () =>
      ROWS.map((r) => ({
        label: r.label,
        items: NAV_SECTIONS.filter((s) => r.groups.includes(s.group)),
      })).filter((r) => r.items.length > 0),
    [],
  );

  return (
    <nav className="guidenav" aria-label="Guide sections">
      {rows.map((row) => (
        <div className="guidenav-row" key={row.label}>
          <span className="guidenav-group">{row.label}</span>
          <div className="guidenav-rail">
            {row.items.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                data-guidenav={s.id}
                className={`guidenav-chip${active === s.id ? ' active' : ''}`}
                aria-current={active === s.id ? 'true' : undefined}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
