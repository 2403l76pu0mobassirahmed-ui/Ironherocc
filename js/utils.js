/* ============================================================
   UTILS.js — small shared helper functions
   ============================================================ */

const Utils = {
    randRange(min, max) {
        return min + Math.random() * (max - min);
    },

    randInt(min, max) {
        return Math.floor(Utils.randRange(min, max + 1));
    },

    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // frame-rate independent damping lerp (Freya Holmer style)
    damp(a, b, lambda, dt) {
        return Utils.lerp(a, b, 1 - Math.exp(-lambda * dt));
    },

    distance2D(a, b) {
        const dx = a.x - b.x, dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    },

    randomPointOnRing(center, minR, maxR) {
        const angle = Math.random() * Math.PI * 2;
        const r = Utils.randRange(minR, maxR);
        return new THREE.Vector3(
            center.x + Math.cos(angle) * r,
            0,
            center.z + Math.sin(angle) * r
        );
    },

    // Create a simple radial-gradient sprite texture for glow/particle effects
    makeGlowTexture(colorHex = "#ffffff") {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );
        gradient.addColorStop(0, colorHex);
        gradient.addColorStop(0.4, colorHex);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    },

    // Simple canvas-based text texture (used for floating damage numbers, etc.)
    makeTextSprite(text, colorCss = "#ffffff") {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = colorCss;
        ctx.textAlign = "center";
        ctx.fillText(text, 128, 64);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2, 1, 1);
        return sprite;
    }
};
