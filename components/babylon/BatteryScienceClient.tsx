'use client';

import dynamic from 'next/dynamic';

const BatteryScience = dynamic(() => import('./BatteryScience'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center' }}>
      <span className="spinner" />
    </div>
  ),
});

export default function BatteryScienceClient() {
  return <BatteryScience />;
}
