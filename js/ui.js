// The game's screens, drawn inside slides 3, 4 and 6. Rules live in game.js.
// Every function here returns HTML; slides.js puts it on the stage.

import { STARTUPS } from "./startups.js";
import { Game, createRound, N, BOTS } from "./game.js";

// Round 2 only: the 37% rule's "observe only" zone covers the first 7 startups.
export const OBSERVE_K = BOTS.find((b) => b.name === "37%").k;

// ------------------------------------------------------------------ state
// Saved in the browser tab, so an accidental reload keeps the room's choices.

const STORE_KEY = "one-shot-game";
const games = {};
let botsShown = false;

function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

const saved = loadSaved();
botsShown = Boolean(saved.botsShown);

function save() {
  const rounds = {};
  for (const [n, g] of Object.entries(games)) rounds[n] = { index: g.index, pick: g.pick, last: g.last };
  sessionStorage.setItem(STORE_KEY, JSON.stringify({ botsShown, rounds }));
}

export function getGame(n) {
  if (!games[n]) {
    const g = new Game(createRound(n, STARTUPS[n]));
    const s = saved.rounds && saved.rounds[n];
    if (s) Object.assign(g, { index: s.index, pick: s.pick, last: s.last });
    games[n] = g;
  }
  return games[n];
}

// Position (1-20) where the room invested in round n, or null if not played yet.
export function stopPosition(n) {
  const g = getGame(n);
  return g.done ? g.pick + 1 : null;
}

// Apply a game action. Returns true if something changed (the slide redraws).
export function gameAction(n, action) {
  const g = getGame(n);
  let changed = false;
  if (action === "invest") changed = g.invest();
  if (action === "pass") changed = g.pass();
  if (action === "undo") changed = g.undo();
  if (action === "restart") {
    g.restart();
    changed = true;
  }
  if (action === "bots" && n === 2 && g.done && !botsShown) {
    botsShown = true;
    changed = true;
  }
  if (n === 2 && (action === "undo" || action === "restart") && changed) botsShown = false;
  if (changed) save();
  return changed;
}

// ------------------------------------------------------------------ helpers

export const fmt = (v) => (v < 0.01 ? "<0.01" : v < 1 ? v.toFixed(2) : v.toFixed(1)) + "x";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const rankText = (rank) => (rank === 1 ? "the best" : `${ordinal(rank)} best`) + ` of ${N}`;

export const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ------------------------------------------------------------------ slides 3 and 6

// What a round slide shows: the game while playing; after investing, a pause
// screen in round 1 (the reveal is on slide 4) or the reveal in round 2.
export function roundSlideHTML(n) {
  const g = getGame(n);
  if (!g.done) return playHTML(g);
  return n === 1 ? investedHTML(g) : revealHTML(2);
}

function playHTML(game) {
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

  return `
    <div class="play">
      <header class="topbar">
        <span class="round-label">Round ${game.round.number}</span>
        <span class="counter">Startup <strong>${game.index + 1}</strong> of ${N}${showZone ? ` · <strong>${seenPct}%</strong> seen` : ""}</span>
      </header>
      <div class="dots ${showZone ? "with-zone" : ""}">${dots}</div>
      <p class="best-before">${prev ? `Best seen so far: <strong>${fmt(prev.value)}</strong> (#${prev.position} ${esc(prev.name)})` : "This is the first startup."}</p>

      <article class="card ${best ? "is-best" : ""}">
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
        <button class="btn invest" data-action="invest" tabindex="-1">Invest <kbd>A</kbd></button>
        <button class="btn pass" data-action="pass" tabindex="-1" ${game.isLast ? "disabled" : ""}>Pass <kbd>R</kbd></button>
      </div>
    </div>`;
}

// Round 1, after investing: a pause before the reveal on slide 4.
function investedHTML(game) {
  const s = game.round.startups[game.pick];
  return `
    <div class="invested">
      <p class="invested-label">The room invested in</p>
      <h2 class="invested-name">#${s.position} ${esc(s.name)}</h2>
      <div class="invested-value">${fmt(s.value)}</div>
      <p class="invested-question">Was it the best?</p>
      <button class="btn primary" data-action="next" tabindex="-1">See the reveal →</button>
    </div>`;
}

// ------------------------------------------------------------------ reveal (slides 4 and 6)

export function revealHTML(n) {
  const game = getGame(n);
  if (!game.done) {
    return `<div class="empty"><p>Play round ${n} first.</p><p class="muted">Go back to slide ${n === 1 ? 3 : 6}.</p></div>`;
  }
  const r = game.result();
  const { startups } = game.round;
  const pick = startups[r.pick];
  const best = startups[r.best];
  const headline = r.pickRank === 1 ? `🎉 You found the best startup!` : `You picked the <strong>${rankText(r.pickRank)}</strong>.`;

  return `
    <div class="reveal">
      <header class="topbar"><span class="round-label">Round ${n}: the reveal</span></header>
      <h2 class="headline">${headline}</h2>
      <div class="summary">
        <div><span class="label">Your pick</span> #${pick.position} ${esc(pick.name)} · <strong>${fmt(pick.value)}</strong></div>
        <div><span class="label">The best</span> #${best.position} ${esc(best.name)} · <strong>${fmt(best.value)}</strong></div>
      </div>
      ${n === 1 ? gridHTML(game, r) : stripHTML(game, r) + botsHTML(game, r)}
    </div>`;
}

// Round 1: two rows of 10 tiles.
function gridHTML(game, r) {
  const tiles = game.round.startups
    .map((s, i) => {
      const tags = [];
      if (i === r.best) tags.push(`<span class="tag best">👑 BEST</span>`);
      if (i === r.pick) tags.push(`<span class="tag room">ROOM</span>`);
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
  return `<div class="grid">${tiles}</div>`;
}

// Round 2: one row of 20, with a line where each bot's observation zone ends.
function stripHTML(game, r) {
  const cells = game.round.startups
    .map((s, i) => {
      const tags = [];
      if (i === r.best) tags.push(`<span class="tag best">👑</span>`);
      if (i === r.pick) tags.push(`<span class="tag room">ROOM</span>`);
      if (botsShown) r.bots.filter((b) => b.pick === i).forEach((b) => tags.push(`<span class="tag bot">${b.name}</span>`));
      return `
        <div class="cell ${i === r.pick ? "picked" : ""} ${i === r.best ? "top" : ""} ${i > r.pick ? "unseen" : ""}">
          <div class="cell-pos">#${s.position}</div>
          <div class="cell-name">${esc(s.name)}</div>
          <div class="cell-value">${fmt(s.value)}</div>
          <div class="cell-tags">${tags.join("")}</div>
        </div>`;
    })
    .join("");
  return `
    <div class="strip-wrap">
      <p class="strip-caption">Lines show where each bot stops observing and starts investing.</p>
      <div class="strip">${cells}${zoneMarksHTML()}</div>
    </div>`;
}

export function zoneMarksHTML() {
  return BOTS.map(
    (b) => `<div class="zone-mark ${b.name === "37%" ? "main" : ""}" style="left:${(b.k / N) * 100}%"><span>${b.name}</span></div>`
  ).join("");
}

function botsHTML(game, r) {
  if (!botsShown) {
    return `<div class="reveal-actions"><button class="btn primary" data-action="bots" tabindex="-1">Reveal the bots <kbd>B</kbd></button></div>`;
  }
  const { startups } = game.round;
  const rows = [
    { name: "The room", watched: "—", pick: r.pick, rank: r.pickRank, room: true },
    ...r.bots.map((b) => ({ name: `Bot ${b.name}`, watched: `${b.k} startups`, pick: b.pick, rank: b.rank, stuck: b.stuck })),
  ];
  const bestRank = Math.min(...rows.map((x) => x.rank));
  const body = rows
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
    .join("");
  return `
    <table class="bots">
      <thead><tr><th>Investor</th><th>Watched first</th><th>Invested in</th><th>Return</th><th>Rank</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}
