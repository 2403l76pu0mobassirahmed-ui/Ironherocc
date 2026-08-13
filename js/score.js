/* ============================================================
   SCORE.js — tracks damage dealt vs damage taken for a simple,
   transparent scoring system: net score = damage dealt minus
   damage taken, running live throughout the game. Finishing all
   3 levels (defeating the boss) multiplies the final score 5x
   as a completion bonus.
   ============================================================ */

const GameScore = {
    damageDealt: 0,
    damageTaken: 0,

    reset() {
        this.damageDealt = 0;
        this.damageTaken = 0;
    },

    addDamageDealt(amount) {
        if (amount > 0) this.damageDealt += amount;
    },

    addDamageTaken(amount) {
        if (amount > 0) this.damageTaken += amount;
    },

    // Live running score during gameplay (not yet multiplied).
    get netScore() {
        return Math.round(this.damageDealt - this.damageTaken);
    },

    // Applied once, when all 3 levels are cleared and the boss falls.
    get finalScore() {
        return Math.round(this.netScore * 5);
    }
};
