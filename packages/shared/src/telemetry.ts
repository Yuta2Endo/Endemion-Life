import { z } from "zod";

export const GUIDE_EVENTS = ["view", "advance", "event", "dossier", "dismiss"] as const;
export type GuideEvent = (typeof GUIDE_EVENTS)[number];

export const guideTelemetrySchema = z.strictObject({
  lifeId: z.uuid(),
  event: z.enum(GUIDE_EVENTS)
});
export type GuideTelemetryRequest = z.infer<typeof guideTelemetrySchema>;

export interface FunnelView {
  days: number;
  keptDays: number;
  generatedAt: string;
  lives: {
    created: number;
    players: number;
    adults: number;
    decisions: number;
    deaths: number;
    successors: number;
  };
  rates: {
    adult: number;
    decision: number;
    death: number;
    successor: number;
  };
  guide: Record<GuideEvent, number>;
  byWorld: { world: string; created: number }[];
}
