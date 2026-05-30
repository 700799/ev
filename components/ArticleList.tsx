'use client';

import { useMemo, useState } from 'react';
import type { Article } from '@/data/articles';
import { withBase } from '@/lib/site';

interface Props {
  articles: Article[];
  pageSize?: number;
  ranked?: boolean; // show #1, #2 … (popularity)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArticleList({ articles, pageSize = 5, ranked = false }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(articles.length / pageSize));

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return articles.slice(start, start + pageSize).map((a, i) => ({ a, rank: start + i + 1 }));
  }, [articles, page, pageSize]);

  return (
    <div>
      <div style={{ display: 'grid', gap: 12 }}>
        {pageItems.map(({ a, rank }) => (
          <article key={a.id} className="article-row">
            {ranked && <div className="article-rank">#{rank}</div>}
            <div style={{ flex: 1 }}>
              <span className="pill">{a.category}</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.08rem' }}>
                <a href={withBase(`/articles/${a.id}/`)} style={{ color: 'inherit' }}>
                  {a.title}
                </a>
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.94rem' }}>{a.excerpt}</p>
              <div className="article-meta">
                <span>🗓️ {fmtDate(a.date)}</span>
                <span>⏱️ {a.readMinutes} min read</span>
                {ranked && <span>👀 {a.views.toLocaleString()} reads this week</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
