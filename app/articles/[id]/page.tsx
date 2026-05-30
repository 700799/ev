import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { articles, freshArticles } from '@/data/articles';
import { getArticleBody } from '@/data/articleBodies';
import { withBase } from '@/lib/site';

export function generateStaticParams() {
  return articles.map((a) => ({ id: a.id }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const article = articles.find((a) => a.id === params.id);
  if (!article) return { title: 'Article not found' };
  return {
    title: `${article.title} — Volt & Mile`,
    description: article.excerpt,
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ArticlePage({ params }: { params: { id: string } }) {
  const article = articles.find((a) => a.id === params.id);
  if (!article) notFound();

  const body = getArticleBody(article.id);
  const related = freshArticles.filter((a) => a.id !== article.id && a.category === article.category).slice(0, 3);

  return (
    <main>
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 16px' }}>
        <a href={withBase('/articles/')} className="small">← All articles</a>
        <div style={{ margin: '14px 0 6px' }}>
          <span className="pill">{article.category}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: '0 0 12px' }}>{article.title}</h1>
        <div className="article-meta" style={{ marginBottom: 6 }}>
          <span>🗓️ {fmtDate(article.date)}</span>
          <span>⏱️ {article.readMinutes} min read</span>
          <span>👀 {article.views.toLocaleString()} reads this week</span>
        </div>
        <p className="lead muted" style={{ fontSize: '1.15rem', margin: '18px 0 26px' }}>{article.excerpt}</p>

        <div className="article-body">
          {body.length > 0 ? (
            body.map((para, i) =>
              para.startsWith('## ') ? (
                <h2 key={i} style={{ fontSize: '1.35rem', margin: '28px 0 10px' }}>{para.slice(3)}</h2>
              ) : (
                <p key={i} style={{ margin: '0 0 16px', lineHeight: 1.75 }}>{para}</p>
              ),
            )
          ) : (
            <p className="muted">{article.excerpt}</p>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section style={{ borderTop: '1px solid var(--border)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h3 style={{ marginBottom: 14 }}>More on {article.category}</h3>
            <div className="grid" style={{ gap: 12 }}>
              {related.map((a) => (
                <a key={a.id} href={withBase(`/articles/${a.id}/`)} className="article-row" style={{ textDecoration: 'none' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem' }}>{a.title}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: '0.92rem' }}>{a.excerpt}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer>
        <div className="container" style={{ maxWidth: 760 }}>
          <a className="btn ghost" href={withBase('/')}>← Back to the full EV guide</a>
          <p className="disclaimer" style={{ marginTop: 16 }}>
            Educational content only; not professional advice. Figures are approximate and change frequently.
          </p>
        </div>
      </footer>
    </main>
  );
}
