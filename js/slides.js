// The 10-slide deck: slide content, navigation, keyboard and fit-to-screen.
//
// Keys:
//   → / Space / Page Down = next slide     ← / Page Up = previous slide
//   F = fullscreen    Home = slide 1
//   On slides 3 and 6: A = invest, R = pass, B = reveal the bots (slide 6)
//   Hidden: Backspace = undo the last click, N = restart the round
//   While a round is in progress, → won't leave the slide. Shift + → forces it.

import { N, BOTS } from "./game.js";
import { roundSlideHTML, revealHTML, gameAction, getGame, stopPosition, zoneMarksHTML, OBSERVE_K } from "./ui.js";

const stage = document.getElementById("stage");

// ------------------------------------------------------------------ slides

const placeholder = (title, question) => `
  <div class="center">
    <p class="kicker">${title}</p>
    <h1 class="big">${question}</h1>
    <div class="placeholder">🐍 Live Python simulation<br><span>Coming in milestone 4</span></div>
  </div>`;

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
    render: () => {
      const boxes = Array.from({ length: N }, (_, i) =>
        `<div class="rule-box ${i < OBSERVE_K ? "observe" : "leap"}">${i + 1}</div>`).join("");
      return `
        <div class="center">
          <p class="kicker">The 37% rule</p>
          <h1 class="big">Look first. Then leap.</h1>
          <div class="rule-row">${boxes}</div>
          <div class="rule-legend">
            <div class="observe-text"><strong>Observe the first 37%</strong><br>Invest in nothing. Learn what "good" looks like.</div>
            <div class="leap-text"><strong>Then leap</strong><br>Invest in the first startup that beats everything you've seen.</div>
          </div>
          <p class="muted rule-note">Mathematicians proved this gives the best chance of picking the single best option.</p>
        </div>`;
    },
  },
  { id: "round2", game: 2, render: () => roundSlideHTML(2) },
  { id: "python", render: () => placeholder("Python, live", "One game is luck. Let's play 10,000.") },
  { id: "h1", render: () => placeholder("Hypothesis 1", "What if you care about average return?") },
  { id: "h2", render: () => placeholder("Hypothesis 2", "What if the world is full of unicorns?") },
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

function render() {
  const s = SLIDES[current];
  stage.innerHTML = `
    <section class="slide slide-${s.id}">${s.render()}</section>
    <div class="slide-num">${current + 1} / ${SLIDES.length}</div>`;
}

function show(i) {
  current = clamp(i);
  history.replaceState(null, "", `#${current + 1}`); // a reload stays on this slide
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

function runGameAction(action) {
  const s = SLIDES[current];
  if (action === "next") return next();
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
  if (GAME_KEYS[key]) runGameAction(GAME_KEYS[key]);
});

// Buttons never keep keyboard focus, so Space can't press them by accident.
stage.addEventListener("mousedown", (e) => {
  if (e.target.closest("button")) e.preventDefault();
});

stage.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el && !el.disabled) runGameAction(el.dataset.action);
});

fit();
render();
