'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';

type Demo = 'regen' | 'drag' | 'charge' | 'thermal';

const TABS: { id: Demo; label: string }[] = [
  { id: 'regen', label: '♻️ Regen Braking' },
  { id: 'drag', label: '💨 Aero Drag' },
  { id: 'charge', label: '🔌 Charge Curve' },
  { id: 'thermal', label: '🌡️ Thermal' },
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
  const params = useRef({ speed: 65, soc: 10, cooling: true });
  useEffect(() => { params.current = { speed, soc, cooling }; }, [speed, soc, cooling]);

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

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="canvas-frame" style={{ minHeight: 320 }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '320px', display: 'block', touchAction: 'none' }} />
        </div>

        <div className="card">
          {demo === 'regen' && (
            <>
              <h3>Regenerative braking</h3>
              <p className="small muted">Lifting off the accelerator turns the motor into a generator. The car&apos;s kinetic energy (½·m·v²) is converted back into charge instead of wasted as brake heat. Faster cars carry more energy to recover.</p>
              <Slider label={`Starting speed: ${speed} mph`} min={20} max={90} value={speed} set={setSpeed} />
            </>
          )}
          {demo === 'drag' && (
            <>
              <h3>Aerodynamic drag</h3>
              <p className="small muted">Drag force = ½·ρ·Cd·A·v². Because it grows with the <em>square</em> of speed, going faster costs far more energy — the streamlines turn turbulent and the force readout climbs sharply.</p>
              <Slider label={`Speed: ${speed} mph`} min={20} max={90} value={speed} set={setSpeed} />
            </>
          )}
          {demo === 'charge' && (
            <>
              <h3>The charging taper</h3>
              <p className="small muted">On a DC fast charger, power is high at low charge then tapers as the battery fills (to avoid lithium plating). Set the starting charge and watch how fast it fills — the last 20% is slow, which is why you charge to ~80% on trips.</p>
              <Slider label={`Start charge: ${soc}%`} min={5} max={80} value={soc} set={setSoc} />
            </>
          )}
          {demo === 'thermal' && (
            <>
              <h3>Thermal management</h3>
              <p className="small muted">Fast charging makes cells hot (color = temperature). Liquid coolant flowing through the pack carries heat away, keeping cells in their safe window — the key to long battery life and sustained charging speed.</p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input type="checkbox" checked={cooling} onChange={(e) => setCooling(e.target.checked)} />
                <span>Coolant pump {cooling ? 'ON' : 'OFF'}</span>
              </label>
            </>
          )}

          <div className="grid cols-2" style={{ marginTop: 14, gap: 10 }}>
            {readout.a && <div className="card" style={{ padding: 12 }}><div className="num">{readout.a.split('|')[0]}</div><div className="result-strong" style={{ fontSize: '1.4rem' }}>{readout.a.split('|')[1]}</div></div>}
            {readout.b && <div className="card" style={{ padding: 12 }}><div className="num">{readout.b.split('|')[0]}</div><div className="result-strong" style={{ fontSize: '1.4rem' }}>{readout.b.split('|')[1]}</div></div>}
            {readout.c && <div className="card" style={{ padding: 12, gridColumn: '1 / -1' }}><div className="num">{readout.c.split('|')[0]}</div><div className="result-strong" style={{ fontSize: '1.4rem' }}>{readout.c.split('|')[1]}</div></div>}
          </div>
        </div>
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

type Params = React.MutableRefObject<{ speed: number; soc: number; cooling: boolean }>;
type SetReadout = (r: { a: string; b: string; c: string }) => void;

function buildDemo(demo: Demo, scene: BABYLON.Scene, engine: BABYLON.Engine, params: Params, setReadout: SetReadout): (() => void) | void {
  const cam = new BABYLON.ArcRotateCamera('c', -Math.PI / 2.2, Math.PI / 2.6, 18, new BABYLON.Vector3(0, 1, 0), scene);
  cam.attachControl(scene.getEngine().getRenderingCanvas(), true);
  cam.lowerRadiusLimit = 10; cam.upperRadiusLimit = 30;
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.2), scene); hemi.intensity = 0.9;
  const glow = new BABYLON.GlowLayer('g', scene); glow.intensity = 0.6;
  const C3 = BABYLON.Color3;
  const RHO = 1.225, G = 9.81;

  let lastUi = 0;
  const ui = (cb: () => void) => { const t = performance.now(); if (t - lastUi > 120) { lastUi = t; cb(); } };

  if (demo === 'regen') {
    cam.setPosition(new BABYLON.Vector3(8, 5, 14));
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
    cam.setPosition(new BABYLON.Vector3(0, 4, 16));
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
    cam.setPosition(new BABYLON.Vector3(6, 4, 14));
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

  // thermal
  cam.setPosition(new BABYLON.Vector3(0, 7, 14));
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
}
