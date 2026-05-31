'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';

type BodyType = 'sedan' | 'suv' | 'pickup';

type ControlApi = {
  setColor: (hex: string) => void;
  toggleLights: () => void;
  startCharge: () => void;
  setType: (t: BodyType) => void;
};

const PAINTS = [
  { name: 'Aurora Green', hex: '#25e6a5' },
  { name: 'Electric Blue', hex: '#3aa0ff' },
  { name: 'Nebula Violet', hex: '#b388ff' },
  { name: 'Stealth Gray', hex: '#9bb0c9' },
  { name: 'Sunset Amber', hex: '#ffb547' },
];

const TYPES: { id: BodyType; label: string }[] = [
  { id: 'sedan', label: '🚗 Sedan' },
  { id: 'suv', label: '🚙 SUV' },
  { id: 'pickup', label: '🛻 Pickup' },
];

/**
 * Interactive Babylon.js EV showroom with selectable body styles (sedan / SUV /
 * pickup), spoked wheels, fenders, mirrors, a reflection probe for live body
 * reflections, a charging particle stream, paint swatches, and headlights.
 * Drag to orbit, scroll to zoom.
 */
export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const apiRef = useRef<ControlApi | null>(null);

  const [ready, setReady] = useState(false);
  const [charge, setCharge] = useState(62);
  const [charging, setCharging] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);
  const [paint, setPaint] = useState(PAINTS[0].hex);
  const [bodyType, setBodyType] = useState<BodyType>('suv');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.06, 0.1, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.04, 0.06, 0.1);
    scene.fogDensity = 0.028;

    const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 1.6, Math.PI / 2.5, 12, new BABYLON.Vector3(0, 0.7, 0), scene);
    camera.lowerRadiusLimit = 7;
    camera.upperRadiusLimit = 20;
    camera.lowerBetaLimit = 0.5;
    camera.upperBetaLimit = Math.PI / 2.05;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvas, true);
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.18;

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new BABYLON.Color3(0.05, 0.08, 0.13);
    const key = new BABYLON.DirectionalLight('key', new BABYLON.Vector3(-1, -2, -1), scene);
    key.position = new BABYLON.Vector3(6, 12, 6);
    key.intensity = 1.15;
    const rim = new BABYLON.PointLight('rim', new BABYLON.Vector3(-7, 3, -6), scene);
    rim.diffuse = new BABYLON.Color3(0.2, 0.6, 1);
    rim.intensity = 0.7;

    const glow = new BABYLON.GlowLayer('glow', scene);
    glow.intensity = 0.45;

    // Reflective floor + neon rings.
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene);
    const groundMat = new BABYLON.PBRMaterial('groundMat', scene);
    groundMat.albedoColor = new BABYLON.Color3(0.02, 0.03, 0.05);
    groundMat.metallic = 0.7;
    groundMat.roughness = 0.35;
    ground.material = groundMat;

    const rings: BABYLON.Mesh[] = [];
    for (let i = 1; i <= 3; i++) {
      const ring = BABYLON.MeshBuilder.CreateTorus(`ring${i}`, { diameter: 6 + i * 4, thickness: 0.03, tessellation: 64 }, scene);
      const rm = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
      rm.emissiveColor = new BABYLON.Color3(0.04, 0.15, 0.13);
      rm.disableLighting = true;
      ring.material = rm;
      ring.position.y = 0.01;
      rings.push(ring);
    }

    // --- Shared materials ---
    const bodyMat = new BABYLON.PBRMaterial('bodyMat', scene);
    bodyMat.albedoColor = BABYLON.Color3.FromHexString(PAINTS[0].hex).scale(0.7);
    bodyMat.metallic = 0.65;
    bodyMat.roughness = 0.28;
    bodyMat.clearCoat.isEnabled = true;
    bodyMat.clearCoat.intensity = 0.95;

    const glassMat = new BABYLON.PBRMaterial('glass', scene);
    glassMat.albedoColor = new BABYLON.Color3(0.04, 0.09, 0.14);
    glassMat.metallic = 0.1;
    glassMat.roughness = 0.05;
    glassMat.alpha = 0.5;

    const trimMat = new BABYLON.PBRMaterial('trim', scene);
    trimMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    trimMat.metallic = 0.4;
    trimMat.roughness = 0.5;

    const wheelMat = new BABYLON.PBRMaterial('wheelMat', scene);
    wheelMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    wheelMat.metallic = 0.2;
    wheelMat.roughness = 0.85;
    const rimMat = new BABYLON.StandardMaterial('rimMat', scene);
    rimMat.emissiveColor = new BABYLON.Color3(0.08, 0.24, 0.26);
    rimMat.disableLighting = true;

    const headMat = new BABYLON.StandardMaterial('headMat', scene);
    headMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    const tailMat = new BABYLON.StandardMaterial('tailMat', scene);
    tailMat.emissiveColor = new BABYLON.Color3(0.25, 0.02, 0.05);
    const portMat = new BABYLON.StandardMaterial('portMat', scene);
    portMat.emissiveColor = new BABYLON.Color3(0.08, 0.4, 0.32);

    // Reflection probe so the body reflects the floor + rings.
    const probe = new BABYLON.ReflectionProbe('probe', 256, scene);
    probe.renderList?.push(ground, ...rings);
    probe.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    bodyMat.reflectionTexture = probe.cubeTexture;
    bodyMat.environmentIntensity = 0.6;

    // --- Wheel factory (tire + spoked rim) ---
    const buildWheel = (parent: BABYLON.TransformNode, x: number, z: number, r: number, i: number) => {
      const w = BABYLON.MeshBuilder.CreateCylinder(`wheel${i}`, { diameter: r * 2, height: 0.5, tessellation: 32 }, scene);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, r, z);
      w.material = wheelMat;
      w.parent = parent;
      const hub = BABYLON.MeshBuilder.CreateCylinder(`hub${i}`, { diameter: r * 0.5, height: 0.52, tessellation: 20 }, scene);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, r, z);
      hub.material = rimMat;
      hub.parent = parent;
      for (let s = 0; s < 5; s++) {
        const spoke = BABYLON.MeshBuilder.CreateBox(`spoke${i}_${s}`, { width: r * 0.85, height: 0.52, depth: 0.07 }, scene);
        spoke.position.set(x, r, z);
        spoke.rotation.x = Math.PI / 2;
        spoke.rotation.y = (s / 5) * Math.PI;
        spoke.material = rimMat;
        spoke.parent = parent;
      }
    };

    // --- Car builder, parameterized by body type ---
    let carNode: BABYLON.TransformNode | null = null;
    let portRef: BABYLON.StandardMaterial = portMat;

    const buildCar = (type: BodyType) => {
      if (carNode) carNode.dispose();
      const car = new BABYLON.TransformNode('car', scene);

      // Proportions per body type.
      const cfg = {
        sedan: { len: 5.4, w: 2.3, lowerH: 0.95, cabinH: 0.95, cabinLen: 2.6, cabinX: -0.3, wheelR: 0.66, roof: false, bed: false, ride: 0 },
        suv: { len: 5.2, w: 2.4, lowerH: 1.25, cabinH: 1.25, cabinLen: 3.0, cabinX: -0.2, wheelR: 0.78, roof: true, bed: false, ride: 0.15 },
        pickup: { len: 6.0, w: 2.45, lowerH: 1.2, cabinH: 1.2, cabinLen: 2.2, cabinX: 0.6, wheelR: 0.8, roof: false, bed: true, ride: 0.2 },
      }[type];

      const baseY = cfg.wheelR + cfg.ride;

      const lower = BABYLON.MeshBuilder.CreateBox('lower', { width: cfg.len, height: cfg.lowerH, depth: cfg.w }, scene);
      lower.position.y = baseY + cfg.lowerH / 2;
      lower.material = bodyMat;
      lower.parent = car;

      const hood = BABYLON.MeshBuilder.CreateBox('hood', { width: cfg.len * 0.34, height: cfg.lowerH * 0.55, depth: cfg.w * 0.92 }, scene);
      hood.position.set(cfg.len * 0.32, baseY + cfg.lowerH + cfg.lowerH * 0.25, 0);
      hood.material = bodyMat;
      hood.parent = car;

      const cabin = BABYLON.MeshBuilder.CreateBox('cabin', { width: cfg.cabinLen, height: cfg.cabinH, depth: cfg.w * 0.88 }, scene);
      cabin.position.set(cfg.cabinX, baseY + cfg.lowerH + cfg.cabinH / 2, 0);
      cabin.material = bodyMat;
      cabin.parent = car;

      // Greenhouse glass.
      const glass = BABYLON.MeshBuilder.CreateBox('glass', { width: cfg.cabinLen * 0.96, height: cfg.cabinH * 0.82, depth: cfg.w * 0.9 }, scene);
      glass.position.set(cfg.cabinX, baseY + cfg.lowerH + cfg.cabinH * 0.52, 0);
      glass.material = glassMat;
      glass.parent = car;

      // Roof rails for the SUV.
      if (cfg.roof) {
        for (const zz of [-cfg.w * 0.32, cfg.w * 0.32]) {
          const rail = BABYLON.MeshBuilder.CreateBox('rail', { width: cfg.cabinLen * 0.8, height: 0.08, depth: 0.08 }, scene);
          rail.position.set(cfg.cabinX, baseY + cfg.lowerH + cfg.cabinH + 0.05, zz);
          rail.material = trimMat;
          rail.parent = car;
        }
      }

      // Pickup bed walls.
      if (cfg.bed) {
        const bedX = -cfg.len * 0.28;
        for (const zz of [-cfg.w * 0.42, cfg.w * 0.42]) {
          const wall = BABYLON.MeshBuilder.CreateBox('bedwall', { width: cfg.len * 0.34, height: 0.5, depth: 0.08 }, scene);
          wall.position.set(bedX, baseY + cfg.lowerH + 0.25, zz);
          wall.material = bodyMat;
          wall.parent = car;
        }
        const tail = BABYLON.MeshBuilder.CreateBox('tailgate', { width: 0.08, height: 0.5, depth: cfg.w * 0.84 }, scene);
        tail.position.set(bedX - cfg.len * 0.17, baseY + cfg.lowerH + 0.25, 0);
        tail.material = bodyMat;
        tail.parent = car;
      }

      // Fenders over each wheel.
      const wheelXs = [cfg.len * 0.3, -cfg.len * 0.3];
      const wheelZs = [cfg.w * 0.46, -cfg.w * 0.46];
      let wi = 0;
      for (const x of wheelXs) {
        for (const z of wheelZs) {
          buildWheel(car, x, z, cfg.wheelR, wi);
          const fender = BABYLON.MeshBuilder.CreateTorus('fender', { diameter: cfg.wheelR * 2.5, thickness: 0.16, tessellation: 24 }, scene);
          fender.rotation.x = Math.PI / 2;
          fender.position.set(x, cfg.wheelR + 0.05, z * 0.98);
          fender.scaling.z = 0.5;
          fender.material = trimMat;
          fender.parent = car;
          wi++;
        }
      }

      // Side mirrors.
      for (const z of [cfg.w * 0.5, -cfg.w * 0.5]) {
        const mirror = BABYLON.MeshBuilder.CreateBox('mirror', { width: 0.22, height: 0.14, depth: 0.1 }, scene);
        mirror.position.set(cfg.cabinX + cfg.cabinLen * 0.42, baseY + cfg.lowerH + cfg.cabinH * 0.35, z);
        mirror.material = trimMat;
        mirror.parent = car;
      }

      // Light bars.
      const head = BABYLON.MeshBuilder.CreateBox('headBar', { width: 0.14, height: 0.16, depth: cfg.w * 0.85 }, scene);
      head.position.set(cfg.len / 2 + 0.02, baseY + cfg.lowerH * 0.7, 0);
      head.material = headMat;
      head.parent = car;
      const tailb = BABYLON.MeshBuilder.CreateBox('tailBar', { width: 0.12, height: 0.14, depth: cfg.w * 0.88 }, scene);
      tailb.position.set(-cfg.len / 2 - 0.02, baseY + cfg.lowerH * 0.75, 0);
      tailb.material = tailMat;
      tailb.parent = car;

      // Charge port (rear quarter).
      const port = BABYLON.MeshBuilder.CreateCylinder('port', { diameter: 0.5, height: 0.1, tessellation: 24 }, scene);
      port.rotation.z = Math.PI / 2;
      port.position.set(-cfg.len * 0.42, baseY + cfg.lowerH * 0.8, -cfg.w * 0.46);
      port.material = portMat;
      port.parent = car;
      portRef = portMat;

      carNode = car;
      return car;
    };

    buildCar(bodyType);

    // Charging particle stream toward the rear charge port.
    const particleSystem = new BABYLON.ParticleSystem('charge', 600, scene);
    particleSystem.particleTexture = new BABYLON.Texture(
      'data:image/svg+xml;base64,' +
        btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="white"/></svg>'),
      scene,
    );
    particleSystem.emitter = new BABYLON.Vector3(-4.8, 2.6, -1.1);
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
    particleSystem.color1 = new BABYLON.Color4(0.15, 0.9, 0.7, 1);
    particleSystem.color2 = new BABYLON.Color4(0.2, 0.6, 1, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0.2, 0.3, 0);
    particleSystem.minSize = 0.08;
    particleSystem.maxSize = 0.22;
    particleSystem.minLifeTime = 0.25;
    particleSystem.maxLifeTime = 0.5;
    particleSystem.emitRate = 400;
    particleSystem.direction1 = new BABYLON.Vector3(1.9, -0.9, 0);
    particleSystem.direction2 = new BABYLON.Vector3(1.9, -0.9, 0);
    particleSystem.minEmitPower = 3;
    particleSystem.maxEmitPower = 5;
    particleSystem.gravity = new BABYLON.Vector3(0, -1, 0);
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      if (carNode) carNode.position.y = Math.sin(t * 1.2) * 0.04;
    });

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    apiRef.current = {
      setColor: (hex) => {
        bodyMat.albedoColor = BABYLON.Color3.FromHexString(hex).scale(0.7);
      },
      toggleLights: () => {
        const on = headMat.emissiveColor.r < 0.3;
        headMat.emissiveColor = on ? new BABYLON.Color3(0.95, 0.95, 0.85) : new BABYLON.Color3(0.05, 0.05, 0.05);
        tailMat.emissiveColor = on ? new BABYLON.Color3(0.9, 0.05, 0.12) : new BABYLON.Color3(0.25, 0.02, 0.05);
      },
      startCharge: () => {
        particleSystem.start();
        portRef.emissiveColor = new BABYLON.Color3(0.15, 0.6, 0.5);
        setTimeout(() => {
          particleSystem.stop();
          portRef.emissiveColor = new BABYLON.Color3(0.08, 0.4, 0.32);
        }, 6000);
      },
      setType: (type) => buildCar(type),
    };

    setReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!charging) return;
    const id = setInterval(() => {
      setCharge((c) => {
        if (c >= 100) {
          setCharging(false);
          return 100;
        }
        return Math.min(100, c + 2);
      });
    }, 120);
    return () => clearInterval(id);
  }, [charging]);

  const onCharge = () => {
    if (charge >= 100) setCharge(20);
    setCharging(true);
    apiRef.current?.startCharge();
  };

  const chargeColor = charge < 20 ? 'var(--danger)' : charge < 50 ? 'var(--warn)' : 'var(--accent)';

  return (
    <div className="canvas-frame" style={{ minHeight: 380 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '380px', display: 'block', touchAction: 'none' }} />

      {!ready && (
        <div style={overlayCenter}>
          <span className="spinner" /> <span className="muted small">Loading 3D showroom…</span>
        </div>
      )}

      {/* Body-type selector */}
      <div style={typeWrap}>
        {TYPES.map((tp) => (
          <button
            key={tp.id}
            onClick={() => {
              setBodyType(tp.id);
              apiRef.current?.setType(tp.id);
            }}
            className={`btn ${bodyType === tp.id ? 'primary' : 'ghost'}`}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* Battery + controls overlay */}
      <div style={hudWrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="small muted" style={{ marginBottom: 4 }}>Battery {charging ? '· charging ⚡' : ''}</div>
            <div style={batteryShell}>
              <div style={{ width: `${charge}%`, height: '100%', background: chargeColor, transition: 'width 0.2s linear' }} />
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: chargeColor, minWidth: 52, textAlign: 'right' }}>{charge}%</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn primary" style={miniBtn} onClick={onCharge} disabled={charging}>
            {charging ? 'Charging…' : '⚡ Charge'}
          </button>
          <button
            className="btn ghost"
            style={miniBtn}
            onClick={() => {
              setLightsOn((v) => !v);
              apiRef.current?.toggleLights();
            }}
          >
            💡 Lights {lightsOn ? 'Off' : 'On'}
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {PAINTS.map((p) => (
              <button
                key={p.hex}
                title={p.name}
                aria-label={p.name}
                onClick={() => {
                  setPaint(p.hex);
                  apiRef.current?.setColor(p.hex);
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: p.hex,
                  border: paint === p.hex ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayCenter: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  pointerEvents: 'none',
};

const typeWrap: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  top: 12,
  display: 'flex',
  gap: 6,
};

const hudWrap: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  right: 14,
  bottom: 12,
  background: 'rgba(10,14,20,0.72)',
  backdropFilter: 'blur(8px)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 12px',
};

const batteryShell: React.CSSProperties = {
  height: 14,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
};

const miniBtn: React.CSSProperties = { padding: '7px 12px', fontSize: '0.85rem' };
