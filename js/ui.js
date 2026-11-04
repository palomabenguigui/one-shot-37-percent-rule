// Everything on screen: menu, startup card, reveal. Rules live in game.js.
//
// Presenter keys:
//   A = invest, R = pass, B = reveal the bots (round 2)
//   Hidden: Backspace = undo the last click only, N = restart the round, Esc = menu

import { STARTUPS } from "./startups.js";
import { Game, createRound, N, BOTS } from "./game.js";

// Round 2 only: the 37% rule's "observe only" zone covers the first 7 startups.
const OBSERVE_K = BOTS.find((b) => b.name === "37%").k;

const app = document.getElementById("app");
let game = null;
let botsShown = false;

// ------------------------------------------------------------------ helpers

const fmt = (v) => (v < 0.01 ? "<0.01" : v < 1 ? v.toFixed(2) : v.toFixed(1)) + "x";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const rankText = (rank) => (rank === 1 ? "the best" : `${ordinal(rank)} best`) + ` of ${N}`;

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ------------------------------------------------------------------ screens

function renderMenu() {
  app.innerHTML = `
    <section class="menu">
      <h1>One Shot</h1>
      <p class="subtitle">$1M. 20 startups. One shot.</p>
      <div class="menu-buttons">
        <button class="btn primary" data-action="round" data-round="1">Play round 1</button>
        <button class="btn primary" data-action="round" data-round="2">Play round 2</button>
      </div>
      <p class="hint">Game test page (milestone 2)</p>
    </section>`;
}

function renderPlay() {
  const s = game.current;
  const best = game.isBestSoFar();
  const prev = game.bestBefore();
  // Round 1 shows no percentages and no zone, so nothing hints at the rule.
  const showZone = game.round.number === 2;
  const inZone = showZone && game.index < OBSERVE_K;
  const dot = (i) => `<span class="dot ${i < game.index ? "passed" : i === game.index ? "current" : ""}"></span>`;
  const all = game.round.startups.map((_, i) => dot(i));
  const dots = showZone
    ? `<div class="zone ${inZone ? "active" : ""}"><span class="zone-label">Observe only</span>${all.slice(0, OBSERVE_K).join("")}</div>
       <span class="zone-end"><span>37%</span></span>${all.slice(OBSERVE_K).join("")}`
    : all.join("");
  const seenPct = Math.round(((game.index + 1) / N) * 100);

  app.innerHTML = `
    <section class="play">
      <header class="topbar">
        <span class="round-label">Round ${game.round.number}</span>
        <span class="counter">Startup <strong>${game.index + 1}</strong> of ${N}${showZone ? ` · <strong>${seenPct}%</strong> seen` : ""}</span>
      </header>
      <div class="dots ${showZone ? "with-zone" : ""}">${dots}</div>
      <p class="best-before">${prev ? `Best seen so far: <strong>${fmt(prev.value)}</strong> (#${prev.position} ${esc(prev.name)})` : "This is the first startup."}</p>

      <article class="card ${best ? "is-best" : ""} ${game.isLast ? "is-last" : ""}">
        <div class="badge ${best ? "" : "hidden"}">🏆 BEST SO FAR</div>
        ${inZone ? `<div class="zone-chip">Observe-only zone</div>` : ""}
        <div class="sector">${esc(s.sector)}</div>
        <h2 class="name">${esc(s.name)}</h2>
        <p class="pitch">${esc(s.pitch)}</p>
        <div class="return-label">Projected return</div>
        <div class="return">${fmt(s.value)}</div>
        ${game.isLast ? `<p class="last-note">Last startup: the fund must invest.</p>` : ""}
      </article>

      <div class="actions">
        <button class="btn invest" data-action="invest">Invest <kbd>A</kbd></button>
        <button class="btn pass" data-action="pass" ${game.isLast ? "disabled" : ""}>Pass <kbd>R</kbd></button>
      </div>
    </section>`;
}

function renderReveal() {
  const r = game.result();
  const { startups } = game.round;
  const pick = startups[r.pick];
  const best = startups[r.best];
  const isRound2 = game.round.number === 2;

  const tiles = startups
    .map((s, i) => {
      const tags = [];
      if (i === r.best) tags.push(`<span class="tag best">👑 BEST</span>`);
      if (i === r.pick) tags.push(`<span class="tag room">ROOM</span>`);
      if (isRound2 && botsShown) {
        r.bots.filter((b) => b.pick === i).forEach((b) => tags.push(`<span class="tag bot">${b.name}</span>`));
      }
      const unseen = i > r.pick;
      return `
        <div class="tile ${i === r.pick ? "picked" : ""} ${i === r.best ? "top" : ""} ${unseen ? "unseen" : ""}">
          <div class="tile-pos">#${s.position}${unseen ? ` <span class="unseen-label">never seen</span>` : ""}</div>
          <div class="tile-name">${esc(s.name)}</div>
          <div class="tile-value">${fmt(s.value)}</div>
          <div class="tile-tags">${tags.join("")}</div>
        </div>`;
    })
    .join("");

  const headline =
    r.pickRank === 1
      ? `🎉 You found the best startup!`
      : `You picked the <strong>${rankText(r.pickRank)}</strong>.`;

  let botsBlock = "";
  if (isRound2) {
    if (!botsShown) {
      botsBlock = `<button class="btn primary" data-action="bots">Reveal the bots <kbd>B</kbd></button>`;
    } else {
      const rows = [
        { name: "The room", watched: "—", pick: r.pick, rank: r.pickRank, room: true },
        ...r.bots.map((b) => ({ name: `Bot ${b.name}`, watched: `${b.k} startups`, pick: b.pick, rank: b.rank, stuck: b.stuck })),
      ];
      const bestRank = Math.min(...rows.map((x) => x.rank));
      botsBlock = `
        <table class="bots">
          <thead><tr><th>Investor</th><th>Watched first</th><th>Invested in</th><th>Return</th><th>Rank</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (x) => `
              <tr class="${x.room ? "room-row" : ""} ${x.rank === bestRank ? "winner" : ""}">
                <td>${x.name}</td>
                <td>${x.watched}</td>
                <td>#${x.pick + 1} ${esc(startups[x.pick].name)}${x.stuck ? ` <span class="stuck">forced last</span>` : ""}</td>
                <td>${fmt(startups[x.pick].value)}</td>
                <td>${rankText(x.rank)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;
    }
  }

  app.innerHTML = `
    <section class="reveal">
      <header class="topbar">
        <span class="round-label">Round ${game.round.number}: the reveal</span>
      </header>
      <h2 class="headline">${headline}</h2>
      <div class="summary">
        <div><span class="label">Your pick</span> #${pick.position} ${esc(pick.name)} · <strong>${fmt(pick.value)}</strong></div>
        <div><span class="label">The best</span> #${best.position} ${esc(best.name)} · <strong>${fmt(best.value)}</strong></div>
      </div>
      ${isRound2 ? renderStrip(r) : `<div class="grid">${tiles}</div>`}
      <div class="reveal-actions">${botsBlock}</div>
    </section>`;
}

// Round 2 reveal: all 20 startups in one row, with a marker where each bot's
// observation zone ends (after 2, 5, 7 and 10 startups).
function renderStrip(r) {
  const { startups } = game.round;
  const cells = startups
    .map((s, i) => {
      const tags = [];
      if (i === r.best) tags.push(`<span class="tag best">👑</span>`);
      if (i === r.pick) tags.push(`<span class="tag room">ROOM</span>`);
      if (botsShown) {
        r.bots.filter((b) => b.pick === i).forEach((b) => tags.push(`<span class="tag bot">${b.name}</span>`));
      }
      return `
        <div class="cell ${i === r.pick ? "picked" : ""} ${i === r.best ? "top" : ""} ${i > r.pick ? "unseen" : ""}">
          <div class="cell-pos">#${s.position}</div>
          <div class="cell-name" title="${esc(s.name)}">${esc(s.name)}</div>
          <div class="cell-value">${fmt(s.value)}</div>
          <div class="cell-tags">${tags.join("")}</div>
        </div>`;
    })
    .join("");
  const markers = BOTS.map(
    (b) => `<div class="zone-mark ${b.name === "37%" ? "main" : ""}" style="left:${(b.k / N) * 100}%"><span>${b.name}</span></div>`
  ).join("");
  return `
    <div class="strip-wrap">
      <p class="strip-caption">Lines show where each bot stops observing and starts investing.</p>
      <div class="strip">${cells}${markers}</div>
    </div>`;
}

function render() {
  if (!game) renderMenu();
  else if (game.done) renderReveal();
  else renderPlay();
}

// ------------------------------------------------------------------ actions

function startRound(number) {
  game = new Game(createRound(number, STARTUPS[number]));
  botsShown = false;
  render();
}

const actions = {
  round: (el) => startRound(Number(el.dataset.round)),
  invest: () => game && game.invest() && render(),
  pass: () => game && game.pass() && render(),
  bots: () => {
    if (game && game.done && game.round.number === 2) {
      botsShown = true;
      render();
    }
  },
  undo: () => {
    if (game && game.undo()) {
      botsShown = false;
      render();
    }
  },
  restart: () => game && startRound(game.round.number),
  menu: () => {
    game = null;
    render();
  },
};

app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el && !el.disabled) actions[el.dataset.action](el);
});

const keys = { a: "invest", r: "pass", b: "bots", n: "restart", backspace: "undo", escape: "menu" };

document.addEventListener("keydown", (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return; // holding a key never clicks twice
  const action = keys[e.key.toLowerCase()];
  if (!action) return;
  e.preventDefault(); // stops Backspace from navigating back in some browsers
  actions[action]();
});

render();
