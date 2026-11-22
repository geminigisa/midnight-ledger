// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world with a simple autopilot (walk the waypoints,
// freeze and sneak when a cone is watching, hold E at the vault, then run for
// the exit), so the frame is what a real game looks like and the same seed
// always gives the same frame. The play and end scenes then set their
// presentation values (alarm, crack progress) so the frame shows the moment
// the brief asks for: the crack in progress, and the getaway at the door.
import { CRACK_RANGE, STEP, VAULT } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;
const VAULT_ROUTE = [[700, 520], [1000, 300], [1010, 240]];
const EXIT_ROUTE = [[500, 300], [220, 200], [76, 160]];

function autopilot(state, route) {
  const thief = state.thief;
  const seen = state.guards.some((g) => g.seesThief) || state.cameras.some((c) => c.seesThief);
  if (seen) return { mx: 0, my: 0, sneak: true, crack: false, target: null };
  const vaultDist = Math.hypot(thief.x - VAULT.x, thief.y - VAULT.y);
  if (!state.lootTaken && vaultDist < CRACK_RANGE) {
    return { mx: 0, my: 0, sneak: false, crack: true, target: null };
  }
  if (route.length === 0) {
    // No more waypoints: walk straight at the goal (the vault, or the exit
    // once the loot is taken) instead of crashing on an empty route.
    const goal = state.lootTaken ? { x: 76, y: 160 } : VAULT;
    const dx = goal.x - thief.x;
    const dy = goal.y - thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return { mx: 0, my: 0, sneak: false, crack: false, target: null };
    return { mx: dx / dist, my: dy / dist, sneak: false, crack: false, target: null };
  }
  const [tx, ty] = route[0];
  const dx = tx - thief.x;
  const dy = ty - thief.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 24) {
    route.shift();
    return { mx: 0, my: 0, sneak: false, crack: false, target: null };
  }
  return { mx: dx / dist, my: dy / dist, sneak: false, crack: false, target: null };
}

function simulate(world, seconds) {
  // One persistent route: the vault waypoints until the loot is taken, then
  // the exit waypoints. The autopilot advances it with route.shift().
  let route = [...VAULT_ROUTE];
  let onExit = false;
  for (let t = 0; t < seconds; t += SAMPLE) {
    if (world.state.lootTaken && !onExit) {
      route = [...EXIT_ROUTE];
      onExit = true;
    }
    const events = world.step(SAMPLE, autopilot(world.state, route), false);
    if (events & EVENT_OVER) break;
  }
}

/**
 * Set `world` to the named scene and return the screen and banner to draw.
 * start: the thief at the vent, guards mid-patrol, alarm 0.
 * play: the thief at the vault, cracking it, alarm ~60, cones sweeping.
 * end: the thief at the exit with the emerald, alarm high, getaway banner.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    simulate(world, 7);
    const state = world.state;
    const vaultDist = Math.hypot(state.thief.x - VAULT.x, state.thief.y - VAULT.y);
    if (vaultDist > 200) {
      // The autopilot never reached the vault (a cone pinned it down): put the
      // thief on the open floor beside the vault so the frame still shows the
      // crack in progress, exactly as a player standing there would.
      state.thief.x = 1000;
      state.thief.y = 250;
      state.thief.angle = Math.atan2(VAULT.y - 250, VAULT.x - 1000);
    }
    if (!state.lootTaken) state.crack = 0.6;
    state.alarm = 58;
    state.peakAlarm = 58;
    return { screen: SCREEN_PLAY, banner: null };
  }
  if (name === 'end') {
    simulate(world, 60);
    const state = world.state;
    state.lootTaken = true;
    state.thief.hasLoot = true;
    state.crack = 1;
    state.thief.x = 76;
    state.thief.y = 160;
    state.thief.angle = 0;
    state.alarm = 85;
    state.peakAlarm = 85;
    return { screen: SCREEN_PLAY, banner: 'escape' };
  }
  // start (and anything else): four seconds of patrol, thief still at the vent.
  for (let t = 0; t < 4; t += SAMPLE) {
    world.step(SAMPLE, { mx: 0, my: 0, sneak: false, crack: false, target: null }, false);
  }
  return { screen: SCREEN_PLAY, banner: null };
}
