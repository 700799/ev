'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { computeStats, BODY_SPECS, WHEEL_SPECS, ACCESSORY_SPECS, type BodyType, type WheelStyle } from '@/data/configSpecs';

interface Config {
  body: BodyType;
  paint: string;
  wheel: WheelStyle;
  accessories: Set<string>;
}

const PAINTS = [
  { name: 'Aurora Green', hex: '#5aa392' },
  { name: 'Electric Blue', hex: '#6390bd' },
  { name: 'Nebula Violet', hex: '#8f86b0' },
  { name: 'Stealth Gray', hex: '#9bb0c9' },
  { name: 'Sunset Amber', hex: '#cf9b4c' },
  { name: 'Crimson', hex: '#cd6a7e' },
  { name: 'Pearl White', hex: '#e8edf4' },
];

const BODIES: { id: BodyType; label: string }[] = [
  { id: 'sedan', label: '🚗 Sedan' },
  { id: 'suv', label: '🚙 SUV' },
  { id: 'pickup', label: '🛻 Pickup' },
];

const WHEELS: { id: WheelStyle; label: string }[] = [
  { id: 'sport', label: 'Sport Spoke' },
  { id: 'aero', label: 'Aero Cover' },
  { id: 'turbine', label: 'Turbine' },
  { id: 'offroad', label: 'Off-Road' },
  { id: 'gold', label: 'Gold Forged' },
];

// 15 tack-on accessories the player can mix and match.
const ACCESSORIES: { id: string; label: string }[] = [
  { id: 'roofrack', label: '🧰 Roof Rack' },
  { id: 'roofbox', label: '📦 Cargo Box' },
  { id: 'lightbar', label: '🔦 Light Bar' },
  { id: 'bullbar', label: '🐂 Bull Bar' },
  { id: 'spoiler', label: '🪽 Rear Spoiler' },
  { id: 'towhitch', label: '🪝 Tow Hitch' },
  { id: 'underglow', label: '🌈 Underglow' },
  { id: 'stripe', label: '🏁 Racing Stripe' },
  { id: 'mudflaps', label: '🛡️ Mud Flaps' },
  { id: 'tint', label: '🕶️ Window Tint' },
  { id: 'skirack', label: '🎿 Ski Rack' },
  { id: 'bikerack', label: '🚲 Bike Rack' },
  { id: 'sharkfin', label: '📡 Shark-Fin Antenna' },
  { id: 'sunroof', label: '☀️ Pano Roof' },
  { id: 'runningboards', label: '🪜 Running Boards' },
];

export default function Configurator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rebuildRef = useRef<(c: Config) => void>(() => {});
  const { record } = useGame();

  const [ready, setReady] = useState(false);
  const [body, setBody] = useState<BodyType>('suv');
  const [paint, setPaint] = useState(PAINTS[0].hex);
  const [wheel, setWheel] = useState<WheelStyle>('sport');
  const [accessories, setAccessories] = useState<Set<string>>(new Set(['roofrack']));

  const stats = useMemo(() => computeStats(body, wheel, accessories), [body, wheel, accessories]);

  // (Re)build whenever config changes.
  useEffect(() => {
    rebuildRef.current({ body, paint, wheel, accessories });
  }, [body, paint, wheel, accessories]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.06, 0.1, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.04, 0.06, 0.1);
    scene.fogDensity = 0.022;

    const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 1.7, Math.PI / 2.5, 13, new BABYLON.Vector3(0, 0.8, 0), scene);
    camera.lowerRadiusLimit = 7;
    camera.upperRadiusLimit = 22;
    camera.lowerBetaLimit = 0.4;
    camera.upperBetaLimit = Math.PI / 2.05;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvas, true);
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.16;

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.62;
    hemi.groundColor = new BABYLON.Color3(0.05, 0.08, 0.13);
    const key = new BABYLON.DirectionalLight('key', new BABYLON.Vector3(-1, -2, -1), scene);
    key.position = new BABYLON.Vector3(6, 12, 6);
    key.intensity = 1.15;
    const rim = new BABYLON.PointLight('rim', new BABYLON.Vector3(-7, 3, -6), scene);
    rim.diffuse = new BABYLON.Color3(0.2, 0.5, 0.7);
    rim.intensity = 0.6;

    const glow = new BABYLON.GlowLayer('glow', scene);
    glow.intensity = 0.5;

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, scene);
    const groundMat = new BABYLON.PBRMaterial('groundMat', scene);
    groundMat.albedoColor = new BABYLON.Color3(0.02, 0.03, 0.05);
    groundMat.metallic = 0.7;
    groundMat.roughness = 0.35;
    ground.material = groundMat;

    const rings: BABYLON.Mesh[] = [];
    for (let i = 1; i <= 3; i++) {
      const ring = BABYLON.MeshBuilder.CreateTorus(`ring${i}`, { diameter: 7 + i * 4, thickness: 0.03, tessellation: 64 }, scene);
      const rm = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
      rm.emissiveColor = new BABYLON.Color3(0.04, 0.15, 0.13);
      rm.disableLighting = true;
      ring.material = rm;
      ring.position.y = 0.01;
      rings.push(ring);
    }

    // --- Shared materials ---
    const bodyMat = new BABYLON.PBRMaterial('bodyMat', scene);
    bodyMat.metallic = 0.65;
    bodyMat.roughness = 0.28;
    bodyMat.clearCoat.isEnabled = true;
    bodyMat.clearCoat.intensity = 0.95;

    const glassMat = new BABYLON.PBRMaterial('glass', scene);
    glassMat.albedoColor = new BABYLON.Color3(0.04, 0.09, 0.14);
    glassMat.metallic = 0.1;
    glassMat.roughness = 0.05;
    glassMat.alpha = 0.5;
    const tintMat = new BABYLON.PBRMaterial('tint', scene);
    tintMat.albedoColor = new BABYLON.Color3(0.01, 0.02, 0.03);
    tintMat.metallic = 0.2;
    tintMat.roughness = 0.08;
    tintMat.alpha = 0.78;

    const trimMat = new BABYLON.PBRMaterial('trim', scene);
    trimMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    trimMat.metallic = 0.4;
    trimMat.roughness = 0.5;

    const chromeMat = new BABYLON.PBRMaterial('chrome', scene);
    chromeMat.albedoColor = new BABYLON.Color3(0.6, 0.6, 0.65);
    chromeMat.metallic = 0.9;
    chromeMat.roughness = 0.15;

    const tireMat = new BABYLON.PBRMaterial('tire', scene);
    tireMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    tireMat.metallic = 0.2;
    tireMat.roughness = 0.85;

    const probe = new BABYLON.ReflectionProbe('probe', 256, scene);
    probe.renderList?.push(ground, ...rings);
    probe.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    bodyMat.reflectionTexture = probe.cubeTexture;
    bodyMat.environmentIntensity = 0.55;

    let carNode: BABYLON.TransformNode | null = null;
    let underglowMesh: BABYLON.Mesh | null = null;

    const rimColorFor = (style: WheelStyle): BABYLON.Color3 => {
      switch (style) {
        case 'gold': return new BABYLON.Color3(0.55, 0.42, 0.12);
        case 'offroad': return new BABYLON.Color3(0.08, 0.09, 0.1);
        case 'aero': return new BABYLON.Color3(0.45, 0.47, 0.5);
        case 'turbine': return new BABYLON.Color3(0.25, 0.27, 0.3);
        default: return new BABYLON.Color3(0.55, 0.57, 0.6);
      }
    };

    const buildWheel = (parent: BABYLON.TransformNode, x: number, z: number, r: number, i: number, style: WheelStyle) => {
      const tireR = style === 'offroad' ? r * 1.12 : r;
      const tire = BABYLON.MeshBuilder.CreateCylinder(`wheel${i}`, { diameter: tireR * 2, height: style === 'offroad' ? 0.6 : 0.5, tessellation: 36 }, scene);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, tireR, z);
      tire.material = tireMat;
      tire.parent = parent;

      const rimM = new BABYLON.PBRMaterial(`rimM${i}`, scene);
      rimM.albedoColor = rimColorFor(style);
      rimM.metallic = style === 'aero' ? 0.4 : 0.85;
      rimM.roughness = style === 'offroad' ? 0.6 : 0.25;

      const face = BABYLON.MeshBuilder.CreateCylinder(`face${i}`, { diameter: r * 1.4, height: 0.52, tessellation: 28 }, scene);
      face.rotation.x = Math.PI / 2;
      face.position.set(x, tireR, z);
      face.material = rimM;
      face.parent = parent;

      if (style === 'aero') {
        // Smooth disc — no spokes.
        return;
      }
      const spokeCount = style === 'turbine' ? 9 : style === 'offroad' ? 6 : 5;
      const spokeW = style === 'offroad' ? r * 0.95 : r * 0.85;
      for (let s = 0; s < spokeCount; s++) {
        const spoke = BABYLON.MeshBuilder.CreateBox(`spoke${i}_${s}`, { width: spokeW, height: 0.54, depth: style === 'turbine' ? 0.05 : 0.09 }, scene);
        spoke.position.set(x, tireR, z);
        spoke.rotation.x = Math.PI / 2;
        spoke.rotation.y = (s / spokeCount) * Math.PI * (style === 'turbine' ? 2 : 1);
        if (style === 'turbine') spoke.rotation.z = 0.4;
        spoke.material = rimM;
        spoke.parent = parent;
      }
    };

    // --- Full car + accessories builder ---
    const build = (cfgIn: Config) => {
      if (carNode) carNode.dispose();
      underglowMesh = null;
      const car = new BABYLON.TransformNode('car', scene);
      carNode = car;

      bodyMat.albedoColor = BABYLON.Color3.FromHexString(cfgIn.paint).scale(0.72);

      const cfg = {
        sedan: { len: 5.4, w: 2.3, lowerH: 0.95, cabinH: 0.95, cabinLen: 2.6, cabinX: -0.3, wheelR: 0.66, roof: false, bed: false, ride: 0 },
        suv: { len: 5.2, w: 2.4, lowerH: 1.25, cabinH: 1.25, cabinLen: 3.0, cabinX: -0.2, wheelR: 0.78, roof: true, bed: false, ride: 0.15 },
        pickup: { len: 6.0, w: 2.45, lowerH: 1.2, cabinH: 1.2, cabinLen: 2.2, cabinX: 0.6, wheelR: 0.8, roof: false, bed: true, ride: 0.2 },
      }[cfgIn.body];

      const baseY = cfg.wheelR + cfg.ride;
      const roofY = baseY + cfg.lowerH + cfg.cabinH;
      const has = (id: string) => cfgIn.accessories.has(id);

      const box = (name: string, w: number, h: number, d: number, pos: [number, number, number], mat: BABYLON.Material) => {
        const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
        m.position.set(pos[0], pos[1], pos[2]);
        m.material = mat;
        m.parent = car;
        return m;
      };

      box('lower', cfg.len, cfg.lowerH, cfg.w, [0, baseY + cfg.lowerH / 2, 0], bodyMat);
      box('hood', cfg.len * 0.34, cfg.lowerH * 0.55, cfg.w * 0.92, [cfg.len * 0.32, baseY + cfg.lowerH + cfg.lowerH * 0.25, 0], bodyMat);
      box('cabin', cfg.cabinLen, cfg.cabinH, cfg.w * 0.88, [cfg.cabinX, baseY + cfg.lowerH + cfg.cabinH / 2, 0], bodyMat);
      box('glass', cfg.cabinLen * 0.96, cfg.cabinH * 0.82, cfg.w * 0.9, [cfg.cabinX, baseY + cfg.lowerH + cfg.cabinH * 0.52, 0], has('tint') ? tintMat : glassMat);

      // Pano roof (glass top panel).
      if (has('sunroof')) {
        box('pano', cfg.cabinLen * 0.7, 0.06, cfg.w * 0.62, [cfg.cabinX, roofY + 0.02, 0], glassMat);
      }

      // SUV roof rails (always for SUV body).
      if (cfg.roof) {
        for (const zz of [-cfg.w * 0.32, cfg.w * 0.32]) {
          box('rail', cfg.cabinLen * 0.8, 0.08, 0.08, [cfg.cabinX, roofY + 0.05, zz], trimMat);
        }
      }

      // Pickup bed.
      if (cfg.bed) {
        const bedX = -cfg.len * 0.28;
        for (const zz of [-cfg.w * 0.42, cfg.w * 0.42]) {
          box('bedwall', cfg.len * 0.34, 0.5, 0.08, [bedX, baseY + cfg.lowerH + 0.25, zz], bodyMat);
        }
        box('tailgate', 0.08, 0.5, cfg.w * 0.84, [bedX - cfg.len * 0.17, baseY + cfg.lowerH + 0.25, 0], bodyMat);
      }

      // Wheels + fenders.
      const wheelXs = [cfg.len * 0.3, -cfg.len * 0.3];
      const wheelZs = [cfg.w * 0.46, -cfg.w * 0.46];
      let wi = 0;
      for (const x of wheelXs) {
        for (const z of wheelZs) {
          buildWheel(car, x, z, cfg.wheelR, wi, cfgIn.wheel);
          const fender = BABYLON.MeshBuilder.CreateTorus('fender', { diameter: cfg.wheelR * 2.5, thickness: 0.16, tessellation: 24 }, scene);
          fender.rotation.x = Math.PI / 2;
          fender.position.set(x, cfg.wheelR + 0.05, z * 0.98);
          fender.scaling.z = 0.5;
          fender.material = trimMat;
          fender.parent = car;
          wi++;
        }
      }

      // Mirrors.
      for (const z of [cfg.w * 0.5, -cfg.w * 0.5]) {
        box('mirror', 0.22, 0.14, 0.1, [cfg.cabinX + cfg.cabinLen * 0.42, baseY + cfg.lowerH + cfg.cabinH * 0.35, z], trimMat);
      }

      // Light bars.
      const head = box('head', 0.14, 0.16, cfg.w * 0.85, [cfg.len / 2 + 0.02, baseY + cfg.lowerH * 0.7, 0], trimMat);
      const headEm = new BABYLON.StandardMaterial('headEm', scene);
      headEm.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.8);
      head.material = headEm;

      // ---------- ACCESSORIES ----------
      // Roof rack rails + crossbars.
      if (has('roofrack')) {
        for (const zz of [-cfg.w * 0.3, cfg.w * 0.3]) {
          box('rrk', cfg.cabinLen * 0.78, 0.07, 0.07, [cfg.cabinX, roofY + 0.12, zz], chromeMat);
        }
        for (const xx of [cfg.cabinX - cfg.cabinLen * 0.28, cfg.cabinX + cfg.cabinLen * 0.28]) {
          box('rrx', 0.07, 0.07, cfg.w * 0.66, [xx, roofY + 0.12, 0], chromeMat);
        }
      }
      // Cargo box on top.
      if (has('roofbox')) {
        const cb = box('cargo', cfg.cabinLen * 0.6, 0.3, cfg.w * 0.55, [cfg.cabinX, roofY + 0.3, 0], trimMat);
        cb.scaling.x = 1;
      }
      // Roof light bar (emissive).
      if (has('lightbar')) {
        const lb = box('lbar', 0.18, 0.14, cfg.w * 0.7, [cfg.cabinX + cfg.cabinLen * 0.3, roofY + 0.2, 0], trimMat);
        const lbEm = new BABYLON.StandardMaterial('lbEm', scene);
        lbEm.emissiveColor = new BABYLON.Color3(0.9, 0.92, 1);
        lb.material = lbEm;
      }
      // Bull bar (front).
      if (has('bullbar')) {
        box('bull', 0.18, 0.5, cfg.w * 0.8, [cfg.len / 2 + 0.18, baseY + cfg.lowerH * 0.45, 0], chromeMat);
        box('bullv', 0.1, 0.7, 0.1, [cfg.len / 2 + 0.18, baseY + cfg.lowerH * 0.6, 0], chromeMat);
      }
      // Rear spoiler.
      if (has('spoiler')) {
        box('spoil', 0.5, 0.07, cfg.w * 0.84, [-cfg.len / 2 + 0.1, roofY * (cfg.bed ? 0 : 1) + (cfg.bed ? baseY + cfg.lowerH + 0.5 : 0.18), 0], trimMat);
        for (const zz of [-cfg.w * 0.34, cfg.w * 0.34]) {
          box('spoilft', 0.1, 0.22, 0.08, [-cfg.len / 2 + 0.1, (cfg.bed ? baseY + cfg.lowerH + 0.4 : roofY + 0.06), zz], trimMat);
        }
      }
      // Tow hitch.
      if (has('towhitch')) {
        box('hitch', 0.4, 0.1, 0.1, [-cfg.len / 2 - 0.2, baseY + 0.25, 0], chromeMat);
        const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 0.16 }, scene);
        ball.position.set(-cfg.len / 2 - 0.38, baseY + 0.3, 0);
        ball.material = chromeMat;
        ball.parent = car;
      }
      // Underglow.
      if (has('underglow')) {
        underglowMesh = BABYLON.MeshBuilder.CreateBox('glowbar', { width: cfg.len * 0.95, height: 0.05, depth: cfg.w * 0.95 }, scene);
        underglowMesh.position.set(0, baseY * 0.4, 0);
        const ug = new BABYLON.StandardMaterial('ug', scene);
        ug.emissiveColor = BABYLON.Color3.FromHexString(cfgIn.paint);
        ug.disableLighting = true;
        underglowMesh.material = ug;
        underglowMesh.parent = car;
      }
      // Racing stripe (top center).
      if (has('stripe')) {
        const stripe = BABYLON.MeshBuilder.CreateBox('stripe', { width: cfg.len * 0.98, height: 0.04, depth: cfg.w * 0.16 }, scene);
        stripe.position.set(0, baseY + cfg.lowerH + 0.001 + (cfg.cabinH), 0);
        const stMat = new BABYLON.StandardMaterial('stMat', scene);
        stMat.emissiveColor = new BABYLON.Color3(0.85, 0.85, 0.9);
        stripe.material = stMat;
        stripe.parent = car;
        // Hood + roof segments approximated by one long low strip on body top.
        const hoodStrip = BABYLON.MeshBuilder.CreateBox('hstripe', { width: cfg.len * 0.3, height: 0.04, depth: cfg.w * 0.16 }, scene);
        hoodStrip.position.set(cfg.len * 0.32, baseY + cfg.lowerH + cfg.lowerH * 0.55, 0);
        hoodStrip.material = stMat;
        hoodStrip.parent = car;
      }
      // Mud flaps.
      if (has('mudflaps')) {
        for (const x of wheelXs) {
          for (const z of [cfg.w * 0.46, -cfg.w * 0.46]) {
            box('flap', 0.06, 0.3, 0.3, [x - Math.sign(x) * cfg.wheelR * 0.9, cfg.wheelR * 0.5, z], trimMat);
          }
        }
      }
      // Ski rack (cross rails on roof with skis).
      if (has('skirack')) {
        for (let s = 0; s < 3; s++) {
          const ski = BABYLON.MeshBuilder.CreateBox('ski', { width: cfg.cabinLen * 0.7, height: 0.04, depth: 0.12 }, scene);
          ski.position.set(cfg.cabinX, roofY + 0.18, -cfg.w * 0.18 + s * 0.16);
          const m = new BABYLON.StandardMaterial('skim' + s, scene);
          m.diffuseColor = new BABYLON.Color3(0.7 - s * 0.2, 0.3, 0.2 + s * 0.2);
          m.emissiveColor = new BABYLON.Color3(0.2, 0.05, 0.05);
          ski.material = m;
          ski.parent = car;
        }
      }
      // Bike rack (rear-mounted).
      if (has('bikerack')) {
        box('brk', 0.1, 0.6, cfg.w * 0.7, [-cfg.len / 2 - 0.25, baseY + cfg.lowerH * 0.8, 0], trimMat);
        for (const zz of [-cfg.w * 0.2, cfg.w * 0.2]) {
          const wheel = BABYLON.MeshBuilder.CreateTorus('bw', { diameter: 0.5, thickness: 0.05, tessellation: 18 }, scene);
          wheel.position.set(-cfg.len / 2 - 0.45, baseY + cfg.lowerH * 0.9, zz);
          wheel.rotation.y = Math.PI / 2;
          wheel.material = trimMat;
          wheel.parent = car;
        }
      }
      // Shark-fin antenna.
      if (has('sharkfin')) {
        const fin = BABYLON.MeshBuilder.CreateCylinder('fin', { diameterTop: 0, diameterBottom: 0.18, height: 0.22, tessellation: 3 }, scene);
        fin.position.set(cfg.cabinX - cfg.cabinLen * 0.4, roofY + 0.11, 0);
        fin.rotation.x = Math.PI;
        fin.scaling.x = 0.4;
        fin.material = trimMat;
        fin.parent = car;
      }
      // Running boards.
      if (has('runningboards')) {
        for (const z of [cfg.w * 0.5, -cfg.w * 0.5]) {
          box('board', cfg.len * 0.55, 0.08, 0.22, [0, baseY + 0.12, z], chromeMat);
        }
      }
    };

    rebuildRef.current = build;
    build({ body, paint, wheel, accessories });

    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      if (carNode) carNode.position.y = Math.sin(t * 1.1) * 0.03;
      if (underglowMesh && underglowMesh.material) {
        (underglowMesh.material as BABYLON.StandardMaterial).alpha = 0.6 + Math.sin(t * 4) * 0.25;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAcc = (id: string) => {
    setAccessories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    record('feature:configurator');
  };

  const reset = () => setAccessories(new Set());

  return (
    <div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        {/* 3D stage */}
        <div className="canvas-frame" style={{ minHeight: 420 }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '420px', display: 'block', touchAction: 'none' }} />
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your garage…</span>
            </div>
          )}
          <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(10,14,20,0.7)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }} className="small muted">
            Drag to spin · scroll to zoom
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div className="num">BODY STYLE</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {BODIES.map((b) => (
                <button key={b.id} className={`btn ${body === b.id ? 'primary' : 'ghost'}`} style={{ padding: '7px 12px' }} onClick={() => { setBody(b.id); record('feature:configurator'); }}>
                  {b.label} <span style={{ opacity: 0.7, fontSize: '0.78em' }}>${(BODY_SPECS[b.id].price / 1000).toFixed(0)}k</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="num">PAINT</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {PAINTS.map((p) => (
                <button
                  key={p.hex}
                  title={p.name}
                  aria-label={p.name}
                  onClick={() => { setPaint(p.hex); record('feature:configurator'); }}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: p.hex, border: paint === p.hex ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="num">WHEELS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {WHEELS.map((w) => (
                <button key={w.id} className={`btn ${wheel === w.id ? 'primary' : 'ghost'}`} style={{ padding: '6px 11px', fontSize: '0.84rem' }} onClick={() => { setWheel(w.id); record('feature:configurator'); }}>
                  {w.label} <span style={{ opacity: 0.7 }}>{WHEEL_SPECS[w.id].cost ? `+$${WHEEL_SPECS[w.id].cost}` : 'incl.'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="num">ACCESSORIES — TACK ON UP TO 15</div>
              <span className="pill" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>{accessories.size}/15 added</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {ACCESSORIES.map((a) => {
                const on = accessories.has(a.id);
                const spec = ACCESSORY_SPECS[a.id];
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAcc(a.id)}
                    className={`btn ${on ? 'primary' : 'ghost'}`}
                    style={{ padding: '6px 11px', fontSize: '0.82rem' }}
                    aria-pressed={on}
                    title={`+$${spec.cost} · +${spec.weightKg}kg${spec.cdDelta > 0 ? ` · +${spec.cdDelta.toFixed(3)} drag` : ''}`}
                  >
                    {on ? '✓ ' : '+ '}{a.label} <span style={{ opacity: 0.7 }}>${spec.cost}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={reset} style={{ padding: '6px 12px' }}>Clear all</button>
            </div>
          </div>
        </div>
      </div>

      {/* Budget + physics impact panel */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div className="num">YOUR BUILD — BUDGET &amp; IMPACT</div>
          <div className="result-strong">${stats.price.toLocaleString()}</div>
        </div>
        <p className="muted small" style={{ margin: '4px 0 12px' }}>
          Add-ons: <strong>+${stats.accessoryCost.toLocaleString()}</strong> · added weight{' '}
          <strong>+{stats.accessoryWeight} kg</strong>. Every accessory costs money and adds weight or aerodynamic
          drag, which trims range and dulls acceleration and cornering.
        </p>

        <div className="grid cols-4">
          <div className="card">
            <div className="num">RANGE</div>
            <div className="result-strong" style={{ color: rangeColor(stats.rangeMi, stats.baseRangeMi) }}>{stats.rangeMi} mi</div>
            <p className="small muted" style={{ margin: 0 }}>
              {deltaLabel(stats.rangeMi - stats.baseRangeMi, 'mi')} vs stock · {stats.whPerMile} Wh/mi @ 65 mph
            </p>
          </div>
          <div className="card">
            <div className="num">DRAG (Cd)</div>
            <div className="result-strong">{stats.cd.toFixed(3)}</div>
            <p className="small muted" style={{ margin: 0 }}>Drag coefficient · lower slips through air better</p>
          </div>
          <div className="card">
            <div className="num">WEIGHT</div>
            <div className="result-strong">{stats.weightKg.toLocaleString()} kg</div>
            <p className="small muted" style={{ margin: 0 }}>Curb weight with add-ons</p>
          </div>
          <div className="card">
            <div className="num">0–60 MPH</div>
            <div className="result-strong" style={{ color: stats.zeroToSixty > stats.baseZeroToSixty + 0.05 ? 'var(--warn)' : 'var(--accent)' }}>{stats.zeroToSixty}s</div>
            <p className="small muted" style={{ margin: 0 }}>{deltaLabel(stats.zeroToSixty - stats.baseZeroToSixty, 's', true)} vs stock</p>
          </div>
          <div className="card">
            <div className="num">CORNERING GRIP</div>
            <div className="result-strong">{stats.grip.toFixed(2)} g</div>
            <p className="small muted" style={{ margin: 0 }}>Peak lateral grip · taller/heavier setups slide sooner</p>
          </div>
          <div className="card">
            <div className="num">SAFE TURN SPEED</div>
            <div className="result-strong">{stats.cornerMph} mph</div>
            <p className="small muted" style={{ margin: 0 }}>Through a tight 50 m bend before losing grip</p>
          </div>
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="num">RANGE vs STOCK</div>
            <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ width: `${Math.min(100, (stats.rangeMi / stats.baseRangeMi) * 100)}%`, height: '100%', background: rangeColor(stats.rangeMi, stats.baseRangeMi), transition: 'width 0.4s ease' }} />
            </div>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              Stock {stats.baseRangeMi} mi → your build {stats.rangeMi} mi. Drag matters most at highway speed; weight
              matters most for acceleration, braking, and tire wear.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function deltaLabel(d: number, unit: string, inverse = false) {
  if (Math.abs(d) < (unit === 's' ? 0.05 : 0.5)) return 'no change';
  const sign = d > 0 ? '+' : '';
  const good = inverse ? d < 0 : d > 0;
  const arrow = good ? '▲' : '▼';
  return `${arrow} ${sign}${unit === 's' ? d.toFixed(1) : Math.round(d)} ${unit}`;
}

function rangeColor(range: number, base: number) {
  if (range >= base - 1) return 'var(--accent)';
  if (range >= base * 0.9) return 'var(--warn)';
  return 'var(--danger)';
}
