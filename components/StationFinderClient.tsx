'use client';

import dynamic from 'next/dynamic';

const StationFinder = dynamic(() => import('./StationFinder'), {
  ssr: false,
  loading: () => (
    <div className="map" style={{ display: 'grid', placeItems: 'center' }}>
      <span className="spinner" />
    </div>
  ),
});

export default function StationFinderClient() {
  return <StationFinder />;
}
