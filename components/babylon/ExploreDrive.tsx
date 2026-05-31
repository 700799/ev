'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { withBase } from '@/lib/site';
import { buildCar, createCarMaterials, type CarConfig } from '@/lib/carBuilder';
import type { BodyType, WheelStyle } from '@/data/configSpecs';

const STORE_KEY = 'ev-build-v1';
const LANES = [-3.4, 0, 3.4];
const ROAD_LEN = 90;

// Distinct districts you auto-drive through; each restyles ground/sky/buildings.
const DISTRICTS = [
  { name: 'Downtown', emoji: '🏙️', ground: [0.07, 0.08, 0.1], sky: [0.05, 0.06, 0.12], bld: [0.1, 0.11, 0.16], neon: [0.3, 0.6, 1] },
  { name: 'Neon District', emoji: '🌃', ground: [0.06, 0.05, 0.09], sky: [0.05, 0.03, 0.11], bld: [0.13, 0.07, 0.17], neon: [1, 0.2, 0.6] },
  { name: 'Waterfront', emoji: '🌊', ground: [0.04, 0.09, 0.13], sky: [0.05, 0.1, 0.15], bld: [0.07, 0.13, 0.17], neon: [0.2, 0.85, 0.95] },
  { name: 'Forest Park', emoji: '🌲', ground: [0.04, 0.13, 0.07], sky: [0.06, 0.11, 0.1], bld: [0.06, 0.16, 0.09], neon: [0.4, 0.95, 0.5] },
  { name: 'Desert Highway', emoji: '🏜️', ground: [0.18, 0.13, 0.07], sky: [0.16, 0.11, 0.09], bld: [0.2, 0.14, 0.08], neon: [1, 0.7, 0.3] },
  { name: 'Mountain Pass', emoji: '🏔️', ground: [0.1, 0.12, 0.14], sky: [0.08, 0.11, 0.16], bld: [0.13, 0.15, 0.18], neon: [0.75, 0.85, 1] },
];
const DISTRICT_LEN = 600; // world units before switching district

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
  } catch { return fallback; }
}

/**
 * Auto-cruise: the car you built drives forward on its own through an endless,
 * dense city that flows past fast. You steer between lanes and can boost; the
 * scenery (ground, sky, neon buildings, roadside props) restyles as you pass
 * through six districts. Distance covered is shown live.
 */
export default function ExploreDrive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState(DISTRICTS[0].name);
  const [speedMph, setSpeedMph] = useState(0);
  const [miles, setMiles] = useState(0);

  const ctrl = useRef({ left: false, right: false, boost: false, brake: false, lane: 1, targetX: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    record('feature:explore');

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.06, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 50; scene.fogEnd = 150;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.5, -14));
    const baseFov = camera.fov;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.1), scene); hemi.intensity = 0.9;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.4, -1, 0.3), scene); sun.intensity = 0.85;
    const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;

    // Ground + scrolling road tiles (endless).
    const groundMat = new BABYLON.StandardMaterial('gm', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.07, 0.08, 0.1); groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 120, height: 400 }, scene);
    ground.material = groundMat; ground.position.z = -120;

    const roadMat = new BABYLON.StandardMaterial('rm', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.05, 0.055, 0.07); roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const roadTiles: BABYLON.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const r = BABYLON.MeshBuilder.CreateGround('road' + i, { width: 13, height: ROAD_LEN }, scene);
      r.material = roadMat; r.position.set(0, 0.02, -i * ROAD_LEN); roadTiles.push(r);
    }
    const markMat = new BABYLON.StandardMaterial('mk', scene);
    markMat.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.4); markMat.disableLighting = true;
    const marks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const m = BABYLON.MeshBuilder.CreateBox('mk' + i, { width: 0.2, height: 0.02, depth: 1.6 }, scene);
      m.material = markMat; m.position.set(i % 2 ? 1.7 : -1.7, 0.04, -i * 4); marks.push(m);
    }

    // Dense roadside buildings (two deep rows per side), recycled as they pass.
    const bldMat = new BABYLON.StandardMaterial('bm', scene);
    bldMat.diffuseColor = new BABYLON.Color3(0.1, 0.11, 0.16); bldMat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.05);
    interface Prop { mesh: BABYLON.Mesh; neon?: BABYLON.StandardMaterial; }
    const props: Prop[] = [];
    const SPAN = 64; // total z length the building field wraps over
    const COUNT = 56;
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const depthRow = (i % 4) < 2 ? 0 : 1;
      const h = 7 + Math.random() * 26;
      const w = 4 + Math.random() * 5;
      const b = BABYLON.MeshBuilder.CreateBox('b' + i, { width: w, height: h, depth: w }, scene);
      b.material = bldMat;
      const x = side * (9 + depthRow * 9 + Math.random() * 4);
      const z = -((i / 2) | 0) * (SPAN / (COUNT / 2)) - 4;
      b.position.set(x, h / 2, z);
      let neon: BABYLON.StandardMaterial | undefined;
      if (i % 2 === 0) {
        neon = new BABYLON.StandardMaterial('n' + i, scene);
        neon.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1); neon.disableLighting = true;
        const sign = BABYLON.MeshBuilder.CreateBox('s' + i, { width: 0.3, height: h * 0.6, depth: w * 0.5 }, scene);
        sign.material = neon; sign.parent = b; sign.position = new BABYLON.Vector3(-side * (w / 2 + 0.15), 0, 0);
      }
      props.push({ mesh: b, neon });
    }

    // Build the player's saved car.
    const mats = createCarMaterials(scene);
    const cfg = loadConfig();
    const built = buildCar(scene, mats, cfg);
    built.node.position.set(0, 0, 0);
    const ug = built.underglow?.material as BABYLON.StandardMaterial | undefined;

    const applyDistrict = (d: typeof DISTRICTS[number]) => {
      scene.clearColor = new BABYLON.Color4(d.sky[0], d.sky[1], d.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(d.sky[0], d.sky[1], d.sky[2]);
      groundMat.diffuseColor = new BABYLON.Color3(d.ground[0], d.ground[1], d.ground[2]);
      bldMat.diffuseColor = new BABYLON.Color3(d.bld[0], d.bld[1], d.bld[2]);
      for (const p of props) if (p.neon) p.neon.emissiveColor = new BABYLON.Color3(d.neon[0], d.neon[1], d.neon[2]);
    };
    applyDistrict(DISTRICTS[0]);
    let distance = 0; let curDistrict = -1;

    let speed = 24; // m/s, auto-drives forward
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const c = ctrl.current;

      // Auto-cruise: always rolling. Boost/brake nudge it; healthy minimum so it never feels stuck.
      const target = c.boost ? 64 : c.brake ? 10 : 38;
      speed += (target - speed) * Math.min(1, dt * 1.5);
      distance += speed * dt;

      // Scroll the world toward the camera.
      for (const r of roadTiles) { r.position.z += speed * dt; if (r.position.z > ROAD_LEN) r.position.z -= ROAD_LEN * 3; }
      for (const m of marks) { m.position.z += speed * dt; if (m.position.z > 10) m.position.z -= 240; }
      for (const p of props) { p.mesh.position.z += speed * dt; if (p.mesh.position.z > 14) p.mesh.position.z -= SPAN; }

      // Steering between lanes (arrows already match the view here).
      const car = built.node;
      car.position.x += (c.targetX - car.position.x) * Math.min(1, dt * 8);
      car.rotation.z = (car.position.x - c.targetX) * 0.1;
      car.rotation.y = (c.targetX - car.position.x) * 0.05;
      for (const w of built.wheelMeshes) w.rotation.x += speed * dt * 0.5;
      if (ug) ug.alpha = 0.6 + Math.sin(performance.now() / 250) * 0.25;

      // Chase cam with subtle boost pull-in + FOV.
      const camZ = c.boost ? 9.5 : 12;
      camera.position.x += (car.position.x * 0.5 - camera.position.x) * Math.min(1, dt * 4);
      camera.position.z += (camZ - camera.position.z) * Math.min(1, dt * 3);
      camera.fov += ((c.boost ? baseFov * 1.2 : baseFov) - camera.fov) * Math.min(1, dt * 4);
      camera.setTarget(new BABYLON.Vector3(car.position.x * 0.4, 1.5, -14));

      // District changes by distance traveled.
      const idx = Math.floor(distance / DISTRICT_LEN) % DISTRICTS.length;
      if (idx !== curDistrict) { curDistrict = idx; applyDistrict(DISTRICTS[idx]); setDistrict(DISTRICTS[idx].name); }

      if (Math.floor(performance.now() / 150) % 2 === 0) {
        setSpeedMph(Math.round(speed * 2.237));
        setMiles(Number((distance / 1609.34).toFixed(2)));
      }
    });

    engine.runRenderLoop(() => scene.render());

    const setKey = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { if (on && !ctrl.current.left) step(-1); ctrl.current.left = on; e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { if (on && !ctrl.current.right) step(1); ctrl.current.right = on; e.preventDefault(); }
      else if (k === 'arrowup' || k === 'w') { ctrl.current.boost = on; e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { ctrl.current.brake = on; e.preventDefault(); }
    };
    const step = (dir: number) => {
      ctrl.current.lane = Math.max(0, Math.min(2, ctrl.current.lane + dir));
      ctrl.current.targetX = LANES[ctrl.current.lane];
      try { navigator.vibrate?.(8); } catch { /* ignore */ }
    };
    const kd = (e: KeyboardEvent) => setKey(e, true);
    const ku = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    stepRef.current = step;
    setReady(true);

    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize);
      scene.dispose(); engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepRef = useRef<(d: number) => void>(() => {});
  const press = (key: 'boost' | 'brake', on: boolean) => () => { ctrl.current[key] = on; };

  return (
    <div className="canvas-frame" style={{ minHeight: 480 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '480px', display: 'block', touchAction: 'none' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your city…</span>
        </div>
      )}

      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 10, pointerEvents: 'none' }}>
        <div style={hudBox}><span className="small muted">District</span><div style={{ fontWeight: 800 }}>{DISTRICTS.find((d) => d.name === district)?.emoji} {district}</div></div>
        <div style={hudBox}><span className="small muted">Miles</span><div style={{ fontWeight: 800, color: 'var(--accent-2)' }}>{miles}</div></div>
        <div style={hudBox}><span className="small muted">Speed</span><div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>{speedMph} mph</div></div>
      </div>

      <a className="btn ghost" href={withBase('/build/')} style={{ position: 'absolute', left: 12, top: 70, padding: '6px 12px' }}>← Edit build</a>

      {/* Auto-driving: steer + boost/brake. */}
      <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ctrlBtn} onClick={() => stepRef.current(-1)} aria-label="Move left">‹</button>
          <button style={ctrlBtn} onClick={() => stepRef.current(1)} aria-label="Move right">›</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...ctrlBtn, fontSize: '0.95rem' }} onPointerDown={press('brake', true)} onPointerUp={press('brake', false)} onPointerLeave={press('brake', false)} aria-label="Brake">BRAKE</button>
          <button style={{ ...ctrlBtn, background: 'var(--accent)', color: '#06140f', fontSize: '0.95rem' }} onPointerDown={press('boost', true)} onPointerUp={press('boost', false)} onPointerLeave={press('boost', false)} aria-label="Boost">BOOST</button>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 12, bottom: 92, pointerEvents: 'none' }} className="small muted">
        Auto-driving — steer ‹ › / A D · hold BOOST · explore all 6 districts!
      </div>
    </div>
  );
}

const hudBox: React.CSSProperties = { background: 'rgba(10,14,20,0.72)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px' };
const ctrlBtn: React.CSSProperties = { width: 70, height: 64, borderRadius: 16, border: '1px solid var(--border)', background: 'rgba(19,28,43,0.85)', color: 'var(--text)', fontSize: '2rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
