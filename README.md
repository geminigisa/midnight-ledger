# Midnight Ledger — The Emerald Vault

[![bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/geminigisa/midnight-ledger/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/geminigisa/midnight-ledger/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A complete heist game for the [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559) bounty. One room, one emerald: sneak past three patrolling guards and two sweeping cameras, crack the glass vault, then reach the EXIT before the alarm hits 100%.

## How to play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit http://localhost:8080). No network, no build step.

- **WASD / arrow keys** — move the thief (cyan)
- **Shift** — sneak: slower, half as easy to spot
- **Hold E** — crack the vault (2 seconds, progress ring)
- **Click the floor** — walk there
- **Enter / Space / click** — start, restart
- **P** — pause

Carrying the emerald makes the guards faster and their cones wider, and the alarm drains slower. Win by reaching the EXIT with the emerald. Lose if the alarm hits 100% or a guard catches you.

## Screenshots

Deterministic, rendered from the game's own code: `?shot=start|play|end&seed=1`.

- `1-start.png` — the thief at the vent, guards mid-patrol, alarm 0%
- `2-play.png` — cracking the vault, alarm 58%, cones closing in
- `3-end.png` — the getaway at the exit, alarm 85%

## Structure

- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `game/index.html` — the page: one 1280×720 canvas
- `game/src/config.js` — every fixed number: the room, patrols, cones, speeds
- `game/src/world.js` — the rules: movement, collision, patrols, vision, alarm, crack, win/lose
- `game/src/render.js` — all drawing: the blueprint-bright room, cones, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sounds, no audio files
- `game/src/shots.js` — the three staged screenshot scenes
- `game/src/main.js` — boot and the fixed-step loop
- `game/src/random.js` — the seeded generator behind `?seed=N`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
