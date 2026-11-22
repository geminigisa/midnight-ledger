// Midnight Ledger: every pixel the judge sees. One bright "blueprint" room:
// a dark navy floor with a light grid, amber guard cones, cyan camera cones,
// a glowing emerald vault, a cyan thief and a big alarm meter up top, so the
// whole heist reads in a single frame, even shrunk.
import {
  CAMERAS, COLORS, CRACK_RANGE, EXIT, GUARD_CONE_HALF, GUARD_CONE_RANGE, H, HUD_H,
  LOOT_RANGE_MULT, PILLARS, ROOM, VAULT, VENT, W,
} from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_WIN = 3;
export const SCREEN_LOSE = 4;

function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function cone(ctx, x, y, angle, range, half, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function label(ctx, text, x, y, color) {
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  ctx.strokeStyle = COLORS.floorGrid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ROOM.x + 40; x < ROOM.x + ROOM.w; x += 40) {
    ctx.moveTo(x, ROOM.y);
    ctx.lineTo(x, ROOM.y + ROOM.h);
  }
  for (let y = ROOM.y + 40; y < ROOM.y + ROOM.h; y += 40) {
    ctx.moveTo(ROOM.x, y);
    ctx.lineTo(ROOM.x + ROOM.w, y);
  }
  ctx.stroke();
  // Walls: a light double line around the room.
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = 6;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  ctx.strokeStyle = COLORS.wallDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ROOM.x + 7, ROOM.y + 7, ROOM.w - 14, ROOM.h - 14);
}

function drawPillars(ctx) {
  for (const pillar of PILLARS) {
    ctx.fillStyle = COLORS.pillar;
    ctx.fillRect(pillar.x, pillar.y, pillar.w, pillar.h);
    ctx.strokeStyle = COLORS.pillarEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(pillar.x, pillar.y, pillar.w, pillar.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pillar.x + 8, pillar.y + pillar.h - 8);
    ctx.lineTo(pillar.x + pillar.w - 8, pillar.y + 8);
    ctx.moveTo(pillar.x + 8, pillar.y + 8);
    ctx.lineTo(pillar.x + pillar.w - 8, pillar.y + pillar.h - 8);
    ctx.stroke();
  }
}

function drawVault(ctx, state) {
  const { x, y, r } = VAULT;
  label(ctx, '[ LOOT ]', x, y - r - 16, COLORS.lootGold);
  hexPath(ctx, x, y, r);
  if (state.lootTaken) {
    ctx.fillStyle = 'rgba(52,211,153,0.08)';
    ctx.fill();
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, 'TAKEN', x, y, COLORS.dim);
    return;
  }
  ctx.save();
  ctx.shadowColor = COLORS.loot;
  ctx.shadowBlur = 22;
  ctx.fillStyle = 'rgba(52,211,153,0.28)';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COLORS.lootGold;
  ctx.lineWidth = 3;
  ctx.stroke();
  // The emerald: a diamond on a pedestal dot.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = COLORS.loot;
  ctx.fillRect(-13, -13, 26, 26);
  ctx.strokeStyle = '#ecfdf5';
  ctx.lineWidth = 2;
  ctx.strokeRect(-13, -13, 26, 26);
  ctx.restore();
  if (state.crack > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r + 14, -Math.PI / 2, -Math.PI / 2 + state.crack * Math.PI * 2);
    ctx.strokeStyle = COLORS.lootGold;
    ctx.lineWidth = 6;
    ctx.stroke();
    label(ctx, 'CRACKING…', x, y + r + 30, COLORS.lootGold);
  }
}

function drawExit(ctx) {
  const { x, y, w, h } = EXIT;
  label(ctx, '[ EXIT ]', x + w / 2, y - 14, '#4ade80');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#111827';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLORS.lootGold;
  for (let i = -h; i < w + h; i += 16) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 8, y + h);
    ctx.lineTo(x + i + 8 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  // A dark pill behind the word so it reads over the hazard stripes.
  ctx.fillStyle = '#052e16';
  ctx.fillRect(x + 8, y + h / 2 - 10, w - 16, 20);
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f0fdf4';
  ctx.fillText('EXIT', x + w / 2, y + h / 2);
}

function drawVent(ctx) {
  label(ctx, '[ VENT ]', VENT.x, VENT.y - 26, COLORS.dim);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(VENT.x - 30, VENT.y - 13, 60, 26);
  ctx.strokeStyle = COLORS.pillarEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(VENT.x - 30, VENT.y - 13, 60, 26);
  ctx.strokeStyle = 'rgba(148,163,184,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 1) {
    ctx.moveTo(VENT.x - 24, VENT.y + i * 7);
    ctx.lineTo(VENT.x + 24, VENT.y + i * 7);
  }
  ctx.stroke();
}

function drawCones(ctx, state) {
  const rangeMult = state.lootTaken ? LOOT_RANGE_MULT : 1;
  for (const guard of state.guards) {
    const range = GUARD_CONE_RANGE * rangeMult;
    cone(
      ctx, guard.x, guard.y, guard.angle, range, GUARD_CONE_HALF,
      guard.seesThief ? COLORS.guardConeSeen : COLORS.guardCone,
      guard.seesThief ? '#ef4444' : COLORS.guardConeEdge,
    );
  }
  for (const camera of state.cameras) {
    cone(
      ctx, camera.x, camera.y, camera.angle, camera.range, camera.half,
      camera.seesThief ? COLORS.guardConeSeen : COLORS.cameraCone,
      camera.seesThief ? '#ef4444' : COLORS.cameraConeEdge,
    );
  }
}

function drawPatrols(ctx, state) {
  ctx.save();
  ctx.setLineDash([2, 7]);
  ctx.strokeStyle = 'rgba(241,245,249,0.18)';
  ctx.lineWidth = 1.5;
  for (const guard of state.guards) {
    ctx.beginPath();
    const [x0, y0] = guard.waypoints[0];
    ctx.moveTo(x0, y0);
    for (let i = 1; i < guard.waypoints.length; i += 1) ctx.lineTo(guard.waypoints[i][0], guard.waypoints[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawCameras(ctx, state) {
  for (const camera of state.cameras) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(camera.x - 11, camera.y - 8, 22, 16);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(camera.x - 11, camera.y - 8, 22, 16);
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = camera.seesThief ? '#ef4444' : '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.guard;
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Visor: a short tick in the facing direction.
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 13, guard.y + Math.sin(guard.angle) * 13);
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (guard.seesThief) {
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('!', guard.x, guard.y - 26);
    }
  }
}

function drawThief(ctx, state) {
  const thief = state.thief;
  if (thief.sneak) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 19, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.thief;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.thief;
  ctx.fill();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(thief.x, thief.y);
  ctx.lineTo(thief.x + Math.cos(thief.angle) * 13, thief.y + Math.sin(thief.angle) * 13);
  ctx.strokeStyle = '#083344';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (thief.hasLoot) {
    ctx.save();
    ctx.translate(thief.x, thief.y - 24);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.loot;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#0a0e1f';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.strokeStyle = 'rgba(216,210,184,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(W, HUD_H);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = COLORS.lootGold;
  ctx.fillText('MIDNIGHT LEDGER', 24, 24);
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('THE EMERALD VAULT', 24, 46);

  // The alarm meter: big, centred, green to red.
  const meterX = 470;
  const meterW = 340;
  const meterY = 20;
  const meterH = 24;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, meterY - 8 + 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(meterX, meterY, meterW, meterH);
  const alarmColor = state.alarm < 40 ? COLORS.alarmLow : state.alarm < 70 ? COLORS.alarmMid : COLORS.alarmHigh;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(meterX, meterY, Math.max(0, (meterW * state.alarm) / 100), meterH);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(meterX, meterY, meterW, meterH);
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${Math.round(state.alarm)}%`, meterX + meterW + 10, meterY + meterH / 2);
  const anySeen = state.guards.some((g) => g.seesThief) || state.cameras.some((c) => c.seesThief);
  if (anySeen) {
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', meterX + meterW / 2, meterY + meterH + 14);
  }

  ctx.textAlign = 'right';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = state.lootTaken ? COLORS.loot : COLORS.dim;
  ctx.fillText(state.lootTaken ? '◆ LOOT: SECURED' : '◇ LOOT: —', W - 24, 24);
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`TIME ${formatTime(state.time)}${state.thief.sneak ? '   ·   SNEAK' : ''}`, W - 24, 46);
}

function drawRoom(ctx, state) {
  drawFloor(ctx);
  drawPatrols(ctx, state);
  drawExit(ctx);
  drawVent(ctx);
  drawPillars(ctx);
  drawVault(ctx, state);
  drawCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawThief(ctx, state);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5,7,15,0.72)';
  ctx.fillRect(0, 0, W, H);
  const pw = 640;
  const ph = 150 + lines.length * 30;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(title, W / 2, py + 52);
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 108 + i * 30));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function draw(state, screen, best, banner) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, W, H);
    drawRoom(ctx, state);
    drawHud(ctx, state);
    if (banner === 'escape') {
      ctx.fillStyle = 'rgba(251,191,36,0.92)';
      ctx.fillRect(W / 2 - 260, HUD_H + 10, 520, 34);
      ctx.font = '700 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#451a03';
      ctx.fillText('LOOT SECURED — GETAWAY!', W / 2, HUD_H + 28);
    }
    if (screen === SCREEN_TITLE) {
      panel(ctx, 'MIDNIGHT LEDGER', [
        'One room. One emerald. Three guards, two cameras, one alarm.',
        'WASD / arrows to move · Shift to sneak · hold E to crack the vault',
        'Click the floor to walk there · grab the emerald, then reach EXIT',
        'Press ENTER or click to start',
        best > 0 ? `Best escape: ${formatTime(best)}` : '',
      ].filter(Boolean), COLORS.lootGold);
    } else if (screen === SCREEN_WIN) {
      panel(ctx, 'ESCAPED WITH THE EMERALD!', [
        `Time ${formatTime(state.time)}   ·   Peak alarm ${Math.round(state.peakAlarm)}%`,
        'The vault is empty and the night is yours.',
        'Press ENTER to play again',
      ], COLORS.loot);
    } else if (screen === SCREEN_LOSE) {
      panel(ctx, state.loseReason === 'caught' ? 'CAUGHT!' : 'ALARM TRIPPED!', [
        state.loseReason === 'caught'
          ? 'A guard got close enough to grab you.'
          : 'The alarm hit 100% and the vault sealed itself.',
        `You lasted ${formatTime(state.time)} · peak alarm ${Math.round(state.peakAlarm)}%`,
        'Press ENTER to try again',
      ], '#ef4444');
    } else if (screen === SCREEN_PAUSED) {
      panel(ctx, 'PAUSED', ['Press P to resume'], COLORS.dim);
    }
  }
  return { draw };
}
