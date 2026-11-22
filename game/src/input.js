// input.js — keyboard state and mouse: click-to-move, on-screen buttons,
// and the one-shot action keys (smoke, EMP, pause, restart, mute).
import { HUD_HEIGHT } from './config.js';
import { throwSmokeBomb, fireEmpBurst } from './player.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    canvas,
    onAction: null, // set by main.js: (action) => void
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    const action = keyToAction(event.code);
    if (action && input.onAction) input.onAction(action);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY - HUD_HEIGHT;
    if (input.onAction) input.onAction({ type: 'clickMove', x, y });
  });

  return input;
}

function keyToAction(code) {
  switch (code) {
    case 'Enter': return { type: 'confirm' };
    case 'KeyP': case 'Escape': return { type: 'pause' };
    case 'KeyR': return { type: 'restart' };
    case 'KeyM': return { type: 'mute' };
    case 'KeyQ': return { type: 'smoke' };
    case 'KeyF': return { type: 'emp' };
    case 'Digit1': return { type: 'floor', index: 0 };
    case 'Digit2': return { type: 'floor', index: 1 };
    case 'Digit3': return { type: 'floor', index: 2 };
    default: return null;
  }
}

// bindToolButtons wires the on-screen buttons to the same actions.
export function bindToolButtons(game) {
  const bind = (id, action) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => game.handleAction(action));
  };
  bind('btn-start', { type: 'confirm' });
  bind('btn-pause', { type: 'pause' });
  bind('btn-restart', { type: 'restart' });
  bind('btn-mute', { type: 'mute' });
  bind('btn-smoke', { type: 'smoke' });
  bind('btn-emp', { type: 'emp' });
}

// applyToolAction runs the instant actions (smoke / EMP) against the game.
export function applyToolAction(action, game) {
  if (action.type === 'smoke') throwSmokeBomb(game.player, game);
  if (action.type === 'emp') fireEmpBurst(game.player, game);
}
