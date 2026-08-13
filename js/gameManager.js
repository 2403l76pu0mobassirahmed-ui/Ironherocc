/* ============================================================
   GAME_MANAGER.js — top-level state machine and per-frame
   orchestration of every subsystem (player, flight, weapons,
   enemies, levels, timer, camera, UI).
   ============================================================ */

const GameState = {
    MENU: "MENU",
    SETTINGS: "SETTINGS",
    CONTROLS: "CONTROLS",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER",
    VICTORY: "VICTORY"
};

const THEME_CLASSES = {
    city: CityEnvironment,
    industrial: IndustrialEnvironment,
    fortress: FortressEnvironment
};

class GameManager {
    constructor(renderer, scene, camera, domElement) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.dom = domElement;

        this.ui = new UIManager();
        this.audio = new AudioManager();
        this.input = new InputManager(domElement);
        this.timer = new GameTimer();

        this.state = GameState.MENU;
        this.clock = new THREE.Clock();

        // start with the Level 1 (city) environment so the menu has a scene behind it
        this.environment = new CityEnvironment(scene);

        this.player = new Player(scene, this.audio);
        this.cameraController = new CameraController(camera, this.player, this.input, this.environment);
        this.flightController = new FlightController(this.player, this.input, this.cameraController, this.environment, this.audio);

        this.spawner = new Spawner(scene, this.player, null, this.audio);
        this.weaponSystem = new WeaponSystem(scene, this.player, this.cameraController, this.audio, () => this.spawner.getLiveEnemies(), this.ui);
        this.spawner.weaponSystem = this.weaponSystem;

        this.level = new LevelManager(
            scene, this.player, this.spawner, this.timer, this.audio,
            (theme) => this._switchEnvironment(theme)
        );
        this.level.onLevelComplete = (num, lapMs) => this._onLevelComplete(num, lapMs);
        this.level.onAllComplete = () => this._onAllComplete();
        this.level.onFail = () => this._onGameOver();
        this.level.onLevelBanner = (text) => this.ui.flashBanner(text);
        this.level.onBossArrival = () => this._onBossArrival();

        this.lockOnTarget = null;
        this.lockOnKeyWasDown = false;

        this._bindMenuButtons();
        this._bindPauseAndLockOn();
        this._bindSecretCheat();

        this.ui.showScreen("mainMenu");
        this.ui.setHudVisible(false);
    }

    // Disposes the current environment and builds a fresh one for the
    // given theme. Called by LevelManager when a level starts.
    _switchEnvironment(theme) {
        if (this.environment && this.environment.dispose) this.environment.dispose();
        const EnvClass = THEME_CLASSES[theme] || CityEnvironment;
        this.environment = new EnvClass(this.scene);
        // keep every system that references the environment in sync
        this.flightController.environment = this.environment;
        this.cameraController.environment = this.environment;
        return this.environment;
    }

    _bindMenuButtons() {
        document.getElementById("btn-play").addEventListener("click", () => { this.audio.init(); this.audio.uiClick(); this.ui.showScreen("howToPlayScreen"); });
        document.getElementById("btn-settings").addEventListener("click", () => { this.audio.uiClick(); this.ui.showScreen("settingsMenu"); });
        document.getElementById("btn-controls").addEventListener("click", () => { this.audio.uiClick(); this.ui.showScreen("controlsMenu"); });
        document.getElementById("btn-quit").addEventListener("click", () => {
            this.ui.flashBanner("Thanks for playing IRON HERO!");
        });

        document.getElementById("btn-settings-back").addEventListener("click", () => { this.audio.uiClick(); this.ui.showScreen("mainMenu"); });
        document.getElementById("btn-controls-back").addEventListener("click", () => { this.audio.uiClick(); this.ui.showScreen("mainMenu"); });

        document.getElementById("btn-start-mission").addEventListener("click", () => this._startGame());
        document.getElementById("btn-how-to-play-back").addEventListener("click", () => { this.audio.uiClick(); this.ui.showScreen("mainMenu"); });

        document.getElementById("btn-resume").addEventListener("click", () => this._resume());
        document.getElementById("btn-restart-pause").addEventListener("click", () => this._retryLevel());
        document.getElementById("btn-quit-pause").addEventListener("click", () => this._quitToMenu());

        document.getElementById("btn-restart-gameover").addEventListener("click", () => this._retryLevel());
        document.getElementById("btn-menu-gameover").addEventListener("click", () => this._quitToMenu());

        document.getElementById("btn-restart-victory").addEventListener("click", () => this._restart());
        document.getElementById("btn-menu-victory").addEventListener("click", () => this._quitToMenu());

        const volumeSlider = document.getElementById("volume-slider");
        volumeSlider.addEventListener("input", (e) => {
            if (this.audio.master) this.audio.master.gain.value = parseFloat(e.target.value);
        });

        document.addEventListener("keydown", (e) => {
            if (e.code === CONFIG.KEYS.PAUSE) {
                if (this.state === GameState.PLAYING) this._pause();
                else if (this.state === GameState.PAUSED) this._resume();
            }
        });
    }

    _bindPauseAndLockOn() {
        this.dom.addEventListener("click", () => {
            if (this.state === GameState.PLAYING) this.input.requestPointerLock();
        });

        // If the window/tab loses focus mid-game, pause cleanly instead
        // of continuing to simulate with input that just got wiped (see
        // InputManager.clearAllInput) — otherwise flying, combat, etc.
        // could keep happening unattended while the player is away.
        window.addEventListener("blur", () => {
            if (this.state === GameState.PLAYING) this._pause();
        });
    }

    _startGame() {
        this.audio.init();
        this.audio.uiClick();
        this.audio.startMusic();
        this._restart();
    }

    _restart() {
        this.audio.init();
        this.spawner.reset();
        this.player.resetMaxHealth();       // clear any leftover boss power-up from a previous run
        this.weaponSystem.resetPowerUps();
        this.player.respawn(new THREE.Vector3(0, 0, 0));
        GameScore.reset();           // fresh run = fresh score

        this.timer.start();          // timer starts the instant Level 1 begins
        this.level.start();          // LevelManager switches to the Level 1 (city) environment itself

        this.lockOnTarget = null;
        this.ui.showScreen(null);
        this.ui.setHudVisible(true);
        this.state = GameState.PLAYING;
        this.input.requestPointerLock();
    }

    // Retries the level currently in progress (fresh environment, fresh
    // waves, full health/energy/fuel) instead of sending the player all
    // the way back to Level 1. Used from the Pause menu and the Game
    // Over screen. The timer is NOT reset — it simply resumes from
    // wherever it was, so time already banked on cleared levels is kept.
    _retryLevel() {
        this.audio.uiClick();
        this.spawner.reset();
        this.player.respawn(new THREE.Vector3(0, 0, 0));
        this.level.retryCurrentLevel();

        this.lockOnTarget = null;
        this.ui.showScreen(null);
        this.ui.setHudVisible(true);
        this.state = GameState.PLAYING;
        this.timer.resume();
        this.input.requestPointerLock();
    }

    _pause() {
        this.state = GameState.PAUSED;
        this.timer.pause();          // timer pauses with the game, resumes on Resume
        this.ui.showScreen("pauseMenu");
        this.input.exitPointerLock();
    }

    _resume() {
        this.audio.uiClick();
        this.state = GameState.PLAYING;
        this.timer.resume();
        this.ui.showScreen(null);
        this.input.requestPointerLock();
    }

    _quitToMenu() {
        this.audio.uiClick();
        this.state = GameState.MENU;
        this.timer.pause();
        this.ui.showScreen("mainMenu");
        this.ui.setHudVisible(false);
        this.input.exitPointerLock();
        this.spawner.reset();
    }

    _onLevelComplete(levelNumber, lapMs) {
        // LevelManager already advances to the next level on its own timer;
        // this hook exists for any extra UI/audio hooks in the future.
    }

    // "Iron Guardian Protocol" — fired once, exactly when the Level 3
    // boss actually spawns (not during the warning countdown before it):
    // +25% max health (granted immediately, not just headroom), +25%
    // weapon damage, and +25% weapon range for better long-range
    // engagement against the boss.
    _onBossArrival() {
        this.player.applyMaxHealthBoost(1.25);
        this.weaponSystem.activateBossPowerUp(1.25);
        this.audio.uiClick();
        this.ui.flashBanner("IRON GUARDIAN PROTOCOL ACTIVATED", 3);
    }

    // Not documented anywhere in the UI, README, or controls screens —
    // deliberately undiscoverable without already knowing it. Both
    // trigger phrases are intentionally unrelated to anything shown to
    // the player (not the boss's displayed name, not any HUD text) so
    // neither can be stumbled into by guessing something visible on
    // screen. No visible confirmation on either, on purpose. Works on
    // whichever level is currently active — every live enemy on screen
    // (drones, combat/heavy robots, and the boss if present), not just
    // the Level 3 boss, so it's just as usable on Levels 1 and 2.
    //   "75"  — instantly cuts every live enemy's health BY 75% (leaves
    //           25% of its max), never healing it back up if it's
    //           already lower.
    //   "100" — instantly kills every live enemy outright.
    _bindSecretCheat() {
        let buffer = "";
        const maxSecretLen = 3;
        window.addEventListener("keydown", (e) => {
            if (!e.key || e.key.length !== 1) return;
            buffer = (buffer + e.key.toLowerCase()).slice(-maxSecretLen);

            if (buffer.endsWith("75")) {
                this._applySecretDamageCheat();
                buffer = "";
            } else if (buffer.endsWith("100")) {
                this._applySecretKillCheat();
                buffer = "";
            }
        });
    }

    _applySecretDamageCheat() {
        const enemies = this.spawner.getLiveEnemies();
        enemies.forEach((e) => {
            // Cuts health BY 75% (100% - 75% = 25% remaining), not TO 75%.
            e.health = Math.min(e.health, e.maxHealth * 0.25);
        });
    }

    _applySecretKillCheat() {
        const enemies = this.spawner.getLiveEnemies();
        enemies.forEach((e) => {
            // Routed through the normal takeDamage/die pipeline (not a
            // raw isDead flag flip) so score tracking, destruction
            // effects, and audio all fire exactly like a real kill would.
            e.takeDamage(e.maxHealth);
        });
    }

    _onGameOver() {
        this.state = GameState.GAME_OVER;
        this.timer.pause();
        this.audio.explosion();
        this.ui.showGameOverResults({
            netScore: GameScore.netScore,
            timeDisplay: this.timer.getDisplay(),
            levelNumber: this.level.levelNumber
        });
        this.ui.showScreen("gameOverScreen");
        this.input.exitPointerLock();
    }

    _onAllComplete() {
        this.state = GameState.VICTORY;
        const finalMs = this.timer.stopFinal();
        const best = GameTimer.saveBestTimeIfBetter(finalMs);

        this.ui.showVictoryResults({
            finalMs,
            bestMs: best.bestMs,
            isNewBest: best.isNewBest,
            levelTimes: this.level.levelTimesMs,
            netScore: GameScore.netScore,
            finalScore: GameScore.finalScore   // 5x completion bonus applied
        });
        this.ui.showScreen("victoryScreen");
        this.ui.startVictoryUnlockCountdown(15);   // buttons stay disabled for 15s so results are actually seen
        this.input.exitPointerLock();
    }

    _updateLockOn(dt) {
        const keyDown = this.input.isDown(CONFIG.KEYS.LOCK_ON);
        const justPressed = keyDown && !this.lockOnKeyWasDown;
        this.lockOnKeyWasDown = keyDown;

        if (justPressed) {
            const enemies = this.spawner.getLiveEnemies();
            if (this.lockOnTarget && enemies.includes(this.lockOnTarget)) {
                this.lockOnTarget = null; // toggle off
            } else if (enemies.length > 0) {
                enemies.sort((a, b) => a.position.distanceTo(this.player.position) - b.position.distanceTo(this.player.position));
                this.lockOnTarget = enemies[0];
                this.audio.lockOn();
            }
        }

        if (this.lockOnTarget && this.lockOnTarget.isDead) this.lockOnTarget = null;

        if (this.lockOnTarget) {
            const worldPos = this.lockOnTarget.position.clone().add(new THREE.Vector3(0, 1.4, 0));
            const screenPos = worldPos.clone().project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            const onScreen = screenPos.z < 1;
            this.ui.setLockOnVisible(onScreen, x, y);
        } else {
            this.ui.setLockOnVisible(false);
        }
    }

    update() {
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.environment) this.environment.update(dt);

        if (this.state === GameState.PLAYING) {
            this.timer.tick(dt);
            this.player.update(dt);
            this.flightController.update(dt);
            this.cameraController.update(dt);
            this.weaponSystem.update(dt, this.input);
            this.spawner.update(dt);
            this.level.update(dt);
            this._updateLockOn(dt);
            this._updateHud();
        } else if (this.state === GameState.PAUSED) {
            this.cameraController.update(0);
        }

        this.renderer.render(this.scene, this.camera);
    }

    _estimateFlightSecondsLeft() {
        if (!this.player.isFlying) return 0;
        const boosting = this.input.isDown(CONFIG.KEYS.BOOST);
        const rate = boosting ? CONFIG.FLIGHT.BOOST_FUEL_COST_PER_SEC : CONFIG.FLIGHT.FUEL_COST_PER_SEC;
        return this.player.flightFuel / rate;
    }

    _updateHud() {
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateEnergy(this.player.energy, this.player.maxEnergy);
        this.ui.updateFlightFuel(this.player.flightFuel, this.player.maxFlightFuel);
        this.ui.updateObjective(this.level.objective);
        this.ui.updateMissionTitle(`LEVEL ${this.level.levelNumber} / ${this.level.totalLevels} — ${this.level.currentLevelConfig.NAME}`);
        this.ui.updateLevelBadge(this.level.levelNumber, this.level.totalLevels);
        this.ui.updateTimer(this.timer.getDisplay());
        this.ui.updateScore(GameScore.netScore);
        this.ui.updateFlightIndicator(this.player.isFlying, this._estimateFlightSecondsLeft());

        const w = CONFIG.WEAPONS;
        this.ui.updateCooldowns(
            this.weaponSystem.repulsorCooldown / w.REPULSOR.COOLDOWN,
            this.weaponSystem.chestBeamActive ? 0 : 1,
            this.weaponSystem.specialCooldown / w.SPECIAL.COOLDOWN
        );

        const boss = this.level.getBoss();
        if (boss && !boss.isDead) {
            this.ui.showBossBar(true, boss.name, boss.health, boss.maxHealth);
        } else {
            this.ui.showBossBar(false);
        }

        this.ui.drawMinimap(this.player.position, this.cameraController.yaw, this.spawner.getLiveEnemies(), boss, this.level.beacon ? this.level.beacon.position : null);
    }
}
