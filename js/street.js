// The parking street (2D, plain SVG + JavaScript), used on two slides:
//   "intro": the car drives past every free spot and never stops (no rule shown)
//   "rule":  the first 37% of spots are "observe only"; then the car parks at
//            the first spot closer to the destination than every spot it saw
//
// The road winds around the destination, so distances go up and down. A dashed
// line from each spot to the building shows its distance, and the labels are
// computed from where the spots actually sit.

const W = 1760;
const H = 650;
const C = { x: 880, y: 320 };       // destination building (center)
const PX_PER_M = 2;                 // 1 m on the map = 2 px
const SPOT_OFFSET = 34;             // spots sit on the roadside, toward the building
const OBSERVE = 3;                  // 37% of 8 spots = 2.96 -> 3

// Road waypoints, one per parking spot (in driving order), plus entry and exit.
// Distances to the building go up and down: ~180, 120, 210, 160, 240, 90, 70, 130 m.
const ENTRY = { x: -80, y: 140 };
const EXIT = { x: 560, y: 740 };
const WAYPOINTS = [
  [-0.95, -0.32, 414], [-0.45, -0.89, 274], [0.85, -0.53, 454], [1, 0, 354],
  [0.83, 0.55, 514], [0.25, 0.97, 214], [-0.95, 0.3, 174], [-0.8, 0.6, 294],
].map(([dx, dy, r]) => {
  const len = Math.hypot(dx, dy);
  return { x: C.x + (dx / len) * r, y: C.y + (dy / len) * r };
});

const NS = "http://www.w3.org/2000/svg";
let root = null;      // the whole scene (re-attached when the slide redraws)
let runId = 0;        // bumps on every start/stop, so old animations end quietly

// ------------------------------------------------------------------ geometry

// Smooth curve through all points (Catmull-Rom converted to cubic Bezier).
function smoothPath(points) {
  const p = [points[0], ...points, points[points.length - 1]];
  let d = `M ${p[1].x} ${p[1].y}`;
  for (let i = 1; i < p.length - 2; i++) {
    const c1 = { x: p[i].x + (p[i + 1].x - p[i - 1].x) / 6, y: p[i].y + (p[i + 1].y - p[i - 1].y) / 6 };
    const c2 = { x: p[i + 1].x - (p[i + 2].x - p[i].x) / 6, y: p[i + 1].y - (p[i + 2].y - p[i].y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}

// Length along the road closest to a point.
function lengthAt(path, pt) {
  const total = path.getTotalLength();
  let best = 0;
  let bestD = Infinity;
  for (let l = 0; l <= total; l += 2) {
    const q = path.getPointAtLength(l);
    const d = (q.x - pt.x) ** 2 + (q.y - pt.y) ** 2;
    if (d < bestD) [best, bestD] = [l, d];
  }
  return best;
}

function pose(path, l) {
  const a = path.getPointAtLength(Math.max(0, l - 1));
  const b = path.getPointAtLength(l + 1);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

// ------------------------------------------------------------------ scene

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function buildScene(mode) {
  root = document.createElement("div");
  root.className = `street street-${mode}`;
  root.innerHTML = `
    <svg class="street-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="street-readout hidden"></div>
    <div class="street-caption"></div>
    <div class="street-outro hidden">
      <div class="outro-icons">
        <div><span>🏠</span>Apartments</div>
        <div><span>💼</span>Jobs</div>
      </div>
      <p class="outro-line">Same dilemma, different choices.</p>
      <p class="outro-final hidden">Today, you'll face this as investors.</p>
    </div>`;
  const svg = root.querySelector("svg");

  // City blocks in the background, for a top-down map feel.
  const blocks = el("g", { class: "blocks" }, svg);
  for (let x = 40; x < W; x += 220) {
    for (let y = 30; y < H; y += 170) el("rect", { x, y, width: 170, height: 120, rx: 10 }, blocks);
  }

  const pts = [ENTRY, ...WAYPOINTS, EXIT];
  const d = smoothPath(pts);
  el("path", { d, class: "road" }, svg);
  el("path", { d, class: "road-line" }, svg);
  const road = el("path", { d, class: "road-guide" }, svg);

  const lines = el("g", {}, svg);
  const spotsLayer = el("g", {}, svg);

  // Destination building.
  const b = el("g", { class: "building" }, svg);
  el("rect", { x: C.x - 80, y: C.y - 60, width: 160, height: 120, rx: 12 }, b);
  el("text", { x: C.x, y: C.y - 4, class: "building-icon" }, b).textContent = "🏢";
  el("text", { x: C.x, y: C.y + 40, class: "building-label" }, b).textContent = "Destination";

  // Spots: on the roadside, toward the building; distance computed from position.
  const spots = WAYPOINTS.map((w, i) => {
    const L = lengthAt(road, w);
    const p = pose(road, L);
    const rad = (p.angle * Math.PI) / 180;
    let n = { x: -Math.sin(rad), y: Math.cos(rad) };
    if (n.x * (C.x - p.x) + n.y * (C.y - p.y) < 0) n = { x: -n.x, y: -n.y };
    const pos = { x: p.x + n.x * SPOT_OFFSET, y: p.y + n.y * SPOT_OFFSET };
    const meters = Math.round(Math.hypot(pos.x - C.x, pos.y - C.y) / PX_PER_M / 10) * 10;

    const line = el("g", { class: "dist hidden" }, lines);
    el("line", { x1: pos.x, y1: pos.y, x2: C.x, y2: C.y }, line);
    // Label on the line, nearer the spot; for very short lines, just outside the spot.
    const dist = Math.hypot(pos.x - C.x, pos.y - C.y);
    const mid = dist < 220
      ? { x: pos.x + ((pos.x - C.x) / dist) * 62, y: pos.y + ((pos.y - C.y) / dist) * 62 }
      : { x: pos.x + (C.x - pos.x) * 0.38, y: pos.y + (C.y - pos.y) * 0.38 };
    el("rect", { x: mid.x - 40, y: mid.y - 18, width: 80, height: 34, rx: 8 }, line);
    el("text", { x: mid.x, y: mid.y + 7 }, line).textContent = `${meters} m`;

    const g = el("g", { class: "spot hidden", transform: `translate(${pos.x} ${pos.y}) rotate(${p.angle})` }, spotsLayer);
    el("rect", { x: -26, y: -17, width: 52, height: 34, rx: 6 }, g);
    el("text", { x: 0, y: 8, class: "spot-p", transform: `rotate(${-p.angle})` }, g).textContent = "P";
    el("text", { x: 0, y: 10, class: "spot-x", transform: `rotate(${-p.angle})` }, g).textContent = "✕";
    return { L, pos, meters, angle: p.angle, g, line };
  });

  // Round 2's 37% gate: a gold line across the road between spots 3 and 4.
  let gate = null;
  if (mode === "rule") {
    const gl = (spots[OBSERVE - 1].L + spots[OBSERVE].L) / 2;
    const gp = pose(road, gl);
    gate = el("g", { class: "gate hidden", transform: `translate(${gp.x} ${gp.y}) rotate(${gp.angle})` }, svg);
    el("line", { x1: 0, y1: -46, x2: 0, y2: 46 }, gate);
    el("text", { x: 0, y: -56, transform: `rotate(${-gp.angle} 0 -56)` }, gate).textContent = "37%";
  }

  // Car.
  const car = el("g", { class: "car" }, svg);
  el("rect", { x: -30, y: -15, width: 60, height: 30, rx: 9, class: "car-body" }, car);
  el("rect", { x: 4, y: -11, width: 14, height: 22, rx: 3, class: "car-glass" }, car);
  el("rect", { x: -22, y: -11, width: 10, height: 22, rx: 3, class: "car-glass" }, car);

  // Question bubble that follows the car.
  const bubble = el("g", { class: "bubble hidden" }, svg);
  el("rect", { x: -190, y: -96, width: 380, height: 50, rx: 25 }, bubble);
  el("text", { x: 0, y: -63 }, bubble).textContent = "Stop here, or keep going?";

  return { svg, road, spots, car, bubble, gate };
}

// ------------------------------------------------------------------ animation helpers

function animator(id) {
  const alive = () => id === runId;
  const wait = (ms) => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej("stopped")), ms));
  const tween = (ms, fn) =>
    new Promise((res, rej) => {
      const t0 = performance.now();
      const tick = (now) => {
        if (!alive()) return rej("stopped");
        const t = Math.min(1, (now - t0) / ms);
        fn(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2); // ease in-out
        if (t < 1) requestAnimationFrame(tick);
        else res();
      };
      requestAnimationFrame(tick);
    });
  return { wait, tween };
}

function placeCar(s, l) {
  const p = pose(s.road, l);
  s.car.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${p.angle})`);
  s.bubble.setAttribute("transform", `translate(${p.x} ${p.y})`);
  s.carL = l;
}

async function drive(s, a, to, ms) {
  const from = s.carL;
  await a.tween(ms, (t) => placeCar(s, from + (to - from) * t));
}

const show = (node) => node.classList.remove("hidden");
const hide = (node) => node.classList.add("hidden");

// ------------------------------------------------------------------ the two stories

async function playIntro(s, a) {
  const caption = root.querySelector(".street-caption");
  caption.textContent = "Looking for parking near your destination.";
  for (const spot of s.spots) {
    await drive(s, a, spot.L - 90, 1000);
    show(spot.g);
    show(spot.line);
    show(s.bubble);
    await drive(s, a, spot.L + 20, 900);
    spot.g.classList.add("passed"); // drove past: gone, can't go back
    spot.line.classList.add("passed");
    hide(s.bubble);
  }
  caption.textContent = "No going back.";
  await drive(s, a, s.road.getTotalLength(), 1200);
  await a.wait(300);
  root.classList.add("faded");
  show(root.querySelector(".street-outro"));
  caption.textContent = "";
  await a.wait(1800);
  show(root.querySelector(".outro-final"));
}

async function playRule(s, a) {
  const caption = root.querySelector(".street-caption");
  const readout = root.querySelector(".street-readout");
  let closest = Infinity;
  const update = () => {
    readout.innerHTML = `Closest seen: <strong>${closest === Infinity ? "—" : closest + " m"}</strong>`;
  };
  show(readout);
  update();
  s.spots.slice(0, OBSERVE).forEach((sp) => sp.g.classList.add("observe"));
  show(s.gate);
  caption.textContent = "Observe the first 37%. Don't park yet.";

  let parkedAt = -1;
  for (let i = 0; i < s.spots.length; i++) {
    const spot = s.spots[i];
    await drive(s, a, spot.L - 90, 900);
    show(spot.g);
    show(spot.line);
    if (i < OBSERVE) {
      closest = Math.min(closest, spot.meters);
      update();
      await drive(s, a, spot.L + 20, 800);
      spot.line.classList.add("passed");
      if (i === OBSERVE - 1) {
        s.gate.classList.add("flash");
        caption.textContent = "Now leap: park at the first spot closer than every spot seen.";
      }
      continue;
    }
    if (spot.meters < closest) {
      await drive(s, a, spot.L, 800);
      // Pull into the spot.
      const start = { x: spot.pos.x, y: spot.pos.y };
      await a.tween(600, (t) => {
        const p = pose(s.road, spot.L);
        const x = p.x + (start.x - p.x) * t;
        const y = p.y + (start.y - p.y) * t;
        s.car.setAttribute("transform", `translate(${x} ${y}) rotate(${spot.angle})`);
      });
      spot.g.classList.add("parked");
      spot.line.classList.add("parked");
      caption.textContent = `Parked: ${spot.meters} m, closer than every spot it saw.`;
      parkedAt = i;
      break;
    }
    spot.g.classList.add("farther");
    await drive(s, a, spot.L + 20, 700);
    spot.line.classList.add("passed");
  }

  // The honest beat: was an even closer spot still ahead?
  const ahead = s.spots.slice(parkedAt + 1);
  const best = ahead.reduce((m, sp) => (sp.meters < (m ? m.meters : Infinity) ? sp : m), null);
  if (best && best.meters < s.spots[parkedAt].meters) {
    await a.wait(1600);
    best.g.classList.add("ghost");
    best.line.classList.add("ghost");
    show(best.g);
    show(best.line);
    caption.textContent = `The very closest spot (${best.meters} m) was still ahead. The rule doesn't guarantee the best; it gives the best odds.`;
  }
}

// ------------------------------------------------------------------ public API

// Start (or restart) the animation inside `container`.
export function startStreet(container, mode) {
  stopStreet();
  const id = runId;
  const s = buildScene(mode);
  container.appendChild(root);
  placeCar(s, 0);
  const play = mode === "rule" ? playRule : playIntro;
  play(s, animator(id)).catch(() => {}); // "stopped" when the slide changes
}

// Put the running scene back after the slide redraws (keeps the animation going).
export function reattachStreet(container) {
  if (root && root.parentNode !== container) container.appendChild(root);
  return Boolean(root);
}

export function stopStreet() {
  runId++;
  root = null;
}
