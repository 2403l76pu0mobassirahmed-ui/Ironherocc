/* ============================================================
   MAIN.js — entry point. Creates the renderer/scene/camera and
   boots the GameManager, which owns everything else.
   ============================================================ */

(function () {
    const canvas = document.getElementById("game-canvas");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // Capped at 1.5 instead of the raw device pixel ratio (which can be 2-3
    // on high-DPI screens) — that alone can mean 2-4x more pixels to shade
    // for very little visible sharpness gain, and it's one of the biggest
    // performance levers available.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    // PCFShadowMap (hard-ish shadows) instead of PCFSoftShadowMap — the
    // soft variant samples the shadow map multiple times per pixel and
    // costs noticeably more for a subtle visual difference.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);
    camera.position.set(0, 4, -8);

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const game = new GameManager(renderer, scene, camera, canvas);

    function loop() {
        game.update();
        requestAnimationFrame(loop);
    }
    loop();

    // expose for debugging in the browser console
    window.__IRON_HERO__ = game;
})();
