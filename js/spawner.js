/* ============================================================
   SPAWNER.js — creates robot enemy instances around the play
   area and keeps a live list for combat/AI systems to use.
   ============================================================ */

class Spawner {
    constructor(scene, player, weaponSystem, audio) {
        this.scene = scene;
        this.player = player;
        this.weaponSystem = weaponSystem;
        this.audio = audio;
        this.enemies = [];
        this.boss = null;
    }

    _spawnPos(minR, maxR) {
        return Utils.randomPointOnRing(this.player.position, minR, maxR);
    }

    spawnWave(waveCfg, spawnRadiusMin, spawnRadiusMax) {
        const drone = waveCfg.drone || 0;
        const combat = waveCfg.combat || 0;
        const heavy = waveCfg.heavy || 0;

        for (let i = 0; i < drone; i++) {
            const pos = this._spawnPos(spawnRadiusMin, spawnRadiusMax);
            pos.y = CONFIG.DRONE.FLY_HEIGHT;
            this.enemies.push(new CombatDrone(this.scene, this.player, this.weaponSystem, this.audio, pos));
        }
        for (let i = 0; i < combat; i++) {
            const pos = this._spawnPos(spawnRadiusMin, spawnRadiusMax);
            this.enemies.push(new CombatRobot(this.scene, this.player, this.weaponSystem, this.audio, pos));
        }
        for (let i = 0; i < heavy; i++) {
            const pos = this._spawnPos(spawnRadiusMin, spawnRadiusMax);
            this.enemies.push(new HeavyRobot(this.scene, this.player, this.weaponSystem, this.audio, pos));
        }
    }

    spawnBoss(spawnRadiusMin = 20, spawnRadiusMax = 26) {
        const pos = this._spawnPos(spawnRadiusMin, spawnRadiusMax);
        this.boss = new Boss(this.scene, this.player, this.weaponSystem, this.audio, pos);
        this.enemies.push(this.boss);
        return this.boss;
    }

    getLiveEnemies() {
        return this.enemies.filter(e => !e.isDead);
    }

    allDead() {
        return this.enemies.length > 0 && this.enemies.every(e => e.isDead);
    }

    update(dt) {
        for (const e of this.enemies) {
            if (!e.isDead) e.update(dt);
        }
        if (this.enemies.length > 200) {
            this.enemies = this.enemies.filter(e => !e.isDead);
        }
    }

    // Full reset — removes every live enemy from the scene. Used both on
    // mission restart and when transitioning between levels.
    reset() {
        for (const e of this.enemies) {
            if (!e.isDead) this.scene.remove(e.group);
        }
        this.enemies = [];
        this.boss = null;
    }
}
