/* ============================================================
   UI.js — HUD + menu screen management.
   Reads/writes plain DOM elements defined in index.html.
   ============================================================ */

class UIManager {
    constructor() {
        this.el = {
            hud: document.getElementById("hud"),
            healthFill: document.getElementById("health-fill"),
            energyFill: document.getElementById("energy-fill"),
            flightFuelFill: document.getElementById("flight-fuel-fill"),
            objectiveText: document.getElementById("objective-text"),
            missionTitle: document.getElementById("mission-title"),
            flightIndicator: document.getElementById("flight-indicator"),
            repulsorCooldown: document.getElementById("repulsor-cooldown-fill"),
            beamCooldown: document.getElementById("beam-cooldown-fill"),
            specialCooldown: document.getElementById("special-cooldown-fill"),
            crosshair: document.getElementById("crosshair"),
            lockOnBox: document.getElementById("lock-on-box"),

            bossBarWrap: document.getElementById("boss-bar-wrap"),
            bossName: document.getElementById("boss-name"),
            bossFill: document.getElementById("boss-fill"),

            mainMenu: document.getElementById("main-menu"),
            settingsMenu: document.getElementById("settings-menu"),
            controlsMenu: document.getElementById("controls-menu"),
            howToPlayScreen: document.getElementById("how-to-play-screen"),
            pauseMenu: document.getElementById("pause-menu"),
            gameOverScreen: document.getElementById("game-over-screen"),
            victoryScreen: document.getElementById("victory-screen"),
            missionBanner: document.getElementById("mission-banner"),
            bannerText: document.getElementById("banner-text"),
            crosshairWrap: document.getElementById("crosshair-wrap"),
            minimap: document.getElementById("minimap-canvas"),

            timerDisplay: document.getElementById("timer-display"),
            scoreDisplay: document.getElementById("score-display"),
            levelBadge: document.getElementById("level-badge"),

            victoryFinalTime: document.getElementById("victory-final-time"),
            victoryBestTime: document.getElementById("victory-best-time"),
            victoryBestBadge: document.getElementById("victory-best-badge"),
            victoryLevelTimes: document.getElementById("victory-level-times"),
            victoryFinalScore: document.getElementById("victory-final-score"),
            victoryNetScore: document.getElementById("victory-net-score"),
            victoryUnlockCountdown: document.getElementById("victory-unlock-countdown"),
            btnRestartVictory: document.getElementById("btn-restart-victory"),
            btnMenuVictory: document.getElementById("btn-menu-victory"),

            gameOverScore: document.getElementById("gameover-score"),
            gameOverTime: document.getElementById("gameover-time"),
            gameOverLevel: document.getElementById("gameover-level"),
        };
        this._minimapCtx = this.el.minimap ? this.el.minimap.getContext("2d") : null;
    }

    showScreen(name) {
        const screens = ["mainMenu", "settingsMenu", "controlsMenu", "howToPlayScreen", "pauseMenu", "gameOverScreen", "victoryScreen"];
        screens.forEach(s => this.el[s] && this.el[s].classList.add("hidden"));
        if (name && this.el[name]) this.el[name].classList.remove("hidden");
    }

    setHudVisible(visible) {
        this.el.hud.classList.toggle("hidden", !visible);
    }

    updateHealth(cur, max) {
        this.el.healthFill.style.width = `${Utils.clamp((cur / max) * 100, 0, 100)}%`;
    }

    updateEnergy(cur, max) {
        this.el.energyFill.style.width = `${Utils.clamp((cur / max) * 100, 0, 100)}%`;
    }

    // Flight fuel is a separate resource from weapons energy now — its
    // own bar so the player can track both independently.
    updateFlightFuel(cur, max) {
        if (this.el.flightFuelFill) this.el.flightFuelFill.style.width = `${Utils.clamp((cur / max) * 100, 0, 100)}%`;
    }

    updateObjective(text) {
        this.el.objectiveText.textContent = text;
    }

    updateMissionTitle(text) {
        this.el.missionTitle.textContent = text;
    }

    // Large, always-visible competition timer. Format: MM:SS.HH
    updateTimer(displayText) {
        if (this.el.timerDisplay) this.el.timerDisplay.textContent = `TIME: ${displayText}`;
    }

    updateLevelBadge(levelNumber, totalLevels) {
        if (this.el.levelBadge) this.el.levelBadge.textContent = `LEVEL ${levelNumber} / ${totalLevels}`;
    }

    // Live running score: damage dealt minus damage taken. Can go
    // negative if you're taking more hits than you're landing.
    updateScore(netScore) {
        if (this.el.scoreDisplay) this.el.scoreDisplay.textContent = `SCORE: ${netScore}`;
    }

    // Populates the Game Over screen with how far the player got: their
    // score at the moment of death, the run time so far, and which level
    // they were on.
    showGameOverResults({ netScore, timeDisplay, levelNumber }) {
        if (this.el.gameOverScore) this.el.gameOverScore.textContent = netScore;
        if (this.el.gameOverTime) this.el.gameOverTime.textContent = timeDisplay;
        if (this.el.gameOverLevel) this.el.gameOverLevel.textContent = levelNumber;
    }

    // Populates the Mission Complete / results screen with the final time,
    // best time (with a "NEW BEST!" badge if this run beat it), a
    // per-level time breakdown, and the score (net score, then the final
    // 5x-multiplied completion score).
    showVictoryResults({ finalMs, bestMs, isNewBest, levelTimes, netScore, finalScore }) {
        if (this.el.victoryFinalTime) this.el.victoryFinalTime.textContent = GameTimer.format(finalMs);
        if (this.el.victoryBestTime) this.el.victoryBestTime.textContent = GameTimer.format(bestMs != null ? bestMs : finalMs);
        if (this.el.victoryBestBadge) this.el.victoryBestBadge.classList.toggle("hidden", !isNewBest);
        if (this.el.victoryNetScore) this.el.victoryNetScore.textContent = netScore;
        if (this.el.victoryFinalScore) this.el.victoryFinalScore.textContent = finalScore;

        if (this.el.victoryLevelTimes) {
            this.el.victoryLevelTimes.innerHTML = "";
            levelTimes.forEach((lap) => {
                const row = document.createElement("div");
                row.className = "level-time-row";
                row.textContent = `LEVEL ${lap.level} — ${GameTimer.format(lap.timeMs)}`;
                this.el.victoryLevelTimes.appendChild(row);
            });
        }
    }

    // Keeps the "Play Again" / "Main Menu" buttons disabled for a short
    // window after victory so the player has to actually look at their
    // results before moving on, with a live countdown telling them why.
    startVictoryUnlockCountdown(seconds) {
        clearInterval(this._victoryCountdownInterval);
        let remaining = seconds;

        const setLocked = (locked) => {
            if (this.el.btnRestartVictory) this.el.btnRestartVictory.disabled = locked;
            if (this.el.btnMenuVictory) this.el.btnMenuVictory.disabled = locked;
        };

        const render = () => {
            if (this.el.victoryUnlockCountdown) {
                this.el.victoryUnlockCountdown.textContent = remaining > 0
                    ? `Buttons unlock in ${remaining}s...`
                    : "";
            }
        };

        setLocked(true);
        render();

        this._victoryCountdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this._victoryCountdownInterval);
                setLocked(false);
            }
            render();
        }, 1000);
    }

    updateFlightIndicator(isFlying, flightSecondsLeft) {
        if (isFlying) {
            this.el.flightIndicator.textContent = `FLIGHT: ACTIVE — ${flightSecondsLeft.toFixed(1)}s LEFT`;
        } else {
            this.el.flightIndicator.textContent = "FLIGHT: STANDBY";
        }
        this.el.flightIndicator.classList.toggle("active", isFlying);
        this.el.flightIndicator.classList.toggle("warning", isFlying && flightSecondsLeft < 3);
    }

    updateCooldowns(repulsorRatio, beamRatio, specialRatio) {
        this.el.repulsorCooldown.style.width = `${(1 - repulsorRatio) * 100}%`;
        this.el.beamCooldown.style.width = `${(1 - beamRatio) * 100}%`;
        this.el.specialCooldown.style.width = `${(1 - specialRatio) * 100}%`;
    }

    setLockOnVisible(visible, screenX, screenY) {
        if (!visible) {
            this.el.lockOnBox.style.display = "none";
            return;
        }
        this.el.lockOnBox.style.display = "block";
        this.el.lockOnBox.style.left = `${screenX}px`;
        this.el.lockOnBox.style.top = `${screenY}px`;
    }

    showBossBar(show, name, cur, max) {
        this.el.bossBarWrap.classList.toggle("hidden", !show);
        if (show) {
            this.el.bossName.textContent = name;
            this.el.bossFill.style.width = `${Utils.clamp((cur / max) * 100, 0, 100)}%`;
        }
    }

    flashBanner(text, duration = 2.2) {
        this.el.bannerText.textContent = text;
        this.el.missionBanner.classList.remove("hidden");
        this.el.missionBanner.classList.add("show");
        clearTimeout(this._bannerTimeout);
        this._bannerTimeout = setTimeout(() => {
            this.el.missionBanner.classList.remove("show");
            setTimeout(() => this.el.missionBanner.classList.add("hidden"), 400);
        }, duration * 1000);
    }

    // Live top-down radar, "forward is always up" style: the whole map
    // rotates around the player rather than just the arrow, so a dot
    // straight ahead of you always appears straight above your marker
    // no matter which way you're facing. (An earlier version rotated
    // only the player arrow while plotting enemies in fixed world-space
    // coordinates — that mismatch is what made the radar feel inverted.)
    drawMinimap(playerPos, facingYaw, enemies, boss, beaconPos) {
        if (!this._minimapCtx) return;
        const ctx = this._minimapCtx;
        const canvas = this.el.minimap;
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2;
        const range = 55; // world units shown from center to edge
        const usableRadius = w / 2 - 8;
        const scale = usableRadius / range;

        // World "forward" at this yaw is (-sin(yaw), -cos(yaw)) in (x,z),
        // matching the camera's actual look direction (see
        // cameraController.js / flightController.js). Project any
        // world-space offset onto forward/right so it can be drawn
        // relative to the player's current facing.
        const sinY = Math.sin(facingYaw), cosY = Math.cos(facingYaw);
        const toRadarXY = (dx, dz) => {
            const forwardComp = -dx * sinY - dz * cosY;
            const rightComp = dx * cosY - dz * sinY;
            return { x: rightComp, y: -forwardComp }; // canvas +Y is down, so "ahead" (up) is -forwardComp
        };

        ctx.clearRect(0, 0, w, h);

        // range rings
        ctx.strokeStyle = "rgba(111,227,255,0.15)";
        ctx.lineWidth = 1;
        [0.33, 0.66, 1].forEach((f) => {
            ctx.beginPath();
            ctx.arc(cx, cy, usableRadius * f, 0, Math.PI * 2);
            ctx.stroke();
        });

        // enemies
        enemies.forEach((e) => {
            if (e.isDead) return;
            let dx = e.position.x - playerPos.x;
            let dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > range) {
                const s = range / dist;
                dx *= s;
                dz *= s;
            }
            const r = toRadarXY(dx, dz);
            const px = cx + r.x * scale;
            const py = cy + r.y * scale;
            const isBoss = boss && e === boss;
            ctx.fillStyle = isBoss ? "#ff2244" : "#ff8a6a";
            ctx.beginPath();
            ctx.arc(px, py, isBoss ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // extraction/objective beacon
        if (beaconPos) {
            let dx = beaconPos.x - playerPos.x;
            let dz = beaconPos.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const clamped = dist > range;
            if (clamped) {
                const s = range / dist;
                dx *= s;
                dz *= s;
            }
            const r = toRadarXY(dx, dz);
            const px = cx + r.x * scale;
            const py = cy + r.y * scale;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = "#6fe3ff";
            ctx.shadowColor = "#6fe3ff";
            ctx.shadowBlur = clamped ? 4 : 8;
            ctx.fillRect(-4, -4, 8, 8);
            ctx.restore();
        }

        // player marker: fixed at center, always pointing straight up —
        // the map itself rotates instead, so this never needs its own
        // rotation math (and can't get that math backwards).
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#6fe3ff";
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}
