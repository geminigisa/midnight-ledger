// Midnight Ledger: every fixed number of the heist lives here, so the world,
// the renderer and the screenshot stager all agree on the same room.
export const W = 1280;
export const H = 720;
export const HUD_H = 64;
export const STEP = 1 / 60;
export const BEST_KEY = 'midnight-ledger-best';

// The single room: one vault, one exit, one vent, five pillars of cover.
export const ROOM = { x: 24, y: HUD_H + 12, w: 1232, h: 620 };
export const VAULT = { x: 1075, y: 165, r: 44 };
export const CRACK_RANGE = 82;
export const CRACK_SECONDS = 2.0;
export const EXIT = { x: 44, y: 132, w: 64, h: 56 };
export const VENT = { x: 330, y: 645 };

export const PILLARS = [
  { x: 430, y: 230, w: 74, h: 74 },
  { x: 700, y: 170, w: 74, h: 74 },
  { x: 900, y: 420, w: 74, h: 74 },
  { x: 560, y: 470, w: 74, h: 74 },
  { x: 1020, y: 330, w: 64, h: 96 },
];

// Three guards on patrol loops (waypoints, in order, ping-pong).
export const GUARDS = [
  { waypoints: [[300, 340], [900, 340]], speed: 55 },
  { waypoints: [[990, 240], [990, 560]], speed: 55 },
  { waypoints: [[860, 240], [1140, 240], [1140, 300], [860, 300]], speed: 55 },
];

// Two wall cameras: mount, base angle (radians, 0 = east), sweep, period.
export const CAMERAS = [
  { x: 620, y: 84, base: Math.PI / 2, sweep: 0.96, period: 6.0, range: 210, half: 0.49 },
  { x: 1248, y: 420, base: Math.PI, sweep: 0.87, period: 7.0, range: 210, half: 0.49 },
];

export const GUARD_CONE_RANGE = 185;
export const GUARD_CONE_HALF = 0.576; // ~33 degrees
export const GUARD_ALERT_SPEED = 82;
export const LOOT_SPEED_MULT = 1.25;
export const LOOT_RANGE_MULT = 1.15;
export const CATCH_RADIUS = 26;

export const THIEF_WALK = 135;
export const THIEF_SNEAK = 72;
export const THIEF_RADIUS = 13;

// Alarm: percent per second while seen, scaled by closeness; decay while hidden.
export const ALARM_GUARD = 26;
export const ALARM_CAMERA = 20;
export const ALARM_DECAY = 6;
export const ALARM_DECAY_LOOT = 3;
export const SNEAK_DETECT_MULT = 0.5;

// Blueprint-bright palette: a dark floor, light walls, glowing cones.
export const COLORS = {
  page: '#05070f',
  floor: '#101736',
  floorGrid: 'rgba(148,163,184,0.08)',
  wall: '#d8d2b8',
  wallDark: '#8a8468',
  pillar: '#1e293b',
  pillarEdge: '#94a3b8',
  guardCone: 'rgba(255,176,32,0.30)',
  guardConeEdge: 'rgba(255,196,66,0.85)',
  guardConeSeen: 'rgba(239,68,68,0.42)',
  cameraCone: 'rgba(56,189,248,0.30)',
  cameraConeEdge: 'rgba(125,211,252,0.85)',
  loot: '#34d399',
  lootGold: '#fbbf24',
  thief: '#22d3ee',
  guard: '#f97316',
  text: '#f1f5f9',
  dim: '#94a3b8',
  alarmLow: '#22c55e',
  alarmMid: '#f59e0b',
  alarmHigh: '#ef4444',
};
