/* ============================================================
   ENEMY.js — Robot enemy types 1-3:
     CombatDrone  — small flying robot, ranged, low health
     CombatRobot  — medium ground robot, arm-mounted blaster
     HeavyRobot   — large, slow, powerful, occasional cannon shot
   All are built from angular metallic shapes with a single
   glowing sensor "eye" and glowing joints — deliberately
   mechanical, not humanoid.
   ============================================================ */

class EnemyBase {
    constructor(scene, player, weaponSystem, audio, position, type) {
        this.scene = scene;
        this.player = player;
        this.weaponSystem = weaponSystem;
        this.audio = audio;
        this.type = type;
        this.isDead = false;
        this.attackTimer = Utils.randRange(0, 1);
        this.hitRadius = 1.2;
        this.emissiveMats = []; // materials flashed white on hit

        this.group = new THREE.Group();
        this.group.position.copy(position);
        scene.add(this.group);
    }

    get position() { return this.group.position; }

    takeDamage(amount) {
        if (this.isDead) return;
        GameScore.addDamageDealt(amount);
        this.health -= amount;
        this._flashHit();
        if (this.health <= 0) this.die();
    }

    _flashHit() {
        this.emissiveMats.forEach((mat) => {
            if (!mat.emissive) return;
            const original = mat.emissive.getHex();
            mat.emissive.setHex(0xffffff);
            setTimeout(() => { if (mat.emissive) mat.emissive.setHex(original); }, 60);
        });
    }

    die() {
        this.isDead = true;
        this.audio.explosion();
        this.weaponSystem.spawnRobotDestructionEffect(this.position.clone().add(new THREE.Vector3(0, 1, 0)));
        this.scene.remove(this.group);
        // small combat-medic bonus: every few kills heals the player a bit
        if (this.player && this.player.registerKill) this.player.registerKill();
    }

    faceTarget(dt, targetPos) {
        const dir = targetPos.clone().sub(this.position);
        dir.y = 0;
        if (dir.lengthSq() < 0.001) return;
        const targetYaw = Math.atan2(dir.x, dir.z);
        this.group.rotation.y = Utils.damp(this.group.rotation.y, targetYaw, 8, dt);
    }

    // shared robot material helper: dark metallic plating with an emissive channel
    _plateMat(color) {
        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.35, emissive: 0x000000 });
        this.emissiveMats.push(mat);
        return mat;
    }
}

// ---------------- TYPE 1: COMBAT DRONE (flying, ranged) ----------------
class CombatDrone extends EnemyBase {
    constructor(scene, player, weaponSystem, audio, position) {
        super(scene, player, weaponSystem, audio, position, "drone");
        const cfg = CONFIG.DRONE;
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.hitRadius = 0.9;
        this.orbitAngle = Utils.randRange(0, Math.PI * 2);
        this.bobPhase = Utils.randRange(0, Math.PI * 2);
        this._buildModel();
    }

    _buildModel() {
        const plate = this._plateMat(0x3a4a5a);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });

        const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), plate);
        this.group.add(body);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), eyeMat);
        eye.position.set(0, 0, 0.4);
        this.group.add(eye);
        // (no eye PointLight — the emissive eye material glows on its own; extra scene lights are costly)

        // four rotor arms, each with a spinning blade pair
        this.rotors = [];
        const armMat = this._plateMat(0x24303c);
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), armMat);
            arm.rotation.z = Math.PI / 2;
            arm.position.set(sx * 0.32, 0.05, sz * 0.32);
            this.group.add(arm);

            const rotorGroup = new THREE.Group();
            rotorGroup.position.set(sx * 0.55, 0.08, sz * 0.55);
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.07), armMat);
            rotorGroup.add(blade);
            const blade2 = blade.clone();
            blade2.rotation.y = Math.PI / 2;
            rotorGroup.add(blade2);
            this.group.add(rotorGroup);
            this.rotors.push(rotorGroup);
        });

        // small weapon pod under the body
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), armMat);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(0, -0.2, 0.2);
        this.group.add(pod);
        this.weaponPod = pod;
    }

    update(dt) {
        if (this.isDead || this.player.isDead) return;
        const cfg = CONFIG.DRONE;

        this.rotors.forEach((r) => { r.rotation.y += dt * 30; });

        const toPlayer = this.player.position.clone().sub(this.position);
        const flatDist = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.z * toPlayer.z);

        this.orbitAngle += dt * 0.6;
        this.bobPhase += dt * 2.2;

        // orbit around the player at its preferred range, bobbing gently
        const desiredDist = cfg.PREFERRED_RANGE;
        let targetX, targetZ;
        if (flatDist > desiredDist + 4) {
            const dir = toPlayer.clone().setY(0).normalize();
            targetX = this.position.x + dir.x * cfg.SPEED * dt;
            targetZ = this.position.z + dir.z * cfg.SPEED * dt;
        } else {
            targetX = this.player.position.x + Math.cos(this.orbitAngle) * desiredDist;
            targetZ = this.player.position.z + Math.sin(this.orbitAngle) * desiredDist;
            const lerp = 1 - Math.exp(-dt * 2);
            targetX = Utils.lerp(this.position.x, targetX, lerp);
            targetZ = Utils.lerp(this.position.z, targetZ, lerp);
        }
        this.group.position.x = targetX;
        this.group.position.z = targetZ;
        this.group.position.y = cfg.FLY_HEIGHT + Math.sin(this.bobPhase) * 0.4;

        this.faceTarget(dt, this.player.position);

        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && flatDist < cfg.PREFERRED_RANGE + 8) {
            this.attackTimer = cfg.ATTACK_COOLDOWN;
            const origin = this.position.clone();
            const dir = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0)).sub(origin).normalize();
            this.weaponSystem.spawnEnemyProjectile(origin, dir, cfg.DAMAGE, cfg.PROJECTILE_SPEED, 0xff3355);
        }
    }
}

// ---------------- TYPE 2: COMBAT ROBOT (ground, arm blaster) ----------------
class CombatRobot extends EnemyBase {
    constructor(scene, player, weaponSystem, audio, position) {
        super(scene, player, weaponSystem, audio, position, "combat");
        const cfg = CONFIG.COMBAT_ROBOT;
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.hitRadius = 1.1;
        this._buildModel();
    }

    _buildModel() {
        const plate = this._plateMat(0x4a3a3a);
        const dark = this._plateMat(0x24201e);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6a3d });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.55), plate);
        torso.position.y = 1.25;
        this.group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), dark);
        head.position.y = 1.95;
        this.group.add(head);

        const eye = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), eyeMat);
        eye.position.set(0, 1.95, 0.21);
        this.group.add(eye);
        // (no eye PointLight — the emissive eye material glows on its own; extra scene lights are costly)

        // mechanical legs with joint spheres
        this.legs = [];
        [-1, 1].forEach((side) => {
            const legGroup = new THREE.Group();
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 8), dark);
            upper.position.set(side * 0.22, 0.75, 0);
            legGroup.add(upper);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), plate);
            knee.position.set(side * 0.22, 0.48, 0);
            legGroup.add(knee);
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8), dark);
            lower.position.set(side * 0.22, 0.22, 0);
            legGroup.add(lower);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), plate);
            foot.position.set(side * 0.22, -0.02, 0.05);
            legGroup.add(foot);
            this.group.add(legGroup);
            this.legs.push(legGroup);
        });

        // arm-mounted blaster on the right arm
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), plate);
        shoulder.position.set(0.5, 1.6, 0);
        this.group.add(shoulder);
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.65, 8), dark);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0.5, 1.45, 0.35);
        this.group.add(cannon);
        this.cannon = cannon;

        // left arm (idle)
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.55, 8), dark);
        leftArm.position.set(-0.5, 1.35, 0);
        this.group.add(leftArm);
    }

    update(dt) {
        if (this.isDead || this.player.isDead) return;
        const cfg = CONFIG.COMBAT_ROBOT;
        const toPlayer = this.player.position.clone().sub(this.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        this.faceTarget(dt, this.player.position);
        this.attackTimer -= dt;

        const walkCycle = performance.now() * 0.006;
        this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walkCycle + i * Math.PI) * 0.3; });

        if (dist > cfg.MELEE_RANGE) {
            const desired = cfg.PREFERRED_RANGE;
            if (dist > desired + 3) {
                this.group.position.addScaledVector(toPlayer.normalize(), cfg.SPEED * dt);
            } else if (dist < desired - 3) {
                this.group.position.addScaledVector(toPlayer.normalize(), -cfg.SPEED * dt);
            } else if (this.attackTimer <= 0) {
                this.attackTimer = cfg.ATTACK_COOLDOWN;
                const origin = new THREE.Vector3();
                this.cannon.getWorldPosition(origin);
                const dir = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0)).sub(origin).normalize();
                this.weaponSystem.spawnEnemyProjectile(origin, dir, cfg.DAMAGE, cfg.PROJECTILE_SPEED, 0xff6a3d);
            }
        } else if (this.attackTimer <= 0) {
            this.attackTimer = cfg.ATTACK_COOLDOWN;
            this.player.takeDamage(cfg.MELEE_DAMAGE);
        }

        const targetY = Utils.clamp(this.player.position.y * 0.4, 0, 3);
        this.group.position.y = Utils.damp(this.group.position.y, targetY, 3, dt);
    }
}

// ---------------- TYPE 3: HEAVY ROBOT (large, slow, powerful) ----------------
class HeavyRobot extends EnemyBase {
    constructor(scene, player, weaponSystem, audio, position) {
        super(scene, player, weaponSystem, audio, position, "heavy");
        const cfg = CONFIG.HEAVY_ROBOT;
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.hitRadius = 1.7;
        this.cannonTimer = Utils.randRange(1, 3);
        this._buildModel();
    }

    _buildModel() {
        const plate = this._plateMat(0x3a3a44);
        const dark = this._plateMat(0x1e1e26);
        const accent = this._plateMat(0x5a2a2a);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.0), plate);
        torso.position.y = 1.9;
        this.group.add(torso);

        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), accent);
        shoulderL.position.set(-0.95, 2.4, 0);
        this.group.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.95;
        this.group.add(shoulderR);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), dark);
        head.position.y = 2.95;
        this.group.add(head);
        const eye = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), eyeMat);
        eye.position.set(0, 2.95, 0.26);
        this.group.add(eye);
        // (no eye PointLight — the emissive eye material glows on its own; extra scene lights are costly)

        // massive shoulder cannon
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.2, 10), dark);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0.95, 2.4, 0.7);
        this.group.add(cannon);
        this.cannon = cannon;

        // thick legs
        this.legs = [];
        [-1, 1].forEach((side) => {
            const legGroup = new THREE.Group();
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.9, 8), dark);
            upper.position.set(side * 0.4, 1.1, 0);
            legGroup.add(upper);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.6), plate);
            foot.position.set(side * 0.4, 0.5, 0.08);
            legGroup.add(foot);
            this.group.add(legGroup);
            this.legs.push(legGroup);
        });
    }

    update(dt) {
        if (this.isDead || this.player.isDead) return;
        const cfg = CONFIG.HEAVY_ROBOT;
        const toPlayer = this.player.position.clone().sub(this.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        this.faceTarget(dt, this.player.position);
        this.attackTimer -= dt;
        this.cannonTimer -= dt;

        const walkCycle = performance.now() * 0.003;
        this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walkCycle + i * Math.PI) * 0.22; });

        if (dist > cfg.ATTACK_RANGE) {
            this.group.position.addScaledVector(toPlayer.normalize(), cfg.SPEED * dt);
        } else if (this.attackTimer <= 0) {
            this.attackTimer = cfg.ATTACK_COOLDOWN;
            this.player.takeDamage(cfg.DAMAGE);
            this.audio.hit();
        }

        if (this.cannonTimer <= 0) {
            this.cannonTimer = cfg.CANNON_COOLDOWN;
            const origin = new THREE.Vector3();
            this.cannon.getWorldPosition(origin);
            const dir = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0)).sub(origin).normalize();
            this.weaponSystem.spawnEnemyProjectile(origin, dir, cfg.CANNON_DAMAGE, cfg.PROJECTILE_SPEED, 0xffcc33);
        }

        const targetY = Utils.clamp(this.player.position.y * 0.3, 0, 3);
        this.group.position.y = Utils.damp(this.group.position.y, targetY, 2, dt);
    }
}
