import { describe, expect, it } from "vitest";
import { playSfx, SFX_NAMES, SFX_PATTERNS, type SfxName } from "./sfx";

describe("UI sound effects", () => {
  it("defines a distinct, audible pattern for every effect", () => {
    expect(new Set(SFX_NAMES).size).toBe(SFX_NAMES.length);
    for (const name of SFX_NAMES) {
      const pattern = SFX_PATTERNS[name];
      expect(pattern.tones.length, name).toBeGreaterThan(0);
      for (const tone of pattern.tones) {
        expect(tone.frequency, name).toBeGreaterThan(0);
        expect(tone.endFrequency ?? tone.frequency, name).toBeGreaterThan(0);
        expect(tone.duration, name).toBeGreaterThan(0);
        expect(tone.gain, name).toBeGreaterThan(0);
        expect(tone.delay, name).toBeGreaterThanOrEqual(0);
      }
      if (pattern.noise) {
        expect(pattern.noise.duration).toBeGreaterThan(0);
        expect(pattern.noise.gain).toBeGreaterThan(0);
        expect(pattern.noise.frequency).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every effect short enough for UI feedback", () => {
    for (const name of SFX_NAMES) {
      const pattern = SFX_PATTERNS[name];
      const lastTone = Math.max(...pattern.tones.map((tone) => tone.delay + tone.duration));
      const lastNoise = pattern.noise ? pattern.noise.delay + pattern.noise.duration : 0;
      expect(Math.max(lastTone, lastNoise), name).toBeLessThanOrEqual(1.3);
    }
  });

  it("is a safe no-op when there is no browser audio context or sound is off", () => {
    expect(() => playSfx("click")).not.toThrow();
    expect(() => playSfx("unknown" as SfxName)).not.toThrow();
  });
});
