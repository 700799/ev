'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { buildCar, createCarMaterials, type CarConfig } from '@/lib/carBuilder';
import type { BodyType, WheelStyle } from '@/data/configSpecs';

// Load the car saved by the configurator so the game uses YOUR build.
function loadSavedCar(): CarConfig {
  const fallback: CarConfig = { body: 'sedan', paint: '#5aa392', wheel: 'sport', accessories: [] };
  try {
    const raw = localStorage.getItem('ev-build-v1');
    if (!raw) return fallback;
    const o = JSON.parse(raw);
    return {
      body: (o.body as BodyType) || 'sedan',
      paint: o.paint || '#5aa392',
      wheel: (o.wheel as WheelStyle) || 'sport',
      accessories: Array.isArray(o.accessories) ? o.accessories : [],
    };
  } catch { return fallback; }
}

type Phase = 'idle' | 'playing' | 'shop' | 'over';
type Kind =
  | 'cone' | 'barrier' | 'pothole' | 'deer' | 'bear' | 'police' | 'bus'
  | 'oilslick' | 'gap' | 'neighbor' | 'turkey' | 'featherbag'
  | 'charge' | 'turbo' | 'boostpad' | 'coin';

interface Entity {
  mesh: BABYLON.TransformNode;
  kind: Kind;
  lane: number;
  z: number;
  wobble: number;
  hit?: boolean;
  vy?: number; // for falling feather bags
  drift?: number; // for neighbor cars closing in
}

const LANES = [-3, 0, 3];
const ROAD_LEN = 80;
const SPAWN_Z = -72;
const TURBO_TIME = 4;

/** Fire device haptics where supported (mobile). */
function haptic(pattern: number | number[]) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}

interface Theme { id: string; label: string; sky: [number, number, number]; building: [number, number, number]; neons: [number, number, number][]; }
const THEMES: Theme[] = [
  { id: 'tokyo', label: '🗼 Tokyo', sky: [0.04, 0.03, 0.09], building: [0.08, 0.07, 0.14], neons: [[0.95, 0.15, 0.5], [0.2, 0.7, 1], [0.7, 0.2, 1], [1, 0.4, 0.1]] },
  { id: 'nyc', label: '🗽 New York', sky: [0.05, 0.06, 0.1], building: [0.1, 0.1, 0.13], neons: [[1, 0.8, 0.3], [0.9, 0.9, 1], [1, 0.5, 0.2], [0.6, 0.8, 1]] },
  { id: 'vegas', label: '🎰 Las Vegas', sky: [0.07, 0.04, 0.1], building: [0.12, 0.09, 0.14], neons: [[1, 0.2, 0.3], [1, 0.85, 0.1], [0.3, 1, 0.5], [0.9, 0.3, 1]] },
  { id: 'dubai', label: '🏙️ Dubai', sky: [0.06, 0.07, 0.1], building: [0.13, 0.12, 0.12], neons: [[1, 0.85, 0.4], [0.3, 0.9, 0.9], [0.9, 0.7, 0.3], [0.7, 0.9, 1]] },
  { id: 'seoul', label: '🌃 Seoul', sky: [0.04, 0.05, 0.09], building: [0.09, 0.09, 0.14], neons: [[0.3, 0.8, 1], [1, 0.3, 0.6], [0.5, 1, 0.8], [0.8, 0.5, 1]] },
];

// Crashing hazards force a pull-over; the others have special effects.
const SPAWN_TABLE: { kind: Kind; w: number }[] = [
  { kind: 'cone', w: 11 },
  { kind: 'barrier', w: 9 },
  { kind: 'pothole', w: 8 },
  { kind: 'deer', w: 8 },
  { kind: 'bear', w: 5 },
  { kind: 'police', w: 6 },
  { kind: 'bus', w: 6 },
  { kind: 'oilslick', w: 8 },
  { kind: 'gap', w: 6 },
  { kind: 'neighbor', w: 7 },
  { kind: 'turkey', w: 6 },
  { kind: 'charge', w: 14 },
  { kind: 'coin', w: 12 },
  { kind: 'turbo', w: 5 },
  { kind: 'boostpad', w: 5 },
];

interface Gadget {
  id: string; icon: string; name: string; cost: number; desc: string;
}
const GADGETS: Gadget[] = [
  { id: 'repair', icon: '🔧', name: 'Repair Kit', cost: 40, desc: 'Patch up and refill the battery to 100%.' },
  { id: 'shield', icon: '🛡️', name: 'Crash Shield', cost: 80, desc: 'Shrug off your next crash for free.' },
  { id: 'bullbar', icon: '🐂', name: 'Bull Bar', cost: 120, desc: 'Smash through cones, barriers & potholes.' },
  { id: 'offroad', icon: '🛞', name: 'Off-Road Tires', cost: 100, desc: 'Never spin out on oil slicks again.' },
  { id: 'jumpjets', icon: '🦘', name: 'Jump Jets', cost: 150, desc: 'Auto-hop over gaps in the road.' },
  { id: 'spotlights', icon: '🔦', name: 'Spotlights', cost: 60, desc: '+25% coins from every pickup.' },
  { id: 'turbocell', icon: '⚡', name: 'Turbo Cell', cost: 90, desc: 'Launch back on the road with 4s of turbo.' },
  { id: 'magnet', icon: '🧲', name: 'Coin Magnet', cost: 110, desc: 'Pull nearby coins & charge toward you.' },
];

export default function DriveGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [battery, setBattery] = useState(100);
  const [turbo, setTurbo] = useState(0);
  const [cash, setCash] = useState(0);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [crashMsg, setCrashMsg] = useState('Crash!');
  const [featherView, setFeatherView] = useState(0); // 0..1 screen obscure
  const [themeId, setThemeId] = useState('tokyo');
  const applyThemeRef = useRef<(t: Theme) => void>(() => {});

  const st = useRef({
    phase: 'idle' as Phase,
    lane: 1, targetX: 0, speed: 22, score: 0, battery: 100, turbo: 0, cash: 0,
    shake: 0, spin: 0, jump: 0, control: true, featherTimer: 0, slowTimer: 0,
    shieldUntilHit: false, coinMult: 1,
    owned: new Set<string>(),
    entities: [] as Entity[], spawnTimer: 0, elapsed: 0, planeTimer: 6,
  });
  const apiRef = useRef<{ steer: (d: number) => void; start: () => void; buy: (g: Gadget) => void; resume: () => void }>({
    steer: () => {}, start: () => {}, buy: () => {}, resume: () => {},
  });

  useEffect(() => {
    try { const b = Number(localStorage.getItem('ev-drive-best') || '0'); if (b) setBest(b); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogColor = new BABYLON.Color3(0.05, 0.07, 0.12);
    scene.fogStart = 38; scene.fogEnd = 80;

    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1, -12));
    const BASE_CAM = new BABYLON.Vector3(0, 7, 12);
    const TURBO_CAM = new BABYLON.Vector3(0, 4.4, 8.2);
    const baseFov = camera.fov;

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.2), scene); hemi.intensity = 0.85;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.5, -1, 0.4), scene); sun.intensity = 0.8;
    const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;

    const roadMat = new BABYLON.StandardMaterial('road', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.12); roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const grassMat = new BABYLON.StandardMaterial('grass', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.05, 0.12, 0.08); grassMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const ground = BABYLON.MeshBuilder.CreateGround('grnd', { width: 60, height: 220 }, scene);
    ground.material = grassMat; ground.position.z = -55;

    const roadTiles: BABYLON.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const road = BABYLON.MeshBuilder.CreateGround('road' + i, { width: 11, height: ROAD_LEN }, scene);
      road.material = roadMat; road.position.set(0, 0.02, -i * ROAD_LEN); roadTiles.push(road);
    }
    const markMat = new BABYLON.StandardMaterial('mark', scene);
    markMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.4); markMat.disableLighting = true;
    const laneMarks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const m = BABYLON.MeshBuilder.CreateBox('m' + i, { width: 0.18, height: 0.02, depth: 1.4 }, scene);
      m.material = markMat; m.position.set(i % 2 === 0 ? -1.5 : 1.5, 0.04, -i * 4); laneMarks.push(m);
    }
    const streakMat = new BABYLON.StandardMaterial('streak', scene);
    streakMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 0.9); streakMat.disableLighting = true;
    const streaks: BABYLON.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const s = BABYLON.MeshBuilder.CreateBox('st' + i, { width: 0.1, height: 0.1, depth: 2 }, scene);
      s.material = streakMat; s.position.set(i % 2 === 0 ? -6.2 : 6.2, 1 + Math.random() * 2, -i * 6); s.visibility = 0; streaks.push(s);
    }

    const buildingMat = new BABYLON.StandardMaterial('bld', scene);
    buildingMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.14); buildingMat.specularColor = new BABYLON.Color3(0, 0, 0);
    interface Bld { mesh: BABYLON.Mesh; neon: BABYLON.StandardMaterial; }
    const buildings: Bld[] = [];
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const h = 6 + Math.random() * 18; const w = 3 + Math.random() * 3;
      const b = BABYLON.MeshBuilder.CreateBox('bld' + i, { width: w, height: h, depth: 3.5 }, scene);
      b.material = buildingMat; b.position.set(side * (9 + Math.random() * 7), h / 2, -((i / 2) | 0) * (160 / 14) - 6);
      const neon = new BABYLON.StandardMaterial('neon' + i, scene);
      neon.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.9); neon.disableLighting = true;
      const sign = BABYLON.MeshBuilder.CreateBox('sign' + i, { width: 0.2, height: h * 0.7, depth: 1.6 }, scene);
      sign.material = neon; sign.parent = b; sign.position = new BABYLON.Vector3(-side * (w / 2 + 0.1), 0, 0);
      buildings.push({ mesh: b, neon });
    }
    const applyTheme = (t: Theme) => {
      scene.clearColor = new BABYLON.Color4(t.sky[0], t.sky[1], t.sky[2], 1);
      scene.fogColor = new BABYLON.Color3(t.sky[0], t.sky[1], t.sky[2]);
      buildingMat.diffuseColor = new BABYLON.Color3(t.building[0], t.building[1], t.building[2]);
      buildings.forEach((b, i) => { const c = t.neons[i % t.neons.length]; b.neon.emissiveColor = new BABYLON.Color3(c[0], c[1], c[2]); });
    };
    applyThemeRef.current = applyTheme;
    applyTheme(THEMES.find((t) => t.id === themeId) || THEMES[0]);

    // --- Player car: render the exact car built in the configurator ---
    const car = new BABYLON.TransformNode('car', scene);
    const glassMat = new BABYLON.PBRMaterial('cg', scene); // also reused by obstacle factories
    glassMat.albedoColor = new BABYLON.Color3(0.04, 0.09, 0.14); glassMat.alpha = 0.6; glassMat.roughness = 0.05;
    const tireMat = new BABYLON.StandardMaterial('t', scene); tireMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    const carMats = createCarMaterials(scene);
    const playerCfg = loadSavedCar();
    const builtCar = buildCar(scene, carMats, playerCfg);
    // The configurator car points +X; rotate to face down the track (-Z) and
    // scale it to fit the three lanes.
    builtCar.node.rotation.y = -Math.PI / 2;
    builtCar.node.scaling.setAll(0.62);
    builtCar.node.parent = car;
    const flameMat = new BABYLON.StandardMaterial('flame', scene);
    flameMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 1); flameMat.disableLighting = true;
    const flame = BABYLON.MeshBuilder.CreateCylinder('fl', { diameterTop: 0, diameterBottom: 0.7, height: 2, tessellation: 12 }, scene);
    flame.rotation.x = Math.PI / 2; flame.position.set(0, 0.6, 2.4); flame.material = flameMat; flame.parent = car; flame.visibility = 0;
    const fistMat = new BABYLON.StandardMaterial('fist', scene); fistMat.diffuseColor = new BABYLON.Color3(0.4, 0.26, 0.14);
    const fist = BABYLON.MeshBuilder.CreateSphere('fist', { diameter: 2 }, scene); fist.material = fistMat; fist.setEnabled(false);

    // Gadget visuals attached to the car when owned.
    const gadgetMeshes: Record<string, BABYLON.Mesh> = {};
    const showGadget = (id: string) => {
      if (gadgetMeshes[id]) return;
      let m: BABYLON.Mesh | null = null;
      if (id === 'bullbar') {
        m = BABYLON.MeshBuilder.CreateBox('gb', { width: 1.9, height: 0.3, depth: 0.2 }, scene);
        m.position.set(0, 0.5, -1.95);
        const mm = new BABYLON.StandardMaterial('gbm', scene); mm.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.65); mm.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.12); m.material = mm;
      } else if (id === 'spotlights') {
        m = BABYLON.MeshBuilder.CreateBox('gs', { width: 1.4, height: 0.16, depth: 0.16 }, scene);
        m.position.set(0, 1.7, -0.2);
        const mm = new BABYLON.StandardMaterial('gsm', scene); mm.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.7); mm.disableLighting = true; m.material = mm;
      } else if (id === 'magnet') {
        m = BABYLON.MeshBuilder.CreateTorus('gm', { diameter: 0.7, thickness: 0.12, tessellation: 16 }, scene);
        m.position.set(0, 1.9, 0.4);
        const mm = new BABYLON.StandardMaterial('gmm', scene); mm.emissiveColor = new BABYLON.Color3(0.9, 0.2, 0.3); mm.disableLighting = true; m.material = mm;
      } else if (id === 'offroad') {
        // thicker tire skirts
        m = BABYLON.MeshBuilder.CreateBox('go', { width: 2.2, height: 0.25, depth: 3.4 }, scene);
        m.position.set(0, 0.28, 0);
        const mm = new BABYLON.StandardMaterial('gom', scene); mm.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.09); m.material = mm;
      }
      if (m) { m.parent = car; gadgetMeshes[id] = m; }
    };

    const mkMat = (name: string, c: BABYLON.Color3, em?: BABYLON.Color3) => {
      const m = new BABYLON.StandardMaterial(name, scene); m.diffuseColor = c; if (em) m.emissiveColor = em; m.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); return m;
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
    const neighborMat = mkMat('nb', new BABYLON.Color3(0.7, 0.2, 0.25));
    const oilMat = mkMat('oil', new BABYLON.Color3(0.02, 0.02, 0.04), new BABYLON.Color3(0.05, 0.04, 0.08));
    const gapMat = mkMat('gap', new BABYLON.Color3(0.01, 0.01, 0.02));
    const turkeyMat = mkMat('turkey', new BABYLON.Color3(0.35, 0.18, 0.1));
    const featherMat = mkMat('feather', new BABYLON.Color3(0.85, 0.8, 0.7));
    const chgMat = mkMat('chg', new BABYLON.Color3(0.1, 0.5, 0.4), new BABYLON.Color3(0.15, 0.85, 0.6)); chgMat.disableLighting = true;
    const coinMat = mkMat('coin', new BABYLON.Color3(0.9, 0.75, 0.1), new BABYLON.Color3(0.8, 0.6, 0.05)); coinMat.disableLighting = true;
    const turboMat = mkMat('tb', new BABYLON.Color3(0.2, 0.4, 0.9), new BABYLON.Color3(0.3, 0.6, 1)); turboMat.disableLighting = true;
    const boostMat = mkMat('bp', new BABYLON.Color3(0.2, 0.8, 0.5), new BABYLON.Color3(0.2, 0.9, 0.5)); boostMat.disableLighting = true;

    const box = (parent: BABYLON.TransformNode, w: number, h: number, d: number, pos: [number, number, number], mat: BABYLON.Material) => {
      const m = BABYLON.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene);
      m.position.set(pos[0], pos[1], pos[2]); m.material = mat; m.parent = parent; return m;
    };

    // --- Airplane that periodically flies over dropping feather bags ---
    const plane = new BABYLON.TransformNode('plane', scene);
    const planeMat = mkMat('pl', new BABYLON.Color3(0.7, 0.72, 0.78));
    box(plane, 1.4, 0.8, 5, [0, 0, 0], planeMat);
    box(plane, 6, 0.2, 1.2, [0, 0, 0], planeMat); // wings
    box(plane, 2, 0.2, 1, [0, 0.5, 2], planeMat); // tail
    plane.position.set(-40, 24, -40); plane.setEnabled(false);
    let planeActive = false; let planeDropTimer = 0;

    const factories: Record<Kind, () => BABYLON.TransformNode> = {
      cone: () => { const n = new BABYLON.TransformNode('cone', scene); const c = BABYLON.MeshBuilder.CreateCylinder('c', { diameterTop: 0, diameterBottom: 0.9, height: 1.2, tessellation: 16 }, scene); c.material = orange; c.position.y = 0.6; c.parent = n; const band = BABYLON.MeshBuilder.CreateCylinder('bd', { diameter: 0.62, height: 0.16, tessellation: 16 }, scene); band.material = white; band.position.y = 0.7; band.parent = n; return n; },
      barrier: () => { const n = new BABYLON.TransformNode('bar', scene); for (let i = 0; i < 3; i++) box(n, 2.4, 0.28, 0.28, [0, 0.45 + i * 0.45, 0], i % 2 ? white : orange); box(n, 0.18, 1.4, 0.18, [-1, 0.7, 0], dark); box(n, 0.18, 1.4, 0.18, [1, 0.7, 0], dark); return n; },
      pothole: () => { const n = new BABYLON.TransformNode('pot', scene); const p = BABYLON.MeshBuilder.CreateCylinder('p', { diameter: 2, height: 0.05, tessellation: 20 }, scene); p.material = dark; p.position.y = 0.06; p.parent = n; const ring = BABYLON.MeshBuilder.CreateTorus('pr', { diameter: 2, thickness: 0.12, tessellation: 20 }, scene); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; ring.material = yellow; ring.parent = n; return n; },
      deer: () => { const n = new BABYLON.TransformNode('deer', scene); box(n, 0.7, 0.7, 1.5, [0, 1, 0], deerMat); box(n, 0.5, 0.5, 0.6, [0, 1.45, -0.9], deerMat); for (const [x, z] of [[0.25, 0.5], [-0.25, 0.5], [0.25, -0.5], [-0.25, -0.5]] as [number, number][]) box(n, 0.16, 1, 0.16, [x, 0.5, z], deerMat); for (const x of [0.18, -0.18]) box(n, 0.08, 0.4, 0.08, [x, 1.85, -0.95], deerMat); return n; },
      bear: () => { const n = new BABYLON.TransformNode('bear', scene); box(n, 1.1, 1.2, 1.7, [0, 1.2, 0], bearMat); box(n, 0.8, 0.8, 0.8, [0, 2, -0.8], bearMat); for (const x of [0.28, -0.28]) box(n, 0.28, 0.28, 0.1, [x, 2.45, -1.1], bearMat); for (const [x, z] of [[0.4, 0.6], [-0.4, 0.6], [0.4, -0.5], [-0.4, -0.5]] as [number, number][]) box(n, 0.32, 1.1, 0.32, [x, 0.55, z], bearMat); for (const x of [0.18, -0.18]) box(n, 0.1, 0.06, 0.06, [x, 2.1, -1.18], white); return n; },
      police: () => { const n = new BABYLON.TransformNode('cop', scene); box(n, 2, 0.7, 3.6, [0, 0.65, 0], copBody); box(n, 2, 0.7, 1.2, [0, 0.66, 0.2], copDoor); box(n, 1.7, 0.6, 1.7, [0, 1.2, -0.2], glassMat); box(n, 0.5, 0.18, 0.4, [-0.35, 1.6, -0.2], mkMat('red', new BABYLON.Color3(0.9, 0.1, 0.1), new BABYLON.Color3(0.7, 0, 0))); box(n, 0.5, 0.18, 0.4, [0.35, 1.6, -0.2], mkMat('blue', new BABYLON.Color3(0.1, 0.3, 0.95), new BABYLON.Color3(0, 0.2, 0.8))); for (const [x, z] of [[1, 1.2], [-1, 1.2], [1, -1.2], [-1, -1.2]] as [number, number][]) { const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 14 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = n; } return n; },
      bus: () => { const n = new BABYLON.TransformNode('bus', scene); box(n, 2.6, 2.2, 6, [0, 1.4, 0], busMat); for (let i = -2; i <= 2; i++) box(n, 0.5, 0.7, 0.06, [0.5, 1.7, i * 1.1], glassMat); box(n, 2.5, 0.5, 0.06, [0, 1.7, -3.05], glassMat); for (const [x, z] of [[1.2, 2], [-1.2, 2], [1.2, -2], [-1.2, -2]] as [number, number][]) { const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.9, height: 0.35, tessellation: 14 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); w.material = tireMat; w.parent = n; } return n; },
      neighbor: () => { const n = new BABYLON.TransformNode('nb', scene); box(n, 2, 0.7, 3.4, [0, 0.7, 0], neighborMat); box(n, 1.7, 0.6, 1.7, [0, 1.25, -0.2], glassMat); for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]) { const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 0.7, height: 0.3, tessellation: 14 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); w.material = tireMat; w.parent = n; } return n; },
      oilslick: () => { const n = new BABYLON.TransformNode('oil', scene); const p = BABYLON.MeshBuilder.CreateDisc('od', { radius: 1.6, tessellation: 24 }, scene); p.rotation.x = Math.PI / 2; p.position.y = 0.05; p.material = oilMat; p.parent = n; return n; },
      gap: () => { const n = new BABYLON.TransformNode('gap', scene); box(n, 9.5, 0.12, 3.2, [0, 0.03, 0], gapMat); return n; },
      turkey: () => { const n = new BABYLON.TransformNode('turkey', scene); box(n, 0.6, 0.55, 0.9, [0, 1.6, 0], turkeyMat); box(n, 0.3, 0.3, 0.3, [0, 1.85, -0.5], turkeyMat); for (const x of [0.5, -0.5]) { const wing = box(n, 0.7, 0.08, 0.5, [x, 1.65, 0], turkeyMat); wing.rotation.z = x > 0 ? 0.4 : -0.4; } return n; },
      featherbag: () => { const n = new BABYLON.TransformNode('fb', scene); const s = BABYLON.MeshBuilder.CreateSphere('fbs', { diameter: 1, segments: 8 }, scene); s.scaling.y = 1.3; s.position.y = 0.6; s.material = featherMat; s.parent = n; return n; },
      charge: () => { const n = new BABYLON.TransformNode('chg', scene); const bolt = BABYLON.MeshBuilder.CreateCylinder('bo', { diameter: 1, height: 0.25, tessellation: 6 }, scene); bolt.position.y = 1.2; bolt.material = chgMat; bolt.parent = n; const ring = BABYLON.MeshBuilder.CreateTorus('cr', { diameter: 1.5, thickness: 0.08, tessellation: 24 }, scene); ring.position.y = 1.2; ring.rotation.x = Math.PI / 2; ring.material = chgMat; ring.parent = n; return n; },
      coin: () => { const n = new BABYLON.TransformNode('coin', scene); const c = BABYLON.MeshBuilder.CreateCylinder('cn', { diameter: 0.9, height: 0.12, tessellation: 20 }, scene); c.rotation.x = Math.PI / 2; c.position.y = 1.1; c.material = coinMat; c.parent = n; return n; },
      turbo: () => { const n = new BABYLON.TransformNode('tb', scene); for (const off of [-0.25, 0.25]) { const bolt = BABYLON.MeshBuilder.CreateCylinder('tbo', { diameter: 0.8, height: 0.25, tessellation: 6 }, scene); bolt.position.set(off, 1.3, 0); bolt.material = turboMat; bolt.parent = n; } const ring = BABYLON.MeshBuilder.CreateTorus('tr', { diameter: 1.7, thickness: 0.1, tessellation: 24 }, scene); ring.position.y = 1.3; ring.rotation.x = Math.PI / 2; ring.material = turboMat; ring.parent = n; return n; },
      boostpad: () => { const n = new BABYLON.TransformNode('bp', scene); const p = BABYLON.MeshBuilder.CreateBox('bpb', { width: 2.4, height: 0.06, depth: 3 }, scene); p.position.y = 0.06; p.material = boostMat; p.parent = n; for (let i = 0; i < 3; i++) { const a = BABYLON.MeshBuilder.CreateBox('bpa', { width: 1.6, height: 0.08, depth: 0.4 }, scene); a.position.set(0, 0.1, -0.8 + i * 0.8); a.material = white; a.parent = n; } return n; },
    };

    const totalW = SPAWN_TABLE.reduce((s, r) => s + r.w, 0);
    const pickKind = (): Kind => { let r = Math.random() * totalW; for (const row of SPAWN_TABLE) { if ((r -= row.w) <= 0) return row.kind; } return 'cone'; };

    const S = st.current;
    const clearEntities = () => { for (const e of S.entities) e.mesh.dispose(); S.entities = []; };

    const spawn = (kind?: Kind, lane?: number) => {
      const k = kind ?? pickKind();
      const ln = lane ?? Math.floor(Math.random() * 3);
      const mesh = factories[k]();
      mesh.position.set(LANES[ln], 0, SPAWN_Z);
      const e: Entity = { mesh, kind: k, lane: ln, z: SPAWN_Z, wobble: Math.random() * 6 };
      if (k === 'neighbor') e.drift = (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
      S.entities.push(e);
    };

    apiRef.current.steer = (dir) => {
      if (S.phase !== 'playing' || !S.control) return;
      const before = S.lane;
      S.lane = Math.max(0, Math.min(2, S.lane - dir)); // invert: arrows match the view
      S.targetX = LANES[S.lane];
      if (S.lane !== before) haptic(8);
    };

    const resetRun = () => {
      clearEntities();
      S.phase = 'playing'; S.lane = 1; S.targetX = 0; S.speed = 22; S.score = 0; S.battery = 100; S.turbo = 0; S.cash = 0;
      S.shake = 0; S.spin = 0; S.jump = 0; S.control = true; S.featherTimer = 0; S.slowTimer = 0; S.shieldUntilHit = false; S.coinMult = 1;
      S.owned = new Set(); S.spawnTimer = 0; S.elapsed = 0; S.planeTimer = 6;
      for (const id of Object.keys(gadgetMeshes)) { gadgetMeshes[id].dispose(); delete gadgetMeshes[id]; }
      car.position.set(0, 0, 0); car.rotation.set(0, 0, 0); fist.setEnabled(false);
      setOwned(new Set()); setCash(0); setFeatherView(0);
      setPhase('playing'); setScore(0); setBattery(100); setTurbo(0);
    };
    apiRef.current.start = resetRun;

    apiRef.current.resume = () => {
      S.phase = 'playing'; S.control = true; setPhase('playing');
      haptic(20);
    };

    apiRef.current.buy = (g) => {
      if (S.cash < g.cost || S.owned.has(g.id)) return;
      S.cash -= g.cost; S.owned.add(g.id); setOwned(new Set(S.owned)); setCash(Math.floor(S.cash));
      haptic([10, 40, 10]);
      // Apply effects.
      if (g.id === 'repair') { S.battery = 100; setBattery(100); S.owned.delete('repair'); setOwned(new Set(S.owned)); } // consumable
      if (g.id === 'shield') S.shieldUntilHit = true;
      if (g.id === 'spotlights') S.coinMult = 1.25;
      if (g.id === 'turbocell') { S.turbo = TURBO_TIME; setTurbo(TURBO_TIME); S.owned.delete('turbocell'); setOwned(new Set(S.owned)); }
      showGadget(g.id);
    };

    const pullOver = (msg: string) => {
      // Crash shield absorbs it.
      if (S.shieldUntilHit) { S.shieldUntilHit = false; setOwned(new Set([...S.owned].filter((x) => x !== 'shield'))); S.owned.delete('shield'); S.shake = 0.6; haptic([20, 60, 20]); return; }
      haptic([30, 80, 120]);
      S.shake = 1.2; S.phase = 'shop'; S.control = false;
      setCrashMsg(msg); setCash(Math.floor(S.cash)); setPhase('shop');
    };

    const gameOver = (msg: string) => {
      S.phase = 'over'; setCrashMsg(msg);
      const fin = Math.floor(S.score); setScore(fin);
      setBest((p) => { const nb = Math.max(p, fin); try { localStorage.setItem('ev-drive-best', String(nb)); } catch { /* ignore */ } return nb; });
      record('feature:drivegame'); if (fin >= 500) record('drive:500');
      setPhase('over'); haptic([40, 80, 40, 80]);
    };

    let animFrame = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      animFrame += dt;
      const turboing = S.turbo > 0;
      const moving = S.phase === 'playing';
      const slow = S.slowTimer > 0 ? 0.6 : 1;
      const v = moving ? S.speed * (turboing ? 1.8 : 1) * slow : 6;

      for (const r of roadTiles) { r.position.z += v * dt; if (r.position.z > ROAD_LEN / 2) r.position.z -= ROAD_LEN * 2; }
      for (const m of laneMarks) { m.position.z += v * dt; if (m.position.z > 8) m.position.z -= 160; }
      for (const s of streaks) { s.position.z += v * dt * 1.6; if (s.position.z > 10) s.position.z -= 144; s.visibility = turboing ? 0.9 : 0; }
      for (const b of buildings) { b.mesh.position.z += v * dt; if (b.mesh.position.z > 16) b.mesh.position.z -= 160; }

      // Car position + spin + jump animation.
      car.position.x += (S.targetX - car.position.x) * Math.min(1, dt * 10);
      if (S.spin > 0) { S.spin = Math.max(0, S.spin - dt); car.rotation.y = (1 - S.spin / 0.8) * Math.PI * 2; if (S.spin === 0) { car.rotation.y = 0; S.control = true; } }
      else { car.rotation.y = (S.targetX - car.position.x) * 0.06; }
      if (S.jump > 0) { S.jump = Math.max(0, S.jump - dt); car.position.y = Math.sin((1 - S.jump / 0.7) * Math.PI) * 2.2; } else car.position.y = 0;
      car.rotation.z = S.spin > 0 ? 0 : (car.position.x - S.targetX) * 0.12;
      flame.visibility = turboing ? 0.9 : 0; flame.scaling.z = 1 + Math.sin(animFrame * 30) * 0.3;
      if (S.featherTimer > 0) S.featherTimer = Math.max(0, S.featherTimer - dt);
      if (S.slowTimer > 0) S.slowTimer = Math.max(0, S.slowTimer - dt);

      // Camera.
      const camT = turboing ? TURBO_CAM : BASE_CAM;
      camera.position.x += (camT.x - camera.position.x) * Math.min(1, dt * 4);
      camera.position.y += (camT.y - camera.position.y) * Math.min(1, dt * 4);
      camera.position.z += (camT.z - camera.position.z) * Math.min(1, dt * 4);
      camera.fov += ((turboing ? baseFov * 1.35 : baseFov) - camera.fov) * Math.min(1, dt * 5);
      if (S.shake > 0) { camera.position.x += (Math.random() - 0.5) * S.shake; camera.position.y += (Math.random() - 0.5) * S.shake; S.shake = Math.max(0, S.shake - dt * 1.6); }
      camera.setTarget(new BABYLON.Vector3(car.position.x * 0.4, 1, -12));

      // Plane flyover dropping feather bags.
      if (planeActive) {
        plane.position.x += dt * 22; plane.position.z += dt * 4;
        planeDropTimer -= dt;
        if (planeDropTimer <= 0 && plane.position.x > -20 && plane.position.x < 20) { spawn('featherbag', Math.floor(Math.random() * 3)); planeDropTimer = 0.5; }
        if (plane.position.x > 50) { planeActive = false; plane.setEnabled(false); }
      }

      if (moving) {
        S.elapsed += dt;
        S.speed = 22 + S.elapsed * 0.6;
        S.score += S.speed * dt * (turboing ? 1.4 : 0.6);
        S.cash += S.speed * dt * 0.04; // earn cash from distance
        S.battery = Math.max(0, S.battery - dt * 2.0);
        if (turboing) S.turbo = Math.max(0, S.turbo - dt);

        S.spawnTimer -= dt;
        const interval = Math.max(0.42, 1.4 - S.elapsed * 0.013);
        if (S.spawnTimer <= 0) { spawn(); S.spawnTimer = interval; }

        // Launch the plane occasionally.
        S.planeTimer -= dt;
        if (S.planeTimer <= 0 && !planeActive) { planeActive = true; plane.setEnabled(true); plane.position.set(-46, 24, -46); planeDropTimer = 0.5; S.planeTimer = 14 + Math.random() * 10; }

        for (const e of S.entities) {
          e.z += S.speed * dt * (turboing ? 1.8 : 1) * slow;
          e.mesh.position.z = e.z;
          if (e.kind === 'charge' || e.kind === 'turbo' || e.kind === 'coin') { e.mesh.rotation.y += dt * 3; e.mesh.position.y = Math.sin(animFrame * 3 + e.wobble) * 0.15; }
          if (e.kind === 'deer') e.mesh.position.x = LANES[e.lane] + Math.sin(animFrame * 2 + e.wobble) * 0.5;
          if (e.kind === 'turkey') { e.mesh.position.x = LANES[e.lane] + Math.sin(animFrame * 3 + e.wobble) * 1.2; e.mesh.position.y = 0.2 * Math.sin(animFrame * 6); e.mesh.rotation.z = Math.sin(animFrame * 12) * 0.5; }
          if (e.kind === 'neighbor' && e.drift) { e.mesh.position.x += e.drift * dt * 1.2; }
          if (e.kind === 'featherbag') { e.mesh.position.y = Math.max(0.4, (e.mesh.position.y || 6) - dt * 5); e.mesh.rotation.x += dt; }

          // Coin magnet pulls coins/charge toward the car.
          if (S.owned.has('magnet') && (e.kind === 'coin' || e.kind === 'charge') && e.z > -10 && !e.hit) {
            e.mesh.position.x += (car.position.x - e.mesh.position.x) * Math.min(1, dt * 3);
          }

          const ex = e.mesh.position.x;
          const hitZ = e.z > -1.8 && e.z < 1.8;
          const width = e.kind === 'bus' ? 2 : e.kind === 'gap' ? 4.5 : 1.6;
          const sameLane = Math.abs(ex - car.position.x) < width;
          if (!e.hit && hitZ && sameLane) {
            e.hit = true;
            const k = e.kind;
            if (k === 'charge') { S.battery = Math.min(100, S.battery + 22); S.cash += 8 * S.coinMult; S.score += 15; e.mesh.dispose(); }
            else if (k === 'coin') { S.cash += 12 * S.coinMult; S.score += 10; haptic(6); e.mesh.dispose(); }
            else if (k === 'turbo') { S.turbo = TURBO_TIME; S.score += 40; record('drive:turbo'); haptic([8, 30, 8]); e.mesh.dispose(); }
            else if (k === 'boostpad') { S.speed += 6; S.score += 20; haptic(12); e.mesh.dispose(); }
            else if (k === 'featherbag') { S.featherTimer = 1.6; S.slowTimer = 1.2; setFeatherView(1); haptic(40); e.mesh.dispose(); }
            else if (turboing) { S.score += 30; S.shake = 0.5; e.mesh.dispose(); } // smash through during turbo
            else if (k === 'oilslick') { if (S.owned.has('offroad')) { e.mesh.dispose(); } else { S.spin = 0.8; S.control = false; S.shake = 0.6; haptic([15, 40, 15, 40]); } }
            else if (k === 'gap') { if (S.owned.has('jumpjets')) { S.jump = 0.7; haptic(20); e.mesh.dispose(); } else pullOver('Fell into a road gap! 🕳️'); }
            else if (k === 'neighbor') {
              // Shove the player one lane away; crash if shoved off the road.
              const dir = ex < car.position.x ? 1 : -1; const nl = S.lane + dir;
              haptic([20, 50]);
              if (nl < 0 || nl > 2) pullOver('Bumped off the road! 💥'); else { S.lane = nl; S.targetX = LANES[nl]; S.shake = 0.5; }
            }
            else if ((k === 'cone' || k === 'barrier' || k === 'pothole') && S.owned.has('bullbar')) { S.score += 10; S.shake = 0.4; haptic(15); e.mesh.dispose(); }
            else if (k === 'bear') { fist.setEnabled(true); fist.position.set(car.position.x, 2.5, e.z); pullOver('A bear punched you! 🐻👊'); }
            else if (k === 'police') pullOver('Pulled over by police! 🚓');
            else if (k === 'bus') pullOver('Rear-ended a bus! 🚌');
            else if (k === 'deer') pullOver('You hit a deer! 🦌');
            else if (k === 'turkey') pullOver('A wild turkey hit the windshield! 🦃');
            else if (k === 'pothole') pullOver('Wrecked in a pothole! 🕳️');
            else pullOver('Crash! 🚧');
          }
        }
        S.entities = S.entities.filter((e) => {
          const consumed = e.hit && ['charge', 'coin', 'turbo', 'boostpad', 'featherbag'].includes(e.kind);
          if (consumed || (e.hit && turboing)) return false;
          if (e.z > 16) { e.mesh.dispose(); return false; }
          return true;
        });

        if (S.battery <= 0 && S.phase === 'playing') gameOver('Out of charge! 🔋');

        if (Math.floor(S.elapsed * 5) !== Math.floor((S.elapsed - dt) * 5)) {
          setScore(Math.floor(S.score)); setBattery(Math.round(S.battery)); setTurbo(Math.ceil(S.turbo)); setCash(Math.floor(S.cash));
          if (S.featherTimer === 0) setFeatherView(0);
        }
      }
    });

    engine.runRenderLoop(() => scene.render());

    const onKey = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { apiRef.current.steer(-1); ev.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { apiRef.current.steer(1); ev.preventDefault(); }
      else if ((ev.key === ' ' || ev.key === 'Enter') && S.phase !== 'playing' && S.phase !== 'shop') apiRef.current.start();
    };
    window.addEventListener('keydown', onKey);

    let downX: number | null = null;
    const onDown = (e: PointerEvent) => { downX = e.clientX; };
    const onUp = (e: PointerEvent) => { if (downX == null) return; const dx = e.clientX - downX; if (Math.abs(dx) > 24) apiRef.current.steer(dx > 0 ? 1 : -1); downX = null; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      scene.dispose(); engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const t = THEMES.find((x) => x.id === themeId); if (t) applyThemeRef.current(t); }, [themeId]);

  const battColor = battery < 20 ? 'var(--danger)' : battery < 50 ? 'var(--warn)' : 'var(--accent)';
  const cheapest = Math.min(...GADGETS.map((g) => g.cost));
  const canAfford = cash >= cheapest;

  return (
    <div className="canvas-frame" style={{ minHeight: 460 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '460px', display: 'block', touchAction: 'none' }} />

      {/* Feather whiteout */}
      {featherView > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,238,230,0.55)', pointerEvents: 'none', transition: 'opacity 0.3s' }} />
      )}

      {/* HUD */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <div style={hud}><div className="small muted">Score</div><div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{score}</div></div>
        <div style={hud}><div className="small muted">💵 Cash</div><div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--warn)' }}>${cash}</div></div>
        <div style={{ ...hud, flex: 1, maxWidth: 150 }}>
          <div className="small muted">{turbo > 0 ? `⚡ TURBO ${turbo}s` : 'Battery'}</div>
          <div style={{ height: 10, borderRadius: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: turbo > 0 ? `${(turbo / TURBO_TIME) * 100}%` : `${battery}%`, height: '100%', background: turbo > 0 ? 'var(--accent-2)' : battColor }} />
          </div>
        </div>
        <div style={hud}><div className="small muted">Best</div><div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>{best}</div></div>
      </div>

      {/* Start / Game-over overlay */}
      {(phase === 'idle' || phase === 'over') && (
        <div style={overlay}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: 20 }}>
            {phase === 'over' ? (
              <>
                <div style={{ fontSize: '2.4rem' }}>🔋</div>
                <h3 style={{ margin: '6px 0' }}>{crashMsg}</h3>
                <p className="muted">You scored <strong style={{ color: 'var(--accent)' }}>{score}</strong>{score >= best && score > 0 ? ' — new best! 🎉' : ''}.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.4rem' }}>🏎️⚡</div>
                <h3 style={{ margin: '6px 0' }}>EV Dodge</h3>
                <p className="muted" style={{ margin: '0 0 6px' }}>
                  Dodge a wild road — cones, barriers, potholes, 🦌 deer, 🐻 bears, 🚓 police, 🚌 buses, 🛢️ oil slicks (spin-outs!),
                  road 🕳️ gaps, 🚗 cars that bump you, ✈️ feather-bag drops, and 🦃 wild turkeys. Grab ⚡ charge, 🪙 coins, and turbo.
                  Crash and you <strong>pull over to buy gadgets</strong> with your cash, then get back on the road!
                </p>
                <p className="small muted">Steer: ← → / A D / on-screen / swipe. Buzzes on mobile.</p>
              </>
            )}
            <div style={{ marginTop: 14 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>City</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {THEMES.map((t) => (
                  <button key={t.id} className={`btn ${themeId === t.id ? 'primary' : 'ghost'}`} style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={() => setThemeId(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            <button className="btn primary" style={{ marginTop: 14 }} onClick={() => apiRef.current.start()}>{phase === 'over' ? '↻ Play again' : '▶ Start driving'}</button>
          </div>
        </div>
      )}

      {/* Pull-over gadget shop */}
      {phase === 'shop' && (
        <div style={overlay}>
          <div style={{ maxWidth: 600, width: '92%', padding: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>🛠️</div>
              <h3 style={{ margin: '4px 0' }}>{crashMsg}</h3>
              <p className="muted small" style={{ margin: '0 0 10px' }}>
                You pulled over. Spend your <strong style={{ color: 'var(--warn)' }}>${cash}</strong> on a gadget to get back on the road. Swipe the shelf →
              </p>
            </div>
            <div className="opt-rail" style={{ paddingBottom: 10 }}>
              {GADGETS.map((g) => {
                const have = owned.has(g.id);
                const afford = cash >= g.cost;
                return (
                  <button
                    key={g.id}
                    className="opt-chip"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 150, gap: 4, padding: '12px 14px', opacity: have || !afford ? 0.55 : 1, borderColor: have ? 'var(--accent)' : 'var(--border)' }}
                    disabled={have || !afford}
                    onClick={() => apiRef.current.buy(g)}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{g.icon}</span>
                    <span className="opt-name" style={{ whiteSpace: 'normal' }}>{g.name}</span>
                    <span className="small muted" style={{ whiteSpace: 'normal', fontWeight: 400 }}>{g.desc}</span>
                    <span className="opt-cost" style={{ color: have ? 'var(--accent)' : afford ? 'var(--warn)' : 'var(--danger)' }}>{have ? 'Equipped ✓' : `$${g.cost}`}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              {canAfford ? (
                <button className="btn primary" onClick={() => apiRef.current.resume()}>🚗 Back on the road →</button>
              ) : (
                <>
                  <p className="small" style={{ color: 'var(--danger)', margin: '0 0 8px' }}>Out of cash for repairs — the run is over.</p>
                  <button className="btn primary" onClick={() => apiRef.current.start()}>↻ Play again</button>
                </>
              )}
            </div>
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

const hud: React.CSSProperties = { background: 'rgba(10,14,20,0.72)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' };
const overlay: React.CSSProperties = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,11,17,0.8)', backdropFilter: 'blur(3px)', overflowY: 'auto' };
const steerBtn: React.CSSProperties = { width: 64, height: 64, borderRadius: 16, border: '1px solid var(--border)', background: 'rgba(19,28,43,0.85)', color: 'var(--text)', fontSize: '2rem', cursor: 'pointer' };
