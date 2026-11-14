import { z } from "zod";

export const PROFILE_VISIBILITIES = ["public", "friends", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const PROFILE_HEADLINE_MAX = 48;
export const PROFILE_BIO_MAX = 280;

export const profileUpdateSchema = z.strictObject({
  headline: z.string().trim().max(PROFILE_HEADLINE_MAX),
  bio: z.string().trim().max(PROFILE_BIO_MAX),
  favoriteUniverseId: z.string().trim().max(32).nullable(),
  visibility: z.enum(PROFILE_VISIBILITIES)
});
export type ProfileUpdateRequest = z.infer<typeof profileUpdateSchema>;

export interface ProfileIdentityView {
  playerId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  favoriteUniverseId: string | null;
  visibility: ProfileVisibility;
  createdAt: string;
  lastSeenAt: string;
}

export interface ProfileStatsView {
  lives: number;
  alive: number;
  dead: number;
  generations: number;
  bestAge: number;
  universes: number;
  guilds: number;
  friends: number;
  trades: number;
  contributions: number;
  history: number;
}

export interface ProfileBadgeView {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  earned: boolean;
  progress: number;
  target: number;
}

export interface ProfileLifeView {
  id: string;
  name: string;
  universeId: string;
  status: "alive" | "dead";
  age: number;
  generation: number;
  updatedAt: string;
}

export interface ProfileGuildView {
  id: string;
  name: string;
  universeId: string;
  role: "leader" | "officer" | "member";
  reputation: number;
}

export type ProfileAccess = "owner" | "public" | "friends" | "private";

export interface ProfileView {
  identity: ProfileIdentityView;
  access: ProfileAccess;
  isOwner: boolean;
  canEdit: boolean;
  stats: ProfileStatsView | null;
  badges: ProfileBadgeView[];
  lives: ProfileLifeView[];
  guilds: ProfileGuildView[];
  /** Owner-only account details. Never returned for another player. */
  account: { email: string; emailVerified: boolean } | null;
}
