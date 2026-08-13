/* ============================================================
   CONFIG.js
   All tunable settings for IRON HERO live here.
   Change key bindings, speeds, damage values, etc. in one place.
   ============================================================ */

const CONFIG = {

    // ---------------- KEY BINDINGS ----------------
    // Values are JavaScript KeyboardEvent.code strings.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
    KEYS: {
        // Each movement direction accepts multiple key codes — WASD and
        // the arrow keys both work, at the same time if you like. This
        // also means a single glitchy/stuck key on one binding doesn't
        // take the whole direction out.
        FORWARD:      ["KeyW", "ArrowUp"],
        BACK:         ["KeyS", "ArrowDown"],
        LEFT:         ["KeyA", "ArrowLeft"],
        RIGHT:        ["KeyD", "ArrowRight"],
        JUMP_FLY:     "Space",
        BOOST:        "ShiftLeft",
        CHEST_BEAM:   "KeyE",
        LOCK_ON:      "KeyQ",
        SPECIAL:      "KeyR",
        PAUSE:        "Escape",
        // "C" instead of Left Ctrl — Ctrl+W closes the browser tab in
        // most browsers when locally hosting/testing, which made holding
        // Ctrl to descend a real hazard. C has no such conflict.
        DESCEND:      "KeyC"   // extra: hold to descend while flying
    },

    MOUSE: {
        REPULSOR: 0,   // left click
        AIM:      2    // right click
    },

    // ---------------- PLAYER ----------------
    PLAYER: {
        MAX_HEALTH: 125,          // +25% from the original 100
        MAX_ENERGY: 100,          // weapons-only energy (repulsor / chest beam / special)
        ENERGY_REGEN_PER_SEC: 8,
        WALK_SPEED: 8,
        RUN_SPEED: 14,
        JUMP_FORCE: 9,
        GRAVITY: -22,
        TURN_SPEED: 10,          // how quickly the model rotates to face movement
        HOVER_HEIGHT: 0.0,       // ground offset

        // Small combat-medic bonus: every N enemy kills heals the player
        // a bit, on top of the per-level heal below.
        KILLS_PER_HEAL: 4,
        KILL_HEAL_AMOUNT: 15
    },

    // ---------------- FLIGHT ----------------
    // Flight now draws from its own fuel pool (MAX_FLIGHT_FUEL), entirely
    // separate from the weapons energy pool above — flying no longer
    // competes with shooting for the same resource.
    FLIGHT: {
        TAKEOFF_FORCE: 10,
        ASCEND_SPEED: 12,
        DESCEND_SPEED: 10,
        FORWARD_SPEED: 20,
        BOOST_MULTIPLIER: 2.2,
        MAX_SPEED: 45,
        ACCELERATION: 30,
        DRAG: 3.0,               // air resistance, higher = snappier stop
        TILT_AMOUNT: 0.35,       // radians, how much the suit tilts when flying
        MAX_FLIGHT_FUEL: 100,
        FUEL_REGEN_PER_SEC: 10,  // only refills while grounded
        FUEL_COST_PER_SEC: 6,
        BOOST_FUEL_COST_PER_SEC: 16,
        MIN_FLIGHT_FUEL: 5       // can't take off below this fuel level
    },

    // ---------------- WEAPONS ----------------
    WEAPONS: {
        REPULSOR: {
            DAMAGE: 8,
            COOLDOWN: 0.18,
            SPEED: 60,
            ENERGY_COST: 3,
            RANGE: 80,
            COLOR: 0x66ccff
        },
        CHEST_BEAM: {
            DAMAGE_PER_SEC: 60,
            CHARGE_TIME: 0.6,
            ENERGY_COST_PER_SEC: 30,
            RANGE: 60,
            COLOR: 0xfff2a8
        },
        SPECIAL: {
            DAMAGE: 60,
            COOLDOWN: 8,
            ENERGY_COST: 40,
            BLAST_RADIUS: 14,
            COLOR: 0xff6a3d
        }
    },

    // ---------------- LEGACY MISSION (v1, still used by current build) ----------------
    ENEMY_BASIC: {
        HEALTH: 40,
        SPEED: 4.5,
        DAMAGE: 6,
        ATTACK_RANGE: 2.5,
        ATTACK_COOLDOWN: 1.2,
        SCORE: 10
    },
    ENEMY_RANGED: {
        HEALTH: 30,
        SPEED: 3.5,
        DAMAGE: 8,
        PREFERRED_RANGE: 18,
        ATTACK_COOLDOWN: 1.8,
        PROJECTILE_SPEED: 26,
        SCORE: 15
    },
    BOSS: {
        HEALTH: 600,
        SPEED: 5,
        DAMAGE: 18,
        ATTACK_RANGE: 6,
        ATTACK_COOLDOWN: 2.2,
        SCORE: 200,
        SCALE: 2.6
    },
    MISSION: {
        WAVES: [
            { basic: 3, ranged: 0 },
            { basic: 3, ranged: 2 },
            { basic: 4, ranged: 2 }
        ],
        BOSS_AFTER_WAVES: true,
        SPAWN_RADIUS_MIN: 25,
        SPAWN_RADIUS_MAX: 45
    },

    // ---------------- ROBOT ENEMIES ----------------
    // Type 1 — Combat Drone: small flying robot, ranged, low health.
    DRONE: {
        HEALTH: 22,
        SPEED: 7,
        DAMAGE: 5,
        PREFERRED_RANGE: 14,
        ATTACK_COOLDOWN: 1.4,
        PROJECTILE_SPEED: 28,
        FLY_HEIGHT: 4.5,
        SCORE: 10
    },
    // Type 2 — Combat Robot: medium ground robot, arm-mounted blaster.
    COMBAT_ROBOT: {
        HEALTH: 45,
        SPEED: 4.2,
        DAMAGE: 9,
        PREFERRED_RANGE: 16,
        ATTACK_COOLDOWN: 1.6,
        PROJECTILE_SPEED: 24,
        MELEE_RANGE: 2.4,
        MELEE_DAMAGE: 7,
        SCORE: 15
    },
    // Type 3 — Heavy Robot: large, slow, powerful, occasional cannon shot.
    HEAVY_ROBOT: {
        HEALTH: 110,
        SPEED: 2.6,
        DAMAGE: 16,
        ATTACK_RANGE: 3.2,
        ATTACK_COOLDOWN: 2.0,
        CANNON_COOLDOWN: 3.5,
        CANNON_DAMAGE: 14,
        PROJECTILE_SPEED: 20,
        SCORE: 30
    },
    // Type 4 — Boss Robot: huge multi-phase war machine (Level 3 final boss).
    BOSS_ROBOT: {
        HEALTH: 900,
        SPEED: 10,             // was 4.2 — the boss now closes distance fast, matching the player's run speed when enraged
        MELEE_DAMAGE: 20,
        MELEE_RANGE: 6.5,
        MELEE_COOLDOWN: 2.0,
        RANGED_DAMAGE: 10,
        RANGED_COOLDOWN: 3.2,
        PROJECTILE_SPEED: 22,
        SPECIAL_DAMAGE: 34,
        SPECIAL_COOLDOWN: 9,
        SPECIAL_RADIUS: 12,
        SCALE: 3.2,
        SCORE: 500
    },

    // ---------------- LEVELS ----------------
    // Each level defines its enemy waves, environment theme, and the
    // objective marker location the player must reach after clearing
    // enemies (except level 3, which ends when the boss dies).
    // One combined wave per level (no more multi-wave "cleared, more
    // incoming" pauses within a level) — all of a level's non-boss
    // enemies spawn together right at the start.
    LEVELS: [
        {
            NUMBER: 1,
            NAME: "CITY DEFENSE",
            THEME: "city",
            OBJECTIVE_CLEAR: "Destroy all combat robots",
            OBJECTIVE_REACH: "Reach the extraction beacon",
            WAVES: [
                { drone: 2, combat: 3, heavy: 0 }
            ],
            SPAWN_RADIUS_MIN: 22,
            SPAWN_RADIUS_MAX: 40,
            HAS_BOSS: false
        },
        {
            NUMBER: 2,
            NAME: "INDUSTRIAL ASSAULT",
            THEME: "industrial",
            OBJECTIVE_CLEAR: "Destroy all combat robots",
            OBJECTIVE_REACH: "Reach the factory core",
            WAVES: [
                { drone: 2, combat: 5, heavy: 2 }
            ],
            SPAWN_RADIUS_MIN: 24,
            SPAWN_RADIUS_MAX: 42,
            HAS_BOSS: false
        },
        {
            NUMBER: 3,
            NAME: "ROBOT STRONGHOLD",
            THEME: "fortress",
            OBJECTIVE_CLEAR: "Destroy all combat robots",
            OBJECTIVE_REACH: null,
            WAVES: [
                { drone: 1, combat: 4, heavy: 2 }
            ],
            SPAWN_RADIUS_MIN: 22,
            SPAWN_RADIUS_MAX: 38,
            HAS_BOSS: true
        }
    ],

    // ---------------- CAMERA ----------------
    CAMERA: {
        DISTANCE: 8,
        HEIGHT: 3,
        LOOK_HEIGHT: 1.6,
        SMOOTHING: 6,
        MOUSE_SENSITIVITY: 0.0022,
        MIN_PITCH: -1.1,
        MAX_PITCH: 1.0
    },

    // ---------------- WORLD (per-theme density/atmosphere settings) ----------------
    // Object counts are kept deliberately modest — every extra mesh is
    // another draw call, and WebGL performance is much more sensitive to
    // draw-call count than to any single object's complexity.
    WORLD: {
        GROUND_SIZE: 400,
        city: {
            BUILDING_COUNT: 36,
            STREET_LIGHT_COUNT: 22,
            VEHICLE_COUNT: 10,
            FOG_COLOR: 0x0a0e1a,
            FOG_NEAR: 60,
            FOG_FAR: 260,
            SKY_TOP: 0x0b1030,
            SKY_BOTTOM: 0x35406b
        },
        industrial: {
            STRUCTURE_COUNT: 26,
            CONTAINER_COUNT: 28,
            PIPE_COUNT: 14,
            PLATFORM_COUNT: 8,
            FOG_COLOR: 0x140f0c,
            FOG_NEAR: 50,
            FOG_FAR: 220,
            SKY_TOP: 0x241a12,
            SKY_BOTTOM: 0x4a3320
        },
        fortress: {
            WALL_SEGMENTS: 20,
            TOWER_COUNT: 8,
            SPIKE_COUNT: 18,
            FOG_COLOR: 0x0d0810,
            FOG_NEAR: 40,
            FOG_FAR: 200,
            SKY_TOP: 0x150a1c,
            SKY_BOTTOM: 0x3a1530
        }
    },

    // ---------------- TIMER ----------------
    TIMER: {
        BEST_TIME_STORAGE_KEY: "ironHero_bestTime_ms"
    }
};

