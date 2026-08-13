/* ============================================================
   PLAYER.js — the armored hero: procedural model + health/energy.
   Movement/flight physics live in flightController.js; this file
   owns the 3D model, stats, and simple hit-reaction/death logic.
   ============================================================ */

class Player {
    constructor(scene, audio) {
        this.scene = scene;
        this.audio = audio;

        this.health = CONFIG.PLAYER.MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER.MAX_HEALTH;
        this.energy = CONFIG.PLAYER.MAX_ENERGY;             // weapons energy (repulsor / beam / special)
        this.maxEnergy = CONFIG.PLAYER.MAX_ENERGY;
        this.flightFuel = CONFIG.FLIGHT.MAX_FLIGHT_FUEL;    // separate resource just for flying
        this.maxFlightFuel = CONFIG.FLIGHT.MAX_FLIGHT_FUEL;
        this.isDead = false;
        this.invulnTimer = 0;
        this.killCount = 0;

        this.group = new THREE.Group();
        this.group.position.set(0, 0, 0);
        scene.add(this.group);

        this._buildModel();

        // exposed for other systems
        this.velocity = new THREE.Vector3();
        this.isFlying = false;
        this.isGrounded = true;
        this.lockedEnemy = null;
    }

    _buildModel() {
        const red = new THREE.MeshStandardMaterial({ color: 0xb3122a, metalness: 0.75, roughness: 0.3 });
        const gold = new THREE.MeshStandardMaterial({ color: 0xffbe4d, metalness: 0.9, roughness: 0.25 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.95 });

        const body = new THREE.Group();

        // torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.7), red);
        torso.position.y = 1.55;
        body.add(torso);

        // chest core (arc reactor equivalent, original design)
        const core = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), glowMat);
        core.position.set(0, 1.65, 0.36);
        body.add(core);
        this.chestCore = core;
        this.chestCoreLight = new THREE.PointLight(0x8fe8ff, 1.2, 4);
        this.chestCoreLight.position.copy(core.position);
        body.add(this.chestCoreLight);

        // abdomen
        const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.6), gold);
        abdomen.position.y = 0.78;
        body.add(abdomen);

        // helmet/head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), red);
        head.position.y = 2.45;
        body.add(head);
        const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.05), gold);
        faceplate.position.set(0, 2.42, 0.29);
        body.add(faceplate);
        const eyeL = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), glowMat);
        eyeL.position.set(-0.12, 2.46, 0.32);
        body.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        body.add(eyeR);

        // shoulders
        const shoulderGeo = new THREE.SphereGeometry(0.32, 12, 12);
        const shoulderL = new THREE.Mesh(shoulderGeo, gold);
        shoulderL.position.set(-0.75, 2.05, 0);
        body.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.75;
        body.add(shoulderR);

        // arms (upper + lower) with hand thrusters/palm emitters
        this.armL = this._buildArm(red, gold, glowMat, -1);
        this.armR = this._buildArm(red, gold, glowMat, 1);
        body.add(this.armL.group, this.armR.group);

        // legs
        this.legL = this._buildLeg(red, gold, glowMat, -1);
        this.legR = this._buildLeg(red, gold, glowMat, 1);
        body.add(this.legL.group, this.legR.group);

        this.group.add(body);
        this.model = body;
        // (removed a second player light here — the chest core light
        // above is enough, and it's invisible anyway since the body is
        // hidden in first-person view)
    }

    _buildArm(red, gold, glowMat, side) {
        const group = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.6, 8), red);
        upper.position.set(0.75 * side, 1.75, 0);
        group.add(upper);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.55, 8), gold);
        lower.position.set(0.75 * side, 1.2, 0);
        group.add(lower);
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.28), red);
        hand.position.set(0.75 * side, 0.85, 0.05);
        group.add(hand);
        const palmGlow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), glowMat);
        palmGlow.position.set(0.75 * side, 0.85, 0.2);
        group.add(palmGlow);
        return { group, hand, palmGlow };
    }

    _buildLeg(red, gold, glowMat, side) {
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, metalness: 0.6, roughness: 0.4 });
        const group = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.7, 8), red);
        upper.position.set(0.28 * side, 0.55, 0);
        group.add(upper);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.65, 8), gold);
        lower.position.set(0.28 * side, -0.1, 0);
        group.add(lower);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.42), bootMat);
        boot.position.set(0.28 * side, -0.5, 0.05);
        group.add(boot);
        const thruster = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), glowMat);
        thruster.rotation.x = Math.PI / 2;
        thruster.position.set(0.28 * side, -0.58, 0);
        group.add(thruster);
        return { group, thruster };
    }

    get position() { return this.group.position; }

    takeDamage(amount) {
        if (this.isDead || this.invulnTimer > 0) return;
        GameScore.addDamageTaken(amount);
        this.health = Utils.clamp(this.health - amount, 0, this.maxHealth);
        this.invulnTimer = 0.15;
        this.audio.hit();
        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        this.health = Utils.clamp(this.health + amount, 0, this.maxHealth);
    }

    // Called by the game/level manager whenever an enemy dies. Every
    // CONFIG.PLAYER.KILLS_PER_HEAL kills grants a small health bonus.
    registerKill() {
        this.killCount++;
        if (this.killCount % CONFIG.PLAYER.KILLS_PER_HEAL === 0) {
            this.heal(CONFIG.PLAYER.KILL_HEAL_AMOUNT);
        }
    }

    // "Iron Guardian Protocol" — the suit powers up when the final boss
    // arrives: max health increases and the extra HP is granted
    // immediately (not just headroom to regen into). Always computed
    // from the base CONFIG value rather than compounding on itself, so
    // calling this more than once (e.g. retrying the boss level) is safe.
    applyMaxHealthBoost(multiplier) {
        const oldMax = this.maxHealth;
        this.maxHealth = Math.round(CONFIG.PLAYER.MAX_HEALTH * multiplier);
        this.health = Utils.clamp(this.health + (this.maxHealth - oldMax), 0, this.maxHealth);
    }

    resetMaxHealth() {
        this.maxHealth = CONFIG.PLAYER.MAX_HEALTH;
        this.health = Utils.clamp(this.health, 0, this.maxHealth);
    }

    // ---------------- weapons energy (repulsor / chest beam / special) ----------------
    useEnergy(amount) {
        if (this.energy < amount) return false;
        this.energy -= amount;
        return true;
    }

    hasEnergy(amount) {
        return this.energy >= amount;
    }

    // ---------------- flight fuel (separate resource, flying only) ----------------
    useFlightFuel(amount) {
        if (this.flightFuel < amount) return false;
        this.flightFuel -= amount;
        return true;
    }

    hasFlightFuel(amount) {
        return this.flightFuel >= amount;
    }

    die() {
        this.isDead = true;
        this.health = 0;
    }

    respawn(position) {
        this.isDead = false;
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.flightFuel = this.maxFlightFuel;
        this.killCount = 0;
        this.velocity.set(0, 0, 0);
        this.group.position.copy(position || new THREE.Vector3(0, 0, 0));
        this.group.rotation.set(0, 0, 0);
    }

    update(dt) {
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (!this.isDead) {
            // Weapons energy always regenerates now — flying no longer
            // draws from this pool, so there's no conflict to gate it against.
            this.energy = Utils.clamp(this.energy + CONFIG.PLAYER.ENERGY_REGEN_PER_SEC * dt, 0, this.maxEnergy);
            // Flight fuel only refills while grounded — it's a hard
            // resource that only goes down while you're in the air.
            if (!this.isFlying) {
                this.flightFuel = Utils.clamp(this.flightFuel + CONFIG.FLIGHT.FUEL_REGEN_PER_SEC * dt, 0, this.maxFlightFuel);
            }
        }
        // chest core pulse
        const pulse = 0.8 + Math.sin(performance.now() * 0.005) * 0.2;
        this.chestCoreLight.intensity = 1.0 * pulse;
    }
}
