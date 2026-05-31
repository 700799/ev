'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';

type Demo = 'regen' | 'drag' | 'charge' | 'thermal' | 'cornering' | 'inertia';

const TABS: { id: Demo; label: string }[] = [
  { id: 'regen', label: '♻️ Regen Braking' },
  { id: 'drag', label: '💨 Aero Drag' },
  { id: 'charge', label: '🔌 Charge Curve' },
  { id: 'thermal', label: '🌡️ Thermal' },
  { id: 'cornering', label: '🌀 Cornering' },
  { id: 'inertia', label: '🧱 Inertia' },
];

/**
 * Four small, physically-grounded Babylon animations. Each runs its own scene;
 * switching tabs disposes the old one and builds the next. A shared `params`
 * ref carries slider values into the render loop.
 */
export default function ScienceLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();
  const [demo, setDemo] = useState<Demo>('regen');

  // Shared live controls.
  const [speed, setSpeed] = useState(65); // mph (drag) / starting speed (regen)
  const [soc, setSoc] = useState(10); // % state of charge (charge curve)
  const [cooling, setCooling] = useState(true); // thermal: coolant on/off
  const [cornerMph, setCornerMph] = useState(35); // cornering entry speed
  const [massKg, setMassKg] = useState(2100); // inertia: vehicle mass
  const params = useRef({ speed: 65, soc: 10, cooling: true, cornerMph: 35, massKg: 2100 });
  useEffect(() => { params.current = { speed, soc, cooling, cornerMph, massKg }; }, [speed, soc, cooling, cornerMph, massKg]);

  // Live readouts driven by the render loop.
  const [readout, setReadout] = useState<{ a: string; b: string; c: string }>({ a: '', b: '', c: '' });

  useEffect(() => {
    record('feature:sciencelab');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.11, 1);

    const cleanup = buildDemo(demo, scene, engine, params, setReadout);

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cleanup?.();
      scene.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} className={`btn ${demo === t.id ? 'primary' : 'ghost'}`} style={{ padding: '7px 13px', fontSize: '0.86rem' }} onClick={() => setDemo(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Canvas on top (shorter), controls + readouts directly under it so you
          can adjust and watch the scene at the same time. */}
      <div className="canvas-frame" style={{ minHeight: 240, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '240px', display: 'block', touchAction: 'none' }} />
        {/* Thin readout strip along the bottom so the animation stays visible. */}
        <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', pointerEvents: 'none' }}>
          {([readout.a, readout.b, readout.c] as const).filter(Boolean).map((r, i) => (
            <div key={i} style={{ background: 'rgba(10,14,20,0.8)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              <span className="muted">{r.split('|')[0]}</span> <strong>{r.split('|')[1]}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {demo === 'regen' && (
          <>
            <h3 style={{ marginTop: 0 }}>Regenerative braking</h3>
            <p className="small muted">Lifting off the accelerator turns the motor into a generator. The car&apos;s kinetic energy (½·m·v²) is converted back into charge instead of wasted as brake heat. Faster cars carry more energy to recover.</p>
            <Slider label={`Starting speed: ${speed} mph`} min={20} max={90} value={speed} set={setSpeed} />
          </>
        )}
        {demo === 'drag' && (
          <>
            <h3 style={{ marginTop: 0 }}>Aerodynamic drag</h3>
            <p className="small muted">Drag force = ½·ρ·Cd·A·v². Because it grows with the <em>square</em> of speed, going faster costs far more energy — the streamlines turn turbulent and the force readout climbs sharply.</p>
            <Slider label={`Speed: ${speed} mph`} min={20} max={90} value={speed} set={setSpeed} />
          </>
        )}
        {demo === 'charge' && (
          <>
            <h3 style={{ marginTop: 0 }}>The charging taper</h3>
            <p className="small muted">On a DC fast charger, power is high at low charge then tapers as the battery fills (to avoid lithium plating). Set the starting charge and watch how fast it fills — the last 20% is slow, which is why you charge to ~80% on trips.</p>
            <Slider label={`Start charge: ${soc}%`} min={5} max={80} value={soc} set={setSoc} />
          </>
        )}
        {demo === 'thermal' && (
          <>
            <h3 style={{ marginTop: 0 }}>Thermal management</h3>
            <p className="small muted">Fast charging makes cells hot (color = temperature). Liquid coolant flowing through the pack carries heat away, keeping cells in their safe window — the key to long battery life and sustained charging speed.</p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input type="checkbox" checked={cooling} onChange={(e) => setCooling(e.target.checked)} />
              <span>Coolant pump {cooling ? 'ON' : 'OFF'}</span>
            </label>
          </>
        )}
        {demo === 'cornering' && (
          <>
            <h3 style={{ marginTop: 0 }}>Cornering physics</h3>
            <p className="small muted">To turn, tires must supply a centripetal force F = m·v²/r toward the center of the curve. Grip can only provide up to about μ·m·g. Raise the entry speed: once the needed force exceeds the grip limit, the car slides wide and leaves skid marks.</p>
            <Slider label={`Entry speed: ${cornerMph} mph`} min={15} max={70} value={cornerMph} set={setCornerMph} />
          </>
        )}
        {demo === 'inertia' && (
          <>
            <h3 style={{ marginTop: 0 }}>Inertia &amp; momentum</h3>
            <p className="small muted">Newton&apos;s first law: a moving mass keeps moving. Momentum p = m·v, and braking distance grows with the <em>square</em> of speed (d = v²/2μg). A heavier EV carries more momentum and takes longer to stop — try a faster entry or a heavier car and watch it run the line.</p>
            <Slider label={`Entry speed: ${speed} mph`} min={20} max={90} value={speed} set={setSpeed} />
            <Slider label={`Vehicle mass: ${massKg} kg`} min={1400} max={3200} value={massKg} set={setMassKg} />
          </>
        )}
      </div>
    </div>
  );
}

function Slider({ label, min, max, value, set }: { label: string; min: number; max: number; value: number; set: (n: number) => void }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="small muted" style={{ marginBottom: 4 }}>{label}</div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  );
}

type Params = React.MutableRefObject<{ speed: number; soc: number; cooling: boolean; cornerMph: number; massKg: number }>;
type SetReadout = (r: { a: string; b: string; c: string }) => void;

function buildDemo(demo: Demo, scene: BABYLON.Scene, engine: BABYLON.Engine, params: Params, setReadout: SetReadout): (() => void) | void {
  // Per-demo framing so each scene fills the (short) canvas instead of floating
  // in empty space. target/radius tuned to the geometry each demo builds.
  const FRAME: Record<Demo, { target: [number, number, number]; radius: number; alpha: number; beta: number }> = {
    regen: { target: [-1, 1, 0], radius: 14, alpha: -Math.PI / 2.2, beta: Math.PI / 2.5 },
    drag: { target: [0, 1.6, 0], radius: 13, alpha: -Math.PI / 2, beta: Math.PI / 2.6 },
    charge: { target: [3, 3, 0], radius: 13, alpha: -Math.PI / 2, beta: Math.PI / 2.4 },
    thermal: { target: [0, 1, 0], radius: 12, alpha: -Math.PI / 2, beta: Math.PI / 3.2 },
    cornering: { target: [0, 0.5, 0], radius: 22, alpha: -Math.PI / 2, beta: Math.PI / 3.4 },
    inertia: { target: [0, 0.8, 0], radius: 20, alpha: -Math.PI / 2, beta: Math.PI / 2.7 },
  };
  const f = FRAME[demo];
  const cam = new BABYLON.ArcRotateCamera('c', f.alpha, f.beta, f.radius, new BABYLON.Vector3(...f.target), scene);
  cam.attachControl(scene.getEngine().getRenderingCanvas(), true);
  cam.lowerRadiusLimit = 8; cam.upperRadiusLimit = 26;
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.2), scene); hemi.intensity = 0.9;
  const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;
  const C3 = BABYLON.Color3;
  const RHO = 1.225, G = 9.81;

  let lastUi = 0;
  const ui = (cb: () => void) => { const t = performance.now(); if (t - lastUi > 120) { lastUi = t; cb(); } };

  if (demo === 'regen') {
    // A simple car + four wheels + an energy bar from motor to battery.
    const carMat = new BABYLON.StandardMaterial('cm', scene); carMat.diffuseColor = new C3(0.12, 0.5, 0.42);
    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 4, height: 1, depth: 2 }, scene);
    body.position.y = 1; body.material = carMat;
    const wheels: BABYLON.Mesh[] = [];
    const wm = new BABYLON.StandardMaterial('wm', scene); wm.diffuseColor = new C3(0.05, 0.05, 0.06);
    for (const [x, z] of [[1.4, 1], [-1.4, 1], [1.4, -1], [-1.4, -1]] as [number, number][]) {
      const w = BABYLON.MeshBuilder.CreateCylinder('w', { diameter: 1.2, height: 0.4, tessellation: 20 }, scene);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.6, z); w.material = wm; wheels.push(w);
      const spoke = BABYLON.MeshBuilder.CreateBox('sp', { width: 1, height: 0.42, depth: 0.12 }, scene);
      spoke.position.set(x, 0.6, z); spoke.rotation.x = Math.PI / 2; spoke.material = wm; spoke.parent = w;
    }
    // Battery block (right) + glowing energy packets traveling into it.
    const battMat = new BABYLON.StandardMaterial('bm', scene); battMat.diffuseColor = new C3(0.1, 0.3, 0.5); battMat.emissiveColor = new C3(0.05, 0.15, 0.25);
    const batt = BABYLON.MeshBuilder.CreateBox('batt', { width: 1.4, height: 1.6, depth: 2 }, scene);
    batt.position.set(-3.6, 1, 0); batt.material = battMat;
    const fillMat = new BABYLON.StandardMaterial('fm', scene); fillMat.emissiveColor = new C3(0.15, 0.85, 0.6); fillMat.disableLighting = true;
    const fill = BABYLON.MeshBuilder.CreateBox('fill', { width: 1.2, height: 0.1, depth: 1.8 }, scene);
    fill.material = fillMat; fill.parent = batt;
    const packMat = new BABYLON.StandardMaterial('pm', scene); packMat.emissiveColor = new C3(0.2, 0.9, 0.6); packMat.disableLighting = true;
    const packets = Array.from({ length: 8 }, (_, i) => { const p = BABYLON.MeshBuilder.CreateSphere('p' + i, { diameter: 0.3 }, scene); p.material = packMat; p.setEnabled(false); return p; });

    let v = params.current.speed * 0.44704; // m/s
    const mass = 1900;
    let recovered = 0;
    let pulse = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const braking = v > 0.5;
      // Decelerate (regen): a ~ 2.5 m/s^2.
      if (braking) v = Math.max(0, v - 2.5 * dt); else v = params.current.speed * 0.44704; // loop: reset to slider speed
      const ke = 0.5 * mass * v * v;
      // Spin wheels at speed.
      for (const w of wheels) w.rotation.x += v * dt * 0.6;
      // Regen power ~ m*a*v; animate packets + fill while braking.
      const regenKw = braking ? (mass * 2.5 * v) / 1000 : 0;
      if (braking) { recovered += regenKw * dt / 3600; pulse += dt; }
      packets.forEach((p, i) => {
        if (!braking) { p.setEnabled(false); return; }
        p.setEnabled(true);
        const t = ((pulse * 1.5 + i / packets.length) % 1);
        p.position = BABYLON.Vector3.Lerp(new BABYLON.Vector3(1.4, 0.9, 0), new BABYLON.Vector3(-3.6, 1, 0), t);
        p.scaling.setAll(0.6 + 0.4 * Math.sin(t * Math.PI));
      });
      fill.scaling.y = Math.min(14, 2 + recovered * 4); fill.position.y = -0.75 + (fill.scaling.y * 0.1) / 2;
      ui(() => setReadout({
        a: `SPEED|${(v / 0.44704).toFixed(0)} mph`,
        b: `REGEN POWER|${regenKw.toFixed(0)} kW`,
        c: `KINETIC ENERGY RECOVERED|${(ke / 3.6e6).toFixed(2)} kWh worth in motion`,
      }));
    });
    return;
  }

  if (demo === 'drag') {
    const carMat = new BABYLON.StandardMaterial('cm', scene); carMat.diffuseColor = new C3(0.12, 0.5, 0.42); carMat.specularColor = new C3(0.2, 0.2, 0.2);
    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 4.4, height: 1.1, depth: 2 }, scene); body.position.y = 1; body.material = carMat;
    const cab = BABYLON.MeshBuilder.CreateBox('cab', { width: 2.4, height: 0.9, depth: 1.8 }, scene); cab.position.set(-0.3, 1.9, 0); cab.material = carMat;
    // Streamlines: tubes of small spheres flowing past the car.
    const lineMat = new BABYLON.StandardMaterial('lm', scene); lineMat.emissiveColor = new C3(0.3, 0.7, 1); lineMat.disableLighting = true;
    interface Stream { dots: BABYLON.Mesh[]; y: number; z: number; phase: number; }
    const streams: Stream[] = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.5 + i * 0.5; const z = -1.5 + (i % 3);
      const dots = Array.from({ length: 16 }, () => { const d = BABYLON.MeshBuilder.CreateSphere('d', { diameter: 0.18 }, scene); d.material = lineMat; return d; });
      streams.push({ dots, y, z, phase: Math.random() });
    }
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const mph = params.current.speed; const v = mph * 0.44704;
      const Cd = 0.28, A = 2.3;
      const dragN = 0.5 * RHO * Cd * A * v * v;
      const powerKw = (dragN * v) / 1000;
      const turb = Math.min(1, (mph - 20) / 70); // turbulence factor
      const flowSpeed = 0.3 + v * 0.02;
      for (const s of streams) {
        s.phase = (s.phase + dt * flowSpeed) % 1;
        s.dots.forEach((d, j) => {
          const t = (j / s.dots.length + s.phase) % 1;
          const x = 8 - t * 16;
          // Deflect around the car body, with turbulence wiggle near/behind it.
          const near = Math.exp(-Math.pow(x / 2.2, 2));
          const lift = near * (0.8 + s.y * 0.2);
          const wob = x < 1 ? turb * Math.sin((x * 6) + s.phase * 30 + j) * 0.5 * near : 0;
          d.position.set(x, s.y + lift + wob, s.z + wob * 0.5);
          const turbo = x < 1 ? turb : 0;
          (d.material as BABYLON.StandardMaterial).emissiveColor = new C3(0.3 + turbo * 0.6, 0.7 - turbo * 0.4, 1 - turbo * 0.6);
        });
      }
      ui(() => setReadout({
        a: `SPEED|${mph} mph`,
        b: `DRAG FORCE|${dragN.toFixed(0)} N`,
        c: `POWER TO PUSH AIR|${powerKw.toFixed(1)} kW  (grows with v²)`,
      }));
    });
    return;
  }

  if (demo === 'charge') {
    // Battery shell + animated fill + a live curve plotted from points.
    const shell = BABYLON.MeshBuilder.CreateBox('shell', { width: 3, height: 6, depth: 3 }, scene);
    shell.position.y = 3; const sm = new BABYLON.StandardMaterial('sm', scene); sm.diffuseColor = new C3(0.1, 0.12, 0.18); sm.alpha = 0.35; shell.material = sm;
    const fillMat = new BABYLON.StandardMaterial('fm', scene); fillMat.emissiveColor = new C3(0.15, 0.85, 0.6); fillMat.disableLighting = true;
    const fill = BABYLON.MeshBuilder.CreateBox('fill', { width: 2.8, height: 1, depth: 2.8 }, scene); fill.material = fillMat; fill.parent = shell;
    // Curve dots to the right showing kW vs SoC.
    const curveMat = new BABYLON.StandardMaterial('cv', scene); curveMat.emissiveColor = new C3(0.3, 0.6, 1); curveMat.disableLighting = true;
    const curve = Array.from({ length: 40 }, (_, i) => { const d = BABYLON.MeshBuilder.CreateSphere('cd' + i, { diameter: 0.18 }, scene); d.material = curveMat; d.position.x = 5; d.setEnabled(false); return d; });
    // Real-ish taper: peak ~150kW to ~50% then linear taper to ~25kW at 100%.
    const kwAt = (s: number) => s < 50 ? 150 - s * 0.6 : Math.max(25, 120 - (s - 50) * 1.9);

    let soc = params.current.soc; let lastStart = soc;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      if (params.current.soc !== lastStart) { lastStart = params.current.soc; soc = params.current.soc; }
      const kw = kwAt(soc);
      // dSoC/dt proportional to kW (toy battery ~75kWh): %/s.
      soc = Math.min(100, soc + (kw / 75) * dt * 3.2);
      if (soc >= 100) soc = params.current.soc; // loop
      fill.scaling.y = soc / 100 * 6 / 1; fill.position.y = -3 + (fill.scaling.y) / 2;
      curve.forEach((d, i) => { d.setEnabled(true); const s = (i / (curve.length - 1)) * 100; d.position.set(4.5 + (s / 100) * 4, 0.4 + (kwAt(s) / 150) * 5, 0); const passed = s <= soc; (d.material as BABYLON.StandardMaterial).emissiveColor = passed ? new C3(0.2, 0.9, 0.6) : new C3(0.25, 0.4, 0.7); });
      ui(() => setReadout({
        a: `CHARGE|${soc.toFixed(0)}%`,
        b: `POWER|${kw.toFixed(0)} kW`,
        c: soc > 80 ? 'NOTE|Past 80% it crawls — unplug & drive' : 'NOTE|Fast zone — high power',
      }));
    });
    return;
  }

  if (demo === 'thermal') {
  const cells: { mesh: BABYLON.Mesh; mat: BABYLON.StandardMaterial; temp: number }[] = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) {
    const c = BABYLON.MeshBuilder.CreateCylinder('cell', { diameter: 0.9, height: 2, tessellation: 16 }, scene);
    c.position.set((x - 2.5) * 1.2, 1, (z - 1.5) * 1.2);
    const m = new BABYLON.StandardMaterial('cm' + x + z, scene); m.emissiveColor = new C3(0.2, 0.6, 0.9); m.disableLighting = true; c.material = m;
    cells.push({ mesh: c, mat: m, temp: 25 });
  }
  // Coolant packets weaving between cell rows.
  const coolMat = new BABYLON.StandardMaterial('cool', scene); coolMat.emissiveColor = new C3(0.2, 0.6, 1); coolMat.disableLighting = true;
  const coolant = Array.from({ length: 14 }, (_, i) => { const p = BABYLON.MeshBuilder.CreateSphere('co' + i, { diameter: 0.35 }, scene); p.material = coolMat; return p; });
  const tempColor = (t: number) => { const f = Math.max(0, Math.min(1, (t - 25) / 55)); return new C3(0.2 + f * 0.75, 0.6 - f * 0.5, 0.9 - f * 0.8); };
  let flow = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
    const cooling = params.current.cooling;
    flow += dt;
    let maxT = 0, sumT = 0;
    for (const c of cells) {
      c.temp += 9 * dt; // fast-charge heating
      if (cooling) c.temp -= (c.temp - 25) * 0.9 * dt; // Newtonian cooling toward ambient
      c.temp = Math.max(25, Math.min(85, c.temp));
      c.mat.emissiveColor = tempColor(c.temp);
      c.mesh.scaling.y = 1 + (c.temp - 25) / 400;
      maxT = Math.max(maxT, c.temp); sumT += c.temp;
    }
    coolant.forEach((p, i) => {
      p.setEnabled(cooling);
      if (!cooling) return;
      const t = ((flow * 0.5 + i / coolant.length) % 1);
      const row = i % 4;
      p.position.set(-3.5 + t * 7, 0.4, (row - 1.5) * 1.2);
    });
    ui(() => setReadout({
      a: `HOTTEST CELL|${maxT.toFixed(0)}°C`,
      b: `AVERAGE|${(sumT / cells.length).toFixed(0)}°C`,
      c: cooling ? 'STATUS|Coolant holding cells safe ✅' : 'STATUS|No cooling — overheating ⚠️',
    }));
  });
  return;
  }

  if (demo === 'cornering') {
    // Centripetal force F = m·v²/r. The car follows a circle of radius r while
    // grip can only supply up to μ·m·g of sideways force; exceed it and it
    // slides wide off the line. We show required vs available force.
    const R = 8; // corner radius (m)
    const MU = 0.95, MASS = 2000;
    // The ideal racing line (circle) drawn as dots.
    const lineMat = new C3(0.25, 0.5, 0.8);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const d = BABYLON.MeshBuilder.CreateSphere('ln' + i, { diameter: 0.18 }, scene);
      d.position.set(Math.cos(a) * R, 0.1, Math.sin(a) * R);
      const m = new BABYLON.StandardMaterial('lm' + i, scene); m.emissiveColor = lineMat; m.disableLighting = true; d.material = m;
    }
    // Car.
    const carMat = new BABYLON.StandardMaterial('cm', scene); carMat.diffuseColor = new C3(0.12, 0.5, 0.42);
    const car = BABYLON.MeshBuilder.CreateBox('car', { width: 1.4, height: 0.8, depth: 2.6 }, scene);
    car.material = carMat;
    // Force arrow (toward center) — scales with required centripetal force.
    const arrowMat = new BABYLON.StandardMaterial('am', scene); arrowMat.emissiveColor = new C3(1, 0.4, 0.2); arrowMat.disableLighting = true;
    const arrow = BABYLON.MeshBuilder.CreateCylinder('arr', { diameter: 0.25, height: 1, tessellation: 8 }, scene); arrow.material = arrowMat;
    // Skid marks pool.
    const skidMat = new BABYLON.StandardMaterial('sk', scene); skidMat.diffuseColor = new C3(0.02, 0.02, 0.02);
    const skids = Array.from({ length: 30 }, () => { const s = BABYLON.MeshBuilder.CreateBox('sd', { width: 0.16, height: 0.02, depth: 0.5 }, scene); s.material = skidMat; s.setEnabled(false); return s; });
    let skidIdx = 0;

    let ang = 0, slide = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const v = params.current.cornerMph * 0.44704;
      const needed = (MASS * v * v) / R;       // required centripetal force (N)
      const available = MU * MASS, G2 = 9.81;  // max grip force = μ·m·g
      const grip = available * G2;
      const overshoot = needed / grip;          // >1 means sliding wide
      // Angular speed around the circle; slide pushes the car outward.
      ang += (v / R) * dt;
      slide += ((overshoot > 1 ? (overshoot - 1) * 3 : -slide) - slide * 0.0) * Math.min(1, dt * 2);
      slide = Math.max(0, Math.min(6, slide));
      const rr = R + slide;
      car.position.set(Math.cos(ang) * rr, 0.4, Math.sin(ang) * rr);
      car.rotation.y = -ang + (overshoot > 1 ? 0.5 : 0); // tail-out when sliding
      // Centripetal arrow points from car toward center.
      const inward = new BABYLON.Vector3(-Math.cos(ang), 0, -Math.sin(ang));
      arrow.position = car.position.add(inward.scale(0.8)).add(new BABYLON.Vector3(0, 0.2, 0));
      arrow.scaling.y = Math.min(4, needed / grip * 2 + 0.3);
      arrow.rotation.z = Math.PI / 2; arrow.rotation.y = -ang + Math.PI / 2;
      arrowMat.emissiveColor = overshoot > 1 ? new C3(1, 0.2, 0.15) : new C3(0.3, 0.8, 0.4);
      if (overshoot > 1 && Math.random() < 0.6) { const s = skids[skidIdx % skids.length]; skidIdx++; s.setEnabled(true); s.position.copyFrom(car.position); s.position.y = 0.03; s.rotation.y = -ang; }
      ui(() => setReadout({
        a: `NEEDED FORCE|${(needed / 1000).toFixed(1)} kN`,
        b: `GRIP LIMIT|${(grip / 1000).toFixed(1)} kN`,
        c: overshoot > 1 ? 'STATUS|Too fast — sliding wide! 🚗💨' : 'STATUS|Holding the line ✅',
      }));
    });
    return;
  }

  // inertia — Newton's first law: a moving mass resists stopping. Braking
  // distance d = v²/(2·μ·g) grows with the SQUARE of speed and with mass-driven
  // momentum p = m·v. Two identical brakes, heavier car stops later.
  const MU = 0.8, G2 = 9.81;
  const roadMat = new BABYLON.StandardMaterial('rm', scene); roadMat.diffuseColor = new C3(0.07, 0.08, 0.1);
  const road = BABYLON.MeshBuilder.CreateGround('rd', { width: 8, height: 60 }, scene); road.material = roadMat; road.position.z = -10;
  // Stop line at z = 0.
  const lineMat2 = new BABYLON.StandardMaterial('lm2', scene); lineMat2.emissiveColor = new C3(0.9, 0.2, 0.2); lineMat2.disableLighting = true;
  const stopLine = BABYLON.MeshBuilder.CreateBox('sl', { width: 8, height: 0.05, depth: 0.4 }, scene); stopLine.material = lineMat2; stopLine.position.set(0, 0.05, 0);
  const carMat = new BABYLON.StandardMaterial('cm', scene); carMat.diffuseColor = new C3(0.12, 0.5, 0.42);
  const car = BABYLON.MeshBuilder.CreateBox('car', { width: 1.6, height: 0.9, depth: 3 }, scene); car.material = carMat;
  const arrowMat = new BABYLON.StandardMaterial('am', scene); arrowMat.emissiveColor = new C3(0.3, 0.6, 1); arrowMat.disableLighting = true;
  const momentum = BABYLON.MeshBuilder.CreateCylinder('mo', { diameter: 0.3, height: 1, tessellation: 8 }, scene); momentum.material = arrowMat; momentum.rotation.x = Math.PI / 2;

  let z = -28, v = 0, braking = false, settle = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
    const mass = params.current.massKg;
    const entry = params.current.speed * 0.44704; // entry speed from the shared speed slider
    const stopDist = (entry * entry) / (2 * MU * G2); // m, independent of mass for ideal tires…
    // …but we add a mass penalty to illustrate momentum/heavier = longer in practice.
    const massPenalty = 1 + (mass - 1800) / 6000;
    const realStop = stopDist * massPenalty;
    if (z < -realStop) { v = entry; braking = false; } // cruising in
    if (z >= -realStop && !braking && v > 0.2) braking = true;
    if (braking) v = Math.max(0, v - (MU * G2 / massPenalty) * dt);
    z += v * dt;
    if (v <= 0.2 && braking) { settle += dt; if (settle > 1.4) { z = -28; v = entry; braking = false; settle = 0; } }
    car.position.set(0, 0.45, z);
    // Momentum arrow length = m·v (scaled).
    const p = mass * v;
    momentum.position.set(0, 0.9, z + 1.6 + Math.min(4, p / 12000));
    momentum.scaling.y = Math.max(0.1, Math.min(8, p / 6000));
    arrowMat.emissiveColor = braking ? new C3(1, 0.4, 0.2) : new C3(0.3, 0.6, 1);
    const overshot = z > 0.5;
    ui(() => setReadout({
      a: `MOMENTUM|${(p / 1000).toFixed(0)} kN·s`,
      b: `STOP DISTANCE|${realStop.toFixed(0)} m`,
      c: overshot ? 'STATUS|Ran the stop line! ⚠️' : braking ? 'STATUS|Braking…' : 'STATUS|Cruising',
    }));
  });
}
