"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { AmbientEngine } from "@/lib/ambient-audio";
import {
  getServerSoundPreference,
  getSoundPreference,
  setSoundPreference,
  subscribeSoundPreference
} from "@/lib/sound-preference";
import { SoundIcon, SoundOffIcon } from "../icons";
import { useI18n } from "../locale-provider";

export function SoundToggle({ universeId }: { universeId: string }) {
  const { t } = useI18n();
  const engine = useRef<AmbientEngine | null>(null);
  const enabled = useSyncExternalStore(subscribeSoundPreference, getSoundPreference, getServerSoundPreference);

  useEffect(() => {
    if (!enabled) {
      engine.current?.stop();
      engine.current = null;
      return;
    }
    const current = engine.current ?? new AmbientEngine();
    engine.current = current;
    void current.start(universeId);
  }, [enabled, universeId]);

  useEffect(() => () => {
    engine.current?.stop();
    engine.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const resume = () => void engine.current?.resume();
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !getSoundPreference();
    setSoundPreference(next);
    if (next) {
      const current = engine.current ?? new AmbientEngine();
      engine.current = current;
      void current.start(universeId);
    } else {
      engine.current?.stop();
      engine.current = null;
    }
  }, [universeId]);

  const label = t(enabled ? "sound.on" : "sound.off");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      data-testid="sound-toggle"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-bone-300 transition hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
    >
      {enabled ? <SoundIcon className="h-5 w-5" /> : <SoundOffIcon className="h-5 w-5" />}
    </button>
  );
}
