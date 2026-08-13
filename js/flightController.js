/* ============================================================
   FLIGHT_CONTROLLER.js — handles walking, running, jumping,
   and full 3D flight movement for the player.

   Movement axes are derived to match the FPP camera's actual
   basis (see cameraController.js): at yaw = 0 the camera looks
   down world -Z and its screen-right is world +X. Keeping these
   two formulas in that camera's frame is what keeps W/A/S/D
   feeling correct — a previous mismatch between the forward and
   strafe formulas was the cause of A/D feeling reversed.
   ============================================================ */

class FlightController {
    constructor(player, input, camera, environment, audio) {
        this.player = player;
        this.input = input;
        this.camera = camera;
        this.environment = environment;
        this.audio = audio;

        this.jetHandle = null;
        this.thrustLevel = 0; // 0..1 used to drive particle/light intensity
        this.spaceWasDown = false;
        this.wasFlying = false;
    }

    update(dt) {
        const p = this.player;
        if (p.isDead) return;

        const keys = CONFIG.KEYS;
        const forward = this.input.isDown(keys.FORWARD) ? 1 : 0;
        const back = this.input.isDown(keys.BACK) ? 1 : 0;
        const left = this.input.isDown(keys.LEFT) ? 1 : 0;
        const right = this.input.isDown(keys.RIGHT) ? 1 : 0;
        const boosting = this.input.isDown(keys.BOOST);
        const spaceDown = this.input.isDown(keys.JUMP_FLY);
        const descending = this.input.isDown(keys.DESCEND);

        // camera-relative movement axes (yaw only), matching the FPP
        // camera's real basis: forward = -Z, right = +X at yaw = 0.
        const yaw = this.camera.yaw;
        const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const strafe = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(fwd, forward - back);
        moveDir.addScaledVector(strafe, right - left);
        if (moveDir.lengthSq() > 0) moveDir.normalize();

        // ---------------- FLIGHT TOGGLE ----------------
        // tap Space on ground = jump. Hold/press Space while airborne = fly.
        const justPressedSpace = spaceDown && !this.spaceWasDown;

        if (!p.isFlying) {
            if (justPressedSpace) {
                if (p.isGrounded) {
                    // jump
                    p.velocity.y = CONFIG.PLAYER.JUMP_FORCE;
                    p.isGrounded = false;
                } else if (p.hasFlightFuel(CONFIG.FLIGHT.MIN_FLIGHT_FUEL)) {
                    // start flying mid-air
                    p.isFlying = true;
                    this._startJet();
                }
            }
        } else {
            // in-flight: Space held = ascend/boost thrust, Ctrl = descend
            if (!p.hasFlightFuel(0.1)) {
                p.isFlying = false;
                this._stopJet();
            }
        }

        if (p.isFlying) {
            this._updateFlight(dt, moveDir, spaceDown, descending, boosting);
        } else {
            this._updateGroundAndGravity(dt, moveDir, boosting);
        }

        // Landing transition: flying -> grounded. Horizontal velocity can
        // still be at flight speed (up to ~45-99) the instant this happens;
        // without clamping it here the player gets a brief, jarring burst
        // of ground speed before the ground damping catches up.
        if (this.wasFlying && !p.isFlying) {
            const flat = new THREE.Vector3(p.velocity.x, 0, p.velocity.z);
            const cap = CONFIG.PLAYER.RUN_SPEED;
            if (flat.length() > cap) {
                flat.setLength(cap);
                p.velocity.x = flat.x;
                p.velocity.z = flat.z;
            }
        }
        this.wasFlying = p.isFlying;

        // First-person: the body always faces exactly where the camera
        // looks (the model itself is invisible in FPP, but this keeps
        // weapon-origin points and any future viewmodel consistent).
        p.group.rotation.y = yaw;

        // subtle body tilt while flying forward (harmless while invisible)
        const flatVel = new THREE.Vector3(p.velocity.x, 0, p.velocity.z);
        const targetTilt = p.isFlying ? Utils.clamp(flatVel.length() / CONFIG.FLIGHT.MAX_SPEED, 0, 1) * CONFIG.FLIGHT.TILT_AMOUNT : 0;
        p.model.rotation.x = Utils.damp(p.model.rotation.x, targetTilt, 6, dt);

        this.spaceWasDown = spaceDown;

        // world bounds
        const half = CONFIG.WORLD.GROUND_SIZE / 2 - 2;
        p.group.position.x = Utils.clamp(p.group.position.x, -half, half);
        p.group.position.z = Utils.clamp(p.group.position.z, -half, half);
    }

    // Moves (x,z) by (dx,dz), sliding along building walls instead of
    // passing through them. Buildings only block below their rooftop
    // height, so flying above a building is still possible.
    _moveWithCollision(p, dx, dz) {
        const startX = p.group.position.x;
        const startZ = p.group.position.z;
        const y = p.group.position.y;

        if (!this.environment.isBlocked(startX + dx, startZ + dz, y)) {
            p.group.position.x = startX + dx;
            p.group.position.z = startZ + dz;
            return;
        }
        // slide along one axis at a time
        if (!this.environment.isBlocked(startX + dx, startZ, y)) {
            p.group.position.x = startX + dx;
            return;
        }
        if (!this.environment.isBlocked(startX, startZ + dz, y)) {
            p.group.position.z = startZ + dz;
            return;
        }
        // fully blocked — no horizontal movement this frame
    }

    _updateGroundAndGravity(dt, moveDir, boosting) {
        const p = this.player;
        const speed = boosting ? CONFIG.PLAYER.RUN_SPEED : CONFIG.PLAYER.WALK_SPEED;

        p.velocity.x = Utils.damp(p.velocity.x, moveDir.x * speed, 10, dt);
        p.velocity.z = Utils.damp(p.velocity.z, moveDir.z * speed, 10, dt);

        // gravity
        p.velocity.y += CONFIG.PLAYER.GRAVITY * dt;

        this._moveWithCollision(p, p.velocity.x * dt, p.velocity.z * dt);
        p.group.position.y += p.velocity.y * dt;

        if (p.group.position.y <= 0) {
            p.group.position.y = 0;
            p.velocity.y = 0;
            p.isGrounded = true;
        } else {
            p.isGrounded = false;
        }
    }

    _updateFlight(dt, moveDir, ascend, descend, boosting) {
        const p = this.player;
        const F = CONFIG.FLIGHT;

        const fuelCostPerSec = boosting ? F.BOOST_FUEL_COST_PER_SEC : F.FUEL_COST_PER_SEC;
        if (!p.useFlightFuel(fuelCostPerSec * dt)) {
            p.isFlying = false;
            this._stopJet();
            return;
        }

        const maxSpeed = F.MAX_SPEED * (boosting ? F.BOOST_MULTIPLIER : 1);
        const accel = F.ACCELERATION * (boosting ? 1.6 : 1);

        const desired = new THREE.Vector3();
        desired.addScaledVector(moveDir, maxSpeed);

        p.velocity.x = Utils.damp(p.velocity.x, desired.x, accel / 5, dt);
        p.velocity.z = Utils.damp(p.velocity.z, desired.z, accel / 5, dt);

        let vertical = 0;
        if (ascend) vertical += F.ASCEND_SPEED;
        if (descend) vertical -= F.DESCEND_SPEED;
        p.velocity.y = Utils.damp(p.velocity.y, vertical, 6, dt);

        this._moveWithCollision(p, p.velocity.x * dt, p.velocity.z * dt);
        p.group.position.y += p.velocity.y * dt;

        // Ground is y = 0 (same baseline as walking) so descending
        // actually reaches the floor instead of hovering at an offset.
        if (p.group.position.y <= 0) {
            p.group.position.y = 0;
            if (p.velocity.y < 0) p.velocity.y = 0;
            p.isGrounded = true;
        } else {
            p.isGrounded = false;
        }
        if (p.group.position.y > 120) p.group.position.y = 120;

        if (p.isGrounded && vertical <= 0 && !boosting && moveDir.lengthSq() < 0.01) {
            // landed and no longer pushing any direction — return to normal ground movement
            p.isFlying = false;
            this._stopJet();
        }

        // thrust intensity for visuals
        const speedRatio = new THREE.Vector3(p.velocity.x, 0, p.velocity.z).length() / maxSpeed;
        this.thrustLevel = Utils.clamp(Math.max(speedRatio, Math.abs(vertical) / F.ASCEND_SPEED), 0.15, 1);
    }

    _startJet() {
        if (this.jetHandle) return;
        this.jetHandle = this.audio.jetLoop();
    }

    _stopJet() {
        if (!this.jetHandle) return;
        this.audio.stopJetLoop(this.jetHandle);
        this.jetHandle = null;
        this.thrustLevel = 0;
    }
}
