'use client';

import dynamic from 'next/dynamic';

const DriveGame = dynamic(() => import('./DriveGame'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center', minHeight: 460 }}>
      <span className="spinner" />
    </div>
  ),
});

export default function DriveGameClient() {
  return <DriveGame />;
}
