// The 10-slide deck: slide content, navigation, keyboard and fit-to-screen.
//
// Keys:
//   → / Space / Page Down = next slide     ← / Page Up = previous slide
//   F = fullscreen    Home = slide 1
//   On slides 4 and 7: A = invest, R = pass, B = reveal the bots (slide 7)
//   On slides 2 and 6: P = replay the street animation
//   On slide 8: P = run the live simulation
//   On slides 8-10: C = show or hide the code panel
//   Hidden: Backspace = undo the last click, N = restart the round,
//           O = switch to saved results (Python fallback)
//   While a round is in progress, → won't leave the slide. Shift + → forces it.
//   Test the fallback: open the page with ?offline (http://localhost:8000/?offline).

import { N } from "./game.js";
import { roundSlideHTML, revealHTML, gameAction, getGame, stopPosition, zoneMarksHTML } from "./ui.js";
import { py, startPython, onChange, useFallback, requireSoon, runLive, replay, excerpt } from "./python.js";
import { barChart, emptyChart, codePanel } from "./charts.js";
import { showRunway, hideRunway } from "./scene3d.js";
import { startStreet, reattachStreet, stopStreet } from "./street.js";

const stage = document.getElementById("stage");

// ------------------------------------------------------------------ Python slides (7-9)

const STRATEGY_NAMES = ["10%", "25%", "37%", "50%"];
const pct = (x) => (100 * x).toFixed(1) + "%";
const mult = (x) => x.toFixed(2) + "x";

// Code panel on/off per slide (C key): shown on slide 8, hidden on 9 and 10.
const codeShown = { python: true, h1: false, h2: false };

// Slide 7 state: number of startups per game and the last live run.
const live = { n: 20, running: false, result: null, replay: null };

async function runSlide7() {
  if (py.status !== "ready" || live.running) return;
  live.running = true;
  render();
  try {
    live.result = await runLive(live.n);
    live.replay = null;
    if (live.n === 20 && getGame(2).done) live.replay = await replay(getGame(2).values);
  } catch {
    live.result = null; // Python failed mid-run: the slide now shows saved results
  } finally {
    live.running = false;
    render();
  }
}

function sourceTag() {
  if (py.source === "live") {
    return `<div class="source live">🐍 Computed live in this browser · 200,000 games · ${(py.liveMs / 1000).toFixed(1)} s</div>`;
  }
  return `<div class="source saved">💾 Saved results · 200,000 games, computed by python/sim.py before the talk</div>`;
}

function slide7() {
  const labels = STRATEGY_NAMES;
  const title = "Chance of picking the single best startup";
  const ready = py.status === "ready";
  let chart;
  let meta = "";

  if (py.status === "fallback") {
    const s = py.analysis.strategies;
    chart = barChart({
      title,
      max: 0.5,
      items: labels.map((name) => ({ label: name, sub: `observe ${s[name].k}`, value: s[name].p_best.value, text: pct(s[name].p_best.value) })),
    });
    meta = `<p class="meta">💾 Saved results for 20 startups. Changing the number of startups needs live Python.</p>`;
  } else if (live.result && !live.running) {
    const s = live.result.strategies;
    chart = barChart({
      title,
      max: 0.5,
      items: labels.map((name) => ({ label: name, sub: `observe ${s[name].k}`, value: s[name].p_best, text: pct(s[name].p_best) })),
    });
    meta = `<p class="meta">🐍 ${live.result.trials.toLocaleString("en-US")} games × 4 strategies with ${live.result.n} startups · ${(live.result.ms / 1000).toFixed(2)} s, live in this browser</p>`;
    if (live.replay) {
      meta += `<p class="meta replay">On <strong>your</strong> 20 round 2 startups, reshuffled 10,000 times, the 37% rule found the best <strong>${pct(live.replay.strategies["37%"].p_best)}</strong> of the time.</p>`;
    } else if (live.n === 20 && !getGame(2).done) {
      meta += `<p class="meta muted">Play round 2 to replay the room's own startups.</p>`;
    }
  } else {
    const message = py.status === "loading" ? `<span class="spinner"></span> Python is loading…` : live.running ? `<span class="spinner"></span> Running…` : "Press <kbd>P</kbd> to run 10,000 games";
    chart = emptyChart(title, labels, message);
  }

  const sizes = [20, 50, 100]
    .map((n) => `<button class="chip ${n === live.n ? "active" : ""}" data-action="size" data-n="${n}" tabindex="-1" ${ready ? "" : "disabled"}>${n}</button>`)
    .join("");

  return `
    <div class="py-slide">
      <p class="kicker">Python, live</p>
      <h1 class="py-title">One game is luck. Let's play 10,000.</h1>
      <div class="py-body">
        <div class="py-left">
          <div class="controls">
            <span>Startups per game:</span> ${sizes}
            <button class="btn primary run" data-action="run" tabindex="-1" ${ready && !live.running ? "" : "disabled"}>Run <kbd>P</kbd></button>
          </div>
          ${chart}
          ${meta}
        </div>
        ${codeShown.python ? codePanel("The rule, as written in python/sim.py", excerpt("def choose(", "return np.where")) : ""}
      </div>
    </div>`;
}

function verdictStamp(v) {
  return `<div class="stamp ${v.toLowerCase()}">${v}</div>`;
}

function slide8() {
  const a = py.analysis;
  if (!a) return `<div class="center"><p class="muted">Loading results…</p></div>`;
  const s = a.strategies;
  const h1 = a.hypotheses.H1;
  const gain = h1.test.relative_gain;
  return `
    <div class="py-slide">
      <p class="kicker">Hypothesis 1</p>
      <h1 class="py-title">What if you care about average return?</h1>
      <div class="py-body">
        <div class="py-left">
          <div class="chart-pair">
            ${barChart({ title: "Chance of picking the best", max: 0.5, items: STRATEGY_NAMES.map((n) => ({ label: n, value: s[n].p_best.value, text: pct(s[n].p_best.value) })) })}
            ${barChart({ title: "Average return (normal world)", items: STRATEGY_NAMES.map((n) => ({ label: n, value: s[n].normal.mean, text: mult(s[n].normal.mean) })) })}
          </div>
          <div class="verdict-row">
            ${verdictStamp(h1.verdict)}
            <div class="verdict-text"><strong>25% beats 37% on average return.</strong><br>Real but small: about ${(100 * gain).toFixed(0)}% higher average return.</div>
          </div>
          ${sourceTag()}
        </div>
        ${codeShown.h1 ? codePanel("The H1 test, as written in python/sim.py", excerpt("h1_test = summary", "h1_best_k =")) : ""}
      </div>
    </div>`;
}

function slide9() {
  const a = py.analysis;
  if (!a) return `<div class="center"><p class="muted">Loading results…</p></div>`;
  const s = a.strategies;
  const h2 = a.hypotheses.H2;
  return `
    <div class="py-slide">
      <p class="kicker">Hypothesis 2</p>
      <h1 class="py-title">What if the world is full of unicorns?</h1>
      <div class="py-body">
        <div class="py-left">
          <div class="chart-pair">
            ${barChart({ title: "Average return (unicorn world)", items: STRATEGY_NAMES.map((n) => ({ label: n, value: s[n].unicorn.mean, text: mult(s[n].unicorn.mean) })) })}
            ${barChart({ title: "Typical (median) return", items: STRATEGY_NAMES.map((n) => ({ label: n, value: s[n].unicorn.median, text: mult(s[n].unicorn.median) })) })}
          </div>
          <div class="verdict-row">
            ${verdictStamp(h2.verdict)}
            <div class="verdict-text"><strong>The best cutoff moves later:</strong> from observing ${h2.best_cutoff.normal} to observing ${h2.best_cutoff.unicorn} startups.<br><span class="observation">The average says wait a bit longer. The typical result says don't.</span></div>
          </div>
          ${sourceTag()}
        </div>
        ${codeShown.h2 ? codePanel("The H2 test, as written in python/sim.py", excerpt("mu, mn = world_mean", "h2_test = summary")) : ""}
      </div>
    </div>`;
}

// ------------------------------------------------------------------ slides
const SLIDES = [
  {
    id: "open",
    render: () => `
      <div class="center">
        <h1 class="title">One Shot</h1>
        <p class="tagline">You have <strong>$1M</strong>. <strong>20</strong> startups. <strong>One</strong> shot.</p>
        <div class="authors">
          <p>Paloma Benguigui · Shira Dvir</p>
          <p class="muted">Bar-Ilan University</p>
        </div>
      </div>`,
  },
  {
    id: "parking",
    street: "intro",
    render: () => `
      <div class="street-slide">
        <p class="kicker">The parking problem</p>
        <div class="street-slot tall"></div>
      </div>`,
  },
  {
    id: "rules",
    render: () => `
      <div class="center">
        <p class="kicker">The rules</p>
        <ul class="rules">
          <li><span>1</span>20 startups appear <strong>one at a time</strong>.</li>
          <li><span>2</span>For each one, you vote with your hands: <strong>invest</strong> or <strong>pass</strong>.</li>
          <li><span>3</span>Pass, and it's <strong>gone forever</strong>.</li>
          <li><span>4</span>Reach startup #20? The fund <strong>must invest</strong> in it.</li>
        </ul>
        <p class="goal">Your goal: back the best startup you can.</p>
      </div>`,
  },
  { id: "round1", game: 1, render: () => roundSlideHTML(1) },
  { id: "reveal1", render: () => revealHTML(1) },
  {
    id: "rule",
    street: "rule",
    render: () => `
      <div class="street-slide">
        <p class="kicker">The 37% rule</p>
        <h1 class="street-title">Look first. Then leap.</h1>
        <div class="street-slot"></div>
        <div class="rule-legend">
          <div class="observe-text"><strong>Observe the first 37%</strong><br>Commit to nothing. Learn what "good" looks like.</div>
          <div class="leap-text"><strong>Then leap</strong><br>Take the first option that beats everything you've seen.</div>
        </div>
      </div>`,
  },
  { id: "round2", game: 2, render: () => roundSlideHTML(2) },
  { id: "python", render: slide7 },
  { id: "h1", render: slide8 },
  { id: "h2", render: slide9 },
  {
    id: "takeaway",
    render: () => {
      const cells = Array.from({ length: N }, (_, i) => `<div class="pos-cell">${i + 1}</div>`).join("");
      const pins = [1, 2]
        .map((n) => {
          const p = stopPosition(n);
          return p ? `<div class="pin r${n}" style="left:${((p - 0.5) / N) * 100}%">Round ${n}<br>#${p}</div>` : "";
        })
        .join("");
      const played = [1, 2].filter((n) => stopPosition(n)).length;
      return `
        <div class="center">
          <p class="kicker">Takeaway</p>
          <h1 class="big">When did the room stop?</h1>
          <div class="stops">
            <div class="pins">${pins}</div>
            <div class="pos-row">${cells}${zoneMarksHTML()}</div>
          </div>
          ${played < 2 ? `<p class="muted">Rounds not played yet are not shown.</p>` : ""}
          <div class="lessons">
            <p><strong>Finding <em>the</em> best?</strong> The 37% rule wins.</p>
            <p><strong>Maximizing average return?</strong> Decide a little earlier.</p>
            <p><strong>In a world of unicorns,</strong> a strategy can win on average while the typical outcome gets worse.</p>
          </div>
          <p class="final">There is no universal stopping rule. A good manager first defines what success means, then chooses when to stop searching.</p>
        </div>`;
    },
  },
];

// ------------------------------------------------------------------ navigation

const clamp = (i) => Math.max(0, Math.min(SLIDES.length - 1, i));
let current = clamp((parseInt(location.hash.slice(1), 10) || 1) - 1);

function statusPill() {
  const label = {
    loading: `<span class="spinner"></span> Python loading…`,
    ready: "🐍 Python ready",
    fallback: "💾 Saved results",
  }[py.status];
  return `<div class="py-pill ${py.status}">${label}</div>`;
}

function render() {
  const s = SLIDES[current];
  stage.innerHTML = `
    <section class="slide slide-${s.id}">${s.render()}</section>
    ${statusPill()}
    ${s.id in codeShown ? `<div class="key-hint"><kbd>C</kbd> · code</div>` : ""}
    <div class="slide-num">${current + 1} / ${SLIDES.length}</div>`;

  // 2D street on slides 2 and 6: start on arrival, otherwise keep it running.
  const slot = stage.querySelector(".street-slot");
  if (slot && s.street) {
    if (streetRestart || !reattachStreet(slot)) startStreet(slot, s.street);
    streetRestart = false;
  } else stopStreet();

  // 3D runway on slides 4 and 7 (and the round 1 pause screen).
  const runway = stage.querySelector(".runway");
  if (runway && s.game && showRunway(runway, getGame(s.game))) runway.classList.add("has-3d");
  else hideRunway();
}

let streetRestart = true; // the street animation restarts each time its slide opens

function show(i) {
  streetRestart = clamp(i) !== current || streetRestart;
  current = clamp(i);
  history.replaceState(null, "", `#${current + 1}`); // a reload stays on this slide
  if (SLIDES[current].id === "python") requireSoon();
  render();
}

function next(force = false) {
  const s = SLIDES[current];
  if (s.game && !getGame(s.game).done && !force) return; // don't skip a round in progress
  show(current + 1);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

// ------------------------------------------------------------------ fit to screen
// Every slide is designed at 1920x1080 and scaled to fit the window, so nothing
// ever scrolls and the laptop and the projector show the same layout.

function fit() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener("resize", fit);

// ------------------------------------------------------------------ input

const GAME_KEYS = { a: "invest", r: "pass", b: "bots", n: "restart", backspace: "undo" };

function runGameAction(action, el) {
  const s = SLIDES[current];
  if (action === "next") return next();
  if (action === "run") return runSlide7();
  if (action === "size") {
    live.n = Number(el.dataset.n);
    live.result = null;
    return runSlide7();
  }
  if (s.game && gameAction(s.game, action)) render();
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  const handled = ["arrowright", "arrowleft", " ", "pagedown", "pageup", "home", "enter", "backspace"].includes(key);
  if (handled) e.preventDefault(); // no page scrolling, no browser "back", no button presses
  if (e.repeat) return; // holding a key never acts twice

  if (key === "arrowright") return next(e.shiftKey);
  if (key === " " || key === "pagedown") return next();
  if (key === "arrowleft" || key === "pageup") return show(current - 1);
  if (key === "home") return show(0);
  if (key === "f") return toggleFullscreen();
  if (key === "o") return useFallback("presenter pressed O"); // hidden: switch to saved results
  if (key === "p" && SLIDES[current].id === "python") return runSlide7();
  if (key === "p" && SLIDES[current].street) {
    streetRestart = true; // replay the street animation
    return render();
  }
  if (key === "c" && SLIDES[current].id in codeShown) {
    codeShown[SLIDES[current].id] = !codeShown[SLIDES[current].id];
    return render();
  }
  if (GAME_KEYS[key]) runGameAction(GAME_KEYS[key]);
});

// Buttons never keep keyboard focus, so Space can't press them by accident.
stage.addEventListener("mousedown", (e) => {
  if (e.target.closest("button")) e.preventDefault();
});

stage.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el && !el.disabled) runGameAction(el.dataset.action, el);
});

onChange(render);
fit();
show(current);
startPython();
