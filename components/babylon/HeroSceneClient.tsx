'use client';

import dynamic from 'next/dynamic';

const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center' }}>
      <span className="spinner" />
    </div>
  ),
});

export default function HeroSceneClient() {
  return <HeroScene />;
}
