import type { PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";

export type CredentialSummary = {
  totalCredentials: number;
  approvedCredentials: number;
};

export type PublicPractitionerPresence = {
  status: "OFFLINE" | "ONLINE" | "AWAY" | "BUSY";
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
};

export type PractitionerProfile = PublicPractitioner & {
  bioAr: string;
  bioEn: string;
  approachAr: string;
  approachEn: string;
  credentialsSummary: CredentialSummary;
};
