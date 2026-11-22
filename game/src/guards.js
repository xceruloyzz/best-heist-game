// guards.js — patrol guards with vision cones, line of sight and a
// suspicion state machine: patrol -> suspicious ("?") -> alert ("!").
// A guard that loses you goes back to its route; one that touches you
// ends the run.
import {
  GUARD_PATROL_SPEED, GUARD_INVESTIGATE_SPEED, GUARD_CHASE_SPEED,
  GUARD_LOCKDOWN_SPEED, GUARD_CATCH_DISTANCE, GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE, GUARD_SUSPICION_RISE_CLOSE,
  GUARD_SUSPICION_RISE_FAR, GUARD_SUSPICION_FALL,
  GUARD_SUSPICION_INVESTIGATE_AT, GUARD_SUSPICION_ALERT_AT,
  GUARD_HEARING_RANGE, TILE,
} from './config.js';
import { hasLineOfSight, isShadowAtPixel, isWallAtPixel } from './levels.js';

export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    waypoints: def.waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
    waypointIndex: 1,
    waypointDirection: 1,
    pause: def.pause ?? 1,
    x: first[0] * TILE + TILE / 2,
    y: first[1] * TILE + TILE / 2,
    angle: 0,
    state: 'patrol', // patrol | suspicious | alert
    suspicion: 0,
    pauseTimer: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    investigateTimer: 0,
    speed: GUARD_PATROL_SPEED,
  };
}

// angleDifference returns the shortest signed angle from a to b.
export function angleDifference(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// canGuardSeePlayer checks range, cone angle, wall line of sight and the
// smoke screen; crouching in a shadow zone shrinks the effective range.
export function canGuardSeePlayer(guard, player, walls, shadow, smoke) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = GUARD_VIEW_RANGE;
  if (player.crouching && isShadowAtPixel(shadow, player.x, player.y)) range *= 0.45;
  else if (player.crouching) range *= 0.7;
  if (dist > range) return false;
  if (Math.abs(angleDifference(guard.angle, Math.atan2(dy, dx))) > GUARD_VIEW_HALF_ANGLE) return false;
  if (!hasLineOfSight(walls, guard.x, guard.y, player.x, player.y)) return false;
  if (smoke && Math.hypot(player.x - smoke.x, player.y - smoke.y) < smoke.radius) return false;
  if (smoke && Math.hypot(guard.x - smoke.x, guard.y - smoke.y) < smoke.radius) return false;
  return true;
}

// guardConePolygon raycasts the vision cone against walls so the rendered
// cone is cut off by cover instead of shining through it.
export function guardConePolygon(guard, walls) {
  const points = [{ x: guard.x, y: guard.y }];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const a = guard.angle - GUARD_VIEW_HALF_ANGLE + (2 * GUARD_VIEW_HALF_ANGLE * i) / steps;
    let reach = GUARD_VIEW_RANGE;
    for (let d = 12; d <= GUARD_VIEW_RANGE; d += 8) {
      const px = guard.x + Math.cos(a) * d;
      const py = guard.y + Math.sin(a) * d;
      if (isWallAtPixel(walls, px, py)) { reach = d; break; }
    }
    points.push({ x: guard.x + Math.cos(a) * reach, y: guard.y + Math.sin(a) * reach });
  }
  return points;
}

// moveGuardToward steps a guard toward a point, sliding along walls.
export function moveGuardToward(guard, tx, ty, speed, dt, walls) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  if (!isWallAtPixel(walls, nx, guard.y)) guard.x = nx;
  if (!isWallAtPixel(walls, guard.x, ny)) guard.y = ny;
  guard.angle = Math.atan2(dy, dx);
  return dist <= step + 1;
}

export function updateGuard(guard, dt, game) {
  const { player, walls, shadow, smoke, alarm } = game;
  const lockdown = alarm.lockdownTimer > 0;
  const seen = canGuardSeePlayer(guard, player, walls, shadow, smoke);

  if (seen) {
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const rate = dist < 110 ? GUARD_SUSPICION_RISE_CLOSE : GUARD_SUSPICION_RISE_FAR;
    const boost = player.running ? 1.5 : 1;
    guard.suspicion = Math.min(1, guard.suspicion + rate * boost * dt * (lockdown ? 1.4 : 1));
    guard.angle += angleDifference(guard.angle, Math.atan2(player.y - guard.y, player.x - guard.x)) * Math.min(1, dt * 6);
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_FALL * dt);
  }

  // Loud running is heard even out of sight.
  if (player.running && !seen) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < GUARD_HEARING_RANGE && hasLineOfSight(walls, guard.x, guard.y, player.x, player.y)) {
      guard.suspicion = Math.min(1, guard.suspicion + 0.35 * dt);
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
    }
  }

  if (guard.suspicion >= GUARD_SUSPICION_ALERT_AT) {
    if (guard.state !== 'alert') game.onGuardAlerted(guard);
    guard.state = 'alert';
  } else if (guard.suspicion >= GUARD_SUSPICION_INVESTIGATE_AT) {
    if (guard.state === 'patrol') guard.state = 'suspicious';
  } else if (guard.state !== 'alert') {
    guard.state = guard.suspicion > 0.05 ? 'suspicious' : 'patrol';
  }

  if (guard.state === 'alert') {
    const speed = lockdown ? GUARD_LOCKDOWN_SPEED : GUARD_CHASE_SPEED;
    const arrived = moveGuardToward(guard, seen ? player.x : guard.lastSeenX, seen ? player.y : guard.lastSeenY, speed, dt, walls);
    if (arrived && !seen) {
      guard.investigateTimer += dt;
      if (guard.investigateTimer > 2.5) {
        guard.state = 'suspicious';
        guard.investigateTimer = 0;
        guard.suspicion = 0.45;
      }
    } else {
      guard.investigateTimer = 0;
    }
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD_CATCH_DISTANCE) {
      game.onPlayerCaught(guard);
    }
    return;
  }

  if (guard.state === 'suspicious') {
    const arrived = moveGuardToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD_INVESTIGATE_SPEED, dt, walls);
    if (arrived) {
      guard.investigateTimer += dt;
      guard.angle += dt * 1.6; // look around the spot
      if (guard.investigateTimer > 2) {
        guard.state = 'patrol';
        guard.investigateTimer = 0;
      }
    }
    return;
  }

  // Patrol: walk the waypoint run, pausing at each end, then turn back.
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveGuardToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt, walls);
  if (arrived) {
    guard.pauseTimer = guard.pause;
    guard.waypointIndex += guard.waypointDirection;
    if (guard.waypointIndex >= guard.waypoints.length) {
      guard.waypointIndex = guard.waypoints.length - 2;
      guard.waypointDirection = -1;
    } else if (guard.waypointIndex < 0) {
      guard.waypointIndex = 1;
      guard.waypointDirection = 1;
    }
  }
}
