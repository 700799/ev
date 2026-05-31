'use client';

import dynamic from 'next/dynamic';

const ScienceLab = dynamic(() => import('./ScienceLab'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
      <span className="spinner" />
    </div>
  ),
});

export default function ScienceLabClient() {
  return <ScienceLab />;
}
