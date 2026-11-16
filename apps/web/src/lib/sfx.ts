/**
 * R5.10.2 — short UI sound effects.
 *
 * These are synthesized on demand with Web Audio, so the effects add no
 * network weight and no binary assets. The shared sound preference turns
 * both the world themes and these effects off together.
 */

import { getSoundPreference } from "./sound-preference";

export const SFX_NAMES = [
  "click",
  "choice",
  "success",
  "failure",
  "coin",
  "reward",
  "death",
  "page",
  "bell",
  "council"
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

type OscillatorShape = "sine" | "triangle" | "square" | "sawtooth";

export interface SfxTone {
  /** Starting frequency in hertz. */
  frequency: number;
  /** Optional glide target in hertz. */
  endFrequency?: number;
  /** Delay from the start of the effect, in seconds. */
  delay: number;
  /** Duration in seconds. */
  duration: number;
  /** Peak gain before the master bus. */
  gain: number;
  type?: OscillatorShape;
}

export interface SfxNoise {
  delay: number;
  duration: number;
  gain: number;
  /** Centre frequency of the band-pass filter. */
  frequency: number;
  q?: number;
}

export interface SfxPattern {
  tones: readonly SfxTone[];
  noise?: SfxNoise;
}

/**
 * Deliberately quiet and short: UI sounds should confirm an action without
 * competing with the world theme. The master bus keeps summed peaks tame.
 */
export const SFX_PATTERNS: Readonly<Record<SfxName, SfxPattern>> = {
  click: {
    tones: [{ frequency: 760, endFrequency: 560, delay: 0, duration: 0.028, gain: 0.035, type: "square" }],
    noise: { delay: 0, duration: 0.022, gain: 0.012, frequency: 1900, q: 0.7 }
  },
  choice: {
    tones: [
      { frequency: 220, endFrequency: 150, delay: 0, duration: 0.09, gain: 0.055, type: "triangle" },
      { frequency: 330, endFrequency: 220, delay: 0.018, duration: 0.07, gain: 0.028, type: "sine" }
    ]
  },
  success: {
    tones: [
      { frequency: 523.25, delay: 0, duration: 0.2, gain: 0.05 },
      { frequency: 659.25, delay: 0.075, duration: 0.22, gain: 0.045 },
      { frequency: 783.99, delay: 0.15, duration: 0.28, gain: 0.04 }
    ],
    noise: { delay: 0.02, duration: 0.18, gain: 0.008, frequency: 2400, q: 0.5 }
  },
  failure: {
    tones: [
      { frequency: 196, endFrequency: 130.81, delay: 0, duration: 0.24, gain: 0.045, type: "sawtooth" },
      { frequency: 146.83, endFrequency: 98, delay: 0.075, duration: 0.22, gain: 0.03, type: "triangle" }
    ]
  },
  coin: {
    tones: [
      { frequency: 1318.51, delay: 0, duration: 0.07, gain: 0.035 },
      { frequency: 1760, delay: 0.055, duration: 0.16, gain: 0.03 }
    ]
  },
  reward: {
    tones: [
      { frequency: 659.25, delay: 0, duration: 0.13, gain: 0.04 },
      { frequency: 880, delay: 0.075, duration: 0.16, gain: 0.038 },
      { frequency: 1046.5, delay: 0.15, duration: 0.24, gain: 0.034 },
      { frequency: 1318.51, delay: 0.225, duration: 0.3, gain: 0.025 }
    ],
    noise: { delay: 0.04, duration: 0.25, gain: 0.007, frequency: 3200, q: 0.6 }
  },
  death: {
    tones: [
      { frequency: 110, endFrequency: 55, delay: 0, duration: 1.15, gain: 0.06, type: "sine" },
      { frequency: 82.41, endFrequency: 41.2, delay: 0.08, duration: 1.0, gain: 0.035, type: "triangle" },
      { frequency: 164.81, endFrequency: 82.41, delay: 0.02, duration: 0.8, gain: 0.018, type: "sine" }
    ],
    noise: { delay: 0, duration: 0.45, gain: 0.012, frequency: 180, q: 0.4 }
  },
  page: {
    tones: [{ frequency: 320, endFrequency: 260, delay: 0, duration: 0.045, gain: 0.022, type: "triangle" }],
    noise: { delay: 0, duration: 0.07, gain: 0.022, frequency: 950, q: 0.6 }
  },
  bell: {
    tones: [
      { frequency: 1046.5, delay: 0, duration: 0.7, gain: 0.035 },
      { frequency: 1567.98, delay: 0.015, duration: 0.5, gain: 0.018 },
      { frequency: 2093, delay: 0.03, duration: 0.35, gain: 0.008 }
    ]
  },
  council: {
    tones: [
      { frequency: 196, delay: 0, duration: 0.85, gain: 0.045, type: "sine" },
      { frequency: 293.66, delay: 0.09, duration: 0.75, gain: 0.03, type: "triangle" },
      { frequency: 392, delay: 0.18, duration: 0.55, gain: 0.018, type: "sine" }
    ],
    noise: { delay: 0, duration: 0.2, gain: 0.007, frequency: 500, q: 0.4 }
  }
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { context: AudioContext; master: GainNode } | null {
  if (context && master) return { context, master };
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
    return { context, master };
  } catch {
    context = null;
    master = null;
    return null;
  }
}

function scheduleTone(ctx: AudioContext, bus: GainNode, tone: SfxTone): void {
  const start = ctx.currentTime + tone.delay;
  const end = start + tone.duration;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = tone.type ?? "sine";
  oscillator.frequency.setValueAtTime(Math.max(1, tone.frequency), start);
  if (tone.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, tone.gain), start + Math.min(0.02, tone.duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(bus);
  oscillator.start(start);
  oscillator.stop(end + 0.05);
}

function scheduleNoise(ctx: AudioContext, bus: GainNode, noise: SfxNoise): void {
  const frames = Math.max(1, Math.ceil(ctx.sampleRate * noise.duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = noise.frequency;
  filter.Q.value = noise.q ?? 0.7;
  const gain = ctx.createGain();
  const start = ctx.currentTime + noise.delay;
  const end = start + noise.duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, noise.gain), start + Math.min(0.01, noise.duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter).connect(gain).connect(bus);
  source.start(start);
  source.stop(end + 0.03);
}

/** Plays a short effect if the shared world-sound preference is on. */
export function playSfx(name: SfxName): void {
  if (!getSoundPreference()) return;
  const pattern = SFX_PATTERNS[name];
  if (!pattern) return;
  const audioGraph = audio();
  if (!audioGraph) return;
  const { context: ctx, master: bus } = audioGraph;
  if (ctx.state === "suspended") void ctx.resume();
  try {
    for (const tone of pattern.tones) scheduleTone(ctx, bus, tone);
    if (pattern.noise) scheduleNoise(ctx, bus, pattern.noise);
  } catch {
    // Audio can be unavailable in private mode or after a context limit.
  }
}
