/* ============================================================
   CAMERA_CONTROLLER.js — first-person (FPP) camera.
   The camera sits at the hero's eye height and rotates directly
   with mouse look (no orbit/follow lag). The player's own body
   model is hidden so nothing blocks the view, matching a true
   first-person perspective.
   ============================================================ */

class CameraController {
    constructor(camera, player, input, environment) {
        this.camera = camera;
        this.player = player;
        this.target = player; // kept for compatibility with code expecting `.target.position`
        this.input = input;
        this.environment = environment;

        this.yaw = 0;
        this.pitch = 0;
        this.eyeHeight = 2.5; // roughly the hero model's head height

        // Camera looks down its local -Z axis; YXZ order keeps yaw/pitch
        // independent of each other (no gimbal roll creeping in).
        this.camera.rotation.order = "YXZ";

        // Hide the hero's own body so it doesn't obstruct the first-person view.
        if (this.player.model) this.player.model.visible = false;
    }

    update(dt) {
        const { dx, dy } = this.input.consumeMouseDelta();
        this.yaw -= dx * CONFIG.CAMERA.MOUSE_SENSITIVITY;
        this.pitch -= dy * CONFIG.CAMERA.MOUSE_SENSITIVITY;
        this.pitch = Utils.clamp(this.pitch, CONFIG.CAMERA.MIN_PITCH, CONFIG.CAMERA.MAX_PITCH);

        const eyePos = this.player.position.clone();
        eyePos.y += this.eyeHeight;
        this.camera.position.copy(eyePos);
        this.camera.rotation.set(this.pitch, this.yaw, 0);
    }

    // Direction the camera is actually looking — used for weapon aim,
    // lock-on, and the chest-beam cone. Computed straight from the
    // camera's real orientation so it can never drift out of sync with
    // what's rendered on screen.
    getAimDirection() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir;
    }
}
