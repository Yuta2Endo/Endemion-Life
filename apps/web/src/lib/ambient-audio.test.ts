import { describe, expect, it } from "vitest";
import {
  SOUND_PROFILES,
  SOUND_STORAGE_KEY,
  readSoundPreference,
  soundProfileFor,
  writeSoundPreference,
  type SoundStorage
} from "./ambient-audio";

const WORLDS = ["academy", "dark-fantasy", "hunter", "isekai", "murim", "xianxia"] as const;

function memoryStorage(): SoundStorage & { value: Map<string, string> } {
  const value = new Map<string, string>();
  return {
    value,
    getItem: (key) => value.get(key) ?? null,
    setItem: (key, next) => {
      value.set(key, next);
    }
  };
}

describe("ambient audio", () => {
  it("has a complete profile for every world", () => {
    expect(Object.keys(SOUND_PROFILES).sort()).toEqual([...WORLDS].sort());
    for (const id of WORLDS) {
      const profile = SOUND_PROFILES[id];
      expect(profile.root).toBeGreaterThan(0);
      expect(profile.fifth).toBeGreaterThan(0);
      expect(profile.shimmer).toBeGreaterThan(0);
      expect(profile.filter).toBeGreaterThan(0);
      expect(profile.noise).toBeGreaterThan(0);
      expect(profile.pulse).toBeGreaterThan(0);
    }
  });

  it("falls back to the dark fantasy profile for an unknown world", () => {
    expect(soundProfileFor("unknown" as "dark-fantasy")).toEqual(SOUND_PROFILES["dark-fantasy"]);
  });

  it("persists the sound preference", () => {
    const storage = memoryStorage();
    expect(readSoundPreference(storage)).toBe(false);
    writeSoundPreference(true, storage);
    expect(storage.value.get(SOUND_STORAGE_KEY)).toBe("on");
    expect(readSoundPreference(storage)).toBe(true);
    writeSoundPreference(false, storage);
    expect(readSoundPreference(storage)).toBe(false);
  });

  it("survives blocked storage", () => {
    const storage: SoundStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };
    expect(readSoundPreference(storage)).toBe(false);
    expect(() => writeSoundPreference(true, storage)).not.toThrow();
  });
});
