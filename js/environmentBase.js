/* ============================================================
   ENVIRONMENT_BASE.js — shared plumbing for every level theme
   (city / industrial / fortress): sky, ground, fog, lighting,
   drifting clouds, building-style collision, and full cleanup
   so one level's geometry never leaks into the next.
   ============================================================ */

class EnvironmentBase {
    constructor(scene, worldCfg) {
        this.scene = scene;
        this.cfg = worldCfg;
        this.collidables = [];   // { x, z, halfW, halfD, height }
        this.clouds = [];
        this._disposables = [];  // every object/geometry/material we created, for cleanup

        // Subclasses call _buildSky/_buildGround/_buildLighting/_buildClouds
        // themselves (with theme-specific colors) right after super().
    }

    // ---------------- helpers used by subclasses ----------------
    _track(obj) {
        this._disposables.push(obj);
        return obj;
    }

    _addCollidableBox(x, z, width, depth, height, buffer = 0.6) {
        this.collidables.push({
            x, z,
            halfW: width / 2 + buffer,
            halfD: depth / 2 + buffer,
            height
        });
    }

    // ---------------- shared construction ----------------
    _buildSky() {
        const skyGeo = new THREE.SphereGeometry(500, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor:    { value: new THREE.Color(this.cfg.SKY_TOP) },
                bottomColor: { value: new THREE.Color(this.cfg.SKY_BOTTOM) },
                offset:      { value: 20 },
                exponent:    { value: 0.7 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        this.sky = this._track(new THREE.Mesh(skyGeo, skyMat));
        this.scene.add(this.sky);
        this.scene.fog = new THREE.Fog(this.cfg.FOG_COLOR, this.cfg.FOG_NEAR, this.cfg.FOG_FAR);
    }

    _buildGround(color = 0x1a1e2b, gridColor1 = 0x2a3a55, gridColor2 = 0x1c2436) {
        const size = CONFIG.WORLD.GROUND_SIZE;
        const geo = new THREE.PlaneGeometry(size, size, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.1 });
        const ground = this._track(new THREE.Mesh(geo, mat));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = this._track(new THREE.GridHelper(size, 60, gridColor1, gridColor2));
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    _buildLighting(sunColor = 0xfff2d6, hemiSky = 0x8fa6ff, hemiGround = 0x1a1e2b) {
        this.hemi = this._track(new THREE.HemisphereLight(hemiSky, hemiGround, 0.7));
        this.scene.add(this.hemi);

        this.sun = this._track(new THREE.DirectionalLight(sunColor, 1.0));
        this.sun.position.set(-80, 120, -60);
        this.sun.castShadow = true;
        // 1024 instead of 2048 — a shadow map is a full extra render pass
        // of the scene, and this halves that cost in each dimension
        // (a quarter of the pixels) with only a modest softness change.
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.camera.left = -150;
        this.sun.shadow.camera.right = 150;
        this.sun.shadow.camera.top = 150;
        this.sun.shadow.camera.bottom = -150;
        this.sun.shadow.camera.far = 400;
        this.scene.add(this.sun);
    }

    _buildClouds(color = 0xaab4d6) {
        const cloudMat = this._track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }));
        for (let i = 0; i < 16; i++) {
            const group = new THREE.Group();
            const puffCount = Utils.randInt(3, 6);
            for (let j = 0; j < puffCount; j++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(Utils.randRange(3, 6), 8, 8), cloudMat);
                puff.position.set(Utils.randRange(-6, 6), Utils.randRange(-1, 1), Utils.randRange(-6, 6));
                group.add(puff);
            }
            group.position.set(Utils.randRange(-200, 200), Utils.randRange(60, 110), Utils.randRange(-200, 200));
            this._track(group);
            this.scene.add(group);
            this.clouds.push(group);
        }
    }

    update(dt) {
        this.clouds.forEach((c, i) => {
            c.position.x += dt * (0.4 + (i % 3) * 0.15);
            if (c.position.x > 220) c.position.x = -220;
        });
    }

    // Returns true if the point (x,z) at height y overlaps a solid
    // structure's footprint. Structures only block below their own top
    // height, so flying above them is always possible.
    isBlocked(x, z, y = 0) {
        for (const b of this.collidables) {
            if (y >= b.height) continue;
            if (Math.abs(x - b.x) < b.halfW && Math.abs(z - b.z) < b.halfD) return true;
        }
        return false;
    }

    // Removes and disposes every object this environment created, so the
    // next level starts with a clean scene and no leaked memory.
    dispose() {
        for (const obj of this._disposables) {
            if (obj.parent) obj.parent.remove(obj);
            else this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            if (obj.traverse) {
                obj.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                });
            }
        }
        this._disposables = [];
        this.collidables = [];
        this.clouds = [];
        this.scene.fog = null;
    }
}
