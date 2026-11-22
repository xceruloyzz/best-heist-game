// audio.js — every sound is synthesized with WebAudio: no audio files,
// no network. A low drone hums under play, footsteps tick, loot chimes,
// the alarm wails and the alert sting cuts in when a guard spots you.
export function createAudio() {
  const audio = {
    context: null,
    master: null,
    droneOsc: null,
    droneGain: null,
    muted: false,
    alarmOn: false,
    alarmOsc: null,
    alarmGain: null,

    ensureContext() {
      if (this.context) {
        if (this.context.state === 'suspended') this.context.resume();
        return;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.context.destination);
      this.startDrone();
    },

    startDrone() {
      const ctx = this.context;
      this.droneOsc = ctx.createOscillator();
      this.droneOsc.type = 'sine';
      this.droneOsc.frequency.value = 52;
      this.droneGain = ctx.createGain();
      this.droneGain.gain.value = 0.05;
      const wobble = ctx.createOscillator();
      wobble.type = 'sine';
      wobble.frequency.value = 0.13;
      const wobbleGain = ctx.createGain();
      wobbleGain.gain.value = 0.02;
      wobble.connect(wobbleGain);
      wobbleGain.connect(this.droneGain.gain);
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.master);
      this.droneOsc.start();
      wobble.start();
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.5;
    },

    // blip plays one short oscillator note with a quick decay envelope.
    blip(freq, duration, type, volume, slideTo) {
      if (!this.context || this.muted) return;
      const ctx = this.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    },

    // noiseBurst plays a filtered burst of white noise (footsteps, smoke).
    noiseBurst(duration, volume, filterFreq) {
      if (!this.context || this.muted) return;
      const ctx = this.context;
      const len = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    },

    playFootstep(running) {
      this.noiseBurst(0.07, running ? 0.16 : 0.09, running ? 900 : 500);
    },

    playLootChime() {
      this.blip(880, 0.12, 'sine', 0.22);
      setTimeout(() => this.blip(1318, 0.18, 'sine', 0.2), 70);
    },

    playVaultChime() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.22), i * 80));
    },

    playAlertSting() {
      this.blip(220, 0.3, 'sawtooth', 0.2, 440);
      this.blip(110, 0.35, 'square', 0.12, 220);
    },

    playSmoke() {
      this.noiseBurst(0.5, 0.2, 1200);
    },

    playEmp() {
      this.blip(1200, 0.4, 'sawtooth', 0.16, 120);
    },

    playCaught() {
      this.blip(330, 0.5, 'sawtooth', 0.25, 55);
      setTimeout(() => this.blip(165, 0.7, 'square', 0.18, 40), 150);
    },

    playWin() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.2), i * 110));
    },

    playClick() {
      this.blip(660, 0.06, 'square', 0.1);
    },

    // setAlarmSound starts or stops the two-tone alarm wail.
    setAlarmSound(on) {
      if (on === this.alarmOn) return;
      this.alarmOn = on;
      if (!this.context) return;
      if (on) {
        this.alarmOsc = this.context.createOscillator();
        this.alarmOsc.type = 'sine';
        this.alarmOsc.frequency.value = 620;
        const lfo = this.context.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 1.6;
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain);
        lfoGain.connect(this.alarmOsc.frequency);
        this.alarmGain = this.context.createGain();
        this.alarmGain.gain.value = 0.06;
        this.alarmOsc.connect(this.alarmGain);
        this.alarmGain.connect(this.master);
        this.alarmOsc.start();
        lfo.start();
        this.alarmLfo = lfo;
      } else if (this.alarmOsc) {
        try { this.alarmOsc.stop(); this.alarmLfo.stop(); } catch (e) { /* already stopped */ }
        this.alarmOsc = null;
        this.alarmLfo = null;
      }
    },
  };
  return audio;
}
