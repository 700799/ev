'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BADGES, levelInfo, type Badge, type LevelInfo } from '@/lib/gamification';

const STORAGE_KEY = 'ev-game-v1';

interface GameContextValue {
  events: Set<string>;
  record: (event: string) => void;
  earned: Set<string>;
  xp: number;
  level: LevelInfo;
  badges: Badge[];
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface Toast {
  id: number;
  badge: Badge;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hydrated = useRef(false);
  const toastId = useRef(0);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const set = new Set(arr);
      const earnedSet = new Set(BADGES.filter((b) => b.check(set)).map((b) => b.id));
      setEvents(set);
      setEarned(earnedSet);
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, []);

  const record = useCallback((event: string) => {
    setEvents((prev) => {
      if (prev.has(event)) return prev;
      const next = new Set(prev);
      next.add(event);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      // Recompute badges; toast any newly earned.
      setEarned((prevEarned) => {
        const nextEarned = new Set(prevEarned);
        for (const b of BADGES) {
          if (!nextEarned.has(b.id) && b.check(next)) {
            nextEarned.add(b.id);
            // Flash a single, brief, centered toast (replaces any prior one) so
            // earned badges don't pile up over the content.
            const t = { id: ++toastId.current, badge: b };
            setToasts([t]);
            setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 1400);
          }
        }
        return nextEarned;
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setEvents(new Set());
    setEarned(new Set());
    setToasts([]);
  }, []);

  const xp = useMemo(
    () => BADGES.filter((b) => earned.has(b.id)).reduce((s, b) => s + b.xp, 0),
    [earned],
  );
  const level = useMemo(() => levelInfo(xp), [xp]);

  const value = useMemo<GameContextValue>(
    () => ({ events, record, earned, xp, level, badges: BADGES, reset }),
    [events, record, earned, xp, level, reset],
  );

  return (
    <GameContext.Provider value={value}>
      {children}
      <div className="toast-flash-layer" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-flash" role="status">
            <span className="toast-flash-icon">{t.badge.icon}</span>
            <div>
              <div className="toast-flash-title">Badge unlocked!</div>
              <div className="toast-flash-name">
                {t.badge.name} <span className="muted small">+{t.badge.xp} XP</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  // Safe no-op fallback so components never crash if rendered outside provider.
  if (!ctx) {
    return {
      events: new Set<string>(),
      record: () => {},
      earned: new Set<string>(),
      xp: 0,
      level: levelInfo(0),
      badges: BADGES,
      reset: () => {},
    } as GameContextValue;
  }
  return ctx;
}
