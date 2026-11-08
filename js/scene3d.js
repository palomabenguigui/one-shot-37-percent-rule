// The 3D "deal flow" runway shown during rounds 1 and 2 (Three.js).
//
// 20 slots run from left to right and recede into fog: passed startups on the
// left, the current one in the spotlight, future ones hidden in the fog.
// The scene only follows the game state (sync); it never blocks the game.
// Each tile eases toward a target, so fast key presses simply retarget it.

import * as THREE from "../vendor/three/three.module.js";
import { N } from "./game.js";
import { OBSERVE_K } from "./ui.js";

const WIDTH = 1760;     // canvas size in stage pixels (the stage is 1920x1080)
const HEIGHT = 210;
const GAP = 1.25;       // distance between slots
const EASE = 9;         // higher = faster easing (about 0.3-0.5 s)

// Light colors: the runway sits on a white card (sunset theme).
const COLORS = {
  bg: 0xffffff,
  floor: 0xf1f5f9,
  marker: 0xcbd5e1,
  edge: 0x94a3b8,
  tile: 0xe2e8f0,
  current: 0x7c3aed,   // violet: the startup on screen
  gold: 0xf59e0b,      // amber: best so far
  blue: 0x2563eb,      // observe-only zone
  red: 0xef4444,
};

const TILE_BASE = new THREE.Color(COLORS.tile);

let renderer = null;
let scene, camera, light;
let slots = [];
let zone, arch, wall;
let frame = null;          // pending animation frame, or null when idle
let lastTime = 0;
let state = null;          // last synced state
let camX = 0;              // camera position along the runway
let archFlash = 0;         // 0..1, flashes when the room passes the 37% gate
let spin = 0;

// ------------------------------------------------------------------ setup

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function labelSprite(text, color) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.font = "800 54px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 50);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, fog: false }));
  sprite.scale.set(2.6, 0.49, 1);
  return sprite;
}

function build() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // sharp enough, light on the laptop
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.domElement.className = "runway-canvas";

  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.Fog(COLORS.bg, 6, 15);

  camera = new THREE.PerspectiveCamera(24, WIDTH / HEIGHT, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(-3, 6, 8);
  scene.add(sun);
  light = new THREE.PointLight(0xffffff, 18, 6); // spotlight that follows the current startup
  scene.add(light);

  // Floor and one faint marker per slot.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * GAP + 60, 50), new THREE.MeshBasicMaterial({ color: COLORS.floor })) // flat, clean floor;
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = (N * GAP) / 2;
  scene.add(floor);

  const markerGeo = new THREE.PlaneGeometry(0.9, 0.5);
  const tileGeo = new THREE.BoxGeometry(0.85, 1.15, 0.12);
  const edgeGeo = new THREE.EdgesGeometry(tileGeo);

  slots = Array.from({ length: N }, (_, i) => {
    const x = i * GAP;
    const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: COLORS.marker }));
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x, 0.005, 0);
    scene.add(marker);

    const pivot = new THREE.Group(); // tips over around its bottom edge
    pivot.position.set(x, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.tile, emissive: COLORS.current, emissiveIntensity: 0, transparent: true });
    const box = new THREE.Mesh(tileGeo, mat);
    box.position.y = 0.575;
    const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.35 }));
    edges.position.y = 0.575;
    pivot.add(box, edges);
    scene.add(pivot);

    // cur = what is drawn now; target = where it is heading
    const v = { y: -1.3, tilt: 0, opacity: 1, glow: 0, lift: 0 };
    return { pivot, box, edges, mat, cur: { ...v }, target: { ...v }, color: new THREE.Color(COLORS.current) };
  });

  // Round 2: blue observe-only floor under the first 7 slots, and the gold 37% arch.
  zone = new THREE.Group();
  const zoneFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(OBSERVE_K * GAP, 1.6),
    new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0.18 })
  );
  zoneFloor.rotation.x = -Math.PI / 2;
  zoneFloor.position.set(((OBSERVE_K - 1) * GAP) / 2, 0.01, 0);
  const label = labelSprite("OBSERVE ONLY", "#2563eb");
  label.position.set(((OBSERVE_K - 1) * GAP) / 2, 1.5, 0);
  zone.add(zoneFloor, label);

  arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.06, 12, 48, Math.PI),
    new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.4 })
  );
  arch.rotation.y = Math.PI / 2;
  arch.position.set((OBSERVE_K - 0.5) * GAP, 0, 0);
  const archLabel = labelSprite("37%", "#b45309");
  archLabel.position.set((OBSERVE_K - 0.5) * GAP, 1.3, 0);
  archLabel.scale.set(2.2, 0.41, 1);
  zone.add(arch, archLabel);
  scene.add(zone);

  // Red wall behind the last startup: no more options.
  wall = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 1.8),
    new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  wall.scale.x = 14;
  wall.rotation.y = Math.PI / 2;
  wall.position.set((N - 1) * GAP + 0.8, 0.9, 0);
  scene.add(wall);
}

// ------------------------------------------------------------------ state -> targets

function targetsFor(game) {
  const { index, pick } = game;
  slots.forEach((s, i) => {
    const t = s.target;
    if (pick !== null && i === pick) {
      Object.assign(t, { y: 0.35, tilt: 0, opacity: 1, glow: 1, lift: 1 });
      s.color.set(game.isBestSoFar(i) ? COLORS.gold : COLORS.blue);
    } else if (i < index) {
      Object.assign(t, { y: -1.3, tilt: -1.2, opacity: 0, glow: 0, lift: 0 }); // passed: tipped over, sunk, gone
    } else if (i === index && pick === null) {
      Object.assign(t, { y: 0, tilt: 0, opacity: 1, glow: 1, lift: 0 }); // current: in the spotlight
      s.color.set(game.isBestSoFar(i) ? COLORS.gold : COLORS.current);
    } else {
      Object.assign(t, { y: 0, tilt: 0, opacity: 0.12, glow: 0, lift: 0 }); // future: faint, in the fog
    }
  });
}

// ------------------------------------------------------------------ animation

function step(now) {
  frame = null;
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  const k = 1 - Math.exp(-EASE * dt);
  let moving = false;

  for (const s of slots) {
    for (const key of Object.keys(s.cur)) {
      const d = s.target[key] - s.cur[key];
      if (Math.abs(d) > 0.002) moving = true;
      s.cur[key] += d * k;
    }
    const c = s.cur;
    s.pivot.position.y = c.y + c.lift * 0.35;
    s.pivot.rotation.x = c.tilt; // tips backward, away from the audience
    s.mat.opacity = Math.max(c.opacity, 0);
    s.mat.color.copy(TILE_BASE).lerp(s.color, c.glow); // on a light scene, tiles take the color itself
    s.mat.emissive.copy(s.color);
    s.mat.emissiveIntensity = c.glow * 0.3;
    s.edges.material.opacity = Math.max(c.opacity, 0.12) * (c.y < -0.6 ? 0 : 1);
    s.pivot.visible = c.y > -1.25;
  }

  // The picked startup keeps spinning slowly.
  const picked = state && state.pick !== null ? slots[state.pick] : null;
  slots.forEach((s) => { if (s !== picked) s.pivot.rotation.y *= 1 - k; });
  if (picked) {
    spin += dt * 1.6;
    picked.pivot.rotation.y = spin;
    moving = true;
  }

  // Camera follows the current startup; the spotlight sits on it.
  const focus = state ? (state.pick !== null ? state.pick : state.index) : 0;
  const dCam = focus * GAP - camX;
  if (Math.abs(dCam) > 0.002) moving = true;
  camX += dCam * k;
  camera.position.set(camX - 1.6, 1.5, 4.6);
  camera.lookAt(camX + 2.2, 0.6, 0);
  light.position.set(focus * GAP, 2.2, 1.6);

  // 37% gate flash, and the red wall on the last startup.
  if (archFlash > 0) {
    archFlash = Math.max(0, archFlash - dt * 1.2);
    moving = true;
  }
  arch.material.emissiveIntensity = 0.4 + archFlash * 2.5;
  const wallTarget = state && state.isLast && state.pick === null ? 0.55 : 0;
  const dw = wallTarget - wall.material.opacity;
  if (Math.abs(dw) > 0.005) moving = true;
  wall.material.opacity += dw * k;

  renderer.render(scene, camera);
  if (moving) frame = requestAnimationFrame(step); // otherwise stop drawing until the next change
}

function wake() {
  if (frame !== null || !renderer) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(step);
}

function snapAll() {
  for (const s of slots) Object.assign(s.cur, s.target);
  if (state) camX = (state.pick !== null ? state.pick : state.index) * GAP;
  archFlash = 0;
}

// ------------------------------------------------------------------ public API

// Put the runway inside `container` and show `game`. Returns false if 3D is
// not available (the 2D dots then stay visible).
export function showRunway(container, game) {
  if (!renderer) {
    if (!webglAvailable()) return false;
    try {
      build();
    } catch {
      renderer = null;
      return false;
    }
  }
  if (renderer.domElement.parentNode !== container) container.appendChild(renderer.domElement);

  const next = { round: game.round.number, index: game.index, pick: game.pick, isLast: game.isLast };
  // Snap (no animation) on a new round, an undo or a restart.
  const snap =
    !state ||
    state.round !== next.round ||
    next.index < state.index ||
    (state.pick !== null && next.pick === null);
  if (state && !snap && next.round === 2 && state.index < OBSERVE_K && next.index >= OBSERVE_K) archFlash = 1;

  zone.visible = next.round === 2;
  state = next;
  targetsFor(game);
  if (snap) snapAll();
  wake();
  return true;
}

// Stop drawing (called on slides without the runway).
export function hideRunway() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}
