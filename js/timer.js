/* ============================================================
   TIMER.js — the competition timer.
   Starts when Level 1 begins, runs continuously across all
   three levels (does NOT reset between levels), pauses only
   while the game itself is paused, and stops the moment the
   Level 3 boss is defeated. Also records a per-level lap time
   and keeps a best-time record in localStorage.
   ============================================================ */

class GameTimer {
    constructor() {
        this.elapsedMs = 0;
        this.running = false;
        this._lastTick = 0;
        this.laps = [];        // [{ level: 1, timeMs: 12345 }, ...]
        this._lastLapMs = 0;
        this.finalTimeMs = null;
    }

    start() {
        this.elapsedMs = 0;
        this.running = true;
        this.laps = [];
        this._lastLapMs = 0;
        this.finalTimeMs = null;
    }

    resume() {
        this.running = true;
    }

    pause() {
        this.running = false;
    }

    // call every frame with dt in seconds while the timer should be counting
    tick(dt) {
        if (!this.running) return;
        this.elapsedMs += dt * 1000;
    }

    // Record the time for a completed level (does not stop the overall timer)
    recordLap(levelNumber) {
        const lapTime = this.elapsedMs - this._lastLapMs;
        this.laps.push({ level: levelNumber, timeMs: lapTime });
        this._lastLapMs = this.elapsedMs;
        return lapTime;
    }

    stopFinal() {
        this.running = false;
        this.finalTimeMs = this.elapsedMs;
        return this.finalTimeMs;
    }

    // ---------------- formatting ----------------
    static format(ms) {
        if (ms == null || ms < 0) ms = 0;
        const totalHundredths = Math.floor(ms / 10);
        const hundredths = totalHundredths % 100;
        const totalSeconds = Math.floor(totalHundredths / 100);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60);
        const pad2 = (n) => String(n).padStart(2, "0");
        return `${pad2(minutes)}:${pad2(seconds)}.${pad2(hundredths)}`;
    }

    getDisplay() {
        return GameTimer.format(this.elapsedMs);
    }

    // ---------------- best time (localStorage) ----------------
    static getBestTime() {
        try {
            const raw = localStorage.getItem(CONFIG.TIMER.BEST_TIME_STORAGE_KEY);
            return raw ? parseFloat(raw) : null;
        } catch (e) {
            return null;
        }
    }

    static saveBestTimeIfBetter(ms) {
        try {
            const current = GameTimer.getBestTime();
            if (current === null || ms < current) {
                localStorage.setItem(CONFIG.TIMER.BEST_TIME_STORAGE_KEY, String(ms));
                return { isNewBest: true, bestMs: ms };
            }
            return { isNewBest: false, bestMs: current };
        } catch (e) {
            return { isNewBest: false, bestMs: ms };
        }
    }
}
