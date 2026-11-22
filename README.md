# MIDNIGHT VAULT — The Aurum Job

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/xceruloyzz/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/xceruloyzz/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down heist game in vanilla JavaScript + Canvas 2D — no libraries, no
network, every asset drawn and synthesized from code. You are the thief
hitting the Aurum Bank after midnight. Lift every loot on a floor, crack
the vault for the big score, then slip out the green exit without the
guards or the cameras ever raising the alarm.

## The game

- **Three floors, rising difficulty** — The Lobby, The Vault Floor, The
  Director's Suite: more guards, more cameras, tighter patrols, more loot.
- **Guards with real vision cones** — yellow cones of light, fixed patrol
  routes with pauses at each turn, line of sight blocked by walls. Learn a
  route, then move in the gaps.
- **CCTV cameras that sweep** — blue cones sweeping back and forth. A
  camera that sees you drives the alarm meter up fast and flashes red.
- **An alarm meter that matters** — it rises while you are seen, falls
  while you hide. Fill it and the bank goes into LOCKDOWN: guards run
  faster and spot you sooner.
- **A fair detection system** — every guard carries a suspicion ring that
  fills while you are in the cone and drains while you hide. Calm (patrol)
  → suspicious "?" (comes to look) → alert "!" (chases). Lose them and they
  go back to their route. Getting caught restarts the floor, not the job.
- **Tools at a cost** — smoke bombs (Q) blind guards and cameras for 5
  seconds; an EMP burst (F) shuts every camera down for 7 seconds. Both
  cost score and are limited per floor, so spend them where they count.
- **Stance matters** — run with Shift and you are fast but loud (guards
  hear you); crouch with C and you are slow, silent, and much harder to
  spot inside the dark blue shadow zones.
- **Sound, all synthesized** — footsteps, loot chimes, vault fanfare,
  alert stings, alarm wail and a low night drone, made with WebAudio.
  M mutes.
- **Scoring** — loot, vault, a time bonus, and a Ghost bonus for a floor
  cleared without ever raising an alert. Best score is kept in localStorage.
- **Deterministic** — seeded decoration and fixed patrols, so every replay
  of a floor plays the same.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No build step, no network request.

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Click | Walk there |
| Shift | Run — fast, but loud |
| C | Crouch — slow, silent, harder to see |
| Q | Smoke bomb (blinds guards + cameras, 5 s) |
| F | EMP burst (cameras off, 7 s) |
| P / Esc | Pause |
| R | Restart the floor |
| M | Mute |
| Enter | Start / continue |
| 1 / 2 / 3 | Jump to a floor from the title screen |

Click the on-screen buttons with the mouse for the same actions.

## Layout

- `game/` — the playable game (static files): `index.html`, `style.css`, `src/`
  - `config.js` — tuning numbers and palette
  - `random.js` — seeded RNG for deterministic decoration
  - `levels.js` — the three floors, maps, patrol routes and camera mounts
  - `guards.js` — vision cones, line of sight, suspicion state machine
  - `cameras.js` — sweeping CCTV cones and alarm pressure
  - `player.js` — movement, stance, loot, smoke and EMP tools
  - `audio.js` — synthesized WebAudio sounds
  - `render.js` — floor, cover, cones, lighting, HUD and screens
  - `input.js` — keyboard and clickable buttons
  - `shots.js` — deterministic screenshot scenes (`?shot=`)
  - `main.js` — state machine and main loop
- `screenshots/` — renders of the game itself
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged from the kit
- `main.ts` — the program that hands the game in (Node 22, standard library only)

## License

MIT — see `LICENSE`.
