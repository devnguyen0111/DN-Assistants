export type SoundscapeTrackId =
  | "rain"
  | "wind"
  | "ocean"
  | "fire"
  | "binaural"
  | "whitenoise"
  | "brownnoise";

export type SoundscapeTrackMeta = {
  id: SoundscapeTrackId;
  nameKey: string;
  icon: string;
  descriptionKey: string;
};

export const SOUNDSCAPE_TRACKS: SoundscapeTrackMeta[] = [
  { id: "rain", nameKey: "soundRain", icon: "🌧️", descriptionKey: "soundRainDesc" },
  { id: "wind", nameKey: "soundWind", icon: "🌲", descriptionKey: "soundWindDesc" },
  { id: "ocean", nameKey: "soundOcean", icon: "🌊", descriptionKey: "soundOceanDesc" },
  { id: "fire", nameKey: "soundFire", icon: "🔥", descriptionKey: "soundFireDesc" },
  { id: "binaural", nameKey: "soundBinaural", icon: "🧠", descriptionKey: "soundBinauralDesc" },
  { id: "whitenoise", nameKey: "soundWhite", icon: "📻", descriptionKey: "soundWhiteDesc" },
  { id: "brownnoise", nameKey: "soundBrown", icon: "🌌", descriptionKey: "soundBrownDesc" },
];

type ActiveTrack = {
  gainNode: GainNode;
  cleanup: () => void;
  volume: number;
};

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracks: Map<SoundscapeTrackId, ActiveTrack> = new Map();
  private trackVolumes: Map<SoundscapeTrackId, number> = new Map([
    ["rain", 0.5],
    ["wind", 0.4],
    ["ocean", 0.5],
    ["fire", 0.4],
    ["binaural", 0.3],
    ["whitenoise", 0.3],
    ["brownnoise", 0.4],
  ]);
  private masterVolume = 0.8;
  private listeners: Set<() => void> = new Set();

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }

  public isTrackPlaying(id: SoundscapeTrackId): boolean {
    return this.tracks.has(id);
  }

  public isAnyPlaying(): boolean {
    return this.tracks.size > 0;
  }

  public getTrackVolume(id: SoundscapeTrackId): number {
    return this.trackVolumes.get(id) ?? 0.5;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.min(1, Math.max(0, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setTrackVolume(id: SoundscapeTrackId, vol: number) {
    const clamped = Math.min(1, Math.max(0, vol));
    this.trackVolumes.set(id, clamped);
    const active = this.tracks.get(id);
    if (active && this.ctx) {
      active.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
      active.volume = clamped;
    }
    this.notify();
  }

  public toggleTrack(id: SoundscapeTrackId): boolean {
    if (this.isTrackPlaying(id)) {
      this.stopTrack(id);
      return false;
    } else {
      this.startTrack(id);
      return true;
    }
  }

  public startTrack(id: SoundscapeTrackId) {
    if (this.tracks.has(id)) return;
    const ctx = this.getContext();
    const gainNode = ctx.createGain();
    const vol = this.getTrackVolume(id);
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.connect(this.masterGain!);

    let cleanup: () => void;

    switch (id) {
      case "rain":
        cleanup = this.createRain(ctx, gainNode);
        break;
      case "wind":
        cleanup = this.createWind(ctx, gainNode);
        break;
      case "ocean":
        cleanup = this.createOcean(ctx, gainNode);
        break;
      case "fire":
        cleanup = this.createFire(ctx, gainNode);
        break;
      case "binaural":
        cleanup = this.createBinaural(ctx, gainNode);
        break;
      case "whitenoise":
        cleanup = this.createWhiteNoise(ctx, gainNode);
        break;
      case "brownnoise":
        cleanup = this.createBrownNoise(ctx, gainNode);
        break;
      default:
        cleanup = () => {};
    }

    this.tracks.set(id, { gainNode, cleanup, volume: vol });
    this.notify();
  }

  public stopTrack(id: SoundscapeTrackId) {
    const active = this.tracks.get(id);
    if (!active) return;
    try {
      active.cleanup();
      active.gainNode.disconnect();
    } catch {
      // ignore
    }
    this.tracks.delete(id);
    this.notify();
  }

  public stopAll() {
    for (const [id] of this.tracks) {
      this.stopTrack(id);
    }
  }

  // --- Procedural synthesizers ---

  private createNoiseBuffer(ctx: AudioContext, type: "white" | "pink" | "brown"): AudioBuffer {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === "brown") {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
    }
    return buffer;
  }

  private createRain(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "pink");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(1000, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(400, ctx.currentTime);

    source.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(dest);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createWind(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "pink");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    // LFO to modulate wind frequency
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(200, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(dest);
    source.start();
    lfo.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
        source.disconnect();
        lfo.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createOcean(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "brown");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    // Swell LFO
    const swell = ctx.createOscillator();
    swell.frequency.setValueAtTime(0.1, ctx.currentTime);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(250, ctx.currentTime);

    swell.connect(swellGain);
    swellGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(dest);
    source.start();
    swell.start();

    return () => {
      try {
        source.stop();
        swell.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createFire(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "brown");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    source.connect(filter);
    filter.connect(dest);
    source.start();

    // Random crackle generator
    let stopped = false;
    const crackle = () => {
      if (stopped) return;
      if (Math.random() < 0.3) {
        const osc = ctx.createOscillator();
        const crackleGain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800 + Math.random() * 1200, ctx.currentTime);
        crackleGain.gain.setValueAtTime(0.08, ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
        osc.connect(crackleGain);
        crackleGain.connect(dest);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
      setTimeout(crackle, 100 + Math.random() * 300);
    };
    crackle();

    return () => {
      stopped = true;
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createBinaural(ctx: AudioContext, dest: GainNode): () => void {
    // 200 Hz Left, 210 Hz Right -> 10 Hz Alpha wave
    const merger = ctx.createChannelMerger(2);

    const oscL = ctx.createOscillator();
    oscL.type = "sine";
    oscL.frequency.setValueAtTime(200, ctx.currentTime);

    const oscR = ctx.createOscillator();
    oscR.type = "sine";
    oscR.frequency.setValueAtTime(210, ctx.currentTime);

    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(dest);

    oscL.start();
    oscR.start();

    return () => {
      try {
        oscL.stop();
        oscR.stop();
        oscL.disconnect();
        oscR.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createWhiteNoise(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "white");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(dest);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private createBrownNoise(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, "brown");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(dest);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }
}

export const soundscapeEngine = new SoundscapeEngine();
