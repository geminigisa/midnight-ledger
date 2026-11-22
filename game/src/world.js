// Midnight Ledger: the room's state and its rules. One room, three patrolling
// guards, two sweeping cameras, one vault to crack and one exit to reach.
// Detection fills the alarm; hiding drains it; carrying the loot makes the
// room angrier. Pure logic, no drawing, no sound.
import {
  ALARM_CAMERA, ALARM_DECAY, ALARM_DECAY_LOOT, ALARM_GUARD, CAMERAS, CATCH_RADIUS,
  CRACK_RANGE, CRACK_SECONDS, EXIT, GUARDS, GUARD_ALERT_SPEED, GUARD_CONE_HALF,
  GUARD_CONE_RANGE, LOOT_RANGE_MULT, LOOT_SPEED_MULT, PILLARS, ROOM, SNEAK_DETECT_MULT,
  THIEF_RADIUS, THIEF_SNEAK, THIEF_WALK, VAULT, VENT,
} from './config.js';

export const EVENT_OVER = 1;
export const EVENT_LOOT = 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Liang-Barsky: does the segment (x1,y1)-(x2,y2) cross the rectangle?
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x, rect.x + rect.w - x1, y1 - rect.y, rect.y + rect.h - y1];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

function losClear(x1, y1, x2, y2) {
  for (const pillar of PILLARS) {
    if (segmentHitsRect(x1, y1, x2, y2, pillar)) return false;
  }
  return true;
}

function circleHitsPillar(x, y, radius) {
  for (const pillar of PILLARS) {
    const cx = clamp(x, pillar.x, pillar.x + pillar.w);
    const cy = clamp(y, pillar.y, pillar.y + pillar.h);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
  }
  return false;
}

export function createWorld(random) {
  const state = {
    time: 0,
    alarm: 0,
    peakAlarm: 0,
    lootTaken: false,
    crack: 0,
    won: false,
    lost: false,
    loseReason: '',
    thief: { x: VENT.x, y: VENT.y, angle: -Math.PI / 2, sneak: false, hasLoot: false, atTarget: false },
    guards: [],
    cameras: [],
  };

  function reset() {
    state.time = 0;
    state.alarm = 0;
    state.peakAlarm = 0;
    state.lootTaken = false;
    state.crack = 0;
    state.won = false;
    state.lost = false;
    state.loseReason = '';
    state.thief.x = VENT.x;
    state.thief.y = VENT.y;
    state.thief.angle = -Math.PI / 2;
    state.thief.sneak = false;
    state.thief.hasLoot = false;
    state.thief.atTarget = false;
    state.guards = GUARDS.map((def, index) => {
      const [x, y] = def.waypoints[0];
      return {
        x, y, angle: 0, wpIndex: 1, wpDir: 1, speed: def.speed,
        waypoints: def.waypoints, seesThief: false, phase: random.range(0, 1),
      };
    });
    // Stagger the guards along their routes so they never start in step.
    for (const guard of state.guards) {
      guard.x += guard.phase * 40 - 20;
    }
    state.cameras = CAMERAS.map((def) => ({
      x: def.x, y: def.y, base: def.base, sweep: def.sweep, period: def.period,
      range: def.range, half: def.half, angle: def.base, seesThief: false,
      phase: random.range(0, Math.PI * 2),
    }));
  }

  function moveThief(dt, input) {
    const thief = state.thief;
    let mx = input.mx;
    let my = input.my;
    thief.atTarget = false;
    if (mx === 0 && my === 0 && input.target) {
      const dx = input.target.x - thief.x;
      const dy = input.target.y - thief.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        thief.atTarget = true;
      } else {
        mx = dx / dist;
        my = dy / dist;
      }
    }
    const speed = input.sneak ? THIEF_SNEAK : THIEF_WALK;
    thief.sneak = input.sneak;
    const nx = thief.x + mx * speed * dt;
    const ny = thief.y + my * speed * dt;
    const minX = ROOM.x + THIEF_RADIUS;
    const maxX = ROOM.x + ROOM.w - THIEF_RADIUS;
    const minY = ROOM.y + THIEF_RADIUS;
    const maxY = ROOM.y + ROOM.h - THIEF_RADIUS;
    const tryX = clamp(nx, minX, maxX);
    if (!circleHitsPillar(tryX, thief.y, THIEF_RADIUS)) thief.x = tryX;
    const tryY = clamp(ny, minY, maxY);
    if (!circleHitsPillar(thief.x, tryY, THIEF_RADIUS)) thief.y = tryY;
    if (mx !== 0 || my !== 0) thief.angle = Math.atan2(my, mx);
  }

  function moveGuards(dt) {
    const lootMult = state.lootTaken ? LOOT_SPEED_MULT : 1;
    for (const guard of state.guards) {
      guard.seesThief = false;
      const alerted = state.alarm > 50 || state.lootTaken;
      const speed = (alerted ? GUARD_ALERT_SPEED : guard.speed) * lootMult;
      if (guard.sees) {
        // Chase the thief while seen.
        const dx = state.thief.x - guard.x;
        const dy = state.thief.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          guard.x += (dx / dist) * speed * dt;
          guard.y += (dy / dist) * speed * dt;
          guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, dt * 10);
        }
        continue;
      }
      const [tx, ty] = guard.waypoints[guard.wpIndex];
      const dx = tx - guard.x;
      const dy = ty - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        guard.wpIndex += guard.wpDir;
        if (guard.wpIndex >= guard.waypoints.length || guard.wpIndex < 0) {
          guard.wpDir *= -1;
          guard.wpIndex += guard.wpDir * 2;
        }
        continue;
      }
      guard.x += (dx / dist) * speed * dt;
      guard.y += (dy / dist) * speed * dt;
      guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, dt * 10);
    }
  }

  function moveCameras() {
    for (const camera of state.cameras) {
      camera.angle = camera.base + camera.sweep * Math.sin((state.time * Math.PI * 2) / camera.period + camera.phase);
      camera.seesThief = false;
    }
  }

  // True when the eye sees the thief: inside the cone and no pillar in between.
  function sees(eyeX, eyeY, angle, range, half) {
    const dx = state.thief.x - eyeX;
    const dy = state.thief.y - eyeY;
    const dist = Math.hypot(dx, dy);
    if (dist > range || dist < 1) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > half) return 0;
    if (!losClear(eyeX, eyeY, state.thief.x, state.thief.y)) return 0;
    return clamp(1.4 - dist / range, 0.6, 1.4);
  }

  function detect(dt) {
    const thief = state.thief;
    const sneakMult = thief.sneak ? SNEAK_DETECT_MULT : 1;
    const rangeMult = state.lootTaken ? LOOT_RANGE_MULT : 1;
    let seen = false;
    for (const guard of state.guards) {
      const strength = sees(guard.x, guard.y, guard.angle, GUARD_CONE_RANGE * rangeMult, GUARD_CONE_HALF);
      if (strength > 0) {
        guard.seesThief = true;
        guard.sees = true;
        state.alarm += ALARM_GUARD * strength * sneakMult * dt;
        seen = true;
      } else {
        guard.sees = false;
      }
    }
    for (const camera of state.cameras) {
      const strength = sees(camera.x, camera.y, camera.angle, camera.range, camera.half);
      if (strength > 0) {
        camera.seesThief = true;
        state.alarm += ALARM_CAMERA * strength * sneakMult * dt;
        seen = true;
      }
    }
    if (!seen) {
      state.alarm -= (state.lootTaken ? ALARM_DECAY_LOOT : ALARM_DECAY) * dt;
    }
    state.alarm = clamp(state.alarm, 0, 100);
    if (state.alarm > state.peakAlarm) state.peakAlarm = state.alarm;
  }

  function crackVault(dt, input) {
    if (state.lootTaken) return;
    const dx = state.thief.x - VAULT.x;
    const dy = state.thief.y - VAULT.y;
    if (Math.hypot(dx, dy) < CRACK_RANGE && input.crack) {
      state.crack += dt / CRACK_SECONDS;
      if (state.crack >= 1) {
        state.crack = 1;
        state.lootTaken = true;
        state.thief.hasLoot = true;
      }
    } else {
      state.crack = Math.max(0, state.crack - dt * 2);
    }
  }

  function checkEnd() {
    const thief = state.thief;
    if (state.lootTaken && thief.x > EXIT.x && thief.x < EXIT.x + EXIT.w
      && thief.y > EXIT.y && thief.y < EXIT.y + EXIT.h) {
      state.won = true;
      return EVENT_OVER;
    }
    if (state.alarm >= 100) {
      state.lost = true;
      state.loseReason = 'alarm';
      return EVENT_OVER;
    }
    for (const guard of state.guards) {
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      if (Math.hypot(dx, dy) < CATCH_RADIUS) {
        state.lost = true;
        state.loseReason = 'caught';
        return EVENT_OVER;
      }
    }
    return 0;
  }

  // Advance the world one fixed step. `demo` moves the patrols but freezes the
  // thief, the alarm and the vault, for the title screen's attract mode.
  function step(dt, input, demo) {
    if (state.won || state.lost) return 0;
    state.time += dt;
    moveCameras();
    moveGuards(dt);
    if (demo) return 0;
    moveThief(dt, input);
    detect(dt);
    const hadLoot = state.lootTaken;
    crackVault(dt, input);
    let events = checkEnd();
    if (state.lootTaken && !hadLoot) events |= EVENT_LOOT;
    return events;
  }

  reset();
  return { state, reset, step };
}
