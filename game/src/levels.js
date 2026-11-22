// levels.js — the three heist floors. Each map is a 32 x 16 grid of tiles:
//   '#' wall   '.' floor   'S' shadow zone (dark cover, harder to spot)
//   'P' thief start   'E' getaway exit   'L' small loot   'V' the vault
// Guards patrol fixed waypoint runs back and forth (ping-pong, straight
// wall-clear legs only) and cameras sweep from fixed mounts. All three
// floors are hand-drawn originals.
import { TILE } from './config.js';

export const LEVELS = [
  {
    name: 'LEVEL 1 — THE LOBBY',
    seed: 1101,
    map: [
      '################################',
      '#P......#...........#..........#',
      '#.......#...L.......#...L..V...#',
      '#..S....#...........#..........#',
      '#.......#......S....#..........#',
      '#.......#...........#....S.....#',
      '###.#############.########.#####',
      '#..............................#',
      '#..L.......S..........L........#',
      '#..................##..........#',
      '#..S..............##....S......#',
      '#..............................#',
      '#####.###################.######',
      '#.......#.............#........#',
      '#...L...#.....S.......#....E...#',
      '################################',
    ],
    guards: [
      { waypoints: [[4, 7], [27, 7]], pause: 1.2 },
      { waypoints: [[2, 13], [5, 13], [5, 9], [2, 9]], pause: 1.0 },
    ],
    cameras: [
      { tile: [16, 7], angle: Math.PI / 2, sweep: 0.55 },
      { tile: [24, 13], angle: Math.PI, sweep: 0.5 },
    ],
  },
  {
    name: 'LEVEL 2 — THE VAULT FLOOR',
    seed: 2202,
    map: [
      '################################',
      '#P.....#...........#...........#',
      '#..L...#....L......#..V....L...#',
      '#..S...#...........#......S....#',
      '#......#..S........#...........#',
      '#......#...........#....S......#',
      '####.#########.############.####',
      '#..............................#',
      '#..L.......S...........L...S...#',
      '#.............##...............#',
      '#..S...........##.....S........#',
      '#..............................#',
      '###.############.#########.#####',
      '#........#...........#.........#',
      '#...L....#....L......#.....E...#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 7], [13, 7]], pause: 1.0 },
      { waypoints: [[17, 9], [29, 9]], pause: 1.4 },
      { waypoints: [[3, 13], [7, 13]], pause: 0.8 },
    ],
    cameras: [
      { tile: [14, 7], angle: Math.PI / 2, sweep: 0.6 },
      { tile: [24, 11], angle: -Math.PI / 2, sweep: 0.55 },
      { tile: [26, 13], angle: Math.PI, sweep: 0.5 },
    ],
  },
  {
    name: 'LEVEL 3 — THE DIRECTOR’S SUITE',
    seed: 3303,
    map: [
      '################################',
      '#P.......#...........#.........#',
      '#..L.....#....L......#..V...L..#',
      '#..S.....#...........#....S....#',
      '#........#..S........#..L......#',
      '###.###########.###########.####',
      '#..............................#',
      '#..L....S.........L.......S....#',
      '#..............................#',
      '#.........##...................#',
      '####.############.########.#####',
      '#..........#........#..........#',
      '#..S...L...#...S....#....L.....#',
      '#..........#........#..........#',
      '#...L......#.......S#.....E....#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 7], [13, 7]], pause: 0.9 },
      { waypoints: [[17, 7], [29, 7]], pause: 1.1 },
      { waypoints: [[3, 12], [9, 12]], pause: 0.8 },
      { waypoints: [[22, 12], [28, 12]], pause: 1.2 },
    ],
    cameras: [
      { tile: [14, 7], angle: Math.PI / 2, sweep: 0.65 },
      { tile: [24, 7], angle: Math.PI / 2, sweep: 0.6 },
      { tile: [16, 12], angle: -Math.PI / 2, sweep: 0.55 },
    ],
  },
];

// parseLevelMap turns one level's ASCII map into lookup data: wall tiles,
// shadow tiles, loot spots, the vault, the start and the exit.
export function parseLevelMap(level) {
  const walls = new Set();
  const shadow = new Set();
  const loot = [];
  let vault = null;
  let start = null;
  let exit = null;
  level.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'S') shadow.add(key);
      else if (ch === 'L') loot.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false, value: 100 });
      else if (ch === 'V') vault = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false, value: 500 };
      else if (ch === 'P') start = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      else if (ch === 'E') exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
    }
  });
  return { walls, shadow, loot, vault, start, exit };
}

export function isWallTile(walls, tileX, tileY) {
  return walls.has(`${tileX},${tileY}`);
}

// isWallAtPixel answers whether a point in world pixels sits inside a wall.
export function isWallAtPixel(walls, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= 32 || ty >= 16) return true;
  return walls.has(`${tx},${ty}`);
}

export function isShadowAtPixel(shadow, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  return shadow.has(`${tx},${ty}`);
}

// hasLineOfSight steps along the ray between two points and reports false
// as soon as a wall tile blocks it. Used by guards and cameras.
export function hasLineOfSight(walls, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWallAtPixel(walls, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}
