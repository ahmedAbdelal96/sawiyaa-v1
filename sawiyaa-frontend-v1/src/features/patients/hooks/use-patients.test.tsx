import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { patientsQueryKeys } from "../constants/query-keys";
import { useUpdatePatientProfile } from "./use-patients";

const { updatePatientProfile } = vi.hoisted(() => ({
  updatePatientProfile: vi.fn(),
}));

vi.mock("../api/patients.api", () => ({
  getPatientProfile: vi.fn(),
  removePatientAvatar: vi.fn(),
  updatePatientProfile,
  uploadPatientAvatar: vi.fn(),
}));

describe("useUpdatePatientProfile", () => {
  it("applies the persisted response to the patient profile cache", async () => {
    const response = {
      message: "Profile updated",
      profile: { timezone: "America/New_York" },
    };
    updatePatientProfile.mockResolvedValue(response);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdatePatientProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ timezone: "America/New_York" });
    });

    expect(updatePatientProfile).toHaveBeenCalledWith(
      { timezone: "America/New_York" },
      expect.anything(),
    );
    expect(queryClient.getQueryData(patientsQueryKeys.me())).toEqual(response);
  });
});
