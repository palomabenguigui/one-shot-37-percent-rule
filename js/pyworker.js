// Background worker: loads Pyodide (Python compiled to WebAssembly) and
// python/sim.py, then runs simulation functions on request. Running here
// keeps the slides smooth while Python downloads and computes.

let pyodide = null;
const ALLOWED = new Set(["run", "run_live", "replay"]);

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;
  try {
    if (type === "init") {
      // ES-module loader: works in module workers in all current browsers
      // (the classic importScripts() route failed in testing).
      const { loadPyodide } = await import(payload.cdn + "pyodide.mjs");
      pyodide = await loadPyodide({ indexURL: payload.cdn });
      await pyodide.loadPackage("numpy");
      const source = await (await fetch(payload.simUrl)).text();
      pyodide.FS.writeFile("/home/pyodide/sim.py", source);
      pyodide.runPython("import sys; sys.path.insert(0, '/home/pyodide'); import sim");
      self.postMessage({ id, ok: true });
      return;
    }

    if (type === "call") {
      if (!ALLOWED.has(payload.fn)) throw new Error(`Unknown function ${payload.fn}`);
      const start = performance.now();
      pyodide.globals.set("call_args", JSON.stringify(payload.kwargs || {}));
      const out = pyodide.runPython(`import json, sim\njson.dumps(sim.${payload.fn}(**json.loads(call_args)))`);
      self.postMessage({ id, ok: true, result: JSON.parse(out), ms: performance.now() - start });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
