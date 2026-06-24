import type { ReactNode } from "react";

export type MessageLane =
  | "all"
  | "support"
  | "session"
  | "care"
  | "followup"
  | "direct";

export type LaneWorkspaceProps = {
  role: "patient" | "practitioner" | "admin";
  locale: string;
  selectedId: string | null;
  page: number;
  limit: number;
  updateListQuery: (updates: Record<string, string | number | null | undefined>) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};
