// Keyboard and mouse, read fresh every frame. WASD or arrows move, Shift
// sneaks, E (held) cracks the vault, Enter/Space/click confirms, P pauses.
// A mouse click on the floor sets a walk target the thief steers toward.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const KEY_DIRS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let target = null;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code in KEY_DIRS || event.code === 'ShiftLeft' || event.code === 'ShiftRight'
      || event.code === 'KeyE' || event.code === 'Enter' || event.code === 'Space'
      || event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
    }
    if (!event.repeat) {
      if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
      if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    }
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    target = canvasPoint(event);
  });

  return {
    // Normalized keyboard direction, or {x:0,y:0} when no key is held.
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = KEY_DIRS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    get sneak() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    get crackHeld() {
      return keys.has('KeyE');
    },
    // The click target, consumed once the thief arrives or a key is pressed.
    get moveTarget() {
      return target;
    },
    clearTarget() {
      target = null;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
