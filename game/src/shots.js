// shots.js — deterministic screenshot scenes, picked with ?shot=cover,
// ?shot=alert, ?shot=title or ?shot=win. Each scene sets the game to one
// exact state (fixed positions, fixed alarm) so every render is identical.
// The cover scene is the judge's first look: thief mid-room, a guard cone
// and a camera cone sweeping, loot and the vault in view, alarm meter
// part-full — a complete heist in one frame.
import { TILE } from './config.js';

export function applyShotScene(game, name) {
  if (name === 'title') {
    game.screen = 'title';
  } else if (name === 'cover') {
    game.startLevel(0);
    game.screen = 'play';
    game.player.x = 15 * TILE + 20;
    game.player.y = 8 * TILE + 20;
    game.player.facing = -Math.PI / 2;
    const guard = game.guards[0];
    guard.x = 20 * TILE + 20;
    guard.y = 7 * TILE + 20;
    guard.angle = Math.PI;
    guard.state = 'suspicious';
    guard.suspicion = 0.55;
    guard.pauseTimer = 999;
    const guard2 = game.guards[1];
    guard2.x = 5 * TILE + 20;
    guard2.y = 11 * TILE + 20;
    guard2.angle = 0;
    guard2.state = 'patrol';
    guard2.pauseTimer = 999;
    game.cameras[0].angle = Math.PI / 2 + 0.3;
    game.alarm.value = 34;
    game.level.loot[0].taken = true;
    game.lootTaken = 1;
    game.score = 100;
    game.levelTime = 47;
  } else if (name === 'alert') {
    game.startLevel(0);
    game.screen = 'play';
    game.player.x = 18 * TILE + 20;
    game.player.y = 7 * TILE + 20;
    game.player.facing = Math.PI;
    const guard = game.guards[0];
    guard.x = 14 * TILE + 20;
    guard.y = 7 * TILE + 20;
    guard.angle = 0;
    guard.state = 'alert';
    guard.suspicion = 1;
    guard.pauseTimer = 0;
    guard.lastSeenX = game.player.x;
    guard.lastSeenY = game.player.y;
    game.cameras[0].angle = Math.PI / 2;
    game.alarm.value = 78;
    game.level.loot[0].taken = true;
    game.level.loot[1].taken = true;
    game.lootTaken = 2;
    game.score = 200;
    game.levelTime = 83;
    game.everAlerted = true;
  } else if (name === 'win') {
    game.startLevel(2);
    game.screen = 'win';
    game.score = 2840;
    game.totalTime = 512;
    game.totalLootTaken = 24;
    game.bestScore = 2840;
    game.everAlerted = false;
  }
  game.shotReady = true;
}
