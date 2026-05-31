'use client';

import dynamic from 'next/dynamic';

const ExploreDrive = dynamic(() => import('./ExploreDrive'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center', minHeight: 480 }}>
      <span className="spinner" />
    </div>
  ),
});

export default function ExploreDriveClient() {
  return <ExploreDrive />;
}
