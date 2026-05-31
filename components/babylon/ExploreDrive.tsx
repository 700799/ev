'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { withBase } from '@/lib/site';
import { buildCar, createCarMaterials, type CarConfig } from '@/lib/carBuilder';
import { computeStats, type BodyType, type WheelStyle } from '@/data/configSpecs';

const STORE_KEY = 'ev-build-v1';
const LANES = [-3.4, 0, 3.4];
const DISTRICT_LEN = 700;

const DISTRICTS = [
  { name: 'Downtown', emoji: '🏙️', ground: [0.07, 0.08, 0.1], sky: [0.05, 0.06, 0.12], bld: [0.1, 0.11, 0.16], neon: [0.3, 0.6, 1] },
  { name: 'Neon District', emoji: '🌃', ground: [0.06, 0.05, 0.09], sky: [0.05, 0.03, 0.11], bld: [0.13, 0.07, 0.17], neon: [1, 0.2, 0.6] },
  { name: 'Waterfront', emoji: '🌊', ground: [0.04, 0.09, 0.13], sky: [0.05, 0.1, 0.15], bld: [0.07, 0.13, 0.17], neon: [0.2, 0.85, 0.95] },
  { name: 'Forest Park', emoji: '🌲', ground: [0.04, 0.13, 0.07], sky: [0.06, 0.11, 0.1], bld: [0.06, 0.16, 0.09], neon: [0.4, 0.95, 0.5] },
  { name: 'Desert Highway', emoji: '🏜️', ground: [0.18, 0.13, 0.07], sky: [0.16, 0.11, 0.09], bld: [0.2, 0.14, 0.08], neon: [1, 0.7, 0.3] },
  { name: 'Mountain Pass', emoji: '🏔️', ground: [0.1, 0.12, 0.14], sky: [0.08, 0.11, 0.16], bld: [0.13, 0.15, 0.18], neon: [0.75, 0.85, 1] },
];

type Kind = 'car' | 'coin' | 'charge';
interface Ent { mesh: BABYLON.TransformNode; kind: Kind; lane: number; z: number; hit?: boolean; v?: number; }
type Light = { mesh: BABYLON.TransformNode; bulbs: BABYLON.StandardMaterial[]; z: number; state: 'green' | 'yellow' | 'red'; timer: number; ran?: boolean };

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
 * Explore drive: your built car cruises a winding city. Dodge other cars, obey
 * traffic lights (run a red and a garbage truck T-bones you), drift (which
 * slides you across lanes), and grab coins/charge. A live stats panel shows
 * speed, drag coefficient, and battery drain/gain.
 */
export default function ExploreDrive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState(DISTRICTS[0].name);
  const [over, setOver] = useState(false);
  const [overMsg, setOverMsg] = useState('Out of charge!');
  const [hud, setHud] = useState({ mph: 0, miles: 0, coins: 0, battery: 100, drift: 0, batRate: 0, light: 'green' as Light['state'] });

  const cfg = useRef<CarConfig>(loadConfig());
  const specs = computeStats(cfg.current.body, cfg.current.wheel, cfg.current.accessories);
  const ctrl = useRef({ boost: false, brake: false, driftDir: 0, steer: 0, dragging: false });
  const [tilt, setTilt] = useState(false);
  const tiltRef = useRef(false);
  const stepRef = useRef<(d: number) => void>(() => {});
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    record('feature:explore');

    // --- Tire-skid sound (filtered white noise via Web Audio) ---
    let audioCtx: AudioContext | null = null;
    let skidGain: GainNode | null = null;
    const initAudio = () => {
      if (audioCtx) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AC();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1600; filter.Q.value = 0.8;
        skidGain = audioCtx.createGain(); skidGain.gain.value = 0;
        noise.connect(filter); filter.connect(skidGain); skidGain.connect(audioCtx.destination);
        noise.start();
      } catch { /* ignore */ }
    };
    const setSkid = (on: boolean) => { if (skidGain && audioCtx) skidGain.gain.setTargetAtTime(on ? 0.18 : 0, audioCtx.currentTime, 0.05); };

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.06, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR; scene.fogStart = 55; scene.fogEnd = 170;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    const baseFov = camera.fov;
    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.1), scene); hemi.intensity = 0.9;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.4, -1, 0.3), scene); sun.intensity = 0.85;
    const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;

    // Winding road: apparent X offset by depth (classic pseudo-3D bend).
    const bendOf = (z: number) => curve * z * z * 0.0016 + drift * -z * 0.04;
    let curve = 0, curveTarget = 0, curveTimer = 0, drift = 0, hairpin = false;

    const groundMat = new BABYLON.StandardMaterial('gm', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.07, 0.08, 0.1); groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 240, height: 500 }, scene);
    ground.material = groundMat; ground.position.z = -150;

    const roadMat = new BABYLON.StandardMaterial('rm', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.05, 0.055, 0.07); roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const segs: BABYLON.Mesh[] = [];
    const SEG = 6, SEG_COUNT = 26;
    for (let i = 0; i < SEG_COUNT; i++) { const s = BABYLON.MeshBuilder.CreateGround('rs' + i, { width: 13, height: SEG }, scene); s.material = roadMat; s.position.z = -i * SEG; segs.push(s); }
    const markMat = new BABYLON.StandardMaterial('mk', scene); markMat.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.4); markMat.disableLighting = true;
    const marks: { mesh: BABYLON.Mesh; lane: number }[] = [];
    for (let i = 0; i < 70; i++) { const m = BABYLON.MeshBuilder.CreateBox('mk' + i, { width: 0.2, height: 0.02, depth: 1.6 }, scene); m.material = markMat; m.position.z = -i * 3.5; marks.push({ mesh: m, lane: i % 2 ? 1.7 : -1.7 }); }

    const bldMat = new BABYLON.StandardMaterial('bm', scene);
    bldMat.diffuseColor = new BABYLON.Color3(0.1, 0.11, 0.16); bldMat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.05);
    const props: { mesh: BABYLON.Mesh; neon?: BABYLON.StandardMaterial; baseX: number }[] = [];
    const SPAN = 70, PCOUNT = 60;
    for (let i = 0; i < PCOUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1; const depthRow = (i % 4) < 2 ? 0 : 1;
      const h = 7 + Math.random() * 26, w = 4 + Math.random() * 5;
      const b = BABYLON.MeshBuilder.CreateBox('b' + i, { width: w, height: h, depth: w }, scene); b.material = bldMat;
      const baseX = side * (9 + depthRow * 9 + Math.random() * 4);
      b.position.set(baseX, h / 2, -((i / 2) | 0) * (SPAN / (PCOUNT / 2)) - 4);
      let neon: BABYLON.StandardMaterial | undefined;
      if (i % 2 === 0) {
        neon = new BABYLON.StandardMaterial('n' + i, scene); neon.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1); neon.disableLighting = true;
        const sign = BABYLON.MeshBuilder.CreateBox('s' + i, { width: 0.3, height: h * 0.6, depth: w * 0.5 }, scene); sign.material = neon; sign.parent = b; sign.position = new BABYLON.Vector3(-side * (w / 2 + 0.15), 0, 0);
      }
      props.push({ mesh: b, neon, baseX });
    }

    const mk = (c: BABYLON.Color3, em?: BABYLON.Color3, noLight = false) => { const m = new BABYLON.StandardMaterial('m' + Math.random(), scene); m.diffuseColor = c; if (em) m.emissiveColor = em; if (noLight) m.disableLighting = true; return m; };
    const white = mk(new BABYLON.Color3(0.95, 0.95, 0.95));
    const tireMat = mk(new BABYLON.Color3(0.02, 0.02, 0.03));
    const glassMat = mk(new BABYLON.Color3(0.05, 0.1, 0.15)); glassMat.alpha = 0.6;
    const coinMat = mk(new BABYLON.Color3(0.9, 0.75, 0.1), new BABYLON.Color3(0.8, 0.6, 0.05), true);
    const chgMat = mk(new BABYLON.Color3(0.1, 0.5, 0.4), new BABYLON.Color3(0.15, 0.85, 0.6), true);
    const CAR_COLORS = [new BABYLON.Color3(0.7, 0.2, 0.25), new BABYLON.Color3(0.2, 0.35, 0.7), new BABYLON.Color3(0.7, 0.6, 0.2), new BABYLON.Color3(0.5, 0.5, 0.55), new BABYLON.Color3(0.3, 0.5, 0.4)];

    const makeCar = (): BABYLON.TransformNode => {
      const n = new BABYLON.TransformNode('e', scene);
      const body = mk(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
      const b = BABYLON.MeshBuilder.CreateBox('cb', { width: 2, height: 0.7, depth: 3.4 }, scene); b.material = body; b.position.y = 0.7; b.parent = n;
      const cab = BABYLON.MeshBuilder.CreateBox('cc', { width: 1.7, height: 0.55, depth: 1.6 }, scene); cab.material = glassMat; cab.position.set(0, 1.25, -0.2); cab.parent = n;
      // Tail lights so you can read it as a car ahead of you.
      for (const x of [0.7, -0.7]) { const t = BABYLON.MeshBuilder.CreateBox('tl', { width: 0.3, height: 0.18, depth: 0.1 }, scene); t.material = mk(new BABYLON.Color3(0.6, 0.05, 0.05), new BABYLON.Color3(0.7, 0.05, 0.05), true); t.position.set(x, 0.8, 1.75); t.parent = n; }
      for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]) { const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 12 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = n; }
      return n;
    };
    const makeCoin = (): BABYLON.TransformNode => { const n = new BABYLON.TransformNode('e', scene); const c = BABYLON.MeshBuilder.CreateCylinder('cn', { diameter: 0.9, height: 0.12, tessellation: 18 }, scene); c.rotation.x = Math.PI / 2; c.position.y = 1.1; c.material = coinMat; c.parent = n; return n; };
    const makeCharge = (): BABYLON.TransformNode => { const n = new BABYLON.TransformNode('e', scene); const bolt = BABYLON.MeshBuilder.CreateCylinder('bo', { diameter: 1, height: 0.22, tessellation: 6 }, scene); bolt.position.y = 1.2; bolt.material = chgMat; bolt.parent = n; const ring = BABYLON.MeshBuilder.CreateTorus('rg', { diameter: 1.4, thickness: 0.08, tessellation: 20 }, scene); ring.rotation.x = Math.PI / 2; ring.position.y = 1.2; ring.material = chgMat; ring.parent = n; return n; };

    // Traffic light over the road (pole + 3 bulbs).
    const makeLight = (): Light => {
      const n = new BABYLON.TransformNode('lt', scene);
      const pole = BABYLON.MeshBuilder.CreateBox('pp', { width: 0.3, height: 7, depth: 0.3 }, scene); pole.material = mk(new BABYLON.Color3(0.1, 0.1, 0.12)); pole.position.set(6, 3.5, 0); pole.parent = n;
      const arm = BABYLON.MeshBuilder.CreateBox('pa', { width: 6.5, height: 0.25, depth: 0.25 }, scene); arm.material = pole.material; arm.position.set(3, 6.6, 0); arm.parent = n;
      const housing = BABYLON.MeshBuilder.CreateBox('ph', { width: 0.7, height: 2, depth: 0.5 }, scene); housing.material = mk(new BABYLON.Color3(0.08, 0.08, 0.1)); housing.position.set(0, 6, 0); housing.parent = n;
      const bulbs: BABYLON.StandardMaterial[] = [];
      ['r', 'y', 'g'].forEach((c, i) => { const m = mk(new BABYLON.Color3(0.1, 0.1, 0.1), undefined, true); const s = BABYLON.MeshBuilder.CreateSphere('b' + c, { diameter: 0.5 }, scene); s.material = m; s.position.set(0, 6.6 - i * 0.6, -0.3); s.parent = n; bulbs.push(m); });
      return { mesh: n, bulbs, z: -150, state: 'green', timer: 3 + Math.random() * 3 };
    };
    const setLight = (l: Light) => {
      const on = (i: number, col: BABYLON.Color3) => { l.bulbs[i].emissiveColor = col; l.bulbs[i].diffuseColor = col; };
      on(0, new BABYLON.Color3(0.12, 0.02, 0.02)); on(1, new BABYLON.Color3(0.12, 0.1, 0.02)); on(2, new BABYLON.Color3(0.02, 0.12, 0.04));
      if (l.state === 'red') on(0, new BABYLON.Color3(1, 0.1, 0.1));
      else if (l.state === 'yellow') on(1, new BABYLON.Color3(1, 0.75, 0.1));
      else on(2, new BABYLON.Color3(0.2, 1, 0.3));
    };

    // Garbage truck that T-bones you for running a red.
    const truck = new BABYLON.TransformNode('truck', scene);
    const truckBody = BABYLON.MeshBuilder.CreateBox('tb', { width: 3, height: 3, depth: 7 }, scene); truckBody.material = mk(new BABYLON.Color3(0.2, 0.45, 0.3)); truckBody.position.y = 1.6; truckBody.parent = truck;
    const truckCab = BABYLON.MeshBuilder.CreateBox('tc', { width: 3, height: 2, depth: 2 }, scene); truckCab.material = mk(new BABYLON.Color3(0.15, 0.35, 0.25)); truckCab.position.set(0, 1.2, -4); truckCab.parent = truck;
    truck.rotation.y = Math.PI / 2; truck.setEnabled(false);
    let truckActive = false, truckX = -18;

    let ents: Ent[] = [];
    let lights: Light[] = [];
    const clearAll = () => { for (const e of ents) e.mesh.dispose(); ents = []; for (const l of lights) l.mesh.dispose(); lights = []; };

    const mats = createCarMaterials(scene);
    const built = buildCar(scene, mats, cfg.current);
    built.node.parent = new BABYLON.TransformNode('carRoot', scene);
    const carRoot = built.node.parent as BABYLON.TransformNode;
    built.node.scaling.setAll(0.62);
    const ug = built.underglow?.material as BABYLON.StandardMaterial | undefined;

    // Drift smoke.
    const smokeMat = mk(new BABYLON.Color3(0.7, 0.7, 0.75), new BABYLON.Color3(0.25, 0.25, 0.3), true);
    const smoke: BABYLON.Mesh[] = [];
    for (let i = 0; i < 14; i++) { const p = BABYLON.MeshBuilder.CreateSphere('sm' + i, { diameter: 0.7, segments: 6 }, scene); p.material = smokeMat.clone('sm' + i); p.setEnabled(false); smoke.push(p); }
    let smokeIdx = 0;
    const puff = (x: number, z: number) => { const p = smoke[smokeIdx++ % smoke.length]; p.setEnabled(true); p.position.set(x, 0.4, z); p.scaling.setAll(0.5 + Math.random() * 0.4); (p as { _life?: number })._life = 0.5; };

    const applyDistrict = (d: typeof DISTRICTS[number]) => {
      scene.clearColor = new BABYLON.Color4(d.sky[0], d.sky[1], d.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(d.sky[0], d.sky[1], d.sky[2]);
      groundMat.diffuseColor = new BABYLON.Color3(d.ground[0], d.ground[1], d.ground[2]);
      bldMat.diffuseColor = new BABYLON.Color3(d.bld[0], d.bld[1], d.bld[2]);
      for (const p of props) if (p.neon) p.neon.emissiveColor = new BABYLON.Color3(d.neon[0], d.neon[1], d.neon[2]);
    };
    applyDistrict(DISTRICTS[0]);

    let distance = 0, curDist = -1, speed = 30, batt = 100, prevBatt = 100, coins = 0, slideX = 0, slideV = 0;
    let carX = 0, spawnTimer = 0, lightTimer = 5, playing = true, driftCharge = 0, boostBurst = 0, nearLight: Light | null = null;

    const endRun = (msg: string) => { playing = false; setOver(true); setOverMsg(msg); haptic([40, 90, 40]); record('feature:explore'); };

    const reset = () => {
      clearAll(); distance = 0; curDist = -1; speed = 30; batt = 100; prevBatt = 100; coins = 0; slideX = 0; slideV = 0; carX = 0;
      spawnTimer = 0; lightTimer = 5; playing = true; driftCharge = 0; boostBurst = 0; nearLight = null; truckActive = false; truck.setEnabled(false);
      curve = 0; curveTarget = 0; curveTimer = 0; drift = 0; ctrl.current.steer = 0;
      setOver(false);
    };
    restartRef.current = reset;

    const step = (dir: number) => {
      if (!playing) return;
      // dir −1 = LEFT, +1 = RIGHT. Nudge the continuous steer target.
      ctrl.current.steer = Math.max(-5, Math.min(5, ctrl.current.steer + dir * 3.4));
      haptic(8);
    };
    stepRef.current = step;

    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const c = ctrl.current;

      if (playing) {
        if (boostBurst > 0) boostBurst = Math.max(0, boostBurst - dt);
        const boosting = c.boost || boostBurst > 0;
        const target = boosting ? 74 : c.brake ? 12 : 42;
        speed += (target - speed) * Math.min(1, dt * 1.6);
        distance += speed * dt;
        batt = Math.max(0, batt - dt * (boosting ? 3.4 : c.brake ? 1.0 : 2.0));

        curveTimer -= dt;
        if (curveTimer <= 0) {
          // Most bends are gentle; sometimes a sharp 180° hairpin you must drift.
          if (Math.random() < 0.28) { curveTarget = (Math.random() < 0.5 ? -1 : 1) * 5.2; curveTimer = 3.5 + Math.random() * 2; hairpin = true; }
          else { curveTarget = (Math.random() - 0.5) * 2.2; curveTimer = 2.5 + Math.random() * 2.5; hairpin = false; }
        }
        curve += (curveTarget - curve) * Math.min(1, dt * 0.7);
        drift += (curveTarget * 6 - drift) * Math.min(1, dt * 0.5);

        // Directional drift (long-press DRIFT ◀ / ▶): slide that way like a skid.
        if (c.driftDir !== 0 && speed > 14) {
          slideV += c.driftDir * 16 * dt;
          driftCharge = Math.min(1, driftCharge + dt * 0.6);
          setSkid(true);
          if (Math.random() < 0.7) { puff(carX - 0.8, carRoot.position.z + 1.4); puff(carX + 0.8, carRoot.position.z + 1.4); }
        } else {
          setSkid(false);
          if (driftCharge > 0.25) { boostBurst = 0.4 + driftCharge * 1.2; haptic([10, 30, 10]); }
          driftCharge = Math.max(0, driftCharge - dt * 1.5);
        }
      } else { setSkid(false); }

      // Car X = steer target + drift slide (clamped to road width).
      const laneTarget = c.steer;
      slideV *= 0.9; slideX += slideV * dt;
      carX += ((laneTarget + slideX) - carX) * Math.min(1, dt * 9);
      carX = Math.max(-5.2, Math.min(5.2, carX));
      if (Math.abs(slideX) > 0.05) slideX *= 0.96; else slideX = 0;
      carRoot.position.x = carX;
      built.node.rotation.y = -Math.PI / 2 + (laneTarget - carX) * 0.06 + slideV * 0.04;
      built.node.rotation.z = (carX - laneTarget) * 0.08;
      for (const w of built.wheelMeshes) w.rotation.x += speed * dt * 0.5;
      if (ug) ug.alpha = 0.6 + Math.sin(performance.now() / 250) * 0.25;

      // Scroll + bend the world.
      for (const s of segs) { s.position.z += speed * dt; if (s.position.z > SEG) s.position.z -= SEG * SEG_COUNT; s.position.x = bendOf(s.position.z); }
      for (const m of marks) { m.mesh.position.z += speed * dt; if (m.mesh.position.z > 10) m.mesh.position.z -= 70 * 3.5; m.mesh.position.x = m.lane + bendOf(m.mesh.position.z); }
      for (const p of props) { p.mesh.position.z += speed * dt; if (p.mesh.position.z > 14) p.mesh.position.z -= SPAN; p.mesh.position.x = p.baseX + bendOf(p.mesh.position.z); }
      for (const p of smoke) { if (!p.isEnabled()) continue; const o = p as { _life?: number }; o._life = (o._life || 0) - dt; p.scaling.addInPlaceFromFloats(dt * 2, dt * 2, dt * 2); p.position.z += speed * dt; (p.material as BABYLON.StandardMaterial).alpha = Math.max(0, (o._life || 0) * 1.6); if ((o._life || 0) <= 0) p.setEnabled(false); }

      if (playing) {
        // Spawn traffic + collectibles (mostly cars to dodge).
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const r = Math.random(); const lane = Math.floor(Math.random() * 3);
          const kind: Kind = r < 0.55 ? 'car' : r < 0.82 ? 'coin' : 'charge';
          const mesh = kind === 'car' ? makeCar() : kind === 'coin' ? makeCoin() : makeCharge();
          mesh.position.set(LANES[lane], 0, -150);
          ents.push({ mesh, kind, lane, z: -150, v: kind === 'car' ? 22 + Math.random() * 8 : 0 });
          spawnTimer = Math.max(0.5, 1.2 - distance * 0.00002);
        }
        // Spawn a traffic light occasionally.
        lightTimer -= dt;
        if (lightTimer <= 0) { const l = makeLight(); setLight(l); l.mesh.position.z = -150; lights.push(l); lightTimer = 7 + Math.random() * 5; }
      }

      // Advance traffic; collide (you must dodge — same lane = crash).
      for (const e of ents) {
        const closing = e.kind === 'car' ? speed - (e.v || 0) : speed;
        e.z += closing * dt; e.mesh.position.z = e.z; e.mesh.position.x = LANES[e.lane] + bendOf(e.z);
        if (e.kind === 'coin' || e.kind === 'charge') { e.mesh.rotation.y += dt * 3; e.mesh.position.y = Math.sin(performance.now() / 300 + e.lane) * 0.15; }
        if (!e.hit && playing && e.z > -2.2 && e.z < 2.2 && Math.abs(e.mesh.position.x - carX) < 1.7) {
          e.hit = true;
          if (e.kind === 'coin') { coins += 1; batt = Math.min(100, batt + 1); haptic(6); e.mesh.dispose(); }
          else if (e.kind === 'charge') { batt = Math.min(100, batt + 18); coins += 2; haptic(10); e.mesh.dispose(); }
          else { endRun('💥 Crashed into a car!'); }
        }
      }
      ents = ents.filter((e) => { if (e.hit && e.kind !== 'car') return false; if (e.z > 16) { e.mesh.dispose(); return false; } return true; });

      // Traffic lights: advance, cycle, and enforce red.
      nearLight = null;
      for (const l of lights) {
        l.z += speed * dt; l.mesh.position.z = l.z; l.mesh.position.x = bendOf(l.z);
        l.timer -= dt;
        if (l.timer <= 0) {
          if (l.state === 'green') { l.state = 'yellow'; l.timer = 1.4; }
          else if (l.state === 'yellow') { l.state = 'red'; l.timer = 3.2; }
          else { l.state = 'green'; l.timer = 4 + Math.random() * 3; }
          setLight(l);
        }
        if (l.z > -22 && l.z < 6) nearLight = l;
        // Crossing the line on red while moving → T-bone.
        if (!l.ran && l.state === 'red' && l.z > -1 && l.z < 2 && speed > 6) {
          l.ran = true; truckActive = true; truck.setEnabled(true); truckX = -18; truck.position.set(-18, 0, l.z);
        }
      }
      lights = lights.filter((l) => { if (l.z > 14) { l.mesh.dispose(); return false; } return true; });

      // Garbage truck slams across the intersection.
      if (truckActive) {
        truckX += 40 * dt; truck.position.x = truckX; truck.position.z += speed * dt * 0.3;
        if (Math.abs(truckX - carX) < 2.6 && playing) endRun('🚛 T-boned by a garbage truck!');
        if (truckX > 16) { truckActive = false; truck.setEnabled(false); }
      }

      if (playing && batt <= 0) endRun('🔋 Out of charge!');

      // Camera leans into the curve.
      const camZ = c.boost ? 9.5 : 12;
      camera.position.x += ((carX + bendOf(-30) * 0.5) - camera.position.x) * Math.min(1, dt * 3);
      camera.position.y += (7 - camera.position.y) * Math.min(1, dt * 3);
      camera.position.z += ((carRoot.position.z + camZ) - camera.position.z) * Math.min(1, dt * 3);
      camera.fov += ((c.boost ? baseFov * 1.2 : baseFov) - camera.fov) * Math.min(1, dt * 4);
      camera.setTarget(new BABYLON.Vector3(carX + bendOf(-14), 1.5, -14));

      const idx = Math.floor(distance / DISTRICT_LEN) % DISTRICTS.length;
      if (idx !== curDist) { curDist = idx; applyDistrict(DISTRICTS[idx]); setDistrict(DISTRICTS[idx].name); }

      if (Math.floor(performance.now() / 120) % 2 === 0) {
        const rate = (batt - prevBatt) / Math.max(dt, 0.001); prevBatt = batt;
        setHud({ mph: Math.round(speed * 2.237), miles: Number((distance / 1609.34).toFixed(2)), coins, battery: Math.round(batt), drift: Math.round(driftCharge * 100), batRate: rate, light: nearLight ? nearLight.state : 'green' });
      }
    });

    engine.runRenderLoop(() => scene.render());

    const setKey = (e: KeyboardEvent, on: boolean) => {
      if (on) initAudio();
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { if (on) step(-1); e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { if (on) step(1); e.preventDefault(); }
      else if (k === 'arrowup' || k === 'w') { ctrl.current.boost = on; e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { ctrl.current.brake = on; e.preventDefault(); }
      else if (k === 'q') { ctrl.current.driftDir = on ? -1 : 0; e.preventDefault(); }      // drift left
      else if (k === 'e') { ctrl.current.driftDir = on ? 1 : 0; e.preventDefault(); }       // drift right
    };
    const kd = (e: KeyboardEvent) => setKey(e, true);
    const ku = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // Drag-to-steer: slide a finger/mouse left-right across the canvas and the
    // car follows continuously (mapped to road width). Far more controllable
    // than discrete arrows.
    const pointerSteer = (clientX: number) => {
      if (!playing) return;
      const r = canvas.getBoundingClientRect();
      const frac = (clientX - r.left) / r.width;          // 0..1 across screen
      ctrl.current.steer = Math.max(-5, Math.min(5, (frac - 0.5) * 11));
    };
    const pd = (e: PointerEvent) => { initAudio(); ctrl.current.dragging = true; pointerSteer(e.clientX); };
    const pm = (e: PointerEvent) => { if (ctrl.current.dragging) pointerSteer(e.clientX); };
    const pu = () => { ctrl.current.dragging = false; };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);

    // Tilt-to-steer (mobile): device roll maps to steer target when enabled.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (!tiltRef.current || !playing || e.gamma == null) return;
      ctrl.current.steer = Math.max(-5, Math.min(5, (e.gamma / 35) * 5));
    };
    window.addEventListener('deviceorientation', onTilt);

    const onResize = () => engine.resize(); window.addEventListener('resize', onResize);
    setReady(true);

    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu); window.removeEventListener('deviceorientation', onTilt);
      window.removeEventListener('resize', onResize); try { audioCtx?.close(); } catch { /* ignore */ } scene.dispose(); engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (key: 'boost' | 'brake', on: boolean) => () => { ctrl.current[key] = on; };
  const driftPress = (dir: number) => { ctrl.current.driftDir = dir; haptic(12); };
  const driftRelease = () => { ctrl.current.driftDir = 0; };
  const toggleTilt = async () => {
    const next = !tilt;
    // iOS requires a user-gesture permission request for motion sensors.
    const DOE = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null) as unknown as { requestPermission?: () => Promise<string> } | null;
    if (next && DOE?.requestPermission) { try { await DOE.requestPermission(); } catch { /* ignore */ } }
    setTilt(next); tiltRef.current = next;
  };
  const battColor = hud.battery < 25 ? 'var(--danger)' : hud.battery < 55 ? 'var(--warn)' : 'var(--accent)';
  const lightColor = hud.light === 'red' ? '#ff5c5c' : hud.light === 'yellow' ? '#ffcc44' : '#4ade80';

  return (
    <div className="canvas-frame" style={{ minHeight: 520 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '520px', display: 'block', touchAction: 'none' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your city…</span>
        </div>
      )}

      {/* Top bar: district + light state */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <div style={hudBox}><span className="small muted">{DISTRICTS.find((d) => d.name === district)?.emoji} {district}</span></div>
        <div style={{ ...hudBox, color: lightColor, fontWeight: 800 }}>● {hud.light.toUpperCase()}</div>
      </div>

      {/* Stats panel (corner) */}
      <div style={statsPanel}>
        <div style={statRow}><span className="muted small">Speed</span><strong style={{ color: 'var(--accent)' }}>{hud.mph} mph</strong></div>
        <div style={statRow}><span className="muted small">Battery</span><strong style={{ color: battColor }}>{hud.battery}%</strong></div>
        <div style={statRow}><span className="muted small">{hud.batRate >= 0 ? 'Gain' : 'Drain'}</span><strong style={{ color: hud.batRate >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{hud.batRate >= 0 ? '+' : ''}{hud.batRate.toFixed(1)}%/s</strong></div>
        <div style={statRow}><span className="muted small">Drag Cd</span><strong>{specs.cd.toFixed(3)}</strong></div>
        <div style={statRow}><span className="muted small">Range</span><strong>{specs.rangeMi} mi</strong></div>
        <div style={statRow}><span className="muted small">Miles</span><strong style={{ color: 'var(--accent-2)' }}>{hud.miles}</strong></div>
        <div style={statRow}><span className="muted small">🪙 Coins</span><strong style={{ color: 'var(--warn)' }}>{hud.coins}</strong></div>
      </div>

      {over && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,11,17,0.82)', backdropFilter: 'blur(3px)' }}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: '2.4rem' }}>{overMsg.split(' ')[0]}</div>
            <h3 style={{ margin: '6px 0' }}>{overMsg.replace(/^\S+\s/, '')}</h3>
            <p className="muted">You drove <strong style={{ color: 'var(--accent-2)' }}>{hud.miles} mi</strong> and grabbed <strong style={{ color: 'var(--warn)' }}>{hud.coins}</strong> coins.</p>
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => restartRef.current()}>↻ Drive again</button>
          </div>
        </div>
      )}

      <a className="btn ghost" href={withBase('/build/')} style={{ position: 'absolute', right: 10, bottom: 86, padding: '5px 11px', fontSize: '0.8rem' }}>← Edit build</a>

      {/* Steering help + tilt toggle */}
      <div style={{ position: 'absolute', left: 10, bottom: 70, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="small muted" style={{ pointerEvents: 'none' }}>👆 Slide to steer · hold 🌀 Drift to skid through 180° hairpins</span>
        <button onClick={toggleTilt} style={{ ...ctrlBtn, width: 'auto', height: 30, fontSize: '0.72rem', padding: '0 10px', background: tilt ? 'var(--accent)' : 'rgba(19,28,43,0.9)', color: tilt ? '#06140f' : 'var(--text)' }}>📱 Tilt {tilt ? 'On' : 'Off'}</button>
      </div>

      {/* Control bar — long-press the drift buttons to skid that way */}
      <div style={controlBar}>
        <button
          style={{ ...ctrlBtn, position: 'relative', overflow: 'hidden', borderColor: hud.drift > 25 ? 'var(--accent)' : 'var(--border)' }}
          onPointerDown={(e) => { e.preventDefault(); driftPress(-1); }} onPointerUp={driftRelease} onPointerLeave={driftRelease} aria-label="Drift left"
        >🌀◀ Drift<span style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${hud.drift}%`, background: 'var(--accent)' }} /></button>
        <button style={ctrlBtn} onPointerDown={press('brake', true)} onPointerUp={press('brake', false)} onPointerLeave={press('brake', false)} aria-label="Brake">BRAKE</button>
        <button style={{ ...ctrlBtn, background: 'var(--accent)', color: '#06140f' }} onPointerDown={press('boost', true)} onPointerUp={press('boost', false)} onPointerLeave={press('boost', false)} aria-label="Boost">BOOST</button>
        <button
          style={{ ...ctrlBtn, position: 'relative', overflow: 'hidden', borderColor: hud.drift > 25 ? 'var(--accent)' : 'var(--border)' }}
          onPointerDown={(e) => { e.preventDefault(); driftPress(1); }} onPointerUp={driftRelease} onPointerLeave={driftRelease} aria-label="Drift right"
        >Drift ▶🌀<span style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${hud.drift}%`, background: 'var(--accent)' }} /></button>
      </div>
    </div>
  );
}

const hudBox: React.CSSProperties = { background: 'rgba(10,14,20,0.78)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 10px', fontSize: '0.85rem' };
const statsPanel: React.CSSProperties = { position: 'absolute', top: 48, right: 10, width: 140, background: 'rgba(10,14,20,0.8)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px', display: 'grid', gap: 4, pointerEvents: 'none' };
const statRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '0.82rem' };
const controlBar: React.CSSProperties = { position: 'absolute', bottom: 12, left: 10, right: 10, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' };
const ctrlBtn: React.CSSProperties = { minWidth: 60, height: 52, padding: '0 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'rgba(19,28,43,0.9)', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
