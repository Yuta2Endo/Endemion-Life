/**
 * R5.10 — tiny Web Audio soundscapes.
 *
 * No binary assets: every world gets a small synthesized drone, filtered noise
 * and a slow pulse. The engine is browser-only and created lazily on a user
 * gesture, so server rendering stays untouched.
 */

export const SOUND_STORAGE_KEY = "endemion-world-sound";

export interface SoundStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SoundProfile {
  /** Fundamental drone frequency in Hz. */
  root: number;
  /** Ratio of the fifth above the root. */
  fifth: number;
  /** Ratio of the quiet high shimmer. */
  shimmer: number;
  /** Low-pass cutoff for the drone. */
  filter: number;
  /** Noise bed level, 0..1. */
  noise: number;
  /** LFO speed in Hz. */
  pulse: number;
}

export const SOUND_PROFILES: Readonly<Record<string, SoundProfile>> = {
  "dark-fantasy": { root: 55, fifth: 1.5, shimmer: 2.01, filter: 420, noise: 0.032, pulse: 0.07 },
  isekai: { root: 110, fifth: 1.5, shimmer: 2, filter: 1600, noise: 0.012, pulse: 0.18 },
  murim: { root: 73.42, fifth: 1.5, shimmer: 3, filter: 880, noise: 0.018, pulse: 0.12 },
  xianxia: { root: 98, fifth: 1.5, shimmer: 2, filter: 2200, noise: 0.008, pulse: 0.055 },
  hunter: { root: 82.41, fifth: 1.5, shimmer: 4, filter: 1100, noise: 0.024, pulse: 0.22 },
  academy: { root: 130.81, fifth: 1.5, shimmer: 3, filter: 1900, noise: 0.01, pulse: 0.1 }
};

export function soundProfileFor(universeId: string): SoundProfile {
  return SOUND_PROFILES[universeId] ?? SOUND_PROFILES["dark-fantasy"];
}

function storageOrNull(): SoundStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSoundPreference(storage: SoundStorage | null = storageOrNull()): boolean {
  try {
    return storage?.getItem(SOUND_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeSoundPreference(enabled: boolean, storage: SoundStorage | null = storageOrNull()): void {
  try {
    storage?.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private mode / blocked storage: the toggle still works for this session.
  }
}

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

/** A small disposable soundscape. One instance can switch worlds without closing the context. */
export class AmbientEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private cleanups: Array<() => void> = [];
  private timer: number | null = null;

  start(profile: SoundProfile): void {
    const Ctor = audioContextCtor();
    if (!Ctor) return;

    const context = this.context ?? new Ctor();
    this.context = context;
    void context.resume();

    this.stopNodes();

    const master = context.createGain();
    const now = context.currentTime;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 2.4);
    master.connect(context.destination);
    this.master = master;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = profile.filter;
    filter.Q.value = 0.7;
    filter.connect(master);
    this.cleanups.push(() => filter.disconnect());

    const drone = (frequency: number, level: number, type: OscillatorType) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = level;
      osc.connect(gain).connect(filter);
      osc.start();
      this.cleanups.push(() => {
        try {
          osc.stop();
        } catch {
          // Already stopped.
        }
        osc.disconnect();
        gain.disconnect();
      });
    };

    drone(profile.root, 0.28, "sine");
    drone(profile.root * profile.fifth, 0.16, "triangle");
    drone(profile.root * profile.shimmer, 0.07, "sine");

    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 2)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;

    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = profile.filter * 0.55;
    noiseFilter.Q.value = 0.55;
    const noiseGain = context.createGain();
    noiseGain.gain.value = profile.noise;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();
    this.cleanups.push(() => {
      try {
        noise.stop();
      } catch {
        // Already stopped.
      }
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    });

    const lfo = context.createOscillator();
    lfo.frequency.value = profile.pulse;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();
    this.cleanups.push(() => {
      try {
        lfo.stop();
      } catch {
        // Already stopped.
      }
      lfo.disconnect();
      lfoGain.disconnect();
    });

    this.timer = window.setInterval(() => this.ping(profile), 15_000);
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") await this.context.resume();
  }

  stop(): void {
    this.stopNodes();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  private ping(profile: SoundProfile): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;

    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = profile.root * 2;
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 2.5);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private stopNodes(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.master?.disconnect();
    this.master = null;
  }
}
