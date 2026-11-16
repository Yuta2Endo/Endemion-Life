import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SOUND_STORAGE_KEY,
  SOUND_WORLDS,
  readSoundPreference,
  soundUrlFor,
  writeSoundPreference,
  type SoundStorage
} from "./ambient-audio";

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
  it("has a public loop for every world", () => {
    expect([...SOUND_WORLDS].sort()).toEqual([
      "academy",
      "dark-fantasy",
      "hunter",
      "isekai",
      "murim",
      "xianxia"
    ]);
    for (const id of SOUND_WORLDS) {
      expect(soundUrlFor(id)).toBe(`/audio/worlds/${id}.ogg`);
      const file = join(process.cwd(), "public", "audio", "worlds", `${id}.ogg`);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(100_000);
    }
  });

  it("falls back to the dark fantasy loop for an unknown world", () => {
    expect(soundUrlFor("unknown")).toBe("/audio/worlds/dark-fantasy.ogg");
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
