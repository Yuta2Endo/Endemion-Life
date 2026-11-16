/**
 * R5.10.1 — recorded world themes.
 *
 * Each of the six worlds has an original 8-bar ambient loop rendered in LMMS.
 * The browser decodes the OGG once and loops it sample-accurately through Web
 * Audio. Only the current world is fetched, and the engine is created lazily
 * on a user gesture so server rendering stays untouched.
 */

export const SOUND_STORAGE_KEY = "endemion-world-sound";

export const SOUND_WORLDS = [
  "dark-fantasy",
  "isekai",
  "murim",
  "xianxia",
  "hunter",
  "academy"
] as const;

export type SoundWorld = (typeof SOUND_WORLDS)[number];

export interface SoundStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function soundUrlFor(universeId: string): string {
  const world = (SOUND_WORLDS as readonly string[]).includes(universeId) ? universeId : "dark-fantasy";
  return `/audio/worlds/${world}.ogg`;
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

/** A disposable looping world theme. One instance can switch worlds without closing the context. */
export class AmbientEngine {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private currentWorld: string | null = null;
  private loadingWorld: string | null = null;
  private token = 0;

  async start(universeId: string): Promise<void> {
    if (this.currentWorld === universeId && this.source) return;
    if (this.loadingWorld === universeId) return;

    const Ctor = audioContextCtor();
    if (!Ctor) return;

    const context = this.context && this.context.state !== "closed" ? this.context : new Ctor();
    this.context = context;
    void context.resume().catch(() => {});

    const token = ++this.token;
    this.loadingWorld = universeId;
    let buffer: AudioBuffer | null = null;
    try {
      const response = await fetch(soundUrlFor(universeId), { cache: "force-cache" });
      if (!response.ok) return;
      const data = await response.arrayBuffer();
      if (token !== this.token) return;
      buffer = await context.decodeAudioData(data);
    } catch {
      return;
    } finally {
      if (this.loadingWorld === universeId && this.token === token) this.loadingWorld = null;
    }

    if (!buffer || token !== this.token) return;

    const now = context.currentTime;
    const nextGain = context.createGain();
    nextGain.gain.setValueAtTime(0.0001, now);
    nextGain.gain.exponentialRampToValueAtTime(0.55, now + 1.8);
    nextGain.connect(context.destination);

    const nextSource = context.createBufferSource();
    nextSource.buffer = buffer;
    nextSource.loop = true;
    nextSource.connect(nextGain);
    nextSource.start(now);

    const oldSource = this.source;
    const oldGain = this.gain;
    this.source = nextSource;
    this.gain = nextGain;
    this.currentWorld = universeId;

    if (oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setTargetAtTime(0.0001, now, 0.22);
    }
    if (oldSource) {
      window.setTimeout(() => {
        try {
          oldSource.stop();
        } catch {
          // Already stopped.
        }
        oldSource.disconnect();
        oldGain?.disconnect();
      }, 1400);
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") {
      await this.context.resume().catch(() => {});
    }
  }

  stop(): void {
    this.token += 1;
    this.loadingWorld = null;

    const context = this.context;
    const source = this.source;
    const gain = this.gain;
    this.context = null;
    this.source = null;
    this.gain = null;
    this.currentWorld = null;

    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.08);
    }

    if (source) {
      window.setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        source.disconnect();
      }, 220);
    }
    if (gain) {
      window.setTimeout(() => gain.disconnect(), 260);
    }
    if (context) {
      window.setTimeout(() => {
        void context.close().catch(() => {});
      }, 300);
    }
  }
}
