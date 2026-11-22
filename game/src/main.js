// main.js — MIDNIGHT VAULT: the state machine and main loop. Screens:
// title -> play -> paused / clear (next floor) / caught (retry) -> win.
// The game object is exposed as window.__game so a headless play-test can
// drive it, and window.__shotReady flips true once a ?shot= scene is set.
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TILE, ALARM_MAX, ALARM_DECAY,
  ALARM_GUARD_ALERT_RATE, ALARM_LOCKDOWN_HOLD, GHOST_BONUS,
  TIME_BONUS_PER_SECOND, SMOKE_DURATION,
} from './config.js';
import { LEVELS, parseLevelMap } from './levels.js';
import { createGuard, updateGuard } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { createPlayer, updatePlayer } from './player.js';
import { createAudio } from './audio.js';
import { createInput, bindToolButtons, applyToolAction } from './input.js';
import { drawGame } from './render.js';
import { applyShotScene } from './shots.js';
import { createSeededRandom } from './random.js';

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const game = {
    canvas,
    ctx,
    screen: 'title',
    levelIndex: 0,
    level: null,
    walls: new Set(),
    shadow: new Set(),
    guards: [],
    cameras: [],
    player: null,
    alarm: { value: 0, lockdownTimer: 0, seenByCamera: false },
    smoke: null,
    score: 0,
    lootTaken: 0,
    totalLootTaken: 0,
    levelTime: 0,
    totalTime: 0,
    time: 0,
    exitOpen: false,
    everAlerted: false,
    bestScore: Number(window.localStorage.getItem('midnight-vault-best') ?? 0) || 0,
    lastClearBonus: { time: 0, ghost: false },
    decor: [],
    audio: createAudio(),
    input: null,
    shotReady: false,
    pausedFrom: null,

    // startLevel loads one floor fresh: map, guards, cameras, thief.
    startLevel(index) {
      this.levelIndex = index;
      const def = LEVELS[index];
      const parsed = parseLevelMap(def);
      this.level = parsed;
      this.walls = parsed.walls;
      this.shadow = parsed.shadow;
      this.guards = def.guards.map(createGuard);
      this.cameras = def.cameras.map(createCamera);
      this.player = createPlayer(parsed.start);
      this.alarm = { value: 0, lockdownTimer: 0, seenByCamera: false };
      this.smoke = null;
      this.lootTaken = 0;
      this.levelTime = 0;
      this.exitOpen = false;
      const random = createSeededRandom(def.seed);
      this.decor = Array.from({ length: 32 * 16 }, () => random());
    },

    startRun(index) {
      this.score = 0;
      this.totalLootTaken = 0;
      this.totalTime = 0;
      this.everAlerted = false;
      this.startLevel(index);
      this.screen = 'play';
    },

    onGuardAlerted() {
      this.everAlerted = true;
      this.audio.playAlertSting();
    },

    onLootTaken() {
      // Hook for future scoring effects; the chime already played.
    },

    onPlayerCaught() {
      if (this.screen !== 'play') return;
      this.screen = 'caught';
      this.audio.playCaught();
      this.audio.setAlarmSound(false);
    },

    // onLevelCleared banks the time + ghost bonus and opens the next floor.
    onLevelCleared() {
      if (this.screen !== 'play') return;
      const timeBonus = Math.max(0, Math.round((240 - this.levelTime) * TIME_BONUS_PER_SECOND));
      const ghost = !this.everAlerted;
      const ghostBonus = ghost ? GHOST_BONUS : 0;
      this.score += timeBonus + ghostBonus;
      this.lastClearBonus = { time: timeBonus, ghost };
      this.totalLootTaken += this.lootTaken;
      this.totalTime += this.levelTime;
      if (this.levelIndex >= LEVELS.length - 1) {
        this.screen = 'win';
        this.audio.playWin();
        this.audio.setAlarmSound(false);
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          window.localStorage.setItem('midnight-vault-best', String(this.bestScore));
        }
      } else {
        this.screen = 'clear';
        this.audio.playWin();
      }
    },

    // handleAction routes every button and key to the right screen change.
    handleAction(action) {
      this.audio.ensureContext();
      if (action.type === 'clickMove') {
        if (this.screen === 'play') this.player.moveTarget = { x: action.x, y: action.y };
        return;
      }
      if (action.type === 'mute') {
        this.audio.setMuted(!this.audio.muted);
        const btn = document.getElementById('btn-mute');
        if (btn) btn.textContent = this.audio.muted ? 'Unmute (M)' : 'Mute (M)';
        return;
      }
      if (action.type === 'confirm') {
        this.audio.playClick();
        if (this.screen === 'title') this.startRun(0);
        else if (this.screen === 'clear') this.startLevel(this.levelIndex + 1), (this.screen = 'play');
        else if (this.screen === 'caught') this.startLevel(this.levelIndex), (this.screen = 'play');
        else if (this.screen === 'win') this.startRun(0);
        else if (this.screen === 'paused') this.screen = 'play';
        return;
      }
      if (action.type === 'floor') {
        if (this.screen === 'title') this.startRun(action.index);
        return;
      }
      if (action.type === 'pause') {
        if (this.screen === 'play') { this.screen = 'paused'; this.audio.setAlarmSound(false); }
        else if (this.screen === 'paused') this.screen = 'play';
        return;
      }
      if (action.type === 'restart') {
        if (this.screen !== 'title') this.startLevel(this.levelIndex), (this.screen = 'play');
        return;
      }
      if (this.screen === 'play') applyToolAction(action, this);
    },

    update(dt) {
      this.time += dt;
      if (this.screen !== 'play') {
        this.audio.setAlarmSound(false);
        return;
      }
      this.levelTime += dt;
      if (this.smoke) {
        this.smoke.timer -= dt;
        if (this.smoke.timer <= 0) this.smoke = null;
      }
      updatePlayer(this.player, dt, this);
      if (this.screen !== 'play') return; // exit may have cleared the floor
      this.alarm.seenByCamera = false;
      for (const camera of this.cameras) updateCamera(camera, dt, this);
      for (const guard of this.guards) updateGuard(guard, dt, this);
      if (this.screen !== 'play') return; // a guard may have caught the thief

      // Alarm: guards in alert push it up, quiet time lets it fall.
      const anyAlert = this.guards.some((g) => g.state === 'alert');
      if (anyAlert) this.alarm.value = Math.min(ALARM_MAX, this.alarm.value + ALARM_GUARD_ALERT_RATE * dt);
      else if (!this.alarm.seenByCamera) this.alarm.value = Math.max(0, this.alarm.value - ALARM_DECAY * dt);
      if (this.alarm.value >= ALARM_MAX && this.alarm.lockdownTimer <= 0) {
        this.alarm.lockdownTimer = ALARM_LOCKDOWN_HOLD;
        this.everAlerted = true;
      }
      if (this.alarm.lockdownTimer > 0) this.alarm.lockdownTimer -= dt;
      this.audio.setAlarmSound(anyAlert || this.alarm.seenByCamera || this.alarm.lockdownTimer > 0);
    },

    render() {
      drawGame(this.ctx, this);
    },
  };

  game.input = createInput(canvas);
  game.input.onAction = (action) => game.handleAction(action);
  bindToolButtons(game);
  game.startLevel(0);
  return game;
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const game = createGame(canvas);
  window.__game = game;

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    game.audio.muted = true;
    applyShotScene(game, shot);
    game.render();
    window.__shotReady = true;
  } else {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      game.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.__shotReady = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
