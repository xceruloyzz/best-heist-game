// cameras.js — wall-mounted CCTV cameras that sweep a cone back and forth.
// A camera that sees the thief drives the alarm meter up fast and flashes
// red; an EMP burst shuts every camera down for a few seconds.
import {
  CAMERA_VIEW_RANGE, CAMERA_VIEW_HALF_ANGLE, CAMERA_ALARM_RATE,
  CAMERA_SWEEP_SPEED, TILE,
} from './config.js';
import { hasLineOfSight, isWallAtPixel } from './levels.js';
import { angleDifference } from './guards.js';

export function createCamera(def) {
  return {
    x: def.tile[0] * TILE + TILE / 2,
    y: def.tile[1] * TILE + TILE / 2,
    baseAngle: def.angle,
    sweep: def.sweep,
    angle: def.angle,
    phase: def.tile[0] * 0.7 + def.tile[1] * 1.3,
    disabledTimer: 0,
    spotting: false,
  };
}

// cameraConePolygon raycasts the camera cone so walls cut it off, like the
// guards' cones.
export function cameraConePolygon(camera, walls) {
  const points = [{ x: camera.x, y: camera.y }];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = camera.angle - CAMERA_VIEW_HALF_ANGLE + (2 * CAMERA_VIEW_HALF_ANGLE * i) / steps;
    let reach = CAMERA_VIEW_RANGE;
    for (let d = 12; d <= CAMERA_VIEW_RANGE; d += 8) {
      const px = camera.x + Math.cos(a) * d;
      const py = camera.y + Math.sin(a) * d;
      if (isWallAtPixel(walls, px, py)) { reach = d; break; }
    }
    points.push({ x: camera.x + Math.cos(a) * reach, y: camera.y + Math.sin(a) * reach });
  }
  return points;
}

// canCameraSeePlayer mirrors the guard check for a sweeping CCTV cone.
export function canCameraSeePlayer(camera, player, walls, smoke) {
  if (camera.disabledTimer > 0) return false;
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_VIEW_RANGE) return false;
  if (Math.abs(angleDifference(camera.angle, Math.atan2(dy, dx))) > CAMERA_VIEW_HALF_ANGLE) return false;
  if (!hasLineOfSight(walls, camera.x, camera.y, player.x, player.y)) return false;
  if (smoke && Math.hypot(player.x - smoke.x, player.y - smoke.y) < smoke.radius) return false;
  return true;
}

export function updateCamera(camera, dt, game) {
  if (camera.disabledTimer > 0) camera.disabledTimer -= dt;
  camera.angle = camera.baseAngle + Math.sin(game.time * CAMERA_SWEEP_SPEED + camera.phase) * camera.sweep;
  camera.spotting = canCameraSeePlayer(camera, game.player, game.walls, game.smoke);
  if (camera.spotting) {
    game.alarm.value = Math.min(100, game.alarm.value + CAMERA_ALARM_RATE * dt);
    game.alarm.seenByCamera = true;
  }
}
