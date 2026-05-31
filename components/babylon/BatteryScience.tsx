'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';

type Mode = 'charge' | 'discharge';

/**
 * Interactive lithium-ion cell. Spheres (Li+ ions) migrate from cathode to
 * anode while charging and back while discharging. Toggle the mode and drag to
 * orbit the cell. A real-time, game-engine driven illustration of the science.
 */
export default function BatteryScience() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<Mode>('charge');
  const [mode, setMode] = useState<Mode>('charge');
  const [ready, setReady] = useState(false);
  const { record } = useGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.11, 1);

    const camera = new BABYLON.ArcRotateCamera('c', -Math.PI / 2, Math.PI / 2.4, 16, BABYLON.Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 26;
    camera.attachControl(canvas, true);
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.12;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.8;
    const glow = new BABYLON.GlowLayer('g', scene);
    glow.intensity = 0.4;

    // Electrodes.
    const makeElectrode = (x: number, color: BABYLON.Color3, label: string) => {
      const e = BABYLON.MeshBuilder.CreateBox(label, { width: 1.4, height: 7, depth: 5 }, scene);
      e.position.x = x;
      const m = new BABYLON.StandardMaterial(label + 'm', scene);
      m.diffuseColor = color;
      m.emissiveColor = color.scale(0.25);
      e.material = m;
      return e;
    };
    makeElectrode(-6, new BABYLON.Color3(0.85, 0.45, 0.15), 'cathode'); // cathode (right=+ during discharge)
    makeElectrode(6, new BABYLON.Color3(0.3, 0.55, 0.9), 'anode'); // anode

    // Separator / electrolyte region (semi-transparent slab).
    const sep = BABYLON.MeshBuilder.CreateBox('sep', { width: 10, height: 6.6, depth: 4.6 }, scene);
    const sepMat = new BABYLON.StandardMaterial('sepm', scene);
    sepMat.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.3);
    sepMat.alpha = 0.12;
    sep.material = sepMat;

    // Lithium ions.
    const ionMat = new BABYLON.StandardMaterial('ion', scene);
    ionMat.emissiveColor = new BABYLON.Color3(0.12, 0.5, 0.42);
    ionMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.34);

    const ionCount = 34;
    const ions: { mesh: BABYLON.Mesh; phase: number; y: number; z: number; speed: number }[] = [];
    for (let i = 0; i < ionCount; i++) {
      const s = BABYLON.MeshBuilder.CreateSphere('ion' + i, { diameter: 0.55, segments: 10 }, scene);
      s.material = ionMat;
      const phase = Math.random();
      const y = (Math.random() - 0.5) * 5.5;
      const z = (Math.random() - 0.5) * 3.6;
      const speed = 0.12 + Math.random() * 0.12;
      s.position.set((phase - 0.5) * 11, y, z);
      ions.push({ mesh: s, phase, y, z, speed });
    }

    // Electron flow arc (visual "wire") above the cell.
    const wire = BABYLON.MeshBuilder.CreateTorus('wire', { diameter: 13, thickness: 0.12, tessellation: 48 }, scene);
    wire.position.y = 5.5;
    wire.rotation.x = Math.PI / 2;
    wire.scaling.y = 0.45;
    const wireMat = new BABYLON.StandardMaterial('wirem', scene);
    wireMat.emissiveColor = new BABYLON.Color3(0.14, 0.38, 0.58);
    wireMat.disableLighting = true;
    wire.material = wireMat;

    scene.onBeforeRenderObservable.add(() => {
      const dir = modeRef.current === 'charge' ? 1 : -1; // charge: cathode(-6) -> anode(+6)
      const dt = engine.getDeltaTime() / 1000;
      ions.forEach((ion) => {
        ion.phase += dir * ion.speed * dt;
        if (ion.phase > 1) ion.phase -= 1;
        if (ion.phase < 0) ion.phase += 1;
        ion.mesh.position.x = (ion.phase - 0.5) * 11;
        ion.mesh.position.y = ion.y + Math.sin(performance.now() / 600 + ion.phase * 6) * 0.25;
      });
    });

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    setReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  const toggle = () => {
    const next: Mode = mode === 'charge' ? 'discharge' : 'charge';
    setMode(next);
    modeRef.current = next;
    record('3d:science');
  };

  return (
    <div className="canvas-frame" style={{ minHeight: 320 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '320px', display: 'block', touchAction: 'none' }} />
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span className="spinner" />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          background: 'rgba(10,14,20,0.72)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: '0.82rem',
        }}
      >
        <div>
          <span style={{ color: '#d97a2a', fontWeight: 700 }}>● Cathode</span>{' '}
          <span className="muted">←→</span>{' '}
          <span style={{ color: '#4c8bdd', fontWeight: 700 }}>Anode ●</span>
        </div>
        <div className="muted">Li⁺ moving toward {mode === 'charge' ? 'anode (charging)' : 'cathode (driving)'}</div>
      </div>
      <button
        className="btn primary"
        style={{ position: 'absolute', right: 12, top: 12, padding: '8px 14px', fontSize: '0.85rem' }}
        onClick={toggle}
      >
        {mode === 'charge' ? '⚡ Charging — switch to Driving' : '🚗 Driving — switch to Charging'}
      </button>
    </div>
  );
}
