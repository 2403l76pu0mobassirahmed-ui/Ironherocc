/* ============================================================
   WEAPONS.js — Repulsor blasts, Chest Beam, and Special Attack.
   Handles projectile spawning, travel, hit detection, damage,
   impact effects, and cooldown/energy bookkeeping.
   ============================================================ */

class WeaponSystem {
    constructor(scene, player, camera, audio, enemyProvider, uiRef) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.audio = audio;
        this.getEnemies = enemyProvider; // function returning live enemy array
        this.ui = uiRef;

        this.projectiles = [];      // repulsor bolts
        this.enemyProjectiles = []; // projectiles fired at the player (managed here for simplicity)
        this.particles = [];        // small impact/thruster particles
        this.debris = [];           // tumbling robot-destruction chunks

        this.repulsorCooldown = 0;
        this.specialCooldown = 0;

        this.chestBeamActive = false;
        this.chestBeamCharge = 0;
        this.chestBeamAudioHandle = null;
        this.beamMesh = this._createBeamMesh();
        this.beamMesh.visible = false;
        scene.add(this.beamMesh);

        this.glowTex = Utils.makeGlowTexture("#66ccff");

        // "Iron Guardian Protocol" power-up multipliers, applied when the
        // final boss arrives (see activateBossPowerUp). 1 = no bonus.
        this.damageMultiplier = 1;
        this.rangeMultiplier = 1;
    }

    // Called once when the Level 3 boss shows up: boosts damage and range
    // on every weapon. Safe to call more than once (e.g. retrying the
    // boss level) since it always SETS the multiplier rather than
    // compounding it.
    activateBossPowerUp(multiplier = 1.25) {
        this.damageMultiplier = multiplier;
        this.rangeMultiplier = multiplier;
    }

    resetPowerUps() {
        this.damageMultiplier = 1;
        this.rangeMultiplier = 1;
    }

    _createBeamMesh() {
        // Built so the beam extends along the mesh's local -Z axis,
        // matching Object3D.lookAt()'s -Z-faces-target convention.
        const geo = new THREE.CylinderGeometry(0.25, 0.55, 1, 12, 1, true);
        geo.rotateX(Math.PI / 2);
        geo.translate(0, 0, -0.5);
        const mat = new THREE.MeshBasicMaterial({
            color: CONFIG.WEAPONS.CHEST_BEAM.COLOR,
            transparent: true, opacity: 0.75,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        return new THREE.Mesh(geo, mat);
    }

    update(dt, input) {
        this.repulsorCooldown = Math.max(0, this.repulsorCooldown - dt);
        this.specialCooldown = Math.max(0, this.specialCooldown - dt);

        this._handleRepulsor(dt, input);
        this._handleChestBeam(dt, input);
        this._handleSpecial(dt, input);
        this._updateProjectiles(dt);
        this._updateParticles(dt);
    }

    // ---------------- REPULSOR ----------------
    _handleRepulsor(dt, input) {
        const firing = input.isMouseDown(CONFIG.MOUSE.REPULSOR);
        if (!firing || this.repulsorCooldown > 0 || this.player.isDead) return;
        const cfg = CONFIG.WEAPONS.REPULSOR;
        if (!this.player.useEnergy(cfg.ENERGY_COST)) return;

        this.repulsorCooldown = cfg.COOLDOWN;
        this.audio.repulsor();

        const dir = this.camera.getAimDirection();
        [this.player.armL, this.player.armR].forEach((arm) => {
            const worldPos = new THREE.Vector3();
            arm.hand.getWorldPosition(worldPos);
            this._spawnRepulsorBolt(worldPos, dir);
            this._flashPalm(arm.palmGlow);
        });
    }

    _flashPalm(palmMesh) {
        palmMesh.material.color.setHex(0xffffff);
        setTimeout(() => { if (palmMesh.material) palmMesh.material.color.setHex(0x8fe8ff); }, 80);
    }

    _spawnRepulsorBolt(position, direction) {
        const cfg = CONFIG.WEAPONS.REPULSOR;
        const geo = new THREE.SphereGeometry(0.14, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: cfg.COLOR, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);
        // No real-time light here on purpose: repulsor bolts fire very
        // frequently, and a PointLight per bolt is a major performance
        // cost (every extra scene light adds work for every lit surface,
        // every frame). The additive MeshBasicMaterial glow is enough.

        this.projectiles.push({
            mesh, direction: direction.clone(), speed: cfg.SPEED,
            damage: cfg.DAMAGE * this.damageMultiplier,
            life: (cfg.RANGE * this.rangeMultiplier) / cfg.SPEED,
            owner: "player"
        });
    }

    // ---------------- CHEST BEAM ----------------
    _handleChestBeam(dt, input) {
        const held = input.isDown(CONFIG.KEYS.CHEST_BEAM);
        const cfg = CONFIG.WEAPONS.CHEST_BEAM;

        if (held && !this.player.isDead && this.player.hasEnergy(1)) {
            this.chestBeamCharge = Math.min(cfg.CHARGE_TIME, this.chestBeamCharge + dt);
            if (this.chestBeamCharge >= cfg.CHARGE_TIME) {
                if (!this.player.useEnergy(cfg.ENERGY_COST_PER_SEC * dt)) {
                    this._stopChestBeam();
                    return;
                }
                this._fireChestBeam(dt);
            }
        } else {
            this._stopChestBeam();
        }
    }

    _fireChestBeam(dt) {
        const cfg = CONFIG.WEAPONS.CHEST_BEAM;
        const range = cfg.RANGE * this.rangeMultiplier;
        if (!this.chestBeamActive) {
            this.chestBeamActive = true;
            this.beamMesh.visible = true;
            this.chestBeamAudioHandle = this.audio.chestBeam();
        }

        const origin = new THREE.Vector3();
        this.player.chestCore.getWorldPosition(origin);
        const dir = this.camera.getAimDirection();

        this.beamMesh.position.copy(origin);
        this.beamMesh.lookAt(origin.clone().add(dir));
        this.beamMesh.scale.set(1, 1, range);

        // damage everything within a narrow cone along dir
        const enemies = this.getEnemies();
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            const toEnemy = enemy.position.clone().sub(origin);
            const dist = toEnemy.length();
            if (dist > range) continue;
            const angle = toEnemy.normalize().angleTo(dir);
            if (angle < 0.22) {
                enemy.takeDamage(cfg.DAMAGE_PER_SEC * dt * this.damageMultiplier);
                this._spawnImpactParticles(enemy.position.clone(), cfg.COLOR);
            }
        }
    }

    _stopChestBeam() {
        this.chestBeamCharge = 0;
        if (this.chestBeamActive) {
            this.chestBeamActive = false;
            this.beamMesh.visible = false;
            this.audio.stopChestBeam(this.chestBeamAudioHandle);
            this.chestBeamAudioHandle = null;
        }
    }

    // ---------------- SPECIAL ATTACK ----------------
    _handleSpecial(dt, input) {
        if (!input.isDown(CONFIG.KEYS.SPECIAL)) return;
        if (this.specialCooldown > 0 || this.player.isDead) return;
        const cfg = CONFIG.WEAPONS.SPECIAL;
        if (!this.player.useEnergy(cfg.ENERGY_COST)) return;

        this.specialCooldown = cfg.COOLDOWN;
        this.audio.explosion();

        // Aerial missile strike: several homing-ish explosive projectiles
        // toward nearby enemies (or straight ahead if none in range).
        const enemies = this.getEnemies().filter(e => !e.isDead);
        const origin = this.player.position.clone().add(new THREE.Vector3(0, 2, 0));
        const dir = this.camera.getAimDirection();

        if (enemies.length === 0) {
            this._spawnMissile(origin, dir, null, cfg);
        } else {
            const targets = enemies
                .sort((a, b) => a.position.distanceTo(this.player.position) - b.position.distanceTo(this.player.position))
                .slice(0, 4);
            targets.forEach((t, i) => {
                setTimeout(() => this._spawnMissile(origin.clone(), dir, t, cfg), i * 120);
            });
        }
    }

    _spawnMissile(origin, dir, target, cfg) {
        // Cone apex points along local -Z so it faces the travel
        // direction after mesh.lookAt() in the update loop below.
        const geo = new THREE.ConeGeometry(0.15, 0.6, 8);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: cfg.COLOR });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(origin);
        this.scene.add(mesh);
        // (no per-projectile light — see note in _spawnRepulsorBolt)

        this.projectiles.push({
            mesh, direction: dir.clone(), speed: 22, damage: cfg.DAMAGE * this.damageMultiplier,
            life: 4, owner: "player", homingTarget: target, blastRadius: cfg.BLAST_RADIUS, isMissile: true
        });
    }

    // ---------------- ENEMY PROJECTILES (fired by ranged enemies) ----------------
    spawnEnemyProjectile(position, direction, damage, speed, color = 0xff5566) {
        const geo = new THREE.SphereGeometry(0.16, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);
        // (no per-projectile light — see note in _spawnRepulsorBolt)
        this.enemyProjectiles.push({ mesh, direction: direction.clone(), speed, damage, life: 4 });
    }

    // ---------------- UPDATE LOOP ----------------
    _updateProjectiles(dt) {
        // player projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;

            if (p.isMissile && p.homingTarget && !p.homingTarget.isDead) {
                const toTarget = p.homingTarget.position.clone().sub(p.mesh.position).normalize();
                p.direction.lerp(toTarget, 0.06).normalize();
            }

            p.mesh.position.addScaledVector(p.direction, p.speed * dt);
            p.mesh.lookAt(p.mesh.position.clone().add(p.direction));

            let hit = false;
            const enemies = this.getEnemies();
            for (const enemy of enemies) {
                if (enemy.isDead) continue;
                if (enemy.position.distanceTo(p.mesh.position) < (enemy.hitRadius || 1.2)) {
                    if (p.blastRadius) {
                        this._explodeAt(p.mesh.position.clone(), p.blastRadius, p.damage);
                    } else {
                        enemy.takeDamage(p.damage);
                        this._spawnImpactParticles(p.mesh.position.clone(), 0x66ccff);
                    }
                    hit = true;
                    break;
                }
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        // enemy projectiles -> player
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.direction, p.speed * dt);

            let hit = false;
            if (!this.player.isDead && p.mesh.position.distanceTo(this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0))) < 1.1) {
                this.player.takeDamage(p.damage);
                this._spawnImpactParticles(p.mesh.position.clone(), 0xff5566);
                hit = true;
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    _explodeAt(position, radius, damage) {
        this.audio.explosion();
        this._spawnImpactParticles(position, 0xff6a3d, 24);
        const enemies = this.getEnemies();
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            const dist = enemy.position.distanceTo(position);
            if (dist <= radius) {
                enemy.takeDamage(damage * (1 - dist / radius));
            }
        }
        if (this.player.position.distanceTo(position) <= radius) {
            // special attack shouldn't hurt the player; only enemies take blast damage
        }
    }

    _spawnImpactParticles(position, colorHex, count = 8) {
        const mat = new THREE.SpriteMaterial({ map: this.glowTex, color: colorHex, transparent: true, blending: THREE.AdditiveBlending });
        for (let i = 0; i < count; i++) {
            const sprite = new THREE.Sprite(mat.clone());
            sprite.scale.set(0.4, 0.4, 0.4);
            sprite.position.copy(position);
            this.scene.add(sprite);
            const vel = new THREE.Vector3(Utils.randRange(-1, 1), Utils.randRange(0, 1.5), Utils.randRange(-1, 1)).multiplyScalar(4);
            this.particles.push({ sprite, vel, life: 0.5 });
        }
    }

    // A "robot exploding" effect used when any enemy dies: a bright flash
    // sprite (not a real light — cheap), a burst of spark particles, and
    // tumbling metal debris chunks that fall under gravity and fade out.
    spawnRobotDestructionEffect(position) {
        this._spawnImpactParticles(position, 0xffcf6b, 10);
        this._spawnImpactParticles(position, 0xff6a3d, 6);

        const flashMat = new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffcf6b, transparent: true, blending: THREE.AdditiveBlending });
        const flash = new THREE.Sprite(flashMat);
        flash.scale.set(2.5, 2.5, 2.5);
        flash.position.copy(position);
        this.scene.add(flash);
        this.particles.push({ sprite: flash, vel: new THREE.Vector3(), life: 0.25, isFlash: true });

        const debrisMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4, transparent: true });
        for (let i = 0; i < 5; i++) {
            const size = Utils.randRange(0.08, 0.22);
            const chunk = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), debrisMat.clone());
            chunk.position.copy(position);
            this.scene.add(chunk);
            const vel = new THREE.Vector3(Utils.randRange(-1, 1), Utils.randRange(1, 3), Utils.randRange(-1, 1)).multiplyScalar(3.5);
            const angularVel = new THREE.Vector3(Utils.randRange(-6, 6), Utils.randRange(-6, 6), Utils.randRange(-6, 6));
            this.debris.push({ mesh: chunk, vel, angularVel, life: 1.4 });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            const fadeWindow = p.isFlash ? 0.25 : 0.5;
            p.sprite.position.addScaledVector(p.vel, dt);
            p.sprite.material.opacity = Utils.clamp(p.life / fadeWindow, 0, 1);
            p.sprite.scale.multiplyScalar(p.isFlash ? 0.88 : 0.96);
            if (p.life <= 0) {
                this.scene.remove(p.sprite);
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.life -= dt;
            d.vel.y -= 9.8 * dt;
            d.mesh.position.addScaledVector(d.vel, dt);
            d.mesh.rotation.x += d.angularVel.x * dt;
            d.mesh.rotation.y += d.angularVel.y * dt;
            d.mesh.rotation.z += d.angularVel.z * dt;
            if (d.mesh.position.y < 0) { d.mesh.position.y = 0; d.vel.y = 0; d.vel.x *= 0.8; d.vel.z *= 0.8; }
            d.mesh.material.opacity = Utils.clamp(d.life / 1.4, 0, 1);
            if (d.life <= 0) {
                this.scene.remove(d.mesh);
                this.debris.splice(i, 1);
            }
        }
    }
}
