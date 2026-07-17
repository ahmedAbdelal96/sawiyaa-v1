import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  downloadAdminPractitionerRecoveriesCsv,
  getAdminPractitionerRecovery,
  listAdminPractitionerRecoveries,
  markAdminPractitionerRecoveryCollected,
  waiveAdminPractitionerRecovery,
} from "../api/admin-practitioner-recoveries.api";
import { adminPractitionerRecoveriesQueryKeys } from "../constants/query-keys";
import type {
  ListAdminPractitionerRecoveriesParams,
  MarkAdminPractitionerRecoveryCollectedPayload,
  WaiveAdminPractitionerRecoveryPayload,
} from "../types/admin-practitioner-recoveries.types";
import { parseDownloadFilename, triggerBlobDownload } from "@/lib/downloads/file-download";

const CSV_FALLBACK_FILE_NAME = "admin-practitioner-recoveries.csv";

export function useAdminPractitionerRecoveries(params: ListAdminPractitionerRecoveriesParams) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPractitionerRecoveriesQueryKeys.list(params),
    queryFn: () => listAdminPractitionerRecoveries(params),
    enabled: isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerRecovery(id?: string) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminPractitionerRecoveriesQueryKeys.detail(id ?? ""),
    queryFn: () => getAdminPractitionerRecovery(id as string),
    enabled: isAdminRole(role) && Boolean(id),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useMarkAdminPractitionerRecoveryCollected() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      recoveryId: string;
      payload: MarkAdminPractitionerRecoveryCollectedPayload;
    }) =>
      markAdminPractitionerRecoveryCollected(
        input.recoveryId,
        input.payload,
      ),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerRecoveriesQueryKeys.detail(input.recoveryId),
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerRecoveriesQueryKeys.all,
      });
    },
  });
}

export function useWaiveAdminPractitionerRecovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      recoveryId: string;
      payload: WaiveAdminPractitionerRecoveryPayload;
    }) => waiveAdminPractitionerRecovery(input.recoveryId, input.payload),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: adminPractitionerRecoveriesQueryKeys.detail(input.recoveryId),
      });
      queryClient.invalidateQueries({
        queryKey: adminPractitionerRecoveriesQueryKeys.all,
      });
    },
  });
}

export function useDownloadAdminPractitionerRecoveriesCsv() {
  return useMutation({
    mutationFn: async (params: ListAdminPractitionerRecoveriesParams) => {
      const exported = await downloadAdminPractitionerRecoveriesCsv(params);
      const fileName = parseDownloadFilename(
        exported.fileNameHeader,
        CSV_FALLBACK_FILE_NAME,
      );
      triggerBlobDownload(exported.blob, fileName);
      return fileName;
    },
  });
}
