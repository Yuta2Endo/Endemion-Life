import { readSoundPreference, SOUND_STORAGE_KEY, writeSoundPreference } from "./ambient-audio";

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Subscribes React to the local sound preference and cross-tab storage changes. */
export function subscribeSoundPreference(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SOUND_STORAGE_KEY) return;
    cached = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function getSoundPreference(): boolean {
  if (cached === null) cached = readSoundPreference();
  return cached;
}

export function getServerSoundPreference(): boolean {
  return false;
}

export function setSoundPreference(enabled: boolean): void {
  cached = enabled;
  writeSoundPreference(enabled);
  emit();
}
