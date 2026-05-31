'use client';

import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useGame } from '../GameProvider';

type Phase = 'idle' | 'playing' | 'over';

interface Entity {
  mesh: BABYLON.TransformNode;
  kind: 'obstacle' | 'animal' | 'charge';
  lane: number;
  z: number;
  hit?: boolean;
}

const LANES = [-3, 0, 3]; // x positions
const ROAD_LEN = 80;
const SPAWN_Z = -70;

/**
 * Endless lane-dodger: your EV drives forward on an infinite road. Steer between
 * three lanes to dodge cones/barriers (obstacles) and deer (animals), and grab
 * glowing charge bolts to keep the battery up. Distance = score; speed ramps up.
 * Keyboard arrows / A-D, on-screen buttons, or swipe to steer.
 */
export default function DriveGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { record } = useGame();

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [battery, setBattery] = useState(100);

  // Mutable game state shared with the render loop.
  const stateRef = useRef({
    phase: 'idle' as Phase,
    lane: 1,
    targetX: 0,
    speed: 22,
    score: 0,
    battery: 100,
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
    scene.fogStart = 35;
    scene.fogEnd = 75;

    // Chase camera behind the car.
    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 7, 12), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1, -12));

    const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0.2), scene);
    hemi.intensity = 0.85;
    const sun = new BABYLON.DirectionalLight('s', new BABYLON.Vector3(-0.5, -1, 0.4), scene);
    sun.intensity = 0.8;
    const glow = new BABYLON.GlowLayer('g', scene);
    glow.intensity = 0.5;

    // --- Road: two scrolling tiles for an endless effect ---
    const roadMat = new BABYLON.StandardMaterial('road', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.12);
    roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    const grassMat = new BABYLON.StandardMaterial('grass', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.05, 0.12, 0.08);
    grassMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const ground = BABYLON.MeshBuilder.CreateGround('g', { width: 60, height: 200 }, scene);
    ground.material = grassMat;
    ground.position.z = -50;

    const roadTiles: BABYLON.Mesh[] = [];
    const laneMarks: BABYLON.Mesh[] = [];
    const markMat = new BABYLON.StandardMaterial('mark', scene);
    markMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.4);
    markMat.disableLighting = true;
    for (let i = 0; i < 2; i++) {
      const road = BABYLON.MeshBuilder.CreateGround('road' + i, { width: 11, height: ROAD_LEN }, scene);
      road.material = roadMat;
      road.position.set(0, 0.02, -i * ROAD_LEN);
      roadTiles.push(road);
    }
    // Dashed lane markers.
    for (let i = 0; i < 40; i++) {
      const m = BABYLON.MeshBuilder.CreateBox('m' + i, { width: 0.18, height: 0.02, depth: 1.4 }, scene);
      m.material = markMat;
      m.position.set(i % 2 === 0 ? -1.5 : 1.5, 0.04, -i * 4);
      if (i % 2 === 0) { m.position.x = -1.5; }
      laneMarks.push(m);
    }

    // --- Player car (compact stylized EV) ---
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
    // Headlight cones (forward, into screen = -z).
    const hl = new BABYLON.StandardMaterial('hl', scene);
    hl.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.7);
    for (const x of [0.6, -0.6]) {
      const beam = BABYLON.MeshBuilder.CreateBox('beam', { width: 0.25, height: 0.18, depth: 0.2 }, scene);
      beam.position.set(x, 0.6, -1.85); beam.material = hl; beam.parent = car;
    }
    car.position.set(0, 0, 0);

    // --- Entity factories ---
    const makeObstacle = (): BABYLON.TransformNode => {
      const n = new BABYLON.TransformNode('obs', scene);
      const cone = BABYLON.MeshBuilder.CreateCylinder('cone', { diameterTop: 0, diameterBottom: 0.9, height: 1.2, tessellation: 16 }, scene);
      const m = new BABYLON.StandardMaterial('cm', scene);
      m.diffuseColor = new BABYLON.Color3(0.85, 0.35, 0.05);
      m.emissiveColor = new BABYLON.Color3(0.3, 0.1, 0);
      cone.material = m; cone.position.y = 0.6; cone.parent = n;
      const band = BABYLON.MeshBuilder.CreateCylinder('band', { diameter: 0.65, height: 0.18, tessellation: 16 }, scene);
      const bm = new BABYLON.StandardMaterial('bm', scene);
      bm.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
      band.material = bm; band.position.y = 0.7; band.parent = n;
      return n;
    };
    const makeAnimal = (): BABYLON.TransformNode => {
      const n = new BABYLON.TransformNode('ani', scene);
      const mat = new BABYLON.StandardMaterial('am', scene);
      mat.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.16);
      const bodyM = BABYLON.MeshBuilder.CreateBox('ab', { width: 0.7, height: 0.7, depth: 1.5 }, scene);
      bodyM.position.y = 1; bodyM.material = mat; bodyM.parent = n;
      const head = BABYLON.MeshBuilder.CreateBox('ah', { width: 0.5, height: 0.5, depth: 0.6 }, scene);
      head.position.set(0, 1.45, -0.9); head.material = mat; head.parent = n;
      for (const [x, z] of [[0.25, 0.5], [-0.25, 0.5], [0.25, -0.5], [-0.25, -0.5]] as [number, number][]) {
        const leg = BABYLON.MeshBuilder.CreateBox('leg', { width: 0.16, height: 1, depth: 0.16 }, scene);
        leg.position.set(x, 0.5, z); leg.material = mat; leg.parent = n;
      }
      // little ears/antlers
      for (const x of [0.18, -0.18]) {
        const ear = BABYLON.MeshBuilder.CreateBox('ear', { width: 0.08, height: 0.35, depth: 0.08 }, scene);
        ear.position.set(x, 1.85, -0.95); ear.material = mat; ear.parent = n;
      }
      return n;
    };
    const makeCharge = (): BABYLON.TransformNode => {
      const n = new BABYLON.TransformNode('chg', scene);
      const m = new BABYLON.StandardMaterial('chm', scene);
      m.emissiveColor = new BABYLON.Color3(0.15, 0.85, 0.6);
      m.disableLighting = true;
      const bolt = BABYLON.MeshBuilder.CreateCylinder('bolt', { diameter: 1, height: 0.25, tessellation: 6 }, scene);
      bolt.position.y = 1.2; bolt.material = m; bolt.parent = n;
      const ring = BABYLON.MeshBuilder.CreateTorus('cr', { diameter: 1.5, thickness: 0.08, tessellation: 24 }, scene);
      ring.position.y = 1.2; ring.rotation.x = Math.PI / 2; ring.material = m; ring.parent = n;
      return n;
    };

    const st = stateRef.current;

    const clearEntities = () => {
      for (const e of st.entities) e.mesh.dispose();
      st.entities = [];
    };

    const spawn = () => {
      const r = Math.random();
      const kind: Entity['kind'] = r < 0.5 ? 'obstacle' : r < 0.78 ? 'animal' : 'charge';
      const lane = Math.floor(Math.random() * 3);
      const mesh = kind === 'obstacle' ? makeObstacle() : kind === 'animal' ? makeAnimal() : makeCharge();
      mesh.position.set(LANES[lane], 0, SPAWN_Z);
      st.entities.push({ mesh, kind, lane, z: SPAWN_Z });
    };

    apiRef.current.steer = (dir: number) => {
      if (st.phase !== 'playing') return;
      st.lane = Math.max(0, Math.min(2, st.lane + dir));
      st.targetX = LANES[st.lane];
    };
    apiRef.current.start = () => {
      clearEntities();
      st.phase = 'playing';
      st.lane = 1; st.targetX = 0; st.speed = 22; st.score = 0; st.battery = 100;
      st.spawnTimer = 0; st.elapsed = 0;
      car.position.x = 0;
      setPhase('playing'); setScore(0); setBattery(100);
    };

    const endGame = () => {
      st.phase = 'over';
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

      // Scroll road tiles + lane marks toward the camera for motion.
      const v = st.phase === 'playing' ? st.speed : 6;
      for (const r of roadTiles) {
        r.position.z += v * dt;
        if (r.position.z > ROAD_LEN / 2) r.position.z -= ROAD_LEN * 2;
      }
      for (const m of laneMarks) {
        m.position.z += v * dt;
        if (m.position.z > 8) m.position.z -= 160;
      }

      // Ease the car toward its target lane + bank slightly.
      car.position.x += (st.targetX - car.position.x) * Math.min(1, dt * 10);
      car.rotation.z = (car.position.x - st.targetX) * 0.12;
      car.rotation.y = (st.targetX - car.position.x) * 0.06;

      if (st.phase === 'playing') {
        st.elapsed += dt;
        st.speed = 22 + st.elapsed * 0.6; // ramp difficulty
        st.score += st.speed * dt * 0.6;
        // Battery slowly drains; pick up charge to refill.
        st.battery = Math.max(0, st.battery - dt * 2.2);

        // Spawn cadence tightens with speed.
        st.spawnTimer -= dt;
        const interval = Math.max(0.5, 1.5 - st.elapsed * 0.012);
        if (st.spawnTimer <= 0) { spawn(); st.spawnTimer = interval; }

        // Advance + collide.
        const carZ = 0;
        for (const e of st.entities) {
          e.z += st.speed * dt;
          e.mesh.position.z = e.z;
          if (e.kind === 'charge') e.mesh.rotation.y += dt * 3;
          if (e.kind === 'animal') e.mesh.position.x = LANES[e.lane] + Math.sin(animFrame * 2 + e.lane) * 0.4;

          if (!e.hit && e.z > carZ - 1.6 && e.z < carZ + 1.6) {
            const sameLane = Math.abs(e.mesh.position.x - car.position.x) < 1.6;
            if (sameLane) {
              e.hit = true;
              if (e.kind === 'charge') {
                st.battery = Math.min(100, st.battery + 22);
                st.score += 25;
                e.mesh.dispose();
              } else {
                endGame();
              }
            }
          }
        }
        // Cull passed entities.
        st.entities = st.entities.filter((e) => {
          if (e.hit && e.kind === 'charge') return false;
          if (e.z > 14) { e.mesh.dispose(); return false; }
          return true;
        });

        if (st.battery <= 0) endGame();

        // Push UI a few times a second.
        if (Math.floor(st.elapsed * 5) !== Math.floor((st.elapsed - dt) * 5)) {
          setScore(Math.floor(st.score));
          setBattery(Math.round(st.battery));
        }
      }
    });

    engine.runRenderLoop(() => scene.render());

    // Keyboard controls.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft' || ev.key.toLowerCase() === 'a') { apiRef.current.steer(-1); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight' || ev.key.toLowerCase() === 'd') { apiRef.current.steer(1); ev.preventDefault(); }
      else if ((ev.key === ' ' || ev.key === 'Enter') && st.phase !== 'playing') { apiRef.current.start(); }
    };
    window.addEventListener('keydown', onKey);

    // Swipe / drag controls.
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
          <div className="small muted">Battery</div>
          <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: `${battery}%`, height: '100%', background: battColor, transition: 'width 0.2s linear' }} />
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
          <div style={{ textAlign: 'center', maxWidth: 440, padding: 20 }}>
            {phase === 'over' ? (
              <>
                <div style={{ fontSize: '2.4rem' }}>💥</div>
                <h3 style={{ margin: '6px 0' }}>{battery <= 0 ? 'Out of charge!' : 'Crash!'}</h3>
                <p className="muted">You scored <strong style={{ color: 'var(--accent)' }}>{score}</strong>{score >= best && score > 0 ? ' — new best! 🎉' : ''}.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.4rem' }}>🏎️⚡</div>
                <h3 style={{ margin: '6px 0' }}>EV Dodge</h3>
                <p className="muted" style={{ margin: '0 0 6px' }}>
                  Drive forward and switch lanes to dodge 🚧 cones and 🦌 deer. Grab ⚡ charge to keep your battery alive. It gets faster — how far can you go?
                </p>
                <p className="small muted">Steer: ← → / A D keys, on-screen buttons, or swipe.</p>
              </>
            )}
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => apiRef.current.start()}>
              {phase === 'over' ? '↻ Play again' : '▶ Start driving'}
            </button>
          </div>
        </div>
      )}

      {/* Touch steer buttons */}
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
