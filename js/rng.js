// Seeded random numbers, so the same seed always produces the same startups.
// This keeps rehearsals identical to the live show.

// Mulberry32: a tiny, well-known seeded random generator. Returns numbers in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal draw (Box-Muller).
export function normal(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Unicorn world, same model as python/sim.py: median 0.5x, spread 1.7.
export const UNICORN = { median: 0.5, spread: 1.7 };

export function unicornReturn(rand) {
  return UNICORN.median * Math.exp(UNICORN.spread * normal(rand));
}
