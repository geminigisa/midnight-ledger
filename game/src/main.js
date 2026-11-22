// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title, play, paused, win and lose.
//
// ?seed=N fixes the patrol phases. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LOOT, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, 0, scene.banner);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastCrackTick = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Crack the vault, grab the emerald, reach the exit.');
  }

  function endGame() {
    if (world.state.won) {
      screen = SCREEN_WIN;
      audio.win();
      const time = Math.floor(world.state.time);
      if (best === 0 || time < best) {
        best = time;
        saveBest(best);
      }
      announce(`Escaped in ${time} seconds.`);
    } else {
      screen = SCREEN_LOSE;
      audio.lose();
      announce(world.state.loseReason === 'caught' ? 'Caught by a guard.' : 'The alarm hit 100%.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, sneak: false, crack: false, target: null }, true);
      return;
    }
    const dir = input.direction();
    const stepInput = {
      mx: dir.x, my: dir.y, sneak: input.sneak, crack: input.crackHeld, target: input.moveTarget,
    };
    const hadCrack = world.state.crack;
    const events = world.step(STEP, stepInput, false);
    if (world.state.thief.atTarget) input.clearTarget();
    if (world.state.crack > hadCrack && world.state.time - lastCrackTick > 0.25) {
      lastCrackTick = world.state.time;
      audio.tick();
    }
    audio.alarmPulse(world.state.alarm, performance.now());
    if (events & EVENT_LOOT) {
      audio.pickup();
      announce('Emerald secured. Get to the exit!');
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, null);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Ledger. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
