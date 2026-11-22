// player.js — the thief: WASD/arrows or click-to-move, run loud or crouch
// quiet, loot pickup, smoke bombs and EMP bursts, and the exit check.
import {
  PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED,
  PLAYER_CROUCH_SPEED, TOOL_SMOKE_COST, TOOL_EMP_COST,
  TOOL_SMOKE_COUNT, TOOL_EMP_COUNT, SMOKE_DURATION, SMOKE_RADIUS,
  EMP_DURATION, LOOT_SMALL_VALUE, LOOT_VAULT_VALUE, TILE,
} from './config.js';
import { isWallAtPixel } from './levels.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    running: false,
    crouching: false,
    moveTarget: null,
    stepTimer: 0,
    facing: 0,
    smokeLeft: TOOL_SMOKE_COUNT,
    empLeft: TOOL_EMP_COUNT,
  };
}

// movePlayerWithCollision slides the thief along walls instead of sticking.
function movePlayerWithCollision(player, dx, dy, walls) {
  const nx = player.x + dx;
  if (!isWallAtPixel(walls, nx + Math.sign(dx) * player.radius, player.y - player.radius + 2)
    && !isWallAtPixel(walls, nx + Math.sign(dx) * player.radius, player.y + player.radius - 2)) {
    player.x = nx;
  }
  const ny = player.y + dy;
  if (!isWallAtPixel(walls, player.x - player.radius + 2, ny + Math.sign(dy) * player.radius)
    && !isWallAtPixel(walls, player.x + player.radius - 2, ny + Math.sign(dy) * player.radius)) {
    player.y = ny;
  }
}

export function updatePlayer(player, dt, game) {
  const keys = game.input.keys;
  let mx = 0;
  let my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  player.running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && (mx !== 0 || my !== 0);
  player.crouching = keys.has('KeyC');

  if (mx !== 0 || my !== 0) {
    player.moveTarget = null; // keys always win over a click target
    const len = Math.hypot(mx, my);
    const speed = player.crouching ? PLAYER_CROUCH_SPEED : player.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    movePlayerWithCollision(player, (mx / len) * speed * dt, (my / len) * speed * dt, game.walls);
    player.facing = Math.atan2(my, mx);
  } else if (player.moveTarget) {
    const dx = player.moveTarget.x - player.x;
    const dy = player.moveTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      player.moveTarget = null;
    } else {
      const speed = player.crouching ? PLAYER_CROUCH_SPEED : PLAYER_WALK_SPEED;
      movePlayerWithCollision(player, (dx / dist) * speed * dt, (dy / dist) * speed * dt, game.walls);
      player.facing = Math.atan2(dy, dx);
    }
  }

  // Footstep timing: faster steps while running, silent while crouched.
  const moving = mx !== 0 || my !== 0 || player.moveTarget;
  if (moving) {
    player.stepTimer -= dt * (player.running ? 1.9 : player.crouching ? 0.7 : 1);
    if (player.stepTimer <= 0) {
      player.stepTimer = 0.42;
      game.audio.playFootstep(player.running);
    }
  }

  collectLoot(player, game);
  checkExit(player, game);
}

// collectLoot picks up small loot and the vault when the thief touches them.
export function collectLoot(player, game) {
  for (const loot of game.level.loot) {
    if (!loot.taken && Math.hypot(player.x - loot.x, player.y - loot.y) < player.radius + 16) {
      loot.taken = true;
      game.score += LOOT_SMALL_VALUE;
      game.lootTaken += 1;
      game.audio.playLootChime();
      game.onLootTaken(loot);
    }
  }
  const vault = game.level.vault;
  if (vault && !vault.taken && Math.hypot(player.x - vault.x, player.y - vault.y) < player.radius + 18) {
    vault.taken = true;
    game.score += LOOT_VAULT_VALUE;
    game.lootTaken += 1;
    game.audio.playVaultChime();
    game.onLootTaken(vault);
  }
}

// checkExit opens the getaway only once every small loot is lifted.
export function checkExit(player, game) {
  const allLoot = game.level.loot.every((loot) => loot.taken);
  game.exitOpen = allLoot;
  if (allLoot && Math.hypot(player.x - game.level.exit.x, player.y - game.level.exit.y) < player.radius + 18) {
    game.onLevelCleared();
  }
}

// throwSmokeBomb drops a smoke cloud that blinds guards and cameras.
export function throwSmokeBomb(player, game) {
  if (player.smokeLeft <= 0) return false;
  if (game.smoke) return false;
  player.smokeLeft -= 1;
  game.score = Math.max(0, game.score - TOOL_SMOKE_COST);
  game.smoke = { x: player.x, y: player.y, radius: SMOKE_RADIUS, timer: SMOKE_DURATION };
  game.audio.playSmoke();
  return true;
}

// fireEmpBurst shuts every camera down for a few seconds.
export function fireEmpBurst(player, game) {
  if (player.empLeft <= 0) return false;
  player.empLeft -= 1;
  game.score = Math.max(0, game.score - TOOL_EMP_COST);
  for (const camera of game.cameras) camera.disabledTimer = EMP_DURATION;
  game.audio.playEmp();
  return true;
}
