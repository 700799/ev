'use client';

import dynamic from 'next/dynamic';

const TripPlanner = dynamic(() => import('./TripPlanner'), {
  ssr: false,
  loading: () => (
    <div className="map" style={{ display: 'grid', placeItems: 'center' }}>
      <span className="spinner" />
    </div>
  ),
});

export default function TripPlannerClient() {
  return <TripPlanner />;
}
