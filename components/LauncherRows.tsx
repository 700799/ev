'use client';

import { useCallback, useState } from 'react';
import { withBase } from '@/lib/site';
import Drawer from './Drawer';

export interface Tile {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  accent?: boolean;
  /** When set (and present in `drawers`), the tile peeks content in a drawer. */
  drawerId?: string;
}
export interface Row {
  title: string;
  tiles: Tile[];
}

// A drawer's body is a list of blocks rendered with the site's existing card,
// table, and list styles — all plain serializable data passed from the server.
export type DrawerBlock =
  | { kind: 'facts'; facts: { title: string; body: string }[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'list'; variant: 'checks' | 'warns'; heading?: string; items: string[] }
  | {
      kind: 'articles';
      ranked?: boolean;
      items: { id: string; title: string; excerpt: string; category: string; date: string; readMinutes: number }[];
    };

export interface DrawerSpec {
  kicker: string;
  title: string;
  href: string;
  cta?: string;
  blocks: DrawerBlock[];
}

function Block({ block }: { block: DrawerBlock }) {
  switch (block.kind) {
    case 'facts':
      return (
        <div className="drawer-cards">
          {block.facts.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{j === 0 ? <strong>{cell}</strong> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list':
      return (
        <>
          {block.heading && <h3 className="drawer-subhead">{block.heading}</h3>}
          <ul className={block.variant}>
            {block.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </>
      );
    case 'articles':
      return (
        <div className="drawer-cards">
          {block.items.map((a, i) => (
            <a className="card drawer-article" key={a.id} href={withBase(`/articles/${a.id}/`)}>
              <span className="pill">
                {block.ranked ? `#${i + 1} · ${a.category}` : a.category}
              </span>
              <h3>{a.title}</h3>
              <p>{a.excerpt}</p>
              <div className="article-meta">
                <span>🗓️ {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>⏱️ {a.readMinutes} min</span>
              </div>
            </a>
          ))}
        </div>
      );
  }
}

export default function LauncherRows({
  rows,
  drawers,
}: {
  rows: Row[];
  drawers: Record<string, DrawerSpec>;
}) {
  // `activeId` drives the content; `open` drives the slide animation. On close we
  // drop `open` first and clear `activeId` after the transition so the exit plays.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const openDrawer = useCallback((id: string) => {
    setActiveId(id);
    requestAnimationFrame(() => setOpen(true));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => setActiveId(null), 260);
  }, []);

  const spec = activeId ? drawers[activeId] : null;

  return (
    <>
      {rows.map((row) => (
        <section key={row.title} className="launch-row" aria-label={row.title}>
          <h2 className="launch-row-title">{row.title}</h2>
          <div className="launch-rail">
            {row.tiles.map((t) => {
              const hasDrawer = t.drawerId && drawers[t.drawerId];
              const cls = `tile${t.accent ? ' tile-accent' : ''}${hasDrawer ? ' tile-peek' : ''}`;
              if (hasDrawer) {
                return (
                  <button
                    key={t.drawerId}
                    type="button"
                    className={cls}
                    onClick={() => openDrawer(t.drawerId!)}
                    aria-haspopup="dialog"
                  >
                    <span className="tile-emoji">{t.emoji}</span>
                    <span className="tile-label">{t.label}</span>
                    <span className="tile-sub">{t.sub}</span>
                  </button>
                );
              }
              return (
                <a key={t.href} href={withBase(t.href)} className={cls}>
                  <span className="tile-emoji">{t.emoji}</span>
                  <span className="tile-label">{t.label}</span>
                  <span className="tile-sub">{t.sub}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}

      <Drawer
        open={open}
        onClose={close}
        kicker={spec?.kicker}
        title={spec?.title || ''}
        ctaHref={spec ? withBase(spec.href) : undefined}
        ctaLabel={spec?.cta}
      >
        {spec?.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </Drawer>
    </>
  );
}
