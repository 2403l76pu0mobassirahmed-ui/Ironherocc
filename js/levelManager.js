/* ============================================================
   LEVEL_MANAGER.js — drives LEVEL 1 -> LEVEL 2 -> LEVEL 3 -> BOSS
   progression. Owns wave spawning, the "reach the objective"
   beacon, the boss trigger, and records each level's lap time
   on the shared GameTimer (which itself keeps running the whole
   time — this class never touches start/stop, only recordLap).
   ============================================================ */

const LevelState = {
    INTRO: "INTRO",
    WAVE: "WAVE",
    WAVE_CLEAR_PAUSE: "WAVE_CLEAR_PAUSE",
    REACH_OBJECTIVE: "REACH_OBJECTIVE",
    LEVEL_COMPLETE_PAUSE: "LEVEL_COMPLETE_PAUSE",
    BOSS_INTRO: "BOSS_INTRO",
    BOSS_FIGHT: "BOSS_FIGHT",
    ALL_COMPLETE: "ALL_COMPLETE",
    FAILED: "FAILED"
};

class LevelManager {
    constructor(scene, player, spawner, timer, audio, envSwitcher) {
        this.scene = scene;
        this.player = player;
        this.spawner = spawner;
        this.timer = timer;
        this.audio = audio;
        this.envSwitcher = envSwitcher; // (theme) => new environment instance (disposes old one)

        this.environment = null;
        this.levelIndex = 0;
        this.waveIndex = 0;
        this.state = LevelState.INTRO;
        this.timerBox = 0;
        this.objective = "Get ready...";
        this.beacon = null;
        this.beaconPulse = 0;

        this.levelTimesMs = []; // recorded as each level completes

        this.onLevelComplete = null;  // (levelNumber, lapTimeMs) => {}
        this.onAllComplete = null;    // () => {}
        this.onFail = null;           // () => {}
        this.onLevelBanner = null;    // (text) => {}
        this.onBossArrival = null;    // () => {} — fired once when the final boss shows up
    }

    get currentLevelConfig() {
        return CONFIG.LEVELS[this.levelIndex];
    }

    get levelNumber() {
        return this.currentLevelConfig.NUMBER;
    }

    get totalLevels() {
        return CONFIG.LEVELS.length;
    }

    start() {
        this.levelIndex = 0;
        this.levelTimesMs = [];
        this._enterLevel(0, true);
    }

    // Public: retry the current level from its start (fresh environment,
    // fresh waves) without going back to Level 1. Used when the player
    // dies — they only lose progress within the level they were on, not
    // any level they already cleared.
    retryCurrentLevel() {
        this._enterLevel(this.levelIndex, false);
    }

    _enterLevel(index, isFirst) {
        this.levelIndex = index;
        const lvl = this.currentLevelConfig;

        this.spawner.reset();
        this._removeBeacon();

        this.environment = this.envSwitcher(lvl.THEME);

        // place the player at a safe spot near the world center for the new level
        this.player.group.position.set(0, 0, 0);
        this.player.velocity.set(0, 0, 0);
        this.player.isFlying = false;

        this.waveIndex = 0;
        this.state = LevelState.INTRO;
        this.timerBox = 2.2;
        this.objective = `Get ready... LEVEL ${lvl.NUMBER}: ${lvl.NAME}`;
        if (this.onLevelBanner) this.onLevelBanner(`LEVEL ${lvl.NUMBER} — ${lvl.NAME}`);
    }

    update(dt) {
        if (this.player.isDead) {
            if (this.state !== LevelState.FAILED) {
                this.state = LevelState.FAILED;
                if (this.onFail) this.onFail();
            }
            return;
        }

        this.timerBox -= dt;
        this.beaconPulse += dt;
        if (this.beacon) {
            this.beacon.rotation.y += dt * 1.2;
            this.beacon.position.y = 0.5 + Math.sin(this.beaconPulse * 2) * 0.3;
        }

        const lvl = this.currentLevelConfig;

        switch (this.state) {
            case LevelState.INTRO:
                if (this.timerBox <= 0) this._startWave();
                break;

            case LevelState.WAVE: {
                const remaining = this.spawner.getLiveEnemies().length;
                this.objective = `${lvl.OBJECTIVE_CLEAR} (${remaining} remaining)`;
                if (this.spawner.allDead()) {
                    this.waveIndex++;
                    if (this.waveIndex < lvl.WAVES.length) {
                        this.state = LevelState.WAVE_CLEAR_PAUSE;
                        this.timerBox = 1.6;
                        this.objective = "Wave cleared. More incoming...";
                    } else {
                        this._allWavesCleared();
                    }
                }
                break;
            }

            case LevelState.WAVE_CLEAR_PAUSE:
                if (this.timerBox <= 0) this._startWave();
                break;

            case LevelState.REACH_OBJECTIVE:
                if (this.beacon) {
                    const dist = this.player.position.distanceTo(this.beacon.position);
                    this.objective = `${lvl.OBJECTIVE_REACH} (${Math.round(dist)}m — see radar)`;
                    if (dist < 5) {
                        this._completeLevel();
                    }
                } else {
                    this.objective = lvl.OBJECTIVE_REACH;
                }
                break;

            case LevelState.LEVEL_COMPLETE_PAUSE:
                if (this.timerBox <= 0) {
                    this._enterLevel(this.levelIndex + 1, false);
                }
                break;

            case LevelState.BOSS_INTRO:
                this.objective = "WARNING: Massive hostile signature detected!";
                if (this.timerBox <= 0) {
                    this.state = LevelState.BOSS_FIGHT;
                    this.spawner.spawnBoss(lvl.SPAWN_RADIUS_MIN, lvl.SPAWN_RADIUS_MAX);
                    this.objective = "Defeat the boss!";
                    // Power up right as the boss actually appears, not
                    // during the warning countdown before it.
                    if (this.onBossArrival) this.onBossArrival();
                }
                break;

            case LevelState.BOSS_FIGHT:
                this.objective = "Defeat the boss!";
                if (this.spawner.boss && this.spawner.boss.isDead) {
                    this._finishGame();
                }
                break;
        }
    }

    _startWave() {
        const lvl = this.currentLevelConfig;
        this.state = LevelState.WAVE;
        this.spawner.spawnWave(lvl.WAVES[this.waveIndex], lvl.SPAWN_RADIUS_MIN, lvl.SPAWN_RADIUS_MAX);
        this.objective = `${lvl.OBJECTIVE_CLEAR} (wave ${this.waveIndex + 1}/${lvl.WAVES.length})`;
    }

    _allWavesCleared() {
        const lvl = this.currentLevelConfig;
        if (lvl.HAS_BOSS) {
            this.state = LevelState.BOSS_INTRO;
            this.timerBox = 3;
            // (power-up fires later, exactly when the boss spawns — see BOSS_INTRO case above)
        } else if (lvl.OBJECTIVE_REACH) {
            this._spawnBeacon();
            this.state = LevelState.REACH_OBJECTIVE;
        } else {
            this._completeLevel();
        }
    }

    _spawnBeacon() {
        // find a reachable spot for the extraction/objective beacon
        let pos = null;
        for (let i = 0; i < 20; i++) {
            const candidate = Utils.randomPointOnRing(this.player.position, 25, 45);
            if (!this.environment.isBlocked(candidate.x, candidate.z, 0)) {
                pos = candidate;
                break;
            }
        }
        if (!pos) pos = Utils.randomPointOnRing(this.player.position, 25, 45);

        const group = new THREE.Group();
        const glowTex = Utils.makeGlowTexture("#6fe3ff");
        const ringMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x6fe3ff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 - i * 0.5, 0.06, 8, 24), ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.4 + i * 0.6;
            group.add(ring);
        }
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 12, 12, 1, true), ringMat);
        beam.position.y = 6;
        group.add(beam);
        const light = new THREE.PointLight(0x6fe3ff, 1.5, 20);
        light.position.y = 2;
        group.add(light);

        group.position.copy(pos);
        this.scene.add(group);
        this.beacon = group;
    }

    _removeBeacon() {
        if (this.beacon) {
            this.scene.remove(this.beacon);
            this.beacon = null;
        }
    }

    _completeLevel() {
        this._removeBeacon();
        const lapMs = this.timer.recordLap(this.levelNumber);
        this.levelTimesMs.push({ level: this.levelNumber, timeMs: lapMs });

        // reward for clearing a level: a health top-up carried into the next one
        this.player.heal(this.player.maxHealth);

        this.state = LevelState.LEVEL_COMPLETE_PAUSE;
        this.timerBox = 2.5;
        this.objective = `LEVEL ${this.levelNumber} COMPLETE`;
        this.audio.uiClick();
        if (this.onLevelComplete) this.onLevelComplete(this.levelNumber, lapMs);
        if (this.onLevelBanner) this.onLevelBanner(`LEVEL ${this.levelNumber} COMPLETE`);
    }

    _finishGame() {
        this._removeBeacon();
        const lapMs = this.timer.recordLap(this.levelNumber);
        this.levelTimesMs.push({ level: this.levelNumber, timeMs: lapMs });

        this.state = LevelState.ALL_COMPLETE;
        this.objective = "GAME COMPLETED!";
        if (this.onAllComplete) this.onAllComplete();
    }

    getBoss() {
        return this.spawner.boss;
    }
}
