/* ============================================================
   INPUT_MANAGER.js — tracks keyboard + mouse state each frame
   ============================================================ */

class InputManager {
    constructor(domElement) {
        this.dom = domElement;
        this.keys = {};          // code -> bool
        this.mouseButtons = {};  // button -> bool
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.pointerLocked = false;
        this.wheelDelta = 0;

        this._bind();
    }

    _bind() {
        // Codes the browser has default behavior for (page scroll on
        // arrows/space) that would fight with using them as game keys.
        // Only prevented when the game canvas actually has focus/pointer
        // lock, so normal page interaction (e.g. typing in a settings
        // field) is never blocked.
        const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

        window.addEventListener("keydown", (e) => {
            this.keys[e.code] = true;
            if (SCROLL_KEYS.has(e.code) && this.pointerLocked) {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            this.keys[e.code] = false;
        });

        this.dom.addEventListener("mousedown", (e) => {
            this.mouseButtons[e.button] = true;
        });
        this.dom.addEventListener("mouseup", (e) => {
            this.mouseButtons[e.button] = false;
        });
        this.dom.addEventListener("contextmenu", (e) => e.preventDefault());

        document.addEventListener("mousemove", (e) => {
            if (this.pointerLocked) {
                this.mouseDX += e.movementX || 0;
                this.mouseDY += e.movementY || 0;
            }
        });

        document.addEventListener("pointerlockchange", () => {
            this.pointerLocked = document.pointerLockElement === this.dom;
            // Losing pointer lock (Esc, alt-tab, clicking outside the
            // window) very often means the corresponding keyup events
            // for whatever was held never reach us — that's the real
            // cause of "movement jamming": a key gets stuck marked as
            // held forever. Clear everything the instant lock is lost.
            if (!this.pointerLocked) this.clearAllInput();
        });

        // Same idea for any other way the window can lose focus without
        // a clean keyup: alt-tabbing, switching apps, minimizing, or the
        // tab going to the background.
        window.addEventListener("blur", () => this.clearAllInput());
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.clearAllInput();
        });

        this.dom.addEventListener("wheel", (e) => {
            this.wheelDelta += e.deltaY;
        });
    }

    requestPointerLock() {
        if (this.dom.requestPointerLock) this.dom.requestPointerLock();
    }

    exitPointerLock() {
        if (document.exitPointerLock) document.exitPointerLock();
    }

    // Resets every tracked key and mouse button to "not held". Called
    // whenever focus/pointer-lock is lost in a way that could leave a
    // key stuck "on" with no matching keyup ever arriving.
    clearAllInput() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseDX = 0;
        this.mouseDY = 0;
    }

    // Accepts either a single key code ("KeyW") or an array of codes
    // (["KeyW", "ArrowUp"]) so a single logical action (e.g. "move
    // forward") can be bound to more than one physical key at once —
    // useful both for player preference and as a fallback if one key
    // ever stops registering (a stuck/jammed key on that key only).
    isDown(codeOrCodes) {
        if (Array.isArray(codeOrCodes)) {
            return codeOrCodes.some((c) => !!this.keys[c]);
        }
        return !!this.keys[codeOrCodes];
    }

    isMouseDown(button) {
        return !!this.mouseButtons[button];
    }

    // call once per frame after using the deltas
    consumeMouseDelta() {
        const dx = this.mouseDX, dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        return { dx, dy };
    }
}
