import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PractitionerAccountSetupHub from "./PractitionerAccountSetupHub";

const updateProfile = vi.fn();
let profileFixture: any;

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("../../hooks/use-practitioners", () => ({
  usePractitionerProfile: () => ({
    data: {
      profile: profileFixture ?? {
        countryCode: "EG",
        pricing: {
          session30: { egp: null, usd: null },
          session60: { egp: null, usd: null },
        },
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
        payoutDestination: null,
      },
    },
  }),
  usePractitionerReadiness: () => ({
    data: { readiness: { canPublish: false, payoutCapabilities: [] } },
    refetch: vi.fn(),
  }),
  useUpdatePractitionerProfile: () => ({
    mutateAsync: updateProfile,
  }),
}));

describe("PractitionerAccountSetupHub", () => {
  beforeEach(() => {
    updateProfile.mockReset();
    profileFixture = undefined;
  });

  it("shows all Instant Booking pricing inputs before Instant Booking is enabled", () => {
    render(<PractitionerAccountSetupHub />);

    expect(screen.getByLabelText("Instant 30m (EGP)")).toBeTruthy();
    expect(screen.getByLabelText("Instant 30m (USD)")).toBeTruthy();
    expect(screen.getByLabelText("Instant 60m (EGP)")).toBeTruthy();
    expect(screen.getByLabelText("Instant 60m (USD)")).toBeTruthy();
  });

  it("preserves configured Instant Booking prices when saving while disabled", async () => {
    profileFixture = {
      countryCode: "EG",
      pricing: {
        session30: { egp: null, usd: null },
        session60: { egp: null, usd: null },
      },
      instantBookingPrice30Egp: 350,
      instantBookingPrice30Usd: 12,
      instantBookingPrice60Egp: 600,
      instantBookingPrice60Usd: 20,
      payoutDestination: null,
    };
    updateProfile.mockResolvedValue({});

    render(<PractitionerAccountSetupHub />);
    fireEvent.click(screen.getByRole("button", { name: "Save Instant Booking" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({
      instantBookingPrice30Egp: 350,
      instantBookingPrice30Usd: 12,
      instantBookingPrice60Egp: 600,
      instantBookingPrice60Usd: 20,
    }));
  });
});
