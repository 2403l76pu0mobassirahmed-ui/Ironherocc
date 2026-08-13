/* ============================================================
   CITY_ENVIRONMENT.js — LEVEL 1: CITY DEFENSE
   ============================================================ */

class CityEnvironment extends EnvironmentBase {
    constructor(scene) {
        super(scene, CONFIG.WORLD.city);
        this._buildSky();
        this._buildGround();
        this._buildLighting();
        this._buildClouds();
        this._buildRoads();
        this._buildBuildings();
        this._buildStreetLights();
        this._buildVehicles();
    }

    _buildRoads() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.8 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcf6b });
        const roadWidth = 14;
        const roadLen = CONFIG.WORLD.GROUND_SIZE;

        const roadA = this._track(new THREE.Mesh(new THREE.PlaneGeometry(roadLen, roadWidth), roadMat));
        roadA.rotation.x = -Math.PI / 2;
        roadA.position.y = 0.02;
        this.scene.add(roadA);

        const roadB = this._track(roadA.clone());
        roadB.rotation.z = Math.PI / 2;
        this.scene.add(roadB);

        const dashGroup = new THREE.Group();
        // Wider spacing (20 instead of 8) means far fewer dash meshes for
        // the same visual effect — each one is a separate draw call.
        for (let i = -roadLen / 2; i < roadLen / 2; i += 20) {
            const dashA = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.4), lineMat);
            dashA.rotation.x = -Math.PI / 2;
            dashA.position.set(i, 0.03, 0);
            dashGroup.add(dashA);

            const dashB = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), lineMat);
            dashB.rotation.x = -Math.PI / 2;
            dashB.position.set(0, 0.03, i);
            dashGroup.add(dashB);
        }
        this._track(dashGroup);
        this.scene.add(dashGroup);
    }

    _buildBuildings() {
        const colors = [0x2b3350, 0x232a45, 0x30395c, 0x1d2338, 0x3a4370];
        const glowTex = Utils.makeGlowTexture("#8fd3ff");

        for (let i = 0; i < this.cfg.BUILDING_COUNT; i++) {
            let x, z;
            do {
                x = Utils.randRange(-160, 160);
                z = Utils.randRange(-160, 160);
            } while (Math.abs(x) < 12 || Math.abs(z) < 12);

            const width = Utils.randRange(6, 14);
            const depth = Utils.randRange(6, 14);
            const height = Utils.randRange(10, 55);

            const geo = new THREE.BoxGeometry(width, height, depth);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[Utils.randInt(0, colors.length - 1)],
                roughness: 0.6, metalness: 0.3
            });
            const building = this._track(new THREE.Mesh(geo, mat));
            building.position.set(x, height / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            const windowMat = new THREE.MeshBasicMaterial({
                map: glowTex, color: Math.random() > 0.5 ? 0x8fd3ff : 0xffd27a,
                transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
            });
            const stripGroup = new THREE.Group();
            const rows = Math.floor(height / 4);
            for (let r = 1; r < rows; r++) {
                if (Math.random() > 0.45) continue;
                const strip = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, 0.6), windowMat);
                strip.position.set(x, r * 4, z + depth / 2 + 0.05);
                stripGroup.add(strip);
            }
            this._track(stripGroup);
            this.scene.add(stripGroup);

            this._addCollidableBox(x, z, width, depth, height);
        }
    }

    _buildStreetLights() {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4d, metalness: 0.6, roughness: 0.4 });
        const lightGlow = Utils.makeGlowTexture("#ffe28a");
        for (let i = 0; i < this.cfg.STREET_LIGHT_COUNT; i++) {
            const alongRoadA = Math.random() > 0.5;
            const t = Utils.randRange(-190, 190);
            const side = Math.random() > 0.5 ? 1 : -1;
            let x, z;
            if (alongRoadA) { x = t; z = side * 9; } else { x = side * 9; z = t; }

            const group = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), poleMat);
            pole.position.y = 3;
            group.add(pole);

            const armLen = 1.4;
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, armLen, 6), poleMat);
            arm.rotation.z = Math.PI / 2;
            arm.position.set(armLen / 2 * -side, 5.8, 0);
            group.add(arm);

            const lampMat = new THREE.MeshBasicMaterial({ map: lightGlow, color: 0xffe28a, transparent: true, blending: THREE.AdditiveBlending });
            const lamp = new THREE.Sprite(lampMat);
            lamp.scale.set(1.2, 1.2, 1.2);
            lamp.position.set(-armLen * -side, 5.7, 0);
            group.add(lamp);
            // (no PointLight here — the additive-blended sprite already
            // reads as a glowing lamp; a real light per street light,
            // times dozens of them, is a major performance cost)

            group.position.set(x, 0, z);
            this._track(group);
            this.scene.add(group);
        }
    }

    _buildVehicles() {
        const bodyColors = [0x555b6e, 0x2f3348, 0x7a1f2b, 0x1f4a3f, 0x3d3d3d];
        for (let i = 0; i < this.cfg.VEHICLE_COUNT; i++) {
            const alongRoadA = Math.random() > 0.5;
            const t = Utils.randRange(-180, 180);
            const laneOffset = (Math.random() > 0.5 ? 1 : -1) * 3.2;
            let x, z, rotY;
            if (alongRoadA) { x = t; z = laneOffset; rotY = 0; }
            else { x = laneOffset; z = t; rotY = Math.PI / 2; }

            const group = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 0.8, 4.2),
                new THREE.MeshStandardMaterial({ color: bodyColors[Utils.randInt(0, bodyColors.length - 1)], metalness: 0.5, roughness: 0.4 })
            );
            body.position.y = 0.6;
            group.add(body);
            const cabin = new THREE.Mesh(
                new THREE.BoxGeometry(1.8, 0.6, 2),
                new THREE.MeshStandardMaterial({ color: 0x1b1f2a, metalness: 0.3, roughness: 0.5 })
            );
            cabin.position.set(0, 1.15, -0.2);
            group.add(cabin);

            group.rotation.y = rotY;
            group.position.set(x, 0, z);
            group.castShadow = true;
            this._track(group);
            this.scene.add(group);
        }
    }
}
