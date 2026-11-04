// Game rules only: no screen code here, so the slides and the 3D scene can reuse it.

import { mulberry32, unicornReturn } from "./rng.js";

export const N = 20;

// Same strategies as python/sim.py: observe k startups, then invest in the
// first one that beats everything seen so far. 37% of 20 = 7.4 -> 7.
export const BOTS = [
  { name: "10%", k: 2 },
  { name: "25%", k: 5 },
  { name: "37%", k: 7 },
  { name: "50%", k: 10 },
];

// Fixed seeds, so every rehearsal shows the same startups as the live show.
// Each round also has its own scale, so a "good" number in round 1 means
// nothing in round 2. The scale changes the size of the numbers, never which
// startup is best or what the bots pick.
export const ROUNDS = {
  1: { seed: 101, scale: 2 },
  2: { seed: 202, scale: 20 },
};

// Build a round: each startup gets a return from the unicorn world,
// multiplied by the round's scale.
export function createRound(number, startups) {
  const { seed, scale } = ROUNDS[number];
  const rand = mulberry32(seed);
  rand(); // skip one draw, so the seeded startup sets stay the same as first tested
  const list = startups.slice(0, N).map((s, i) => ({
    ...s,
    position: i + 1,
    value: unicornReturn(rand) * scale,
  }));
  return { number, seed, scale, startups: list };
}

// Index picked by a cutoff strategy (mirrors choose() in python/sim.py).
export function botPick(values, k) {
  if (k === 0) return 0;
  const bestSeen = Math.max(...values.slice(0, k));
  for (let i = k; i < values.length; i++) {
    if (values[i] > bestSeen) return i;
  }
  return values.length - 1; // forced to take the last one
}

// 1 = best of the round.
export function rankOf(values, i) {
  return 1 + values.filter((v) => v > values[i]).length;
}

export function bestIndex(values) {
  return values.indexOf(Math.max(...values));
}

export class Game {
  constructor(round) {
    this.round = round;
    this.values = round.startups.map((s) => s.value);
    this.restart();
  }

  restart() {
    this.index = 0;     // startup currently on screen
    this.pick = null;   // index the room invested in
    this.last = null;   // the last click, kept so the presenter can undo it once
  }

  get current() { return this.round.startups[this.index]; }
  get isLast() { return this.index === N - 1; }
  get done() { return this.pick !== null; }

  // Does startup i beat every startup shown before it?
  isBestSoFar(i = this.index) {
    return this.values.slice(0, i).every((v) => v < this.values[i]);
  }

  // Best startup seen before the current one, or null on the first card.
  bestBefore(i = this.index) {
    if (i === 0) return null;
    const seen = this.values.slice(0, i);
    return this.round.startups[seen.indexOf(Math.max(...seen))];
  }

  invest() {
    if (this.done) return false;
    this.last = { index: this.index };
    this.pick = this.index;
    return true;
  }

  pass() {
    if (this.done || this.isLast) return false; // the last startup is forced
    this.last = { index: this.index };
    this.index += 1;
    return true;
  }

  // Undo only the most recent click (for presenter mistakes). Not repeatable.
  undo() {
    if (!this.last) return false;
    this.index = this.last.index;
    this.pick = null;
    this.last = null;
    return true;
  }

  result() {
    const best = bestIndex(this.values);
    return {
      pick: this.pick,
      pickRank: rankOf(this.values, this.pick),
      best,
      bots: BOTS.map((b) => {
        const pick = botPick(this.values, b.k);
        return { ...b, pick, rank: rankOf(this.values, pick), stuck: pick === N - 1 };
      }),
    };
  }
}
