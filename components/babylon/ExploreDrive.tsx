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
const DISTRICT_LEN = 700;

const DISTRICTS = [
  { name: 'Downtown', emoji: '🏙️', ground: [0.07, 0.08, 0.1], sky: [0.05, 0.06, 0.12], bld: [0.1, 0.11, 0.16], neon: [0.3, 0.6, 1] },
  { name: 'Neon District', emoji: '🌃', ground: [0.06, 0.05, 0.09], sky: [0.05, 0.03, 0.11], bld: [0.13, 0.07, 0.17], neon: [1, 0.2, 0.6] },
  { name: 'Waterfront', emoji: '🌊', ground: [0.04, 0.09, 0.13], sky: [0.05, 0.1, 0.15], bld: [0.07, 0.13, 0.17], neon: [0.2, 0.85, 0.95] },
  { name: 'Forest Park', emoji: '🌲', ground: [0.04, 0.13, 0.07], sky: [0.06, 0.11, 0.1], bld: [0.06, 0.16, 0.09], neon: [0.4, 0.95, 0.5] },
  { name: 'Desert Highway', emoji: '🏜️', ground: [0.18, 0.13, 0.07], sky: [0.16, 0.11, 0.09], bld: [0.2, 0.14, 0.08], neon: [1, 0.7, 0.3] },
  { name: 'Mountain Pass', emoji: '🏔️', ground: [0.1, 0.12, 0.14], sky: [0.08, 0.11, 0.16], bld: [0.13, 0.15, 0.18], neon: [0.75, 0.85, 1] },
];

type Kind = 'cone' | 'barrier' | 'car' | 'coin' | 'charge';
interface Ent { mesh: BABYLON.TransformNode; kind: Kind; lane: number; z: number; hit?: boolean; spin?: number; }

function haptic(p: number | number[]) { try { navigator.vibrate?.(p); } catch { /* ignore */ } }

function loadConfig(): CarConfig {
  const fb: CarConfig = { body: 'suv', paint: '#5aa392', wheel: 'sport', accessories: ['roofrack'] };
  try {
    const raw = localStorage.getItem(STORE_KEY); if (!raw) return fb;
    const o = JSON.parse(raw);
    return { body: (o.body as BodyType) || 'suv', paint: o.paint || '#5aa392', wheel: (o.wheel as WheelStyle) || 'sport', accessories: Array.isArray(o.accessories) ? o.accessories : ['roofrack'] };
  } catch { return fb; }
}

/**
 * Explore drive with challenge: the car auto-cruises a winding road that bends
 * left and right (pseudo-3D curvature), with obstacles to dodge (cones,
 * barriers, traffic), coins + charge to collect, and a battery you must keep
 * alive. Hitting things costs battery and spins you; running flat ends the run.
 */
export default function ExploreDrive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState(DISTRICTS[0].name);
  const [speedMph, setSpeedMph] = useState(0);
  const [miles, setMiles] = useState(0);
  const [coins, setCoins] = useState(0);
  const [battery, setBattery] = useState(100);
  const [driftPct, setDriftPct] = useState(0);
  const [passed, setPassed] = useState(0);
  const [over, setOver] = useState(false);

  const ctrl = useRef({ boost: false, brake: false, drift: false, lane: 1, targetX: 0 });
  const stepRef = useRef<(d: number) => void>(() => {});
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    record('feature:explore');

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.06, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR; scene.fogStart = 55; scene.fogEnd = 170;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    const baseFov = camera.fov;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.1), scene); hemi.intensity = 0.9;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.4, -1, 0.3), scene); sun.intensity = 0.85;
    const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;

    // Curvature: a value that slowly drifts so the road snakes. Each object's
    // apparent X is offset by curve * depth² — classic pseudo-3D bend.
    const bendOf = (z: number) => curve * z * z * 0.0016 + drift * -z * 0.04;
    let curve = 0, curveTarget = 0, curveTimer = 0, drift = 0;

    const groundMat = new BABYLON.StandardMaterial('gm', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.07, 0.08, 0.1); groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 240, height: 500 }, scene);
    ground.material = groundMat; ground.position.z = -150;

    const roadMat = new BABYLON.StandardMaterial('rm', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.05, 0.055, 0.07); roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    // Many short road segments so the strip can bend smoothly.
    const segs: BABYLON.Mesh[] = [];
    const SEG = 6, SEG_COUNT = 26;
    for (let i = 0; i < SEG_COUNT; i++) {
      const s = BABYLON.MeshBuilder.CreateGround('rs' + i, { width: 13, height: SEG }, scene);
      s.material = roadMat; s.position.z = -i * SEG; segs.push(s);
    }
    const markMat = new BABYLON.StandardMaterial('mk', scene);
    markMat.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.4); markMat.disableLighting = true;
    const marks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 70; i++) {
      const m = BABYLON.MeshBuilder.CreateBox('mk' + i, { width: 0.2, height: 0.02, depth: 1.6 }, scene);
      m.material = markMat; (m as any)._lane = i % 2 ? 1.7 : -1.7; m.position.z = -i * 3.5; marks.push(m);
    }

    const bldMat = new BABYLON.StandardMaterial('bm', scene);
    bldMat.diffuseColor = new BABYLON.Color3(0.1, 0.11, 0.16); bldMat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.05);
    interface Prop { mesh: BABYLON.Mesh; neon?: BABYLON.StandardMaterial; baseX: number; }
    const props: Prop[] = [];
    const SPAN = 70, PCOUNT = 60;
    for (let i = 0; i < PCOUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const depthRow = (i % 4) < 2 ? 0 : 1;
      const h = 7 + Math.random() * 26, w = 4 + Math.random() * 5;
      const b = BABYLON.MeshBuilder.CreateBox('b' + i, { width: w, height: h, depth: w }, scene);
      b.material = bldMat;
      const baseX = side * (9 + depthRow * 9 + Math.random() * 4);
      b.position.set(baseX, h / 2, -((i / 2) | 0) * (SPAN / (PCOUNT / 2)) - 4);
      let neon: BABYLON.StandardMaterial | undefined;
      if (i % 2 === 0) {
        neon = new BABYLON.StandardMaterial('n' + i, scene);
        neon.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1); neon.disableLighting = true;
        const sign = BABYLON.MeshBuilder.CreateBox('s' + i, { width: 0.3, height: h * 0.6, depth: w * 0.5 }, scene);
        sign.material = neon; sign.parent = b; sign.position = new BABYLON.Vector3(-side * (w / 2 + 0.15), 0, 0);
      }
      props.push({ mesh: b, neon, baseX });
    }

    // Obstacle/collectible materials + factories.
    const mk = (c: BABYLON.Color3, em?: BABYLON.Color3, noLight = false) => { const m = new BABYLON.StandardMaterial('m' + Math.random(), scene); m.diffuseColor = c; if (em) m.emissiveColor = em; if (noLight) m.disableLighting = true; return m; };
    const orange = mk(new BABYLON.Color3(0.85, 0.35, 0.05), new BABYLON.Color3(0.25, 0.08, 0));
    const white = mk(new BABYLON.Color3(0.95, 0.95, 0.95));
    const dark = mk(new BABYLON.Color3(0.06, 0.06, 0.08));
    const trafficMat = mk(new BABYLON.Color3(0.7, 0.2, 0.25));
    const coinMat = mk(new BABYLON.Color3(0.9, 0.75, 0.1), new BABYLON.Color3(0.8, 0.6, 0.05), true);
    const chgMat = mk(new BABYLON.Color3(0.1, 0.5, 0.4), new BABYLON.Color3(0.15, 0.85, 0.6), true);
    const tireMat = mk(new BABYLON.Color3(0.02, 0.02, 0.03));
    const glassMat = mk(new BABYLON.Color3(0.05, 0.1, 0.15)); glassMat.alpha = 0.6;

    const makeEnt = (kind: Kind): BABYLON.TransformNode => {
      const n = new BABYLON.TransformNode('e', scene);
      if (kind === 'cone') { const c = BABYLON.MeshBuilder.CreateCylinder('c', { diameterTop: 0, diameterBottom: 0.9, height: 1.2, tessellation: 14 }, scene); c.material = orange; c.position.y = 0.6; c.parent = n; }
      else if (kind === 'barrier') { for (let i = 0; i < 3; i++) { const b = BABYLON.MeshBuilder.CreateBox('br', { width: 2.6, height: 0.28, depth: 0.28 }, scene); b.material = i % 2 ? white : orange; b.position.y = 0.5 + i * 0.45; b.parent = n; } }
      else if (kind === 'car') { const b = BABYLON.MeshBuilder.CreateBox('cb', { width: 2, height: 0.7, depth: 3.4 }, scene); b.material = trafficMat; b.position.y = 0.7; b.parent = n; const cab = BABYLON.MeshBuilder.CreateBox('cc', { width: 1.7, height: 0.55, depth: 1.6 }, scene); cab.material = glassMat; cab.position.set(0, 1.25, -0.2); cab.parent = n; for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]) { const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 12 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = n; } }
      else if (kind === 'coin') { const c = BABYLON.MeshBuilder.CreateCylinder('cn', { diameter: 0.9, height: 0.12, tessellation: 18 }, scene); c.rotation.x = Math.PI / 2; c.position.y = 1.1; c.material = coinMat; c.parent = n; }
      else { const bolt = BABYLON.MeshBuilder.CreateCylinder('bo', { diameter: 1, height: 0.22, tessellation: 6 }, scene); bolt.position.y = 1.2; bolt.material = chgMat; bolt.parent = n; const ring = BABYLON.MeshBuilder.CreateTorus('rg', { diameter: 1.4, thickness: 0.08, tessellation: 20 }, scene); ring.rotation.x = Math.PI / 2; ring.position.y = 1.2; ring.material = chgMat; ring.parent = n; }
      return n;
    };
    const SPAWN: { k: Kind; w: number }[] = [{ k: 'cone', w: 16 }, { k: 'barrier', w: 12 }, { k: 'car', w: 14 }, { k: 'coin', w: 22 }, { k: 'charge', w: 12 }];
    const totalW = SPAWN.reduce((s, r) => s + r.w, 0);
    const pick = (): Kind => { let r = Math.random() * totalW; for (const row of SPAWN) if ((r -= row.w) <= 0) return row.k; return 'cone'; };
    let ents: Ent[] = [];
    const clearEnts = () => { for (const e of ents) e.mesh.dispose(); ents = []; };

    const mats = createCarMaterials(scene);
    const cfg = loadConfig();
    const built = buildCar(scene, mats, cfg);
    built.node.parent = new BABYLON.TransformNode('carRoot', scene);
    const carRoot = built.node.parent as BABYLON.TransformNode;
    const ug = built.underglow?.material as BABYLON.StandardMaterial | undefined;

    // Drift tire-smoke puffs trailing the rear wheels.
    const smokeMat = mk(new BABYLON.Color3(0.7, 0.7, 0.75), new BABYLON.Color3(0.25, 0.25, 0.3), true);
    const smoke: BABYLON.Mesh[] = [];
    for (let i = 0; i < 12; i++) { const p = BABYLON.MeshBuilder.CreateSphere('sm' + i, { diameter: 0.7, segments: 6 }, scene); p.material = smokeMat; p.setEnabled(false); smoke.push(p); }
    let smokeIdx = 0;
    const puff = (x: number, z: number) => { const p = smoke[smokeIdx % smoke.length]; smokeIdx++; p.setEnabled(true); p.position.set(x, 0.4, z); p.scaling.setAll(0.5 + Math.random() * 0.5); (p as any)._life = 0.5; };

    const applyDistrict = (d: typeof DISTRICTS[number]) => {
      scene.clearColor = new BABYLON.Color4(d.sky[0], d.sky[1], d.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(d.sky[0], d.sky[1], d.sky[2]);
      groundMat.diffuseColor = new BABYLON.Color3(d.ground[0], d.ground[1], d.ground[2]);
      bldMat.diffuseColor = new BABYLON.Color3(d.bld[0], d.bld[1], d.bld[2]);
      for (const p of props) if (p.neon) p.neon.emissiveColor = new BABYLON.Color3(d.neon[0], d.neon[1], d.neon[2]);
    };
    applyDistrict(DISTRICTS[0]);

    let distance = 0, curDist = -1, speed = 30, batt = 100, coinCount = 0, spin = 0, spawnTimer = 0, playing = true;
    let driftYaw = 0, driftCharge = 0, boostBurst = 0, passed = 0;

    const reset = () => {
      clearEnts(); distance = 0; curDist = -1; speed = 30; batt = 100; coinCount = 0; spin = 0; spawnTimer = 0; playing = true;
      curve = 0; curveTarget = 0; curveTimer = 0; drift = 0; driftYaw = 0; driftCharge = 0; boostBurst = 0; passed = 0;
      ctrl.current.lane = 1; ctrl.current.targetX = 0; carRoot.position.x = 0;
      setOver(false); setBattery(100); setCoins(0); setMiles(0); setDriftPct(0); setPassed(0);
    };
    restartRef.current = reset;

    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const c = ctrl.current;

      if (playing) {
        if (boostBurst > 0) boostBurst = Math.max(0, boostBurst - dt);
        const target = (c.boost || boostBurst > 0) ? 74 : c.brake ? 14 : 42;
        speed += (target - speed) * Math.min(1, dt * 1.5);
        distance += speed * dt;
        batt = Math.max(0, batt - dt * ((c.boost || boostBurst > 0) ? 3.4 : 2.0));
        // Evolve curvature so the road winds.
        curveTimer -= dt;
        if (curveTimer <= 0) { curveTarget = (Math.random() - 0.5) * 2.2; curveTimer = 2.5 + Math.random() * 2.5; }
        curve += (curveTarget - curve) * Math.min(1, dt * 0.7);
        drift += (curveTarget * 6 - drift) * Math.min(1, dt * 0.5);

        // Drifting: while held and moving, the car slides sideways (toward the
        // current bend), kicks out a big yaw + smoke, and banks a boost charge.
        if (c.drift && speed > 18) {
          const slideDir = Math.sign(curve || (ctrl.current.lane - 1) || 1);
          driftYaw += (slideDir * 0.6 - driftYaw) * Math.min(1, dt * 4);
          driftCharge = Math.min(1, driftCharge + dt * 0.6);
          if (Math.random() < 0.5) { puff(carRoot.position.x - 0.7, carRoot.position.z + 1.4); puff(carRoot.position.x + 0.7, carRoot.position.z + 1.4); }
        } else {
          driftYaw += (0 - driftYaw) * Math.min(1, dt * 5);
          // Releasing a built-up drift unleashes a boost burst.
          if (driftCharge > 0.25) { boostBurst = 0.4 + driftCharge * 1.2; haptic([10, 30, 10]); }
          driftCharge = Math.max(0, driftCharge - dt * 1.5);
        }
      }
      // Fade smoke puffs.
      for (const p of smoke) { if (!p.isEnabled()) continue; const life = ((p as any)._life -= dt); p.scaling.addInPlaceFromFloats(dt * 2, dt * 2, dt * 2); p.position.z += speed * dt; (p.material as BABYLON.StandardMaterial).alpha = Math.max(0, life * 1.6); if (life <= 0) p.setEnabled(false); }

      // Scroll + bend road segments.
      for (const s of segs) { s.position.z += speed * dt; if (s.position.z > SEG) s.position.z -= SEG * SEG_COUNT; s.position.x = bendOf(s.position.z); }
      for (const m of marks) { m.position.z += speed * dt; if (m.position.z > 10) m.position.z -= 70 * 3.5; m.position.x = (m as any)._lane + bendOf(m.position.z); }
      for (const p of props) { p.mesh.position.z += speed * dt; if (p.mesh.position.z > 14) p.mesh.position.z -= SPAN; p.mesh.position.x = p.baseX + bendOf(p.mesh.position.z); }

      // Spawn obstacles/collectibles.
      if (playing) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) { const k = pick(); const lane = Math.floor(Math.random() * 3); const e: Ent = { mesh: makeEnt(k), kind: k, lane, z: -150 }; ents.push(e); spawnTimer = Math.max(0.45, 1.1 - distance * 0.00002); }
      }

      // Car lane position (plus the road's bend at the car's depth ~0).
      const laneX = LANES[c.lane];
      carRoot.position.x += (laneX - carRoot.position.x) * Math.min(1, dt * 8);
      if (spin > 0) { spin = Math.max(0, spin - dt); built.node.rotation.y = -Math.PI / 2 + (1 - spin / 0.7) * Math.PI * 2; }
      else built.node.rotation.y = -Math.PI / 2 + (laneX - carRoot.position.x) * 0.05 + driftYaw;
      built.node.rotation.z = spin > 0 ? 0 : (carRoot.position.x - laneX) * 0.1 - driftYaw * 0.15;
      built.node.scaling.setAll(0.62);
      for (const w of built.wheelMeshes) w.rotation.x += speed * dt * 0.5;
      if (ug) ug.alpha = 0.6 + Math.sin(performance.now() / 250) * 0.25;

      // Advance entities + collisions. Traffic moves slower (forward) so you
      // overtake it; static hazards/collectibles approach at full closing speed.
      for (const e of ents) {
        const closing = e.kind === 'car' ? speed - 24 : speed; // 24 m/s traffic
        e.z += closing * dt; e.mesh.position.z = e.z;
        e.mesh.position.x = LANES[e.lane] + bendOf(e.z);
        if (e.kind === 'coin' || e.kind === 'charge') { e.mesh.rotation.y += dt * 3; e.mesh.position.y = Math.sin(performance.now() / 300 + e.lane) * 0.15; }
        if (e.kind === 'car' && !e.hit && !(e as any)._passed && e.z > 3) { (e as any)._passed = true; passed += 1; coinCount += 1; }
        if (!e.hit && playing && e.z > -2 && e.z < 2 && Math.abs(e.mesh.position.x - carRoot.position.x) < 1.7) {
          e.hit = true;
          if (e.kind === 'coin') { coinCount += 1; batt = Math.min(100, batt + 1); haptic(6); e.mesh.dispose(); }
          else if (e.kind === 'charge') { batt = Math.min(100, batt + 18); coinCount += 2; haptic(10); e.mesh.dispose(); }
          else { batt = Math.max(0, batt - 18); speed *= 0.5; spin = 0.7; haptic([20, 60, 20]); e.mesh.dispose(); }
        }
      }
      ents = ents.filter((e) => { if (e.hit) return false; if (e.z > 16) { e.mesh.dispose(); return false; } return true; });

      if (playing && batt <= 0) { playing = false; setOver(true); haptic([40, 80, 40]); record('feature:explore'); }

      // Chase cam that leans into the curve.
      const camZ = c.boost ? 9.5 : 12;
      const lead = bendOf(-30) * 0.5;
      camera.position.x += ((carRoot.position.x + lead) - camera.position.x) * Math.min(1, dt * 3);
      camera.position.y += (7 - camera.position.y) * Math.min(1, dt * 3);
      camera.position.z += ((carRoot.position.z + camZ) - camera.position.z) * Math.min(1, dt * 3);
      camera.fov += ((c.boost ? baseFov * 1.2 : baseFov) - camera.fov) * Math.min(1, dt * 4);
      camera.setTarget(new BABYLON.Vector3(carRoot.position.x + bendOf(-14), 1.5, -14));

      const idx = Math.floor(distance / DISTRICT_LEN) % DISTRICTS.length;
      if (idx !== curDist) { curDist = idx; applyDistrict(DISTRICTS[idx]); setDistrict(DISTRICTS[idx].name); }

      if (Math.floor(performance.now() / 150) % 2 === 0) {
        setSpeedMph(Math.round(speed * 2.237)); setMiles(Number((distance / 1609.34).toFixed(2)));
        setBattery(Math.round(batt)); setCoins(coinCount); setDriftPct(Math.round(driftCharge * 100)); setPassed(passed);
      }
    });

    engine.runRenderLoop(() => scene.render());

    const step = (dir: number) => { ctrl.current.lane = Math.max(0, Math.min(2, ctrl.current.lane + dir)); ctrl.current.targetX = LANES[ctrl.current.lane]; haptic(8); };
    stepRef.current = step;
    const setKey = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { if (on) step(-1); e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { if (on) step(1); e.preventDefault(); }
      else if (k === 'arrowup' || k === 'w') { ctrl.current.boost = on; e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { ctrl.current.brake = on; e.preventDefault(); }
      else if (k === ' ' || k === 'shift') { ctrl.current.drift = on; e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => setKey(e, true);
    const ku = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const onResize = () => engine.resize(); window.addEventListener('resize', onResize);
    setReady(true);

    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize); scene.dispose(); engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (key: 'boost' | 'brake' | 'drift', on: boolean) => () => { ctrl.current[key] = on; };
  const battColor = battery < 25 ? 'var(--danger)' : battery < 55 ? 'var(--warn)' : 'var(--accent)';

  return (
    <div className="canvas-frame" style={{ minHeight: 480 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '480px', display: 'block', touchAction: 'none' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your city…</span>
        </div>
      )}

      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 8, pointerEvents: 'none', flexWrap: 'wrap' }}>
        <div style={hudBox}><span className="small muted">{DISTRICTS.find((d) => d.name === district)?.emoji} District</span><div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{district}</div></div>
        <div style={hudBox}><span className="small muted">🪙 Coins</span><div style={{ fontWeight: 800, color: 'var(--warn)' }}>{coins}</div></div>
        <div style={hudBox}><span className="small muted">🏁 Passed</span><div style={{ fontWeight: 800 }}>{passed}</div></div>
        <div style={{ ...hudBox, minWidth: 96 }}><span className="small muted">Battery</span><div style={{ height: 9, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${battery}%`, height: '100%', background: battColor }} /></div></div>
        <div style={hudBox}><span className="small muted">Speed</span><div style={{ fontWeight: 800, color: 'var(--accent)' }}>{speedMph}</div></div>
      </div>

      {over && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,11,17,0.8)', backdropFilter: 'blur(3px)' }}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: '2.4rem' }}>🔋</div>
            <h3 style={{ margin: '6px 0' }}>Out of charge!</h3>
            <p className="muted">You drove <strong style={{ color: 'var(--accent-2)' }}>{miles} mi</strong>, passed <strong>{passed}</strong> cars, and grabbed <strong style={{ color: 'var(--warn)' }}>{coins}</strong> coins.</p>
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => restartRef.current()}>↻ Drive again</button>
          </div>
        </div>
      )}

      <a className="btn ghost" href={withBase('/build/')} style={{ position: 'absolute', right: 12, top: 70, padding: '6px 12px' }}>← Edit build</a>

      <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ctrlBtn} onClick={() => stepRef.current(-1)} aria-label="Move left">‹</button>
          <button style={ctrlBtn} onClick={() => stepRef.current(1)} aria-label="Move right">›</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...ctrlBtn, fontSize: '0.82rem', position: 'relative', overflow: 'hidden', borderColor: driftPct > 25 ? 'var(--accent)' : 'var(--border)' }}
            onPointerDown={press('drift', true)} onPointerUp={press('drift', false)} onPointerLeave={press('drift', false)} aria-label="Drift"
          >
            DRIFT
            <span style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${driftPct}%`, background: 'var(--accent)' }} />
          </button>
          <button style={{ ...ctrlBtn, fontSize: '0.82rem' }} onPointerDown={press('brake', true)} onPointerUp={press('brake', false)} onPointerLeave={press('brake', false)} aria-label="Brake">BRAKE</button>
          <button style={{ ...ctrlBtn, background: 'var(--accent)', color: '#06140f', fontSize: '0.82rem' }} onPointerDown={press('boost', true)} onPointerUp={press('boost', false)} onPointerLeave={press('boost', false)} aria-label="Boost">BOOST</button>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 12, bottom: 92, pointerEvents: 'none' }} className="small muted">
        Winding road — dodge 🚧 obstacles, pass 🚗 traffic, hold DRIFT around corners for a boost!
      </div>
    </div>
  );
}

const hudBox: React.CSSProperties = { background: 'rgba(10,14,20,0.78)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 10px' };
const ctrlBtn: React.CSSProperties = { width: 66, height: 60, borderRadius: 16, border: '1px solid var(--border)', background: 'rgba(19,28,43,0.85)', color: 'var(--text)', fontSize: '1.8rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
