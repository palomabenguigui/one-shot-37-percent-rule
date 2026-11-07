// Live Python for slides 7-9, with an automatic fallback to data/results.json.
//
// Status: "loading" -> "ready", or "fallback" if Pyodide fails, if it is still
// not ready 10 s after opening slide 7, if the page is opened with ?offline,
// or if the presenter presses the hidden O key.

const PYODIDE_VERSION = "314.0.7"; // pinned, so a CDN update can't break the talk
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const SLIDE7_WAIT_MS = 10_000;

export const py = {
  status: "loading",
  analysis: null,      // full H0-H2 analysis (200,000 games)
  source: null,        // "live" (computed in this browser) or "saved" (results.json)
  liveMs: null,        // how long the live analysis took
  simSource: "",       // text of python/sim.py, for the code panels
};

let worker = null;
let nextId = 1;
const pending = new Map();
const listeners = [];

export function onChange(fn) { listeners.push(fn); }
const notify = () => listeners.forEach((fn) => fn());

function call(type, payload) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

function onMessage({ data }) {
  const p = pending.get(data.id);
  if (!p) return;
  pending.delete(data.id);
  data.ok ? p.resolve(data) : p.reject(new Error(data.error));
}

export function useFallback(reason) {
  if (py.status === "fallback") return;
  console.warn("Using saved results:", reason);
  py.status = "fallback";
  if (worker) worker.terminate();
  worker = null;
  pending.forEach((p) => p.reject(new Error("fallback")));
  pending.clear();
  notify();
}

export async function startPython() {
  // Always load the saved results first: slides 8-9 can show them right away,
  // and they are the fallback if Python never arrives.
  const [saved, simText] = await Promise.all([
    fetch("data/results.json").then((r) => r.json()),
    fetch("python/sim.py").then((r) => r.text()),
  ]);
  py.analysis = saved;
  py.source = "saved";
  py.simSource = simText;
  notify();

  if (new URLSearchParams(location.search).has("offline")) return useFallback("?offline in the URL");

  try {
    worker = new Worker("js/pyworker.js", { type: "module" });
    worker.onmessage = onMessage;
    worker.onerror = (e) => useFallback(e.message || "worker error");
    await call("init", { cdn: CDN, simUrl: new URL("python/sim.py", location.href).href });
    if (py.status === "fallback") return;
    py.status = "ready";
    notify();

    // Recompute the full analysis live, with the same seed as results.json.
    const res = await call("call", { fn: "run", kwargs: { trials: 200_000, seed: 37 } });
    py.analysis = res.result;
    py.source = "live";
    py.liveMs = res.ms;
    notify();
  } catch (err) {
    useFallback(err.message);
  }
}

// Called when slide 7 opens: give Python 10 more seconds, then fall back.
export function requireSoon() {
  if (py.status !== "loading") return;
  setTimeout(() => {
    if (py.status === "loading") useFallback("not ready 10 s after opening slide 7");
  }, SLIDE7_WAIT_MS);
}

export async function runLive(n) {
  const res = await call("call", { fn: "run_live", kwargs: { trials: 10_000, n } });
  return { ...res.result, ms: res.ms };
}

export async function replay(values) {
  const res = await call("call", { fn: "replay", kwargs: { startup_values: values, trials: 10_000 } });
  return res.result;
}

// ------------------------------------------------------------------ code excerpts

// Cut lines from the real sim.py: from the line containing `start` through the
// line containing `end`, with the common indentation removed. Whole-line
// comments are dropped to keep the panel readable on a projector.
export function excerpt(start, end) {
  const lines = py.simSource.split("\n");
  const a = lines.findIndex((l) => l.includes(start));
  if (a < 0) return "";
  let b = lines.findIndex((l, i) => i >= a && l.includes(end));
  if (b < 0) b = a;
  const chunk = lines.slice(a, b + 1).filter((l) => !l.trim().startsWith("#"));
  const indent = Math.min(...chunk.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return chunk.map((l) => l.slice(indent)).join("\n");
}
