import type { PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";

export type PublicPractitionerPresence = {
  status: "OFFLINE" | "ONLINE" | "AWAY" | "BUSY";
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
};

export type PublicPractitionerInstantBookingAvailability = {
  availableNow: boolean;
  durations: { 30: boolean; 60: boolean };
  checkedAt: string;
};

export type PractitionerProfile = PublicPractitioner & {
  /** Backend-resolved full professional bio for the request locale. */
  bio?: string | null;
  bioAr: string | null;
  bioEn: string | null;
  approachAr: string;
  approachEn: string;
};
