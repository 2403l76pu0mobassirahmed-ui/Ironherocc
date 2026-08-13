# IRON HERO — 3D Flying Combat Game

A complete, playable third-person "power-armor" flying combat game, built with
**Three.js** (JavaScript + WebGL) so it runs directly in your web browser on
Windows (or any OS) — no engine installation required.

You control an original red-and-gold armored hero (not using any copyrighted
Iron Man assets — a similar futuristic power-suit concept, built entirely
from procedural 3D shapes). Fly through a procedurally generated city,
shoot repulsor blasts, fire a chest beam, unleash a missile-strike special
attack, and fight through waves of enemies and a boss to complete
**MISSION 01 — CITY DEFENSE**.

---

## 1. What software you need

You only need a modern web browser. That's it.

- **Recommended:** Google Chrome or Microsoft Edge (latest version)
- Also works in Firefox
- No Unity, no Unreal, no Godot, no installers, no admin rights needed

Optional (only for the smoothest launch method, see below):
- [Python](https://www.python.org/downloads/) 3.x — free, takes 2 minutes to install.
  Check "Add Python to PATH" during install.

## 2. How to run the game

You have two options. **Option A is recommended.**

### Option A — Double-click `RUN_GAME.bat` (Windows, recommended)
1. Unzip this project anywhere on your PC.
2. Double-click **`RUN_GAME.bat`**.
3. It will start a tiny local web server and open the game in your browser
   automatically at `http://localhost:8000/index.html`.
4. To stop the server later, just close the black console window.

This method avoids any browser file-security restrictions and is the most
reliable way to play.

### Option B — Just open `index.html`
1. Unzip the project.
2. Double-click `index.html`.
3. It should open directly in your browser and work. If you see a black
   screen or console errors about blocked scripts, use Option A instead.

### Playing
- Click **PLAY** on the main menu.
- Click once on the game screen to lock your mouse for camera look
  (this is standard for first/third-person games).
- Press **Esc** any time to pause and free your mouse.

## 3. Controls

The game is played in **first-person view** — you look through the hero's
own eyes/visor.

| Key / Input              | Action                              |
|---------------------------|--------------------------------------|
| `W A S D` or Arrow Keys   | Move (both work together)            |
| Mouse                      | Look / aim                           |
| `Space`                    | Jump (on ground) / Start flying (in air) |
| `Space` (hold, while flying) | Ascend                            |
| `C` (while flying)        | Descend                              |
| `Shift`                    | Run (ground) / Flight boost (air)    |
| Left Mouse Button          | Fire repulsor blast                  |
| `E` (hold)                 | Chest beam (charges, then fires)     |
| `Q`                        | Lock on to nearest enemy             |
| `R`                        | Special attack (aerial missile strike) |
| `Esc`                      | Pause / resume                       |

A radar in the top-right corner shows your position (center, rotates with
your facing direction) and nearby enemies (red/orange dots) in real time.

Flight is fuel-limited: energy drains while flying and only refills once
you land, so watch the "FLIGHT" readout (it turns red under 3 seconds
remaining).

All key bindings can be changed in **`js/config.js`** at the top, under
`CONFIG.KEYS` — just replace the key code strings (e.g. `"KeyW"`) with any
other [key code](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values).

## 4. How the game works

**A 3-level campaign against robot forces**, with a single continuous
competition timer running from the moment Level 1 begins until the
Level 3 boss is defeated.

1. **LEVEL 1 — CITY DEFENSE** (city). Waves of Combat Drones and Combat
   Robots attack. Clear them, then fly/run to the glowing extraction
   beacon that appears to complete the level.
2. **LEVEL 2 — INDUSTRIAL ASSAULT** (factory zone). Tougher, faster waves
   — now including Heavy Robots — spread across warehouses, shipping
   containers, pipe networks, and elevated platforms that reward flying.
   Reach the factory-core beacon to finish.
3. **LEVEL 3 — ROBOT STRONGHOLD** (dark fortress). The hardest waves, then
   a multi-phase boss fight against **WARBRINGER**, a large mechanical war
   machine with ranged volleys, melee slams, and a missile-barrage special
   attack that all intensify as its health drops.

The timer never resets between levels — only a level restart (via Game
Over or Main Menu) resets it back to zero at Level 1. When the boss falls,
the timer stops and the results screen shows your **final time**, your
**best time** (saved locally in your browser so it persists between
sessions), and a breakdown of each level's individual time.

If your health reaches 0 at any point, you get a **Game Over** screen with
a **Restart Mission** button that starts the whole run over from Level 1.

## 5. Robot enemies

Four distinct robot designs, each visually different and each fought
differently:

| Type | Role | Behavior |
|---|---|---|
| **Combat Drone** | Small flying scout | Orbits at range, fires quick blaster shots |
| **Combat Robot** | Medium ground unit | Arm-mounted blaster; kites at range, melees if you close in |
| **Heavy Robot** | Large ground brute | Slow but hits hard, plus an occasional shoulder-cannon shot |
| **WARBRINGER** (boss) | Massive war machine | 3 escalating phases mixing ranged volleys, melee, and a missile-barrage special |

## 6. Project structure

```
IronHero/
├── index.html                Main page: canvas, HUD, menus, script includes
├── RUN_GAME.bat               Windows one-click launcher
├── README.md                   This file
├── css/
│   └── style.css               All HUD and menu styling
└── js/
    ├── config.js                All tunable settings, key bindings, and level/robot data (edit here!)
    ├── utils.js                  Small shared math/helper functions
    ├── timer.js                   The competition timer + best-time storage
    ├── audio.js                    Procedural sound effects (Web Audio API, no sound files needed)
    ├── inputManager.js             Keyboard/mouse state tracking
    ├── environmentBase.js           Shared sky/ground/lighting/collision/cleanup for every level theme
    ├── cityEnvironment.js            LEVEL 1 theme: city, roads, buildings, street lights, vehicles
    ├── industrialEnvironment.js       LEVEL 2 theme: factory structures, containers, pipes, platforms
    ├── fortressEnvironment.js          LEVEL 3 theme: perimeter walls, towers, spikes, boss arena
    ├── player.js                        The armored hero: procedural 3D model, health/energy
    ├── flightController.js               Walking, running, jumping, flight physics, building collision
    ├── cameraController.js                First-person mouse-look camera
    ├── weapons.js                          Repulsor blast, chest beam, special attack, projectiles, effects
    ├── enemy.js                             Combat Drone, Combat Robot, Heavy Robot AI
    ├── boss.js                               WARBRINGER boss robot: 3-phase attack pattern
    ├── spawner.js                             Creates and tracks enemy instances
    ├── levelManager.js                         3-level progression, waves, objectives, boss trigger
    ├── ui.js                                    HUD, timer/level display, results screen, minimap
    ├── gameManager.js                           Top-level state machine tying every system together
    └── main.js                                   Sets up the 3D renderer/scene/camera and starts the game loop
```

Every 3D model (hero, robots, boss, buildings, vehicles, street lights,
factory structures, fortress walls) is built from primitive shapes (boxes,
cylinders, spheres, cones) combined in code — there are **no external
model files to download or place**. All sound effects are synthesized at
runtime with the Web Audio API — there are **no external audio files
needed either**.

## 7. "Building an EXE"

Because this game runs in a browser, you don't need an .exe to play it —
`RUN_GAME.bat` already gives you a one-click Windows launch experience.

If you specifically want a standalone desktop `.exe` (for example, to share
with someone who doesn't want to touch a browser), the standard approach is
to wrap the project with **Electron**:

1. Install [Node.js](https://nodejs.org/) (includes `npm`).
2. In the project folder, run:
   ```
   npm init -y
   npm install --save-dev electron electron-packager
   ```
3. Create a small `electron-main.js` that opens `index.html` in an Electron
   `BrowserWindow` (Electron's own documentation has a copy-paste "quick
   start" example for this — https://www.electronjs.org/docs/latest/tutorial/quick-start).
4. Package it:
   ```
   npx electron-packager . IronHero --platform=win32 --arch=x64
   ```
   This produces a folder containing `IronHero.exe`.

This step is optional — the browser version is fully playable as-is.

## 8. Troubleshooting

**Black screen / nothing appears**
- Make sure you're using a recent Chrome, Edge, or Firefox — very old
  browsers don't support WebGL2 well.
- Use `RUN_GAME.bat` instead of double-clicking `index.html` directly —
  some browsers restrict local script loading when there's no web server.
- Open the browser DevTools console (`F12`) and check for red errors.

**No sound**
- Browsers block audio until you interact with the page. Click **PLAY**
  first — sound initializes on that click.
- Check the volume slider in Settings and your system volume.

**Mouse look doesn't work**
- Click once on the game canvas after pressing Play — browsers require a
  click before they allow "mouse lock" for camera control.
- Press `Esc` to release the mouse at any time.

**Game runs slowly / low frame rate**
- Lower your monitor/browser window resolution, or close other GPU-heavy
  browser tabs.
- Building count and other density settings can be reduced in
  `js/config.js` under `CONFIG.WORLD` (e.g. lower `BUILDING_COUNT`).

**"Failed to load resource" for a `.js` file**
- This means the browser blocked a local file request. Use
  `RUN_GAME.bat`, which serves the game over `http://localhost` instead of
  `file://`, avoiding this restriction entirely.

**I want to change difficulty, damage, speeds, etc.**
- Everything gameplay-related (health, damage, speeds, cooldowns, wave
  sizes) is centralized in `js/config.js` — no need to touch any other file.

## 9. Recent fixes

- **A/D were reversed.** Movement direction math didn't match the camera's
  actual orientation — fixed so strafing now matches the camera exactly.
- **Descending never reached the ground.** Flight had a hard floor at
  y = 0.4 that the "am I grounded?" check could never satisfy — both now
  use the same ground level (y = 0), so landing works properly.
- **Sudden speed burst after landing.** Horizontal velocity from flight
  (much faster than ground speed) carried over for a few frames after
  landing. It's now capped to normal run speed the instant you land.
- **Flight had no real time limit.** Energy was regenerating even while
  actively flying, nearly canceling out the flight drain. Regen now only
  happens while grounded, and a live "seconds remaining" readout was added.
- **Switched to first-person view (FPP).** The camera now sits at eye
  level and turns directly with the mouse, and the hero's own body model
  is hidden so it doesn't block the view.
- **Buildings were hollow.** The player could fly/walk straight through
  them. Buildings now block movement below their rooftop height (you can
  still fly over them), with sliding collision so you don't get stuck
  dead-still against a wall.
- **Added a live radar/minimap** (top-right) showing your position and
  every active enemy in real time.

## 10. 3-level upgrade

- **Continuous competition timer** — starts at Level 1, runs through all
  3 levels without resetting, stops the instant the boss dies. Best time
  is saved locally and shown on the results screen alongside a per-level
  time breakdown.
- **3 full levels** — City Defense → Industrial Assault → Robot
  Stronghold, each with its own environment, difficulty, and enemy mix.
- **Robot enemy redesign** — Combat Drone, Combat Robot, and Heavy Robot
  replace the earlier humanoid enemies, plus a new multi-phase boss robot,
  WARBRINGER.
- **Enhanced destruction effects** — robots now explode into tumbling
  metal debris with a flash and spark burst instead of just fading out.

---

Have fun flying around the city, Hero! 🛡️
