'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';

type Phase = 'idle' | 'playing' | 'over';
type Kind = 'cone' | 'barrier' | 'pothole' | 'deer' | 'bear' | 'police' | 'bus' | 'charge' | 'turbo';

interface Entity {
  mesh: BABYLON.TransformNode;
  kind: Kind;
  lane: number;
  z: number;
  wobble: number;
  hit?: boolean;
}

const LANES = [-3, 0, 3];
const ROAD_LEN = 80;
const SPAWN_Z = -72;
const TURBO_TIME = 4; // seconds

// Themed metro backdrops. Each sets the sky/fog and a palette of neon building
// colors that flank the road, giving each city a distinct night-drive vibe.
interface Theme {
  id: string;
  label: string;
  sky: [number, number, number];
  building: [number, number, number];
  neons: [number, number, number][];
}
const THEMES: Theme[] = [
  { id: 'tokyo', label: '🗼 Tokyo', sky: [0.04, 0.03, 0.09], building: [0.08, 0.07, 0.14], neons: [[0.95, 0.15, 0.5], [0.2, 0.7, 1], [0.7, 0.2, 1], [1, 0.4, 0.1]] },
  { id: 'nyc', label: '🗽 New York', sky: [0.05, 0.06, 0.1], building: [0.1, 0.1, 0.13], neons: [[1, 0.8, 0.3], [0.9, 0.9, 1], [1, 0.5, 0.2], [0.6, 0.8, 1]] },
  { id: 'vegas', label: '🎰 Las Vegas', sky: [0.07, 0.04, 0.1], building: [0.12, 0.09, 0.14], neons: [[1, 0.2, 0.3], [1, 0.85, 0.1], [0.3, 1, 0.5], [0.9, 0.3, 1]] },
  { id: 'dubai', label: '🏙️ Dubai', sky: [0.06, 0.07, 0.1], building: [0.13, 0.12, 0.12], neons: [[1, 0.85, 0.4], [0.3, 0.9, 0.9], [0.9, 0.7, 0.3], [0.7, 0.9, 1]] },
  { id: 'seoul', label: '🌃 Seoul', sky: [0.04, 0.05, 0.09], building: [0.09, 0.09, 0.14], neons: [[0.3, 0.8, 1], [1, 0.3, 0.6], [0.5, 1, 0.8], [0.8, 0.5, 1]] },
];

// Spawn weights for variety. Hazards end the run (except when turbo-smashed);
// charge refills battery, turbo grants the boost.
const SPAWN_TABLE: { kind: Kind; w: number }[] = [
  { kind: 'cone', w: 16 },
  { kind: 'barrier', w: 12 },
  { kind: 'pothole', w: 10 },
  { kind: 'deer', w: 10 },
  { kind: 'bear', w: 7 },
  { kind: 'police', w: 9 },
  { kind: 'bus', w: 8 },
  { kind: 'charge', w: 18 },
  { kind: 'turbo', w: 6 },
];
const HAZARDS: Kind[] = ['cone', 'barrier', 'pothole', 'deer', 'bear', 'police', 'bus'];

/**
 * Endless lane-dodger. Steer your EV across 3 lanes to dodge a variety of
 * hazards — cones, barriers, potholes, deer, bears (they punch you!), police
 * cars, and buses — while grabbing ⚡ charge to stay alive and ⚡⚡ turbo for a
 * 4-second speed boost with a 3D camera rush that smashes through anything.
 */
export default function DriveGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [battery, setBattery] = useState(100);
  const [turbo, setTurbo] = useState(0); // remaining turbo seconds (for HUD)
  const [deathMsg, setDeathMsg] = useState('Crash!');
  const [themeId, setThemeId] = useState('tokyo');
  const applyThemeRef = useRef<(t: Theme) => void>(() => {});

  const stateRef = useRef({
    phase: 'idle' as Phase,
    lane: 1,
    targetX: 0,
    speed: 22,
    score: 0,
    battery: 100,
    turbo: 0,
    shake: 0,
    entities: [] as Entity[],
    spawnTimer: 0,
    elapsed: 0,
  });
  const apiRef = useRef<{ steer: (dir: number) => void; start: () => void }>({ steer: () => {}, start: () => {} });

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem('ev-drive-best') || '0');
      if (b) setBest(b);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogColor = new BABYLON.Color3(0.05, 0.07, 0.12);
    scene.fogStart = 38;
    scene.fogEnd = 78;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1, -12));
    const BASE_CAM = new BABYLON.Vector3(0, 7, 12);
    const TURBO_CAM = new BABYLON.Vector3(0, 4.4, 8.2); // lower + closer during turbo
    const baseFov = camera.fov;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.2), scene);
    hemi.intensity = 0.85;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.5, -1, 0.4), scene);
    sun.intensity = 0.8;
    const glow = new BABYLON.GlowLayer('g', scene);
    glow.intensity = 0.6;

    // --- Road ---
    const roadMat = new BABYLON.StandardMaterial('road', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.12);
    roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const grassMat = new BABYLON.StandardMaterial('grass', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.05, 0.12, 0.08);
    grassMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 60, height: 220 }, scene);
    ground.material = grassMat;
    ground.position.z = -55;

    const roadTiles: BABYLON.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const road = BABYLON.MeshBuilder.CreateGround('road' + i, { width: 11, height: ROAD_LEN }, scene);
      road.material = roadMat;
      road.position.set(0, 0.02, -i * ROAD_LEN);
      roadTiles.push(road);
    }
    const markMat = new BABYLON.StandardMaterial('mark', scene);
    markMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.4);
    markMat.disableLighting = true;
    const laneMarks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const m = BABYLON.MeshBuilder.CreateBox('m' + i, { width: 0.18, height: 0.02, depth: 1.4 }, scene);
      m.material = markMat;
      m.position.set(i % 2 === 0 ? -1.5 : 1.5, 0.04, -i * 4);
      laneMarks.push(m);
    }
    // Roadside speed streaks (more visible during turbo).
    const streakMat = new BABYLON.StandardMaterial('streak', scene);
    streakMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 0.9);
    streakMat.disableLighting = true;
    const streaks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const s = BABYLON.MeshBuilder.CreateBox('st' + i, { width: 0.1, height: 0.1, depth: 2 }, scene);
      s.material = streakMat;
      s.position.set(i % 2 === 0 ? -6.2 : 6.2, 1 + Math.random() * 2, -i * 6);
      s.visibility = 0;
      streaks.push(s);
    }

    // --- Themed city skyline (two rows of scrolling neon buildings) ---
    const buildingMat = new BABYLON.StandardMaterial('bld', scene);
    buildingMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.14);
    buildingMat.specularColor = new BABYLON.Color3(0, 0, 0);
    interface Bld { mesh: BABYLON.Mesh; neon: BABYLON.StandardMaterial; }
    const buildings: Bld[] = [];
    const BUILDING_SPAN = 160;
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const h = 6 + Math.random() * 18;
      const w = 3 + Math.random() * 3;
      const b = BABYLON.MeshBuilder.CreateBox('bld' + i, { width: w, height: h, depth: 3.5 }, scene);
      b.material = buildingMat;
      b.position.set(side * (9 + Math.random() * 7), h / 2, -((i / 2) | 0) * (BUILDING_SPAN / 14) - 6);
      // Emissive "windows" strip facing the road.
      const neon = new BABYLON.StandardMaterial('neon' + i, scene);
      neon.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.9);
      neon.disableLighting = true;
      const sign = BABYLON.MeshBuilder.CreateBox('sign' + i, { width: 0.2, height: h * 0.7, depth: 1.6 }, scene);
      sign.material = neon;
      sign.position.set(side * (9 + Math.random() * 7) - side * (w / 2), h * 0.5, b.position.z);
      sign.parent = b; // move with the building
      sign.position = new BABYLON.Vector3(-side * (w / 2 + 0.1), 0, 0);
      buildings.push({ mesh: b, neon });
    }

    const applyTheme = (t: Theme) => {
      scene.clearColor = new BABYLON.Color4(t.sky[0], t.sky[1], t.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(t.sky[0], t.sky[1], t.sky[2]);
      buildingMat.diffuseColor = new BABYLON.Color3(t.building[0], t.building[1], t.building[2]);
      buildings.forEach((b, i) => {
        const c = t.neons[i % t.neons.length];
        b.neon.emissiveColor = new BABYLON.Color3(c[0], c[1], c[2]);
      });
    };
    applyThemeRef.current = applyTheme;
    applyTheme(THEMES.find((t) => t.id === themeId) || THEMES[0]);

    // --- Player car ---
    const car = new BABYLON.TransformNode('car', scene);
    const carMat = new BABYLON.PBRMaterial('carMat', scene);
    carMat.albedoColor = new BABYLON.Color3(0.12, 0.5, 0.42);
    carMat.metallic = 0.6;
    carMat.roughness = 0.3;
    const glassMat = new BABYLON.PBRMaterial('cg', scene);
    glassMat.albedoColor = new BABYLON.Color3(0.04, 0.09, 0.14);
    glassMat.alpha = 0.6;
    glassMat.roughness = 0.05;
    const cbody = BABYLON.MeshBuilder.CreateBox('cb', { width: 2, height: 0.7, depth: 3.6 }, scene);
    cbody.position.y = 0.7; cbody.material = carMat; cbody.parent = car;
    const ccab = BABYLON.MeshBuilder.CreateBox('cc', { width: 1.7, height: 0.6, depth: 1.9 }, scene);
    ccab.position.set(0, 1.25, -0.2); ccab.material = glassMat; ccab.parent = car;
    const tireMat = new BABYLON.StandardMaterial('t', scene);
    tireMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    for (const [x, z] of [[1, 1.1], [-1, 1.1], [1, -1.1], [-1, -1.1]] as [number, number][]) {
      const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 18 }, scene);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = car;
    }
    const hl = new BABYLON.StandardMaterial('hl', scene);
    hl.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.7);
    for (const x of [0.6, -0.6]) {
      const beam = BABYLON.MeshBuilder.CreateBox('beam', { width: 0.25, height: 0.18, depth: 0.2 }, scene);
      beam.position.set(x, 0.6, -1.85); beam.material = hl; beam.parent = car;
    }
    // Turbo flame trail (hidden until boosting).
    const flameMat = new BABYLON.StandardMaterial('flame', scene);
    flameMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 1);
    flameMat.disableLighting = true;
    const flame = BABYLON.MeshBuilder.CreateCylinder('fl', { diameterTop: 0, diameterBottom: 0.7, height: 2, tessellation: 12 }, scene);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0.6, 2.4); flame.material = flameMat; flame.parent = car; flame.visibility = 0;

    // Bear "punch" fist (swings in on a bear hit).
    const fistMat = new BABYLON.StandardMaterial('fist', scene);
    fistMat.diffuseColor = new BABYLON.Color3(0.4, 0.26, 0.14);
    const fist = BABYLON.MeshBuilder.CreateSphere('fist', { diameter: 2 }, scene);
    fist.material = fistMat;
    fist.position.set(0, 3, -30);
    fist.setEnabled(false);

    // --- Materials reused by factories ---
    const mkMat = (name: string, c: BABYLON.Color3, em?: BABYLON.Color3) => {
      const m = new BABYLON.StandardMaterial(name, scene);
      m.diffuseColor = c;
      if (em) m.emissiveColor = em;
      m.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      return m;
    };
    const orange = mkMat('orange', new BABYLON.Color3(0.85, 0.35, 0.05), new BABYLON.Color3(0.25, 0.08, 0));
    const white = mkMat('white', new BABYLON.Color3(0.95, 0.95, 0.95));
    const yellow = mkMat('yellow', new BABYLON.Color3(0.9, 0.75, 0.1), new BABYLON.Color3(0.2, 0.16, 0));
    const dark = mkMat('dk', new BABYLON.Color3(0.06, 0.06, 0.08));
    const deerMat = mkMat('deer', new BABYLON.Color3(0.5, 0.34, 0.18));
    const bearMat = mkMat('bear', new BABYLON.Color3(0.28, 0.18, 0.1));
    const copBody = mkMat('cop', new BABYLON.Color3(0.9, 0.9, 0.95));
    const copDoor = mkMat('copd', new BABYLON.Color3(0.05, 0.07, 0.15));
    const busMat = mkMat('bus', new BABYLON.Color3(0.85, 0.6, 0.1));
    const chgMat = mkMat('chg', new BABYLON.Color3(0.1, 0.5, 0.4), new BABYLON.Color3(0.15, 0.85, 0.6));
    chgMat.disableLighting = true;
    const turboMat = mkMat('tb', new BABYLON.Color3(0.2, 0.4, 0.9), new BABYLON.Color3(0.3, 0.6, 1));
    turboMat.disableLighting = true;

    const box = (parent: BABYLON.TransformNode, w: number, h: number, d: number, pos: [number, number, number], mat: BABYLON.Material) => {
      const m = BABYLON.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene);
      m.position.set(pos[0], pos[1], pos[2]); m.material = mat; m.parent = parent; return m;
    };

    // --- Entity factories ---
    const factories: Record<Kind, () => BABYLON.TransformNode> = {
      cone: () => {
        const n = new BABYLON.TransformNode('cone', scene);
        const c = BABYLON.MeshBuilder.CreateCylinder('c', { diameterTop: 0, diameterBottom: 0.9, height: 1.2, tessellation: 16 }, scene);
        c.material = orange; c.position.y = 0.6; c.parent = n;
        const band = BABYLON.MeshBuilder.CreateCylinder('bd', { diameter: 0.62, height: 0.16, tessellation: 16 }, scene);
        band.material = white; band.position.y = 0.7; band.parent = n;
        return n;
      },
      barrier: () => {
        const n = new BABYLON.TransformNode('bar', scene);
        for (let i = 0; i < 3; i++) box(n, 2.4, 0.28, 0.28, [0, 0.4 + i * 0.001, 0], i % 2 ? white : orange).position.y = 0.45 + i * 0.45;
        box(n, 0.18, 1.4, 0.18, [-1, 0.7, 0], dark);
        box(n, 0.18, 1.4, 0.18, [1, 0.7, 0], dark);
        return n;
      },
      pothole: () => {
        const n = new BABYLON.TransformNode('pot', scene);
        const p = BABYLON.MeshBuilder.CreateCylinder('p', { diameter: 2, height: 0.05, tessellation: 20 }, scene);
        p.material = dark; p.position.y = 0.06; p.parent = n;
        const ring = BABYLON.MeshBuilder.CreateTorus('pr', { diameter: 2, thickness: 0.12, tessellation: 20 }, scene);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; ring.material = yellow; ring.parent = n;
        return n;
      },
      deer: () => {
        const n = new BABYLON.TransformNode('deer', scene);
        box(n, 0.7, 0.7, 1.5, [0, 1, 0], deerMat);
        box(n, 0.5, 0.5, 0.6, [0, 1.45, -0.9], deerMat);
        for (const [x, z] of [[0.25, 0.5], [-0.25, 0.5], [0.25, -0.5], [-0.25, -0.5]] as [number, number][]) box(n, 0.16, 1, 0.16, [x, 0.5, z], deerMat);
        for (const x of [0.18, -0.18]) box(n, 0.08, 0.4, 0.08, [x, 1.85, -0.95], deerMat);
        return n;
      },
      bear: () => {
        const n = new BABYLON.TransformNode('bear', scene);
        box(n, 1.1, 1.2, 1.7, [0, 1.2, 0], bearMat);
        box(n, 0.8, 0.8, 0.8, [0, 2, -0.8], bearMat);
        for (const x of [0.28, -0.28]) box(n, 0.28, 0.28, 0.1, [x, 2.45, -1.1], bearMat); // ears
        for (const [x, z] of [[0.4, 0.6], [-0.4, 0.6], [0.4, -0.5], [-0.4, -0.5]] as [number, number][]) box(n, 0.32, 1.1, 0.32, [x, 0.55, z], bearMat);
        // angry eyes
        for (const x of [0.18, -0.18]) box(n, 0.1, 0.06, 0.06, [x, 2.1, -1.18], white).material = mkMat('eye', new BABYLON.Color3(0.9, 0.1, 0.1), new BABYLON.Color3(0.4, 0, 0));
        return n;
      },
      police: () => {
        const n = new BABYLON.TransformNode('cop', scene);
        box(n, 2, 0.7, 3.6, [0, 0.65, 0], copBody);
        box(n, 2, 0.7, 1.2, [0, 0.65, 0.2], copDoor); // dark door panel
        box(n, 1.7, 0.6, 1.7, [0, 1.2, -0.2], glassMat);
        // light bar
        box(n, 0.5, 0.18, 0.4, [-0.35, 1.6, -0.2], mkMat('red', new BABYLON.Color3(0.9, 0.1, 0.1), new BABYLON.Color3(0.7, 0, 0)));
        box(n, 0.5, 0.18, 0.4, [0.35, 1.6, -0.2], mkMat('blue', new BABYLON.Color3(0.1, 0.3, 0.95), new BABYLON.Color3(0, 0.2, 0.8)));
        for (const [x, z] of [[1, 1.2], [-1, 1.2], [1, -1.2], [-1, -1.2]] as [number, number][]) {
          const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 14 }, scene);
          w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = n;
        }
        return n;
      },
      bus: () => {
        const n = new BABYLON.TransformNode('bus', scene);
        box(n, 2.6, 2.2, 6, [0, 1.4, 0], busMat);
        for (let i = -2; i <= 2; i++) box(n, 0.5, 0.7, 0.06, [0.5, 1.7, i * 1.1], glassMat);
        box(n, 2.5, 0.5, 0.06, [0, 1.7, -3.05], glassMat); // windshield
        for (const [x, z] of [[1.2, 2], [-1.2, 2], [1.2, -2], [-1.2, -2]] as [number, number][]) {
          const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.9, height: 0.35, tessellation: 14 }, scene);
          w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); w.material = tireMat; w.parent = n;
        }
        return n;
      },
      charge: () => {
        const n = new BABYLON.TransformNode('chg', scene);
        const bolt = BABYLON.MeshBuilder.CreateCylinder('bo', { diameter: 1, height: 0.25, tessellation: 6 }, scene);
        bolt.position.y = 1.2; bolt.material = chgMat; bolt.parent = n;
        const ring = BABYLON.MeshBuilder.CreateTorus('cr', { diameter: 1.5, thickness: 0.08, tessellation: 24 }, scene);
        ring.position.y = 1.2; ring.rotation.x = Math.PI / 2; ring.material = chgMat; ring.parent = n;
        return n;
      },
      turbo: () => {
        const n = new BABYLON.TransformNode('tb', scene);
        for (const off of [-0.25, 0.25]) {
          const bolt = BABYLON.MeshBuilder.CreateCylinder('tbo', { diameter: 0.8, height: 0.25, tessellation: 6 }, scene);
          bolt.position.set(off, 1.3, 0); bolt.material = turboMat; bolt.parent = n;
        }
        const ring = BABYLON.MeshBuilder.CreateTorus('tr', { diameter: 1.7, thickness: 0.1, tessellation: 24 }, scene);
        ring.position.y = 1.3; ring.rotation.x = Math.PI / 2; ring.material = turboMat; ring.parent = n;
        return n;
      },
    };

    const totalW = SPAWN_TABLE.reduce((s, r) => s + r.w, 0);
    const pickKind = (): Kind => {
      let r = Math.random() * totalW;
      for (const row of SPAWN_TABLE) { if ((r -= row.w) <= 0) return row.kind; }
      return 'cone';
    };

    const st = stateRef.current;
    const clearEntities = () => { for (const e of st.entities) e.mesh.dispose(); st.entities = []; };

    const spawn = () => {
      const kind = pickKind();
      const lane = Math.floor(Math.random() * 3);
      const mesh = factories[kind]();
      mesh.position.set(LANES[lane], 0, SPAWN_Z);
      st.entities.push({ mesh, kind, lane, z: SPAWN_Z, wobble: Math.random() * 6 });
    };

    apiRef.current.steer = (dir) => {
      if (st.phase !== 'playing') return;
      st.lane = Math.max(0, Math.min(2, st.lane + dir));
      st.targetX = LANES[st.lane];
    };
    apiRef.current.start = () => {
      clearEntities();
      st.phase = 'playing';
      st.lane = 1; st.targetX = 0; st.speed = 22; st.score = 0; st.battery = 100;
      st.turbo = 0; st.shake = 0; st.spawnTimer = 0; st.elapsed = 0;
      car.position.set(0, 0, 0);
      fist.setEnabled(false);
      setPhase('playing'); setScore(0); setBattery(100); setTurbo(0);
    };

    const endGame = (msg: string) => {
      st.phase = 'over';
      setDeathMsg(msg);
      setPhase('over');
      const finalScore = Math.floor(st.score);
      setScore(finalScore);
      setBest((prev) => {
        const nb = Math.max(prev, finalScore);
        try { localStorage.setItem('ev-drive-best', String(nb)); } catch { /* ignore */ }
        return nb;
      });
      record('feature:drivegame');
      if (finalScore >= 500) record('drive:500');
    };

    let animFrame = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      animFrame += dt;
      const turboing = st.turbo > 0;

      const v = st.phase === 'playing' ? st.speed * (turboing ? 1.8 : 1) : 6;
      for (const r of roadTiles) { r.position.z += v * dt; if (r.position.z > ROAD_LEN / 2) r.position.z -= ROAD_LEN * 2; }
      for (const m of laneMarks) { m.position.z += v * dt; if (m.position.z > 8) m.position.z -= 160; }
      for (const s of streaks) {
        s.position.z += v * dt * 1.6;
        if (s.position.z > 10) s.position.z -= 144;
        s.visibility = turboing ? 0.9 : 0;
      }
      for (const b of buildings) {
        b.mesh.position.z += v * dt;
        if (b.mesh.position.z > 16) b.mesh.position.z -= 160;
      }

      // Car lane easing + bank.
      car.position.x += (st.targetX - car.position.x) * Math.min(1, dt * 10);
      car.rotation.z = (car.position.x - st.targetX) * 0.12;
      car.rotation.y = (st.targetX - car.position.x) * 0.06;
      flame.visibility = turboing ? 0.9 : 0;
      flame.scaling.z = 1 + Math.sin(animFrame * 30) * 0.3;

      // --- Camera: 3D rush during turbo (pull in, lower, widen FOV) + shake ---
      const camTarget = turboing ? TURBO_CAM : BASE_CAM;
      camera.position.x += (camTarget.x - camera.position.x) * Math.min(1, dt * 4);
      camera.position.y += (camTarget.y - camera.position.y) * Math.min(1, dt * 4);
      camera.position.z += (camTarget.z - camera.position.z) * Math.min(1, dt * 4);
      const fovTarget = turboing ? baseFov * 1.35 : baseFov;
      camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 5);
      if (st.shake > 0) {
        camera.position.x += (Math.random() - 0.5) * st.shake;
        camera.position.y += (Math.random() - 0.5) * st.shake;
        st.shake = Math.max(0, st.shake - dt * 1.6);
      }
      camera.setTarget(new BABYLON.Vector3(car.position.x * 0.4, 1, -12));

      if (st.phase === 'playing') {
        st.elapsed += dt;
        st.speed = 22 + st.elapsed * 0.6;
        st.score += st.speed * dt * (turboing ? 1.4 : 0.6);
        st.battery = Math.max(0, st.battery - dt * 2.2);
        if (turboing) st.turbo = Math.max(0, st.turbo - dt);

        st.spawnTimer -= dt;
        const interval = Math.max(0.45, 1.4 - st.elapsed * 0.013);
        if (st.spawnTimer <= 0) { spawn(); st.spawnTimer = interval; }

        for (const e of st.entities) {
          e.z += st.speed * dt * (turboing ? 1.8 : 1);
          e.mesh.position.z = e.z;
          if (e.kind === 'charge' || e.kind === 'turbo') { e.mesh.rotation.y += dt * 3; e.mesh.position.y = Math.sin(animFrame * 3 + e.wobble) * 0.15; }
          if (e.kind === 'deer') e.mesh.position.x = LANES[e.lane] + Math.sin(animFrame * 2 + e.wobble) * 0.5;
          if (e.kind === 'bear') e.mesh.position.x = LANES[e.lane] + Math.sin(animFrame * 1.3 + e.wobble) * 0.3;

          const hitZ = e.z > -1.8 && e.z < 1.8;
          const sameLane = Math.abs(e.mesh.position.x - car.position.x) < (e.kind === 'bus' ? 2 : 1.6);
          if (!e.hit && hitZ && sameLane) {
            e.hit = true;
            if (e.kind === 'charge') { st.battery = Math.min(100, st.battery + 22); st.score += 25; e.mesh.dispose(); }
            else if (e.kind === 'turbo') { st.turbo = TURBO_TIME; st.score += 40; record('drive:turbo'); e.mesh.dispose(); }
            else if (turboing) { st.score += 30; st.shake = 0.5; e.mesh.dispose(); } // smash through during turbo
            else if (e.kind === 'bear') {
              // Bear punches you: swing the fist in + big shake, then end.
              fist.setEnabled(true);
              fist.position.set(car.position.x, 2.5, e.z);
              st.shake = 1.4;
              endGame('A bear punched you! 🐻👊');
            }
            else if (e.kind === 'police') { st.shake = 1; endGame('Busted by the police! 🚓'); }
            else if (e.kind === 'bus') { st.shake = 1.2; endGame('Rear-ended a bus! 🚌'); }
            else if (e.kind === 'deer') { st.shake = 1; endGame('You hit a deer! 🦌'); }
            else if (e.kind === 'pothole') { st.shake = 0.8; endGame('Wrecked in a pothole! 🕳️'); }
            else { st.shake = 1; endGame('Crash! 🚧'); }
          }
        }
        st.entities = st.entities.filter((e) => {
          if (e.hit && (e.kind === 'charge' || e.kind === 'turbo' || turboing)) return false;
          if (e.z > 16) { e.mesh.dispose(); return false; }
          return true;
        });

        if (st.battery <= 0 && st.phase === 'playing') endGame('Out of charge! 🔋');

        if (Math.floor(st.elapsed * 5) !== Math.floor((st.elapsed - dt) * 5)) {
          setScore(Math.floor(st.score));
          setBattery(Math.round(st.battery));
          setTurbo(Math.ceil(st.turbo));
        }
      }
    });

    engine.runRenderLoop(() => scene.render());

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft' || ev.key.toLowerCase() === 'a') { apiRef.current.steer(-1); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight' || ev.key.toLowerCase() === 'd') { apiRef.current.steer(1); ev.preventDefault(); }
      else if ((ev.key === ' ' || ev.key === 'Enter') && st.phase !== 'playing') { apiRef.current.start(); }
    };
    window.addEventListener('keydown', onKey);

    let downX: number | null = null;
    const onDown = (e: PointerEvent) => { downX = e.clientX; };
    const onUp = (e: PointerEvent) => {
      if (downX == null) return;
      const dx = e.clientX - downX;
      if (Math.abs(dx) > 24) apiRef.current.steer(dx > 0 ? 1 : -1);
      downX = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      scene.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply the city theme to the live scene when the picker changes.
  useEffect(() => {
    const t = THEMES.find((x) => x.id === themeId);
    if (t) applyThemeRef.current(t);
  }, [themeId]);

  const battColor = battery < 20 ? 'var(--danger)' : battery < 50 ? 'var(--warn)' : 'var(--accent)';

  return (
    <div className="canvas-frame" style={{ minHeight: 460 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '460px', display: 'block', touchAction: 'none' }} />

      {/* HUD */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 12, pointerEvents: 'none' }}>
        <div style={hud}>
          <div className="small muted">Score</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{score}</div>
        </div>
        <div style={{ ...hud, flex: 1, maxWidth: 220 }}>
          <div className="small muted">{turbo > 0 ? `⚡ TURBO ${turbo}s` : 'Battery'}</div>
          <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: turbo > 0 ? `${(turbo / TURBO_TIME) * 100}%` : `${battery}%`, height: '100%', background: turbo > 0 ? 'var(--accent-2)' : battColor, transition: 'width 0.2s linear' }} />
          </div>
        </div>
        <div style={hud}>
          <div className="small muted">Best</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)' }}>{best}</div>
        </div>
      </div>

      {/* Start / Game-over overlay */}
      {phase !== 'playing' && (
        <div style={overlay}>
          <div style={{ textAlign: 'center', maxWidth: 460, padding: 20 }}>
            {phase === 'over' ? (
              <>
                <div style={{ fontSize: '2.4rem' }}>💥</div>
                <h3 style={{ margin: '6px 0' }}>{deathMsg}</h3>
                <p className="muted">You scored <strong style={{ color: 'var(--accent)' }}>{score}</strong>{score >= best && score > 0 ? ' — new best! 🎉' : ''}.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.4rem' }}>🏎️⚡</div>
                <h3 style={{ margin: '6px 0' }}>EV Dodge</h3>
                <p className="muted" style={{ margin: '0 0 6px' }}>
                  Dodge 🚧 cones, 🚧 barriers, 🕳️ potholes, 🦌 deer, 🐻 bears (they punch!), 🚓 police, and 🚌 buses.
                  Grab ⚡ charge to stay alive and ⚡⚡ <strong>turbo</strong> for a 4-second boost that smashes through anything!
                </p>
                <p className="small muted">Steer: ← → / A D keys, on-screen buttons, or swipe.</p>
              </>
            )}
            <div style={{ marginTop: 14 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>City</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`btn ${themeId === t.id ? 'primary' : 'ghost'}`}
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    onClick={() => setThemeId(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn primary" style={{ marginTop: 14 }} onClick={() => apiRef.current.start()}>
              {phase === 'over' ? '↻ Play again' : '▶ Start driving'}
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button style={steerBtn} onClick={() => apiRef.current.steer(-1)} aria-label="Steer left">‹</button>
          <button style={steerBtn} onClick={() => apiRef.current.steer(1)} aria-label="Steer right">›</button>
        </div>
      )}
    </div>
  );
}

const hud: React.CSSProperties = {
  background: 'rgba(10,14,20,0.72)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '6px 12px',
};
const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(8,11,17,0.74)',
  backdropFilter: 'blur(3px)',
};
const steerBtn: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'rgba(19,28,43,0.85)',
  color: 'var(--text)',
  fontSize: '2rem',
  cursor: 'pointer',
};
