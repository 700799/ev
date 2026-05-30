import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import ArticleList from '@/components/ArticleList';
import { popularArticles, freshArticles } from '@/data/articles';
import { withBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'EV Articles — Trending & Fresh',
  description: 'Browse the most popular EV articles of the week and the freshest new stories.',
};

export default function ArticlesPage() {
  return (
    <main>
      <Section
        id="popular"
        kicker="Trending"
        title="Most popular this week"
        intro="The most-read articles over the last 7 days, ranked and paginated."
      >
        <ArticleList articles={popularArticles} pageSize={6} ranked />
      </Section>

      <Section
        id="fresh"
        kicker="Just published"
        title="Fresh articles"
        intro="Our newest stories, in reverse-chronological order."
      >
        <ArticleList articles={freshArticles} pageSize={6} />
        <div className="note" style={{ marginTop: 16 }}>
          ← Back to the <a href={withBase('/')}>full EV ownership guide</a>.
        </div>
      </Section>
    </main>
  );
}
