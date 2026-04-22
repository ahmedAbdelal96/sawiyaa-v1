import { useMutation } from "@tanstack/react-query";
import { createModerationReport } from "../api/moderation.api";
import type { CreateModerationReportInput } from "../types/moderation.types";

export function useCreateModerationReport() {
  return useMutation({
    mutationFn: (payload: CreateModerationReportInput) => createModerationReport(payload),
  });
}

