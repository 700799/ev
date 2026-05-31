'use client';

import { useEffect } from 'react';
import { useGame } from './GameProvider';

export default function ArticleReadTracker({ id }: { id: string }) {
  const { record } = useGame();
  useEffect(() => {
    record(`article:${id}`);
  }, [record, id]);
  return null;
}
