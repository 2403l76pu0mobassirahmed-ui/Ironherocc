/* ============================================================
   FORTRESS_ENVIRONMENT.js — LEVEL 3: ROBOT STRONGHOLD
   A dark, ominous enemy fortress: a circular perimeter wall with
   towers and spikes surrounding an open central arena where the
   boss fight takes place.
   ============================================================ */

class FortressEnvironment extends EnvironmentBase {
    constructor(scene) {
        super(scene, CONFIG.WORLD.fortress);
        this._buildSky();
        this._buildGround(0x120b18, 0x3a1f4a, 0x1c1024);
        this._buildLighting(0xd6b3ff, 0x4a2a66, 0x120b18);
        this._buildClouds(0x5a3a6a);
        this._buildPerimeterWall();
        this._buildTowers();
        this._buildSpikes();
        this._buildCoreStructure();
        this._buildEmbers();
    }

    _buildPerimeterWall() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 0.7, metalness: 0.5 });
        const radius = 90;
        const segments = this.cfg.WALL_SEGMENTS;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const width = (Math.PI * 2 * radius / segments) * 1.05;
            const height = Utils.randRange(14, 22);

            const segment = this._track(new THREE.Mesh(new THREE.BoxGeometry(width, height, 3), wallMat));
            segment.position.set(x, height / 2, z);
            segment.rotation.y = -angle + Math.PI / 2;
            segment.castShadow = true;
            segment.receiveShadow = true;
            this.scene.add(segment);

            this._addCollidableBox(x, z, width, 3, height);

            // occasional glowing rune/vent on the wall
            if (Math.random() > 0.5) {
                const glowTex = Utils.makeGlowTexture("#aa44ff");
                const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xaa44ff, transparent: true, blending: THREE.AdditiveBlending });
                const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.4, 1.2), glowMat);
                glow.position.copy(segment.position);
                glow.position.y = height * 0.5;
                glow.rotation.y = segment.rotation.y;
                this._track(glow);
                this.scene.add(glow);
            }
        }
    }

    _buildTowers() {
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x2c1e38, roughness: 0.6, metalness: 0.6 });
        const radius = 90;
        for (let i = 0; i < this.cfg.TOWER_COUNT; i++) {
            const angle = (i / this.cfg.TOWER_COUNT) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = Utils.randRange(26, 34);

            const tower = this._track(new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, height, 10), towerMat));
            tower.position.set(x, height / 2, z);
            tower.castShadow = true;
            this.scene.add(tower);
            this._addCollidableBox(x, z, 6.5, 6.5, height);

            const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 10), beaconMat);
            beacon.position.set(x, height + 1, z);
            this._track(beacon);
            this.scene.add(beacon);
            // (no PointLight per tower — the unlit beacon sphere already
            // reads as glowing; 10 extra real lights would be costly)
        }
    }

    _buildSpikes() {
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.8, metalness: 0.3 });
        for (let i = 0; i < this.cfg.SPIKE_COUNT; i++) {
            const dist = Utils.randRange(20, 85);
            const angle = Utils.randRange(0, Math.PI * 2);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const height = Utils.randRange(4, 12);

            const spike = this._track(new THREE.Mesh(new THREE.ConeGeometry(1.2, height, 6), spikeMat));
            spike.position.set(x, height / 2, z);
            spike.castShadow = true;
            this.scene.add(spike);
            this._addCollidableBox(x, z, 1.8, 1.8, height);
        }
    }

    _buildCoreStructure() {
        // A central raised dais that frames the boss-fight arena.
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x2a1a38, roughness: 0.5, metalness: 0.6 });
        const dais = this._track(new THREE.Mesh(new THREE.CylinderGeometry(20, 22, 1, 24), coreMat));
        dais.position.set(0, 0.5, 0);
        dais.receiveShadow = true;
        this.scene.add(dais);

        const glowTex = Utils.makeGlowTexture("#aa44ff");
        const ringMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xaa44ff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(18, 20, 32), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 1.05;
        this._track(ring);
        this.scene.add(ring);
    }

    _buildEmbers() {
        // Slow-drifting ember particles for atmosphere.
        const glowTex = Utils.makeGlowTexture("#ff8a4d");
        const mat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a4d, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        this.embers = [];
        for (let i = 0; i < 40; i++) {
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(0.3, 0.3, 0.3);
            sprite.position.set(Utils.randRange(-80, 80), Utils.randRange(0, 20), Utils.randRange(-80, 80));
            this._track(sprite);
            this.scene.add(sprite);
            this.embers.push({ sprite, speed: Utils.randRange(0.4, 1.2) });
        }
    }

    update(dt) {
        super.update(dt);
        if (this.embers) {
            this.embers.forEach((e) => {
                e.sprite.position.y += e.speed * dt;
                if (e.sprite.position.y > 22) e.sprite.position.y = 0;
            });
        }
    }
}
