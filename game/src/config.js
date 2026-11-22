// config.js — tuning numbers and palette for MIDNIGHT VAULT.
// Every number the game balances on lives here, so a tweak never means
// hunting through the other files.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const HUD_HEIGHT = 64;
export const WORLD_WIDTH = COLS * TILE; // 1280
export const WORLD_HEIGHT = ROWS * TILE; // 640
export const CANVAS_WIDTH = WORLD_WIDTH;
export const CANVAS_HEIGHT = HUD_HEIGHT + WORLD_HEIGHT; // 704

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 235;
export const PLAYER_CROUCH_SPEED = 82;
export const PLAYER_RUN_NOISE_RADIUS = 150;
export const PLAYER_WALK_NOISE_RADIUS = 55;

export const GUARD_RADIUS = 13;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_INVESTIGATE_SPEED = 105;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_LOCKDOWN_SPEED = 195;
export const GUARD_CATCH_DISTANCE = 22;
export const GUARD_VIEW_RANGE = 215;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees
export const GUARD_SUSPICION_RISE_CLOSE = 1.5; // per second, player near
export const GUARD_SUSPICION_RISE_FAR = 0.55; // per second, player far
export const GUARD_SUSPICION_FALL = 0.45; // per second while hidden
export const GUARD_SUSPICION_INVESTIGATE_AT = 0.5;
export const GUARD_SUSPICION_ALERT_AT = 1.0;
export const GUARD_HEARING_RANGE = 190;

export const CAMERA_VIEW_RANGE = 235;
export const CAMERA_VIEW_HALF_ANGLE = 0.5; // ~29 degrees
export const CAMERA_ALARM_RATE = 34; // alarm points per second while seen
export const CAMERA_SWEEP_SPEED = 0.55; // radians per second

export const ALARM_MAX = 100;
export const ALARM_DECAY = 5; // per second while unseen
export const ALARM_GUARD_ALERT_RATE = 16; // per second while any guard alerts
export const ALARM_LOCKDOWN_AT = 100;
export const ALARM_LOCKDOWN_HOLD = 6; // seconds the lockdown lasts

export const LOOT_SMALL_VALUE = 100;
export const LOOT_VAULT_VALUE = 500;
export const TOOL_SMOKE_COST = 50;
export const TOOL_EMP_COST = 75;
export const TOOL_SMOKE_COUNT = 3;
export const TOOL_EMP_COUNT = 2;
export const SMOKE_DURATION = 5;
export const SMOKE_RADIUS = 130;
export const EMP_DURATION = 7;
export const GHOST_BONUS = 300;
export const TIME_BONUS_PER_SECOND = 4;

export const PALETTE = {
  background: '#0b0e14',
  floor: '#1c2230',
  floorAlt: '#202839',
  floorSpeckle: '#2a3448',
  wall: '#3a4358',
  wallTop: '#4d5a75',
  wallEdge: '#12161f',
  shadowZone: '#16283d',
  shadowZoneEdge: '#2b6cb0',
  carpet: '#232c42',
  gold: '#f5c542',
  goldDark: '#b8860b',
  vault: '#e8b923',
  exit: '#2fbf71',
  exitGlow: '#7dffb0',
  player: '#e8e6df',
  playerCoat: '#232a3d',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  cone: 'rgba(245, 197, 66, 0.20)',
  coneSuspicious: 'rgba(245, 140, 66, 0.30)',
  coneAlert: 'rgba(230, 60, 60, 0.34)',
  cameraCone: 'rgba(120, 200, 255, 0.20)',
  cameraConeHot: 'rgba(255, 80, 80, 0.30)',
  cameraBody: '#8fa8c8',
  cameraLens: '#ff5a5a',
  hudBackground: '#10141d',
  hudText: '#e8e6df',
  hudMuted: '#8b93a7',
  alarmLow: '#2fbf71',
  alarmMid: '#f5c542',
  alarmHigh: '#e63c3c',
  titleGold: '#f5c542',
  panel: 'rgba(10, 13, 20, 0.88)',
  panelBorder: '#f5c542',
  button: '#1d2637',
  buttonHover: '#2a3852',
  smoke: 'rgba(180, 190, 205, 0.55)',
};

export const LEVEL_NAMES = [
  'LEVEL 1 — THE LOBBY',
  'LEVEL 2 — THE VAULT FLOOR',
  'LEVEL 3 — THE DIRECTOR’S SUITE',
];
