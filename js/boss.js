/* ============================================================
   BOSS.js — TYPE 4: BOSS ROBOT ("WARBRINGER")
   A large mechanical war machine, not a human in armor: blocky
   armor plates, glowing core, oversized shoulder-mounted weapon
   systems, and mechanical joints. Fights in three phases that
   get more aggressive as its health drops.
   ============================================================ */

const BossPhase = {
    RANGED_FOCUS: 1,   // >66% health: mostly ranged volleys, cautious melee
    MIXED: 2,          // 33-66% health: mixes melee, ranged, and specials
    ENRAGED: 3         // <33% health: faster, more aggressive, frequent specials
};

class Boss extends EnemyBase {
    constructor(scene, player, weaponSystem, audio, position) {
        super(scene, player, weaponSystem, audio, position, "boss");
        const cfg = CONFIG.BOSS_ROBOT;
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.hitRadius = 3.2;
        this.name = "WARBRINGER";
        this.phase = BossPhase.RANGED_FOCUS;

        this.meleeTimer = Utils.randRange(1, 2);
        this.rangedTimer = Utils.randRange(1, 2);
        this.specialTimer = cfg.SPECIAL_COOLDOWN * 0.5;

        this._buildModel();
    }

    _buildModel() {
        const cfg = CONFIG.BOSS_ROBOT;
        const plate = this._plateMat(0x33384a);
        const dark = this._plateMat(0x181a24);
        const accent = this._plateMat(0x6a2a8a);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.95 });

        // legs (mechanical, digitigrade stance)
        this.legs = [];
        [-1, 1].forEach((side) => {
            const legGroup = new THREE.Group();
            const hip = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), plate);
            hip.position.set(side * 1.1, 3.0, 0);
            legGroup.add(hip);
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 1.6, 8), dark);
            thigh.position.set(side * 1.1, 2.1, 0.15);
            thigh.rotation.x = 0.15;
            legGroup.add(thigh);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), plate);
            knee.position.set(side * 1.1, 1.3, 0.3);
            legGroup.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 1.5, 8), dark);
            shin.position.set(side * 1.1, 0.5, 0.1);
            shin.rotation.x = -0.2;
            legGroup.add(shin);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 1.1), plate);
            foot.position.set(side * 1.1, -0.15, 0.25);
            legGroup.add(foot);
            this.group.add(legGroup);
            this.legs.push(legGroup);
        });

        // torso — bulky, angular armor plates
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 1.8), plate);
        torso.position.y = 4.4;
        this.group.add(torso);

        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 0.3), dark);
        chestPlate.position.set(0, 4.5, 1.0);
        this.group.add(chestPlate);

        // glowing power core
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), coreMat);
        core.position.set(0, 4.5, 1.2);
        this.group.add(core);
        this.core = core;
        this.coreLight = new THREE.PointLight(0xaa44ff, 1.5, 8);
        this.coreLight.position.copy(core.position);
        this.group.add(this.coreLight);

        // massive shoulders with weapon pods
        const shoulderGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        const shoulderL = new THREE.Mesh(shoulderGeo, accent);
        shoulderL.position.set(-1.85, 5.1, 0);
        this.group.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 1.85;
        this.group.add(shoulderR);

        // ranged weapon pod (right shoulder)
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 10), dark);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(1.85, 5.1, 1.1);
        this.group.add(cannon);
        this.cannon = cannon;

        // melee arm (left) — heavy mechanical fist
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 1.8, 8), dark);
        armL.position.set(-1.85, 3.6, 0.3);
        armL.rotation.x = 0.3;
        this.group.add(armL);
        this.armL = armL;
        const fist = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), plate);
        fist.position.set(-1.85, 2.7, 0.7);
        this.group.add(fist);
        this.fist = fist;

        // head / sensor cluster
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.8), dark);
        head.position.y = 6.0;
        this.group.add(head);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
        eyeL.position.set(-0.24, 6.0, 0.42);
        this.group.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.24;
        this.group.add(eyeR);

        this.group.scale.setScalar(1.15);
    }

    _updatePhase() {
        const ratio = this.health / this.maxHealth;
        const prev = this.phase;
        if (ratio > 0.66) this.phase = BossPhase.RANGED_FOCUS;
        else if (ratio > 0.33) this.phase = BossPhase.MIXED;
        else this.phase = BossPhase.ENRAGED;

        if (this.phase !== prev) {
            // phase transition — brief telegraphed flash + a burst of embers
            this.weaponSystem._spawnImpactParticles(this.position.clone().add(new THREE.Vector3(0, 4, 0)), 0xaa44ff, 20);
            this.audio.explosion();
        }
    }

    update(dt) {
        if (this.isDead || this.player.isDead) return;
        const cfg = CONFIG.BOSS_ROBOT;
        this._updatePhase();

        const speedMult = this.phase === BossPhase.ENRAGED ? 1.4 : 1;
        const cooldownMult = this.phase === BossPhase.ENRAGED ? 0.65 : (this.phase === BossPhase.MIXED ? 0.85 : 1);

        const toPlayer = this.player.position.clone().sub(this.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        this.faceTarget(dt, this.player.position);

        const walkCycle = performance.now() * 0.0025;
        this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walkCycle + i * Math.PI) * 0.15; });

        this.meleeTimer -= dt;
        this.rangedTimer -= dt;
        this.specialTimer -= dt;

        // movement: close distance if far outside melee range
        if (dist > cfg.MELEE_RANGE) {
            this.group.position.addScaledVector(toPlayer.normalize(), cfg.SPEED * speedMult * dt);
        }

        // melee attack (close range)
        if (dist <= cfg.MELEE_RANGE && this.meleeTimer <= 0) {
            this.meleeTimer = cfg.MELEE_COOLDOWN * cooldownMult;
            this.player.takeDamage(cfg.MELEE_DAMAGE);
            this.audio.hit();
        }

        // ranged volley — happens regardless of distance, more often in later phases
        const rangedCooldown = cfg.RANGED_COOLDOWN * cooldownMult * (this.phase === BossPhase.RANGED_FOCUS ? 0.8 : 1);
        if (this.rangedTimer <= 0) {
            this.rangedTimer = rangedCooldown;
            this._rangedVolley();
        }

        // special attack — only in mixed/enraged phases
        if (this.phase !== BossPhase.RANGED_FOCUS && this.specialTimer <= 0) {
            this.specialTimer = cfg.SPECIAL_COOLDOWN * cooldownMult;
            this._specialAttack();
        }

        // core pulses faster as the boss gets angrier
        const pulseSpeed = this.phase === BossPhase.ENRAGED ? 0.012 : (this.phase === BossPhase.MIXED ? 0.008 : 0.005);
        this.coreLight.intensity = 1.2 + Math.sin(performance.now() * pulseSpeed) * 0.6;

        const targetY = Utils.clamp(this.player.position.y * 0.25, 0, 5);
        this.group.position.y = Utils.damp(this.group.position.y, targetY, 2, dt);
    }

    _rangedVolley() {
        const cfg = CONFIG.BOSS_ROBOT;
        const origin = new THREE.Vector3();
        this.cannon.getWorldPosition(origin);
        const shots = this.phase === BossPhase.ENRAGED ? 3 : (this.phase === BossPhase.MIXED ? 2 : 1);
        for (let i = 0; i < shots; i++) {
            const spread = (i - (shots - 1) / 2) * 0.15;
            const dir = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0)).sub(origin).normalize();
            dir.x += spread;
            dir.normalize();
            this.weaponSystem.spawnEnemyProjectile(origin.clone(), dir, cfg.RANGED_DAMAGE, cfg.PROJECTILE_SPEED, 0xaa44ff);
        }
    }

    _specialAttack() {
        // Missile barrage: a volley of homing-style projectiles fired in
        // sequence toward the player's current position.
        const cfg = CONFIG.BOSS_ROBOT;
        this.audio.explosion();
        const origin = this.position.clone().add(new THREE.Vector3(0, 5, 0));
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (this.isDead) return;
                const dir = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0)).sub(origin).normalize();
                dir.x += Utils.randRange(-0.2, 0.2);
                dir.z += Utils.randRange(-0.2, 0.2);
                this.weaponSystem.spawnEnemyProjectile(origin.clone(), dir.normalize(), cfg.SPECIAL_DAMAGE / 3, 24, 0xff6a3d);
            }, i * 150);
        }
    }
}
