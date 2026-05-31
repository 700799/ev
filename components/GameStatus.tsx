'use client';

import { withBase } from '@/lib/site';
import { useGame } from './GameProvider';

/** Always-visible compact level/XP chip (bottom-left). Links to the badge shelf. */
export default function GameStatus() {
  const { level, xp, earned, badges } = useGame();
  const pct = level.isMax ? 100 : Math.round((level.current / level.span) * 100);

  return (
    <a className="game-chip" href={withBase('/#badges')} title="Your EV learning progress">
      <span className="game-chip-trophy">🏆</span>
      <span className="game-chip-body">
        <span className="game-chip-top">
          Lv {level.level} · {xp} XP
          <span className="muted small"> · {earned.size}/{badges.length}</span>
        </span>
        <span className="game-chip-bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      </span>
    </a>
  );
}
