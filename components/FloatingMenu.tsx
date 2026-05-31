'use client';

import { useEffect, useMemo, useState } from 'react';
import { NAV_SECTIONS, type NavSection } from '@/lib/site';

const GROUP_ORDER: NavSection['group'][] = ['Tools', 'Play', 'Learn', 'Compare', 'Tips'];

export default function FloatingMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>('');

  // Highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_SECTIONS.filter((s) => !q || s.label.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      group: g,
      items: filtered.filter((s) => s.group === g),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <>
      {open && (
        <nav className="float-menu" aria-label="Quick navigation">
          <input
            className="menu-search"
            placeholder="Jump to a section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter sections"
          />
          {grouped.map((g) => (
            <div key={g.group}>
              <div className="group-label">{g.group}</div>
              {g.items.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={
                    active === s.id
                      ? { background: 'var(--panel-2)', color: 'var(--text)' }
                      : undefined
                  }
                  onClick={() => setOpen(false)}
                >
                  {s.label}
                </a>
              ))}
            </div>
          ))}
          {grouped.length === 0 && <p className="muted small">No sections match.</p>}
        </nav>
      )}
      <button
        className="fab"
        aria-expanded={open}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setOpen((v) => !v)}
        title="Quick navigation"
      >
        {open ? '✕' : '☰'}
      </button>
    </>
  );
}
