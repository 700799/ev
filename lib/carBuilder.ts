// Shared 3D car builder so the configurator and the "drive & explore" mode
// render the exact same vehicle from one config. Pure Babylon, no React.

import * as BABYLON from '@babylonjs/core';
import type { BodyType, WheelStyle } from '@/data/configSpecs';

export interface CarConfig {
  body: BodyType;
  paint: string;
  wheel: WheelStyle;
  accessories: Set<string> | string[];
}

export interface CarMaterials {
  bodyMat: BABYLON.PBRMaterial;
  glassMat: BABYLON.PBRMaterial;
  tintMat: BABYLON.PBRMaterial;
  trimMat: BABYLON.PBRMaterial;
  chromeMat: BABYLON.PBRMaterial;
  tireMat: BABYLON.PBRMaterial;
}

const BODY_GEOM: Record<BodyType, {
  len: number; w: number; lowerH: number; cabinH: number; cabinLen: number;
  cabinX: number; wheelR: number; roof: boolean; bed: boolean; ride: number;
}> = {
  sedan: { len: 5.4, w: 2.3, lowerH: 0.95, cabinH: 0.95, cabinLen: 2.6, cabinX: -0.3, wheelR: 0.66, roof: false, bed: false, ride: 0 },
  suv: { len: 5.2, w: 2.4, lowerH: 1.25, cabinH: 1.25, cabinLen: 3.0, cabinX: -0.2, wheelR: 0.78, roof: true, bed: false, ride: 0.15 },
  pickup: { len: 6.0, w: 2.45, lowerH: 1.2, cabinH: 1.2, cabinLen: 2.2, cabinX: 0.6, wheelR: 0.8, roof: false, bed: true, ride: 0.2 },
};

export function createCarMaterials(scene: BABYLON.Scene): CarMaterials {
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

  return { bodyMat, glassMat, tintMat, trimMat, chromeMat, tireMat };
}

function rimColorFor(style: WheelStyle): BABYLON.Color3 {
  switch (style) {
    case 'gold': return new BABYLON.Color3(0.55, 0.42, 0.12);
    case 'offroad': return new BABYLON.Color3(0.08, 0.09, 0.1);
    case 'aero': return new BABYLON.Color3(0.45, 0.47, 0.5);
    case 'turbine': return new BABYLON.Color3(0.25, 0.27, 0.3);
    default: return new BABYLON.Color3(0.55, 0.57, 0.6);
  }
}

export interface BuiltCar {
  node: BABYLON.TransformNode;
  underglow: BABYLON.Mesh | null;
  wheelMeshes: BABYLON.TransformNode[]; // for spin animation in drive mode
}

/** Build a full car (body + wheels + accessories) parented to a fresh node. */
export function buildCar(scene: BABYLON.Scene, mats: CarMaterials, cfgIn: CarConfig): BuiltCar {
  const { bodyMat, glassMat, tintMat, trimMat, chromeMat, tireMat } = mats;
  const acc = new Set(cfgIn.accessories as Iterable<string>);
  const has = (id: string) => acc.has(id);

  const car = new BABYLON.TransformNode('car', scene);
  bodyMat.albedoColor = BABYLON.Color3.FromHexString(cfgIn.paint).scale(0.72);

  const cfg = BODY_GEOM[cfgIn.body];
  const baseY = cfg.wheelR + cfg.ride;
  const roofY = baseY + cfg.lowerH + cfg.cabinH;
  const wheelMeshes: BABYLON.TransformNode[] = [];
  let underglow: BABYLON.Mesh | null = null;

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

  if (has('sunroof')) box('pano', cfg.cabinLen * 0.7, 0.06, cfg.w * 0.62, [cfg.cabinX, roofY + 0.02, 0], glassMat);

  if (cfg.roof) {
    for (const zz of [-cfg.w * 0.32, cfg.w * 0.32]) box('rail', cfg.cabinLen * 0.8, 0.08, 0.08, [cfg.cabinX, roofY + 0.05, zz], trimMat);
  }

  if (cfg.bed) {
    const bedX = -cfg.len * 0.28;
    for (const zz of [-cfg.w * 0.42, cfg.w * 0.42]) box('bedwall', cfg.len * 0.34, 0.5, 0.08, [bedX, baseY + cfg.lowerH + 0.25, zz], bodyMat);
    box('tailgate', 0.08, 0.5, cfg.w * 0.84, [bedX - cfg.len * 0.17, baseY + cfg.lowerH + 0.25, 0], bodyMat);
  }

  // Wheels + fenders.
  const wheelXs = [cfg.len * 0.3, -cfg.len * 0.3];
  const wheelZs = [cfg.w * 0.46, -cfg.w * 0.46];
  let wi = 0;
  for (const x of wheelXs) {
    for (const z of wheelZs) {
      const wheelNode = new BABYLON.TransformNode(`wheelN${wi}`, scene);
      wheelNode.parent = car;
      const style = cfgIn.wheel;
      const r = cfg.wheelR;
      const tireR = style === 'offroad' ? r * 1.12 : r;
      const tire = BABYLON.MeshBuilder.CreateCylinder(`wheel${wi}`, { diameter: tireR * 2, height: style === 'offroad' ? 0.6 : 0.5, tessellation: 32 }, scene);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, tireR, z);
      tire.material = tireMat;
      tire.parent = wheelNode;
      const rimM = new BABYLON.PBRMaterial(`rimM${wi}`, scene);
      rimM.albedoColor = rimColorFor(style);
      rimM.metallic = style === 'aero' ? 0.4 : 0.85;
      rimM.roughness = style === 'offroad' ? 0.6 : 0.25;
      const face = BABYLON.MeshBuilder.CreateCylinder(`face${wi}`, { diameter: r * 1.4, height: 0.52, tessellation: 24 }, scene);
      face.rotation.x = Math.PI / 2;
      face.position.set(x, tireR, z);
      face.material = rimM;
      face.parent = wheelNode;
      if (style !== 'aero') {
        const spokeCount = style === 'turbine' ? 9 : style === 'offroad' ? 6 : 5;
        const spokeW = style === 'offroad' ? r * 0.95 : r * 0.85;
        for (let s = 0; s < spokeCount; s++) {
          const spoke = BABYLON.MeshBuilder.CreateBox(`spoke${wi}_${s}`, { width: spokeW, height: 0.54, depth: style === 'turbine' ? 0.05 : 0.09 }, scene);
          spoke.position.set(x, tireR, z);
          spoke.rotation.x = Math.PI / 2;
          spoke.rotation.y = (s / spokeCount) * Math.PI * (style === 'turbine' ? 2 : 1);
          if (style === 'turbine') spoke.rotation.z = 0.4;
          spoke.material = rimM;
          spoke.parent = wheelNode;
        }
      }
      wheelMeshes.push(wheelNode);
      const fender = BABYLON.MeshBuilder.CreateTorus('fender', { diameter: cfg.wheelR * 2.5, thickness: 0.16, tessellation: 24 }, scene);
      fender.rotation.x = Math.PI / 2;
      fender.position.set(x, cfg.wheelR + 0.05, z * 0.98);
      fender.scaling.z = 0.5;
      fender.material = trimMat;
      fender.parent = car;
      wi++;
    }
  }

  for (const z of [cfg.w * 0.5, -cfg.w * 0.5]) {
    box('mirror', 0.22, 0.14, 0.1, [cfg.cabinX + cfg.cabinLen * 0.42, baseY + cfg.lowerH + cfg.cabinH * 0.35, z], trimMat);
  }

  const head = box('head', 0.14, 0.16, cfg.w * 0.85, [cfg.len / 2 + 0.02, baseY + cfg.lowerH * 0.7, 0], trimMat);
  const headEm = new BABYLON.StandardMaterial('headEm', scene);
  headEm.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.8);
  head.material = headEm;

  // ---------- Accessories ----------
  if (has('roofrack')) {
    for (const zz of [-cfg.w * 0.3, cfg.w * 0.3]) box('rrk', cfg.cabinLen * 0.78, 0.07, 0.07, [cfg.cabinX, roofY + 0.12, zz], chromeMat);
    for (const xx of [cfg.cabinX - cfg.cabinLen * 0.28, cfg.cabinX + cfg.cabinLen * 0.28]) box('rrx', 0.07, 0.07, cfg.w * 0.66, [xx, roofY + 0.12, 0], chromeMat);
  }
  if (has('roofbox')) box('cargo', cfg.cabinLen * 0.6, 0.3, cfg.w * 0.55, [cfg.cabinX, roofY + 0.3, 0], trimMat);
  if (has('lightbar')) {
    const lb = box('lbar', 0.18, 0.14, cfg.w * 0.7, [cfg.cabinX + cfg.cabinLen * 0.3, roofY + 0.2, 0], trimMat);
    const lbEm = new BABYLON.StandardMaterial('lbEm', scene);
    lbEm.emissiveColor = new BABYLON.Color3(0.9, 0.92, 1);
    lb.material = lbEm;
  }
  if (has('bullbar')) {
    box('bull', 0.18, 0.5, cfg.w * 0.8, [cfg.len / 2 + 0.18, baseY + cfg.lowerH * 0.45, 0], chromeMat);
    box('bullv', 0.1, 0.7, 0.1, [cfg.len / 2 + 0.18, baseY + cfg.lowerH * 0.6, 0], chromeMat);
  }
  if (has('spoiler')) {
    box('spoil', 0.5, 0.07, cfg.w * 0.84, [-cfg.len / 2 + 0.1, cfg.bed ? baseY + cfg.lowerH + 0.5 : roofY + 0.18, 0], trimMat);
    for (const zz of [-cfg.w * 0.34, cfg.w * 0.34]) box('spoilft', 0.1, 0.22, 0.08, [-cfg.len / 2 + 0.1, cfg.bed ? baseY + cfg.lowerH + 0.4 : roofY + 0.06, zz], trimMat);
  }
  if (has('towhitch')) {
    box('hitch', 0.4, 0.1, 0.1, [-cfg.len / 2 - 0.2, baseY + 0.25, 0], chromeMat);
    const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 0.16 }, scene);
    ball.position.set(-cfg.len / 2 - 0.38, baseY + 0.3, 0);
    ball.material = chromeMat;
    ball.parent = car;
  }
  if (has('underglow')) {
    underglow = BABYLON.MeshBuilder.CreateBox('glowbar', { width: cfg.len * 0.95, height: 0.05, depth: cfg.w * 0.95 }, scene);
    underglow.position.set(0, baseY * 0.4, 0);
    const ug = new BABYLON.StandardMaterial('ug', scene);
    ug.emissiveColor = BABYLON.Color3.FromHexString(cfgIn.paint);
    ug.disableLighting = true;
    underglow.material = ug;
    underglow.parent = car;
  }
  if (has('stripe')) {
    const stMat = new BABYLON.StandardMaterial('stMat', scene);
    stMat.emissiveColor = new BABYLON.Color3(0.85, 0.85, 0.9);
    const stripe = box('stripe', cfg.len * 0.98, 0.04, cfg.w * 0.16, [0, baseY + cfg.lowerH + cfg.cabinH + 0.001, 0], stMat);
    stripe.parent = car;
    box('hstripe', cfg.len * 0.3, 0.04, cfg.w * 0.16, [cfg.len * 0.32, baseY + cfg.lowerH + cfg.lowerH * 0.55, 0], stMat);
  }
  if (has('mudflaps')) {
    for (const x of wheelXs) for (const z of [cfg.w * 0.46, -cfg.w * 0.46]) box('flap', 0.06, 0.3, 0.3, [x - Math.sign(x) * cfg.wheelR * 0.9, cfg.wheelR * 0.5, z], trimMat);
  }
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
  if (has('sharkfin')) {
    const fin = BABYLON.MeshBuilder.CreateCylinder('fin', { diameterTop: 0, diameterBottom: 0.18, height: 0.22, tessellation: 3 }, scene);
    fin.position.set(cfg.cabinX - cfg.cabinLen * 0.4, roofY + 0.11, 0);
    fin.rotation.x = Math.PI;
    fin.scaling.x = 0.4;
    fin.material = trimMat;
    fin.parent = car;
  }
  if (has('runningboards')) {
    for (const z of [cfg.w * 0.5, -cfg.w * 0.5]) box('board', cfg.len * 0.55, 0.08, 0.22, [0, baseY + 0.12, z], chromeMat);
  }

  return { node: car, underglow, wheelMeshes };
}
