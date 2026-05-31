'use client';

import { useGame } from './GameProvider';
import { TOTAL_XP } from '@/lib/gamification';
import Carousel from './Carousel';

export default function BadgeShelf() {
  const { badges, earned, xp, level, reset } = useGame();
  const earnedCount = earned.size;
  const pct = level.isMax ? 100 : Math.round((level.current / level.span) * 100);
  // Earned badges first so progress is visible without a long scroll.
  const ordered = [...badges].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)));

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div>
            <div className="num">LEVEL {level.level}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{level.title}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="result-strong">{xp} XP</div>
            <div className="muted small">{earnedCount}/{badges.length} badges · {TOTAL_XP} XP total</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s ease' }} />
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>
            {level.isMax ? 'Max level reached — you’re an EV Guru! 🎉' : `${level.toNext} XP to the next level`}
          </div>
        </div>
      </div>

      <Carousel itemMinWidth={170}>
        {ordered.map((b) => {
          const has = earned.has(b.id);
          return (
            <div
              key={b.id}
              className="card"
              style={{
                textAlign: 'center',
                padding: 14,
                opacity: has ? 1 : 0.55,
                borderColor: has ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div style={{ fontSize: '1.8rem', filter: has ? 'none' : 'grayscale(1)' }}>{has ? b.icon : '🔒'}</div>
              <h3 style={{ fontSize: '0.92rem', margin: '6px 0 4px' }}>{b.name}</h3>
              <p className="small" style={{ margin: 0 }}>{b.desc}</p>
              <div className="pill" style={{ marginTop: 8, color: has ? 'var(--accent)' : 'var(--muted)', borderColor: 'currentColor' }}>
                {has ? `Earned · +${b.xp} XP` : `+${b.xp} XP`}
              </div>
            </div>
          );
        })}
      </Carousel>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button className="btn ghost" onClick={reset}>Reset progress</button>
      </div>
    </div>
  );
}
