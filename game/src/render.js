// render.js — everything drawn: the floor plan, walls, shadow cover,
// vision cones, guards, cameras, loot, the vault, the exit, the thief,
// smoke, and the HUD with its alarm meter. Plus the title, pause,
// level-clear, caught and win screens.
import {
  TILE, HUD_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, PALETTE, LEVEL_NAMES,
  ALARM_MAX,
} from './config.js';
import { guardConePolygon } from './guards.js';
import { cameraConePolygon } from './cameras.js';

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (game.screen === 'title') { drawTitleScreen(ctx, game); return; }
  drawWorld(ctx, game);
  drawHud(ctx, game);
  if (game.screen === 'paused') drawPausedScreen(ctx, game);
  if (game.screen === 'clear') drawLevelClearScreen(ctx, game);
  if (game.screen === 'caught') drawCaughtScreen(ctx, game);
  if (game.screen === 'win') drawWinScreen(ctx, game);
}

function drawWorld(ctx, game) {
  ctx.save();
  ctx.translate(0, HUD_HEIGHT);
  drawFloor(ctx, game);
  drawShadowZones(ctx, game);
  drawLootAndVault(ctx, game);
  drawExit(ctx, game);
  drawVisionCones(ctx, game);
  drawWalls(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawSmoke(ctx, game);
  drawPlayer(ctx, game);
  ctx.restore();
}

// drawFloor paints the checkerboard floor with seeded speckles and carpet.
function drawFloor(ctx, game) {
  for (let ty = 0; ty < 16; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      const speckle = game.decor[ty * 32 + tx];
      if (speckle > 0.72) {
        ctx.fillStyle = PALETTE.floorSpeckle;
        ctx.fillRect(x + speckle * 20, y + (1 - speckle) * 20, 5, 5);
      }
    }
  }
  // A carpet runner down the main corridor for a "bank at night" read.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(0, 7 * TILE + 12, WORLD_WIDTH, 16);
  ctx.strokeStyle = PALETTE.goldDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 7 * TILE + 12, WORLD_WIDTH, 16);
}

function drawShadowZones(ctx, game) {
  game.level.shadow.forEach((key) => {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillStyle = PALETTE.shadowZone;
    ctx.fillRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = PALETTE.shadowZoneEdge;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
    ctx.setLineDash([]);
  });
}

function drawLootAndVault(ctx, game) {
  for (const loot of game.level.loot) {
    if (loot.taken) continue;
    const pulse = 0.7 + 0.3 * Math.sin(game.time * 4 + loot.x * 0.01);
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gold;
    ctx.globalAlpha = pulse;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.goldDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$', loot.x, loot.y - 14);
  }
  const vault = game.level.vault;
  if (vault && !vault.taken) {
    const pulse = 0.75 + 0.25 * Math.sin(game.time * 3);
    ctx.save();
    ctx.translate(vault.x, vault.y);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.vault;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#6b4e00';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.vault;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT', vault.x, vault.y - 24);
  }
}

function drawExit(ctx, game) {
  const exit = game.level.exit;
  const open = game.exitOpen;
  const pulse = open ? 0.6 + 0.4 * Math.sin(game.time * 5) : 0.25;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(-17, -17, 34, 34);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.exitGlow;
  ctx.lineWidth = open ? 3 : 1;
  ctx.strokeRect(-17, -17, 34, 34);
  ctx.fillStyle = open ? '#062b16' : '#9adbb6';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', 0, 4);
  ctx.restore();
  if (open) {
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY OPEN — RUN!', exit.x, exit.y - 26);
  }
}

function drawVisionCones(ctx, game) {
  for (const guard of game.guards) {
    const poly = guardConePolygon(guard, game.walls);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = guard.state === 'alert' ? PALETTE.coneAlert
      : guard.state === 'suspicious' ? PALETTE.coneSuspicious : PALETTE.cone;
    ctx.fill();
  }
  for (const camera of game.cameras) {
    if (camera.disabledTimer > 0) continue;
    const poly = cameraConePolygon(camera, game.walls);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = camera.spotting ? PALETTE.cameraConeHot : PALETTE.cameraCone;
    ctx.fill();
  }
}

function drawWalls(ctx, game) {
  game.level.walls.forEach((key) => {
    const [tx, ty] = key.split(',').map(Number);
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, TILE, 5);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  });
}

function drawCameras(ctx, game) {
  for (const camera of game.cameras) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.rotate(camera.angle);
    ctx.fillStyle = PALETTE.cameraBody;
    ctx.fillRect(-4, -7, 18, 14);
    ctx.fillStyle = camera.disabledTimer > 0 ? '#555f73' : camera.spotting ? PALETTE.cameraLens : '#2b3a55';
    ctx.beginPath();
    ctx.arc(14, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = camera.disabledTimer > 0 ? PALETTE.hudMuted : camera.spotting ? '#ff5a5a' : PALETTE.cameraBody;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (camera.disabledTimer > 0) {
      ctx.fillStyle = PALETTE.hudMuted;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OFF', camera.x, camera.y - 14);
    } else if (camera.spotting) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED!', camera.x, camera.y - 14);
    }
  }
}

function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.angle);
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Suspicion ring + state mark above the guard's head.
    ctx.strokeStyle = guard.state === 'alert' ? '#ff5a5a' : guard.state === 'suspicious' ? '#f58c42' : '#8b93a7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
    ctx.stroke();
    if (guard.state !== 'patrol') {
      ctx.fillStyle = guard.state === 'alert' ? '#ff5a5a' : '#f58c42';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(guard.state === 'alert' ? '!' : '?', guard.x, guard.y - 22);
    }
  }
}

function drawSmoke(ctx, game) {
  const smoke = game.smoke;
  if (!smoke) return;
  ctx.fillStyle = PALETTE.smoke;
  ctx.beginPath();
  ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dfe6f2';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SMOKE', smoke.x, smoke.y - smoke.radius - 6);
}

function drawPlayer(ctx, game) {
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  ctx.fillStyle = PALETTE.playerCoat;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(6, -4, 8, 3);
  ctx.fillRect(6, 1, 8, 3);
  ctx.restore();
  if (player.crouching) {
    ctx.strokeStyle = '#7fb3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YOU', player.x, player.y - 20);
}

// drawHud paints the top bar: level name, loot, score, timer, tools and
// the big alarm meter the whole heist lives or dies by.
function drawHud(ctx, game) {
  ctx.fillStyle = PALETTE.hudBackground;
  ctx.fillRect(0, 0, WORLD_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MIDNIGHT VAULT', 16, 26);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px monospace';
  ctx.fillText(LEVEL_NAMES[game.levelIndex], 16, 48);

  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  const lootTotal = game.level.loot.length + 1;
  ctx.fillText(`LOOT ${game.lootTaken}/${lootTotal}`, 330, 26);
  ctx.fillText(`SCORE ${game.score}`, 330, 48);
  ctx.fillText(`TIME ${formatTime(game.levelTime)}`, 520, 26);
  ctx.fillText(`GHOST ${game.everAlerted ? 'LOST' : 'CLEAN'}`, 520, 48);

  // Tools: smoke (Q) and EMP (F), with their remaining counts.
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px monospace';
  ctx.fillText(`[Q] SMOKE x${game.player.smokeLeft} (-50)`, 700, 26);
  ctx.fillText(`[F] EMP x${game.player.empLeft} (-75)`, 700, 48);

  // Alarm meter.
  const meterX = 980;
  const meterY = 14;
  const meterW = 220;
  const meterH = 22;
  ctx.fillStyle = '#000';
  ctx.fillRect(meterX - 2, meterY - 2, meterW + 4, meterH + 4);
  ctx.fillStyle = '#222a3a';
  ctx.fillRect(meterX, meterY, meterW, meterH);
  const frac = game.alarm.value / ALARM_MAX;
  ctx.fillStyle = frac < 0.4 ? PALETTE.alarmLow : frac < 0.75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
  ctx.fillRect(meterX, meterY, meterW * frac, meterH);
  ctx.strokeStyle = PALETTE.hudText;
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX, meterY, meterW, meterH);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(game.alarm.lockdownTimer > 0 ? 'LOCKDOWN!' : 'ALARM', meterX, meterY + meterH + 16);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(game.alarm.value)}%`, meterX + meterW, meterY + meterH + 16);
  ctx.textAlign = 'left';

  if (game.alarm.seenByCamera || game.guards.some((g) => g.state === 'alert')) {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!! SPOTTED — BREAK LINE OF SIGHT !!', WORLD_WIDTH / 2, HUD_HEIGHT + 18);
    ctx.textAlign = 'left';
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function drawPanel(ctx, title, lines, accent) {
  const w = 560;
  const h = 120 + lines.length * 30;
  const x = (WORLD_WIDTH - w) / 2;
  const y = (WORLD_HEIGHT + HUD_HEIGHT - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || PALETTE.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent || PALETTE.titleGold;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, WORLD_WIDTH / 2, y + 48);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '16px monospace';
  lines.forEach((line, i) => ctx.fillText(line, WORLD_WIDTH / 2, y + 88 + i * 30));
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '14px monospace';
  ctx.fillText('Press Enter to continue', WORLD_WIDTH / 2, y + h - 18);
  ctx.textAlign = 'left';
}

function drawTitleScreen(ctx, game) {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // A miniature vault door behind the title.
  ctx.save();
  ctx.translate(WORLD_WIDTH / 2, 300);
  ctx.strokeStyle = PALETTE.goldDark;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
    ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.titleGold;
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT VAULT', WORLD_WIDTH / 2, 150);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px monospace';
  ctx.fillText('A top-down heist in three floors — lift the loot, dodge the', WORLD_WIDTH / 2, 470);
  ctx.fillText('cones, silence the cameras, and slip out the green exit.', WORLD_WIDTH / 2, 498);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '16px monospace';
  ctx.fillText('WASD / arrows — move      Click — walk there      Shift — run (loud)', WORLD_WIDTH / 2, 548);
  ctx.fillText('C — crouch (quiet, harder to see)      Q — smoke      F — EMP      P — pause', WORLD_WIDTH / 2, 574);
  ctx.fillText('M — mute      R — restart      1 / 2 / 3 — pick a floor', WORLD_WIDTH / 2, 600);
  ctx.fillStyle = PALETTE.titleGold;
  ctx.font = 'bold 22px monospace';
  ctx.fillText('Press Enter or click Start', WORLD_WIDTH / 2, 650);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px monospace';
  ctx.fillText(`Best score: ${game.bestScore}`, WORLD_WIDTH / 2, 682);
  ctx.textAlign = 'left';
}

function drawPausedScreen(ctx, game) {
  ctx.fillStyle = 'rgba(5, 8, 14, 0.6)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawPanel(ctx, 'PAUSED', [
    `${LEVEL_NAMES[game.levelIndex]}`,
    `Score ${game.score}   Loot ${game.lootTaken}/${game.level.loot.length + 1}`,
    'P / Esc — resume      R — restart floor',
  ]);
}

function drawLevelClearScreen(ctx, game) {
  const bonus = game.lastClearBonus;
  drawPanel(ctx, 'FLOOR CLEARED!', [
    `${LEVEL_NAMES[game.levelIndex]} — getaway made`,
    `Time bonus +${bonus.time}   ${bonus.ghost ? 'Ghost bonus +300' : 'Ghost bonus lost'}`,
    `Score ${game.score}`,
    game.levelIndex < 2 ? 'Next floor: Enter' : 'Final floor done: Enter',
  ], PALETTE.exit);
}

function drawCaughtScreen(ctx, game) {
  drawPanel(ctx, 'CAUGHT!', [
    'A guard got a hand on you. The vault keeps its gold.',
    `${LEVEL_NAMES[game.levelIndex]}   Score ${game.score}`,
    'Enter — retry this floor      R — restart',
  ], '#e63c3c');
}

function drawWinScreen(ctx, game) {
  drawPanel(ctx, 'THE PERFECT JOB', [
    'All three floors cleaned out. The Aurum job is done.',
    `Final score ${game.score}   Total time ${formatTime(game.totalTime)}`,
    `Loot ${game.totalLootTaken} pieces   ${game.everAlerted ? 'Spotted along the way' : 'Never once spotted — a ghost'}`,
    `Best score ${game.bestScore}`,
  ], PALETTE.titleGold);
}
