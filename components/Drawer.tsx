'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Bottom-sheet drawer. Slides up from the bottom over a dimmed backdrop so the
 * launcher can "peek" content inline without a full page navigation. Closes on
 * backdrop tap, the ✕ button, or Escape; locks body scroll while open.
 *
 * The root stays mounted so both the enter and exit transitions play — the
 * caller keeps `spec`/children around until the slide-down finishes.
 */
export default function Drawer({
  open,
  onClose,
  kicker,
  title,
  ctaHref,
  ctaLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  kicker?: string;
  title: string;
  ctaHref?: string;
  ctaLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={`drawer-root${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-label={title}>
        <button className="drawer-handle" onClick={onClose} aria-label="Close" />
        <div className="drawer-head">
          <div className="drawer-headtext">
            {kicker && <div className="kicker">{kicker}</div>}
            <h2 className="drawer-title">{title}</h2>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {ctaHref && (
          <div className="drawer-foot">
            <a className="btn primary" href={ctaHref}>
              {ctaLabel || 'Open full page →'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
