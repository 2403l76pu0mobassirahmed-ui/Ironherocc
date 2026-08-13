/* ============================================================
   AUDIO.js — procedural sound effects via Web Audio API.
   No external audio files are required; every sound is
   synthesized at runtime with oscillators/noise buffers.
   ============================================================ */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.musicGain = null;
        this.enabled = true;
        this._musicNodes = [];
    }

    // Must be called after a user gesture (browser autoplay policy)
    init() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.12;
        this.musicGain.connect(this.master);
    }

    setEnabled(v) {
        this.enabled = v;
        if (this.master) this.master.gain.value = v ? 0.5 : 0;
    }

    _env(gainNode, attack, decay, sustainLevel, releaseStart, releaseTime) {
        const now = this.ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(1, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), now + attack + decay);
        gainNode.gain.setValueAtTime(Math.max(sustainLevel, 0.0001), now + releaseStart);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseStart + releaseTime);
    }

    repulsor() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.18);
    }

    chestBeam(start) {
        if (!this.ctx || !this.enabled) return null;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc2.type = "sawtooth";
        osc.frequency.setValueAtTime(120, t);
        osc2.frequency.setValueAtTime(240, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.5);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc2.start(t);
        return { osc, osc2, gain };
    }

    stopChestBeam(handle) {
        if (!handle || !this.ctx) return;
        const t = this.ctx.currentTime;
        handle.gain.gain.cancelScheduledValues(t);
        handle.gain.gain.setValueAtTime(handle.gain.gain.value, t);
        handle.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        handle.osc.stop(t + 0.2);
        handle.osc2.stop(t + 0.2);
    }

    explosion() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1800, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.6);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        noise.connect(filter).connect(gain).connect(this.master);
        noise.start(t);
    }

    hit() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    jetLoop() {
        if (!this.ctx || !this.enabled) return null;
        const t = this.ctx.currentTime;
        const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        noise.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 500;
        filter.Q.value = 0.6;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
        noise.connect(filter).connect(gain).connect(this.master);
        noise.start(t);
        return { noise, gain, filter };
    }

    stopJetLoop(handle) {
        if (!handle || !this.ctx) return;
        const t = this.ctx.currentTime;
        handle.gain.gain.cancelScheduledValues(t);
        handle.gain.gain.setValueAtTime(Math.max(handle.gain.gain.value, 0.0001), t);
        handle.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        handle.noise.stop(t + 0.3);
    }

    uiClick() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    lockOn() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(900, t + 0.06);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.14);
    }

    // Simple ambient background music: slow evolving pad using detuned oscillators.
    startMusic() {
        if (!this.ctx || this._musicNodes.length) return;
        const notes = [55, 65.4, 73.4, 82.4]; // A1, C2, D2, E2 - moody pad
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = i % 2 === 0 ? "sine" : "triangle";
            osc.frequency.value = freq;
            const gain = this.ctx.createGain();
            gain.gain.value = 0.0;
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.05 + i * 0.02;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.02;
            lfo.connect(lfoGain).connect(gain.gain);
            osc.connect(gain).connect(this.musicGain);
            osc.start();
            lfo.start();
            gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 2);
            this._musicNodes.push({ osc, gain, lfo });
        });
    }

    stopMusic() {
        this._musicNodes.forEach(n => {
            try {
                n.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
                n.osc.stop(this.ctx.currentTime + 3);
                n.lfo.stop(this.ctx.currentTime + 3);
            } catch (e) {}
        });
        this._musicNodes = [];
    }
}
