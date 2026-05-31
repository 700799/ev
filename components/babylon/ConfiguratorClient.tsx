'use client';

import dynamic from 'next/dynamic';

const Configurator = dynamic(() => import('./Configurator'), {
  ssr: false,
  loading: () => (
    <div className="canvas-frame" style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
      <span className="spinner" />
    </div>
  ),
});

export default function ConfiguratorClient() {
  return <Configurator />;
}
