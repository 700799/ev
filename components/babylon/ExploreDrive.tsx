'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { withBase } from '@/lib/site';
import { buildCar, createCarMaterials, type CarConfig } from '@/lib/carBuilder';
import type { BodyType, WheelStyle } from '@/data/configSpecs';

const STORE_KEY = 'ev-build-v1';

// Distinct districts you drive through, each with its own ground + sky palette.
const DISTRICTS = [
  { name: 'Downtown', emoji: '🏙️', ground: [0.07, 0.08, 0.1], sky: [0.05, 0.06, 0.11], build: [0.1, 0.1, 0.15], neon: [0.3, 0.6, 1] },
  { name: 'Neon District', emoji: '🌃', ground: [0.06, 0.05, 0.09], sky: [0.05, 0.03, 0.1], build: [0.12, 0.07, 0.16], neon: [1, 0.2, 0.6] },
  { name: 'Waterfront', emoji: '🌊', ground: [0.04, 0.09, 0.12], sky: [0.05, 0.09, 0.13], build: [0.07, 0.12, 0.16], neon: [0.2, 0.8, 0.9] },
  { name: 'Forest Park', emoji: '🌲', ground: [0.04, 0.12, 0.07], sky: [0.06, 0.1, 0.1], build: [0.06, 0.14, 0.09], neon: [0.4, 0.9, 0.5] },
  { name: 'Desert Highway', emoji: '🏜️', ground: [0.16, 0.12, 0.07], sky: [0.14, 0.1, 0.09], build: [0.18, 0.13, 0.08], neon: [1, 0.7, 0.3] },
  { name: 'Mountain Pass', emoji: '🏔️', ground: [0.1, 0.11, 0.13], sky: [0.08, 0.1, 0.14], build: [0.12, 0.13, 0.16], neon: [0.7, 0.8, 1] },
];

function loadConfig(): CarConfig {
  const fallback: CarConfig = { body: 'suv', paint: '#5aa392', wheel: 'sport', accessories: ['roofrack'] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const o = JSON.parse(raw);
    return {
      body: (o.body as BodyType) || 'suv',
      paint: o.paint || '#5aa392',
      wheel: (o.wheel as WheelStyle) || 'sport',
      accessories: Array.isArray(o.accessories) ? o.accessories : ['roofrack'],
    };
  } catch {
    return fallback;
  }
}

/**
 * Free-roam drive: spawns the car you built in the configurator and lets you
 * cruise an open city, passing through distinct districts (downtown, neon,
 * waterfront, forest, desert, mountains). Steer with arrows / A-D / on-screen
 * buttons; accelerate with up / W / gas button.
 */
export default function ExploreDrive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState(DISTRICTS[0].name);
  const [speedMph, setSpeedMph] = useState(0);

  const ctrl = useRef({ left: false, right: false, gas: false, brake: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    record('feature:explore');

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 60;
    scene.fogEnd = 220;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 8, 16), scene);
    camera.fov = 0.9;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.1), scene);
    hemi.intensity = 0.9;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.4, -1, 0.3), scene);
    sun.intensity = 0.85;
    const glow = new BABYLON.GlowLayer('g', scene);
    glow.intensity = 0.55;

    // Big ground plane (recolored per district).
    const groundMat = new BABYLON.StandardMaterial('gm', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.07, 0.08, 0.1);
    groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 800, height: 800 }, scene);
    ground.material = groundMat;

    // A looping ring road (torus) so you can cruise forever; plus a grid of
    // city blocks scattered around it.
    const roadMat = new BABYLON.StandardMaterial('rm', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.04, 0.045, 0.06);
    roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const road = BABYLON.MeshBuilder.CreateTorus('road', { diameter: 240, thickness: 14, tessellation: 80 }, scene);
    road.material = roadMat;
    road.position.y = 0.05;
    road.scaling.y = 0.02;

    // Buildings/trees scattered in clusters; recolored per district as you pass.
    interface Prop { mesh: BABYLON.Mesh; neon?: BABYLON.StandardMaterial; angle: number; }
    const props: Prop[] = [];
    const propMat = new BABYLON.StandardMaterial('pm', scene);
    propMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.14);
    propMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    const RING_R = 120;
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const side = i % 2 === 0 ? 1 : -1;
      const r = RING_R + side * (24 + Math.random() * 60);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = 6 + Math.random() * 30;
      const w = 5 + Math.random() * 8;
      const b = BABYLON.MeshBuilder.CreateBox('b' + i, { width: w, height: h, depth: w }, scene);
      b.material = propMat;
      b.position.set(x, h / 2, z);
      // Neon sign strip on some buildings.
      let neon: BABYLON.StandardMaterial | undefined;
      if (i % 3 === 0) {
        neon = new BABYLON.StandardMaterial('n' + i, scene);
        neon.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1);
        neon.disableLighting = true;
        const sign = BABYLON.MeshBuilder.CreateBox('s' + i, { width: 0.4, height: h * 0.6, depth: w * 0.5 }, scene);
        sign.material = neon;
        sign.position.set(x - (w / 2) * Math.sign(x || 1), h * 0.5, z);
        sign.parent = b;
        sign.position = new BABYLON.Vector3(-w / 2 - 0.2, 0, 0);
      }
      props.push({ mesh: b, neon, angle });
    }

    // Build the player's saved car.
    const mats = createCarMaterials(scene);
    const cfg = loadConfig();
    const built = buildCar(scene, mats, cfg);
    const carRoot = new BABYLON.TransformNode('carRoot', scene);
    built.node.parent = carRoot;
    // Place the car on the ring road heading tangentially.
    let carAngle = 0; // position around the ring
    let heading = 0; // facing direction (radians)
    let speed = 0; // m/s

    // Underglow pulse if present.
    const ug = built.underglow?.material as BABYLON.StandardMaterial | undefined;

    const applyDistrict = (d: typeof DISTRICTS[number]) => {
      scene.clearColor = new BABYLON.Color4(d.sky[0], d.sky[1], d.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(d.sky[0], d.sky[1], d.sky[2]);
      groundMat.diffuseColor = new BABYLON.Color3(d.ground[0], d.ground[1], d.ground[2]);
      propMat.diffuseColor = new BABYLON.Color3(d.build[0], d.build[1], d.build[2]);
      for (const p of props) if (p.neon) p.neon.emissiveColor = new BABYLON.Color3(d.neon[0], d.neon[1], d.neon[2]);
    };
    applyDistrict(DISTRICTS[0]);
    let curDistrict = 0;

    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      t += dt;
      const c = ctrl.current;

      // Simple arcade driving: gas accelerates, friction decays, steering turns.
      const accel = c.gas ? 26 : c.brake ? -34 : -6;
      speed = Math.max(0, Math.min(60, speed + accel * dt));
      const steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
      heading += steer * dt * (0.6 + speed * 0.02) * (speed > 0.5 ? 1 : 0);

      // Move the car root in its heading.
      carRoot.position.x += Math.sin(heading) * speed * dt;
      carRoot.position.z += Math.cos(heading) * speed * dt;
      carRoot.rotation.y = heading;
      built.node.rotation.z = -steer * 0.05 * Math.min(1, speed / 20); // body roll

      // Spin wheels with speed.
      for (const w of built.wheelMeshes) w.rotation.x += speed * dt * 0.5;
      if (ug) ug.alpha = 0.6 + Math.sin(t * 4) * 0.25;

      // Chase camera.
      const camDist = 16, camHeight = 8;
      const targetCam = new BABYLON.Vector3(
        carRoot.position.x - Math.sin(heading) * camDist,
        carRoot.position.y + camHeight,
        carRoot.position.z - Math.cos(heading) * camDist,
      );
      camera.position = BABYLON.Vector3.Lerp(camera.position, targetCam, Math.min(1, dt * 3));
      camera.setTarget(new BABYLON.Vector3(carRoot.position.x, 1.5, carRoot.position.z));

      // District changes based on which quadrant of the map you're in.
      const ang = (Math.atan2(carRoot.position.z, carRoot.position.x) + Math.PI * 2) % (Math.PI * 2);
      const idx = Math.floor((ang / (Math.PI * 2)) * DISTRICTS.length) % DISTRICTS.length;
      if (idx !== curDistrict) {
        curDistrict = idx;
        applyDistrict(DISTRICTS[idx]);
        setDistrict(DISTRICTS[idx].name);
      }

      if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) setSpeedMph(Math.round(speed * 2.237));
    });

    engine.runRenderLoop(() => scene.render());

    const setKey = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { ctrl.current.left = on; e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { ctrl.current.right = on; e.preventDefault(); }
      else if (k === 'arrowup' || k === 'w') { ctrl.current.gas = on; e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { ctrl.current.brake = on; e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => setKey(e, true);
    const ku = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    setReady(true);

    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold-to-press helpers for touch controls.
  const hold = (key: 'left' | 'right' | 'gas' | 'brake') => ({
    onPointerDown: () => { ctrl.current[key] = true; },
    onPointerUp: () => { ctrl.current[key] = false; },
    onPointerLeave: () => { ctrl.current[key] = false; },
  });

  return (
    <div className="canvas-frame" style={{ minHeight: 480 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '480px', display: 'block', touchAction: 'none' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your city…</span>
        </div>
      )}

      {/* Top HUD: district + speed */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 12, pointerEvents: 'none' }}>
        <div style={hudBox}><span className="small muted">District</span><div style={{ fontWeight: 800 }}>{DISTRICTS.find((d) => d.name === district)?.emoji} {district}</div></div>
        <div style={hudBox}><span className="small muted">Speed</span><div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>{speedMph} mph</div></div>
      </div>

      {/* Driving controls */}
      <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ctrlBtn} {...hold('left')} aria-label="Steer left">‹</button>
          <button style={ctrlBtn} {...hold('right')} aria-label="Steer right">›</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...ctrlBtn, fontSize: '1rem' }} {...hold('brake')} aria-label="Brake">BRAKE</button>
          <button style={{ ...ctrlBtn, background: 'var(--accent)', color: '#06140f', fontSize: '1rem' }} {...hold('gas')} aria-label="Accelerate">GO</button>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 12, bottom: 90, pointerEvents: 'none' }} className="small muted">
        Drive: ← → / A D to steer · ↑ / W to go · explore all {DISTRICTS.length} districts!
      </div>

      <a className="btn ghost" href={withBase('/build/')} style={{ position: 'absolute', left: 12, top: 64, padding: '6px 12px' }}>← Edit build</a>
    </div>
  );
}

const hudBox: React.CSSProperties = {
  background: 'rgba(10,14,20,0.72)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '6px 12px',
};
const ctrlBtn: React.CSSProperties = {
  width: 70,
  height: 64,
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'rgba(19,28,43,0.85)',
  color: 'var(--text)',
  fontSize: '2rem',
  fontWeight: 800,
  cursor: 'pointer',
  touchAction: 'none',
};
