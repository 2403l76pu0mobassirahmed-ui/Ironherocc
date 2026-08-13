/* ============================================================
   INDUSTRIAL_ENVIRONMENT.js — LEVEL 2: INDUSTRIAL ASSAULT
   A large factory zone: warehouses, shipping containers, pipe
   networks, and elevated platforms that push the player to mix
   ground combat with flying.
   ============================================================ */

class IndustrialEnvironment extends EnvironmentBase {
    constructor(scene) {
        super(scene, CONFIG.WORLD.industrial);
        this._buildSky();
        this._buildGround(0x241a12, 0x4a3320, 0x1c140d);
        this._buildLighting(0xffcf9a, 0x8a6a4a, 0x241a12);
        this._buildClouds(0x8a7a6a);
        this._buildStructures();
        this._buildContainers();
        this._buildPipes();
        this._buildPlatforms();
    }

    _buildStructures() {
        const bodyColors = [0x3a2e22, 0x2e2620, 0x453626, 0x2a2018];
        const neonColors = [0xff6a3d, 0xffcf6b, 0x66ccff];
        const neonTex = Utils.makeGlowTexture("#ff6a3d");

        for (let i = 0; i < this.cfg.STRUCTURE_COUNT; i++) {
            let x, z;
            do {
                x = Utils.randRange(-170, 170);
                z = Utils.randRange(-170, 170);
            } while (Math.abs(x) < 16 && Math.abs(z) < 16);

            const width = Utils.randRange(10, 22);
            const depth = Utils.randRange(10, 22);
            const height = Utils.randRange(8, 26);

            const geo = new THREE.BoxGeometry(width, height, depth);
            const mat = new THREE.MeshStandardMaterial({
                color: bodyColors[Utils.randInt(0, bodyColors.length - 1)],
                roughness: 0.8, metalness: 0.4
            });
            const structure = this._track(new THREE.Mesh(geo, mat));
            structure.position.set(x, height / 2, z);
            structure.castShadow = true;
            structure.receiveShadow = true;
            this.scene.add(structure);

            // slanted roof detail
            const roof = new THREE.Mesh(
                new THREE.BoxGeometry(width * 1.02, 1, depth * 1.02),
                new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.9 })
            );
            roof.position.set(x, height + 0.5, z);
            this._track(roof);
            this.scene.add(roof);

            // neon warning strip
            const neonMat = new THREE.MeshBasicMaterial({
                map: neonTex, color: neonColors[Utils.randInt(0, neonColors.length - 1)],
                transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
            });
            const strip = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, 0.5), neonMat);
            strip.position.set(x, height * 0.55, z + depth / 2 + 0.05);
            this._track(strip);
            this.scene.add(strip);
            // (no PointLight per structure — the additive neon strip glows
            // on its own; dozens of extra real lights would be costly)

            this._addCollidableBox(x, z, width, depth, height);
        }
    }

    _buildContainers() {
        const colors = [0xb5451f, 0x1f6fb5, 0x4f8a3d, 0xb5951f, 0x7a1fb5];
        for (let i = 0; i < this.cfg.CONTAINER_COUNT; i++) {
            let x, z;
            do {
                x = Utils.randRange(-180, 180);
                z = Utils.randRange(-180, 180);
            } while (Math.abs(x) < 14 && Math.abs(z) < 14);
            const w = 2.4, h = 2.4, d = 6;
            const stacked = Math.random() > 0.6;

            const mat = new THREE.MeshStandardMaterial({ color: colors[Utils.randInt(0, colors.length - 1)], metalness: 0.5, roughness: 0.6 });
            const box1 = this._track(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
            box1.rotation.y = Utils.randRange(0, Math.PI * 2);
            box1.position.set(x, h / 2, z);
            box1.castShadow = true;
            this.scene.add(box1);
            this._addCollidableBox(x, z, d, w, h, 0.3);

            if (stacked) {
                const box2 = this._track(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone()));
                box2.rotation.y = box1.rotation.y;
                box2.position.set(x, h * 1.5, z);
                this.scene.add(box2);
                this._addCollidableBox(x, z, d, w, h * 2, 0.3);
            }
        }
    }

    _buildPipes() {
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x556070, metalness: 0.8, roughness: 0.3 });
        for (let i = 0; i < this.cfg.PIPE_COUNT; i++) {
            const x = Utils.randRange(-190, 190);
            const z = Utils.randRange(-190, 190);
            const length = Utils.randRange(6, 16);
            const height = Utils.randRange(2, 8);

            const pipe = this._track(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, length, 10), pipeMat));
            pipe.rotation.z = Math.PI / 2;
            pipe.rotation.y = Utils.randRange(0, Math.PI);
            pipe.position.set(x, height, z);
            pipe.castShadow = true;
            this.scene.add(pipe);

            // support struts
            [-1, 1].forEach((s) => {
                const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, height, 6), pipeMat);
                strut.position.set(x + Math.cos(pipe.rotation.y) * (length / 2) * s, height / 2, z + Math.sin(pipe.rotation.y) * (length / 2) * s);
                this._track(strut);
                this.scene.add(strut);
            });
        }
    }

    _buildPlatforms() {
        const platMat = new THREE.MeshStandardMaterial({ color: 0x2c3340, metalness: 0.6, roughness: 0.5 });
        const railMat = new THREE.MeshBasicMaterial({ color: 0xffcf6b });
        for (let i = 0; i < this.cfg.PLATFORM_COUNT; i++) {
            const x = Utils.randRange(-160, 160);
            const z = Utils.randRange(-160, 160);
            const y = Utils.randRange(8, 18);
            const w = Utils.randRange(8, 14);
            const d = Utils.randRange(8, 14);

            const platform = this._track(new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), platMat));
            platform.position.set(x, y, z);
            platform.castShadow = true;
            platform.receiveShadow = true;
            this.scene.add(platform);

            // corner rails (visual only, no collision — reachable by flight)
            const railGroup = new THREE.Group();
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), railMat);
                rail.position.set(sx * (w / 2 - 0.3), 0.9, sz * (d / 2 - 0.3));
                railGroup.add(rail);
            });
            railGroup.position.set(x, y, z);
            this._track(railGroup);
            this.scene.add(railGroup);

            // support column
            const column = this._track(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, y, 8), platMat));
            column.position.set(x, y / 2, z);
            this.scene.add(column);

            // only the column itself blocks movement — the space under the
            // elevated platform stays open so it doesn't wall off ground paths
            this._addCollidableBox(x, z, 1.2, 1.2, y);
        }
    }
}
