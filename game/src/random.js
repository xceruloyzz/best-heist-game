// random.js — a tiny seeded RNG (mulberry32) so decoration and sparkle
// phases are identical on every replay of a level. No Math.random is used
// anywhere in gameplay.
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(random, min, max) {
  return min + random() * (max - min);
}

export function seededPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
