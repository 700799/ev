'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';

type ControlApi = {
  setColor: (hex: string) => void;
  toggleLights: () => void;
  startCharge: () => void;
};

const PAINTS = [
  { name: 'Aurora Green', hex: '#25e6a5' },
  { name: 'Electric Blue', hex: '#3aa0ff' },
  { name: 'Nebula Violet', hex: '#b388ff' },
  { name: 'Stealth Gray', hex: '#9bb0c9' },
  { name: 'Sunset Amber', hex: '#ffb547' },
];

/**
 * Interactive Babylon.js EV showroom: an orbit-able stylized electric car with
 * a glow layer, a live charging particle stream, paint swatches, and a working
 * headlight toggle. Drag to rotate, scroll to zoom.
 */
export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const apiRef = useRef<ControlApi | null>(null);

  const [ready, setReady] = useState(false);
  const [charge, setCharge] = useState(62);
  const [charging, setCharging] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);
  const [paint, setPaint] = useState(PAINTS[0].hex);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.06, 0.1, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.04, 0.06, 0.1);
    scene.fogDensity = 0.03;

    // Camera — orbit + auto spin when idle.
    const camera = new BABYLON.ArcRotateCamera(
      'cam',
      Math.PI / 1.6,
      Math.PI / 2.5,
      11,
      new BABYLON.Vector3(0, 0.6, 0),
      scene,
    );
    camera.lowerRadiusLimit = 6;
    camera.upperRadiusLimit = 18;
    camera.lowerBetaLimit = 0.6;
    camera.upperBetaLimit = Math.PI / 2.05;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvas, true);
    camera.useAutoRotationBehavior = true;
    if (camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.18;

    // Lights.
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.groundColor = new BABYLON.Color3(0.05, 0.08, 0.13);
    const key = new BABYLON.DirectionalLight('key', new BABYLON.Vector3(-1, -2, -1), scene);
    key.position = new BABYLON.Vector3(6, 10, 6);
    key.intensity = 1.1;
    const rim = new BABYLON.PointLight('rim', new BABYLON.Vector3(-6, 3, -6), scene);
    rim.diffuse = new BABYLON.Color3(0.2, 0.6, 1);
    rim.intensity = 0.6;

    const glow = new BABYLON.GlowLayer('glow', scene);
    glow.intensity = 0.85;

    // Reflective floor.
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene);
    const groundMat = new BABYLON.PBRMaterial('groundMat', scene);
    groundMat.albedoColor = new BABYLON.Color3(0.02, 0.03, 0.05);
    groundMat.metallic = 0.7;
    groundMat.roughness = 0.35;
    ground.material = groundMat;

    // Grid accent rings on the floor.
    for (let i = 1; i <= 3; i++) {
      const ring = BABYLON.MeshBuilder.CreateTorus(
        `ring${i}`,
        { diameter: 6 + i * 4, thickness: 0.03, tessellation: 64 },
        scene,
      );
      const rm = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
      rm.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.25);
      rm.disableLighting = true;
      ring.material = rm;
      ring.position.y = 0.01;
    }

    // ---- Build a stylized car from primitives ----
    const car = new BABYLON.TransformNode('car', scene);

    const bodyMat = new BABYLON.PBRMaterial('bodyMat', scene);
    bodyMat.albedoColor = BABYLON.Color3.FromHexString(PAINTS[0].hex).scale(0.7);
    bodyMat.metallic = 0.6;
    bodyMat.roughness = 0.3;
    bodyMat.clearCoat.isEnabled = true;
    bodyMat.clearCoat.intensity = 0.9;

    const lowerBody = BABYLON.MeshBuilder.CreateBox('lower', { width: 5.4, height: 1.0, depth: 2.3 }, scene);
    lowerBody.position.y = 0.95;
    lowerBody.material = bodyMat;
    lowerBody.parent = car;

    const hood = BABYLON.MeshBuilder.CreateBox('hood', { width: 2.0, height: 0.5, depth: 2.15 }, scene);
    hood.position.set(1.7, 1.55, 0);
    hood.material = bodyMat;
    hood.parent = car;

    const cabin = BABYLON.MeshBuilder.CreateBox('cabin', { width: 2.6, height: 1.1, depth: 2.0 }, scene);
    cabin.position.set(-0.3, 1.85, 0);
    cabin.material = bodyMat;
    cabin.parent = car;

    // Glass.
    const glassMat = new BABYLON.PBRMaterial('glass', scene);
    glassMat.albedoColor = new BABYLON.Color3(0.05, 0.1, 0.15);
    glassMat.metallic = 0.1;
    glassMat.roughness = 0.05;
    glassMat.alpha = 0.55;
    const windshield = BABYLON.MeshBuilder.CreateBox('wind', { width: 2.5, height: 0.95, depth: 1.9 }, scene);
    windshield.position.set(-0.3, 1.88, 0);
    windshield.scaling.x = 1.02;
    windshield.material = glassMat;
    windshield.parent = car;

    // Wheels.
    const wheelMat = new BABYLON.PBRMaterial('wheelMat', scene);
    wheelMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    wheelMat.metallic = 0.2;
    wheelMat.roughness = 0.8;
    const rimMat = new BABYLON.StandardMaterial('rimMat', scene);
    rimMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.45);
    const wheelPos: [number, number][] = [
      [1.7, 1.0],
      [1.7, -1.0],
      [-1.7, 1.0],
      [-1.7, -1.0],
    ];
    wheelPos.forEach(([x, z], i) => {
      const w = BABYLON.MeshBuilder.CreateCylinder(`wheel${i}`, { diameter: 1.3, height: 0.45, tessellation: 28 }, scene);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.65, z);
      w.material = wheelMat;
      w.parent = car;
      const hub = BABYLON.MeshBuilder.CreateCylinder(`hub${i}`, { diameter: 0.6, height: 0.46, tessellation: 6 }, scene);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.65, z);
      hub.material = rimMat;
      hub.parent = car;
    });

    // Light bars (head + tail) — emissive, toggled.
    const headMat = new BABYLON.StandardMaterial('headMat', scene);
    headMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    const tailMat = new BABYLON.StandardMaterial('tailMat', scene);
    tailMat.emissiveColor = new BABYLON.Color3(0.25, 0.02, 0.05);

    const headBar = BABYLON.MeshBuilder.CreateBox('headBar', { width: 0.15, height: 0.18, depth: 2.0 }, scene);
    headBar.position.set(2.72, 1.3, 0);
    headBar.material = headMat;
    headBar.parent = car;

    const tailBar = BABYLON.MeshBuilder.CreateBox('tailBar', { width: 0.12, height: 0.16, depth: 2.05 }, scene);
    tailBar.position.set(-2.72, 1.35, 0);
    tailBar.material = tailMat;
    tailBar.parent = car;

    // Charge port glow on rear fender.
    const portMat = new BABYLON.StandardMaterial('portMat', scene);
    portMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.6);
    const port = BABYLON.MeshBuilder.CreateCylinder('port', { diameter: 0.5, height: 0.1, tessellation: 24 }, scene);
    port.rotation.z = Math.PI / 2;
    port.position.set(-2.7, 1.5, -1.0);
    port.material = portMat;
    port.parent = car;

    // Charging particle stream from "cable" to the port.
    const particleSystem = new BABYLON.ParticleSystem('charge', 600, scene);
    particleSystem.particleTexture = new BABYLON.Texture(
      'data:image/svg+xml;base64,' +
        btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="white"/></svg>',
        ),
      scene,
    );
    particleSystem.emitter = new BABYLON.Vector3(-4.6, 2.4, -1.0);
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

    // Subtle idle hover for the car.
    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      car.position.y = Math.sin(t * 1.2) * 0.04;
    });

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    // Expose imperative controls to React buttons.
    apiRef.current = {
      setColor: (hex: string) => {
        bodyMat.albedoColor = BABYLON.Color3.FromHexString(hex).scale(0.7);
      },
      toggleLights: () => {
        const on = headMat.emissiveColor.r < 0.3;
        headMat.emissiveColor = on
          ? new BABYLON.Color3(0.95, 0.95, 0.85)
          : new BABYLON.Color3(0.05, 0.05, 0.05);
        tailMat.emissiveColor = on
          ? new BABYLON.Color3(0.9, 0.05, 0.12)
          : new BABYLON.Color3(0.25, 0.02, 0.05);
      },
      startCharge: () => {
        particleSystem.start();
        portMat.emissiveColor = new BABYLON.Color3(0.2, 1, 0.8);
        setTimeout(() => {
          particleSystem.stop();
          portMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.6);
        }, 6000);
      },
    };

    setReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  // Animate the (HTML) battery readout while charging.
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
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '380px', display: 'block', touchAction: 'none' }}
      />

      {!ready && (
        <div style={overlayCenter}>
          <span className="spinner" /> <span className="muted small">Loading 3D showroom…</span>
        </div>
      )}

      {/* Battery + controls overlay */}
      <div style={hudWrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="small muted" style={{ marginBottom: 4 }}>
              Battery {charging ? '· charging ⚡' : ''}
            </div>
            <div style={batteryShell}>
              <div
                style={{
                  width: `${charge}%`,
                  height: '100%',
                  background: chargeColor,
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: chargeColor, minWidth: 52, textAlign: 'right' }}>
            {charge}%
          </div>
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
