'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';
import { withBase } from '@/lib/site';
import { buildCar, createCarMaterials, type CarConfig } from '@/lib/carBuilder';
import { computeStats, BODY_SPECS, WHEEL_SPECS, ACCESSORY_SPECS, type BodyType, type WheelStyle } from '@/data/configSpecs';

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

const STORE_KEY = 'ev-build-v1';

export default function Configurator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rebuildRef = useRef<(c: CarConfig) => void>(() => {});
  const { record } = useGame();

  const [ready, setReady] = useState(false);
  const [body, setBody] = useState<BodyType>('suv');
  const [paint, setPaint] = useState(PAINTS[0].hex);
  const [wheel, setWheel] = useState<WheelStyle>('sport');
  const [accessories, setAccessories] = useState<Set<string>>(new Set(['roofrack']));

  const stats = useMemo(() => computeStats(body, wheel, accessories), [body, wheel, accessories]);

  // Live rebuild whenever the config changes — the car is always on screen.
  useEffect(() => {
    rebuildRef.current({ body, paint, wheel, accessories });
  }, [body, paint, wheel, accessories]);

  // Persist the build so the drive-and-explore mode can load the same car.
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ body, paint, wheel, accessories: [...accessories] }));
    } catch { /* ignore */ }
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

    const mats = createCarMaterials(scene);
    const probe = new BABYLON.ReflectionProbe('probe', 256, scene);
    probe.renderList?.push(ground, ...rings);
    probe.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    mats.bodyMat.reflectionTexture = probe.cubeTexture;
    mats.bodyMat.environmentIntensity = 0.55;

    let built = buildCar(scene, mats, { body, paint, wheel, accessories });

    rebuildRef.current = (cfg) => {
      built.node.dispose();
      built = buildCar(scene, mats, cfg);
    };

    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      built.node.position.y = Math.sin(t * 1.1) * 0.03;
      if (built.underglow && built.underglow.material) {
        (built.underglow.material as BABYLON.StandardMaterial).alpha = 0.6 + Math.sin(t * 4) * 0.25;
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
      {/* The car is always visible up top — sticky so it stays in view while you scroll options. */}
      <div className="build-stage canvas-frame">
        <canvas ref={canvasRef} style={{ width: '100%', height: '340px', display: 'block', touchAction: 'none' }} />
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <span className="spinner" /> <span className="muted small" style={{ marginLeft: 8 }}>Loading your garage…</span>
          </div>
        )}
        <div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(10,14,20,0.72)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }} className="small">
          <strong style={{ color: 'var(--accent)' }}>${stats.price.toLocaleString()}</strong>
          <span className="muted"> · {stats.rangeMi} mi · {stats.weightKg.toLocaleString()} kg</span>
        </div>
        <div style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(10,14,20,0.7)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 9px' }} className="small muted">
          Drag to spin
        </div>
      </div>

      {/* Carousel rows of options */}
      <div className="build-row">
        <div className="build-row-label">Body style</div>
        <div className="opt-rail">
          {BODIES.map((b) => (
            <button key={b.id} className={`opt-chip ${body === b.id ? 'on' : ''}`} onClick={() => { setBody(b.id); record('feature:configurator'); }}>
              <span className="opt-name">{b.label}</span>
              <span className="opt-cost">${(BODY_SPECS[b.id].price / 1000).toFixed(0)}k</span>
            </button>
          ))}
        </div>
      </div>

      <div className="build-row">
        <div className="build-row-label">Paint</div>
        <div className="opt-rail">
          {PAINTS.map((p) => (
            <button
              key={p.hex}
              className={`opt-chip ${paint === p.hex ? 'on' : ''}`}
              onClick={() => { setPaint(p.hex); record('feature:configurator'); }}
              title={p.name}
            >
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.hex, display: 'inline-block', border: '1px solid rgba(255,255,255,0.3)' }} />
              <span className="opt-name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="build-row">
        <div className="build-row-label">Wheels</div>
        <div className="opt-rail">
          {WHEELS.map((w) => (
            <button key={w.id} className={`opt-chip ${wheel === w.id ? 'on' : ''}`} onClick={() => { setWheel(w.id); record('feature:configurator'); }}>
              <span className="opt-name">{w.label}</span>
              <span className="opt-cost">{WHEEL_SPECS[w.id].cost ? `+$${WHEEL_SPECS[w.id].cost}` : 'incl.'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="build-row">
        <div className="build-row-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Accessories — tap to add</span>
          <span className="pill" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>{accessories.size}/15</span>
        </div>
        <div className="opt-rail">
          {ACCESSORIES.map((a) => {
            const on = accessories.has(a.id);
            const spec = ACCESSORY_SPECS[a.id];
            return (
              <button
                key={a.id}
                className={`opt-chip ${on ? 'on' : ''}`}
                onClick={() => toggleAcc(a.id)}
                aria-pressed={on}
                title={`+$${spec.cost} · +${spec.weightKg}kg${spec.cdDelta > 0 ? ` · +${spec.cdDelta.toFixed(3)} drag` : ''}`}
              >
                <span className="opt-name">{on ? '✓ ' : '+ '}{a.label}</span>
                <span className="opt-cost">${spec.cost}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={reset} style={{ padding: '6px 12px' }}>Clear all</button>
          <a className="btn primary" href={withBase('/explore/')} style={{ padding: '6px 14px' }}>🌆 Drive &amp; explore this car →</a>
        </div>
      </div>

      {/* Budget + physics impact */}
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
            <p className="small muted" style={{ margin: 0 }}>{deltaLabel(stats.rangeMi - stats.baseRangeMi, 'mi')} vs stock · {stats.whPerMile} Wh/mi @ 65 mph</p>
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
