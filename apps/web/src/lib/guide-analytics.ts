import type { GuideEvent } from "@endemion/shared";
import { apiFetch } from "./api";

/** R1.2: fire-and-forget guide signal. Failure must never block play. */
export function trackGuide(lifeId: string, event: GuideEvent): void {
  void apiFetch("/api/insights/guide", {
    method: "POST",
    body: JSON.stringify({ lifeId, event })
  }).catch(() => undefined);
}
