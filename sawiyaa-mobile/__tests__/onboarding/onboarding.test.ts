import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  resolveInitialRoute,
  type InitialDestinationInput,
} from "../../src/app-startup/resolve-initial-destination";
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
} from "../../src/features/onboarding/services/onboarding-preferences";
import type { AuthenticatedUser } from "../../src/features/auth/contracts";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockUser: AuthenticatedUser = {
  id: "u_123",
  displayName: "Test User",
  status: "ACTIVE",
  roles: ["PATIENT"],
  primaryEmail: "test@example.com",
  isEmailVerified: true,
  primaryPhone: null,
  isPhoneVerified: false,
  practitionerProfileId: null,
  practitionerStatus: null,
};

describe("Initial Destination Resolver Unit Tests", () => {
  it("returns loading state if auth is not ready or onboarding state is not resolved", () => {
    const case1 = resolveInitialRoute({
      authReady: false,
      user: null,
      role: null,
      onboardingState: null,
    });
    expect(case1).toEqual({ type: "loading" });

    const case2 = resolveInitialRoute({
      authReady: true,
      user: null,
      role: null,
      onboardingState: null,
    });
    expect(case2).toEqual({ type: "loading" });

    const case3 = resolveInitialRoute({
      authReady: false,
      user: null,
      role: null,
      onboardingState: { status: "not_completed" },
    });
    expect(case3).toEqual({ type: "loading" });
  });

  it("routes authenticated patient directly to patient destination ignoring onboarding status", () => {
    // Case A: Onboarding completed
    const result1 = resolveInitialRoute({
      authReady: true,
      user: mockUser,
      role: "patient",
      onboardingState: { status: "completed" },
    });
    expect(result1).toEqual({ type: "navigate", route: "/(patient)" });

    // Case B: Onboarding not completed
    const result2 = resolveInitialRoute({
      authReady: true,
      user: mockUser,
      role: "patient",
      onboardingState: { status: "not_completed" },
    });
    expect(result2).toEqual({ type: "navigate", route: "/(patient)" });

    // Case C: Onboarding read failed
    const result3 = resolveInitialRoute({
      authReady: true,
      user: mockUser,
      role: "patient",
      onboardingState: { status: "read_failed", error: new Error("Read error") },
    });
    expect(result3).toEqual({ type: "navigate", route: "/(patient)" });
  });

  it("routes authenticated practitioner directly to practitioner destination ignoring onboarding status", () => {
    const practitionerUser = { ...mockUser, roles: ["PRACTITIONER"] as any[] };
    
    // Case A: Onboarding completed
    const result1 = resolveInitialRoute({
      authReady: true,
      user: practitionerUser,
      role: "practitioner",
      onboardingState: { status: "completed" },
    });
    expect(result1).toEqual({ type: "navigate", route: "/(practitioner)" });

    // Case B: Onboarding not completed
    const result2 = resolveInitialRoute({
      authReady: true,
      user: practitionerUser,
      role: "practitioner",
      onboardingState: { status: "not_completed" },
    });
    expect(result2).toEqual({ type: "navigate", route: "/(practitioner)" });

    // Case C: Onboarding read failed
    const result3 = resolveInitialRoute({
      authReady: true,
      user: practitionerUser,
      role: "practitioner",
      onboardingState: { status: "read_failed", error: new Error("Read error") },
    });
    expect(result3).toEqual({ type: "navigate", route: "/(practitioner)" });
  });

  it("falls back safely to /(auth) if user role is unknown or invalid", () => {
    const result = resolveInitialRoute({
      authReady: true,
      user: mockUser,
      role: "unknown" as any,
      onboardingState: { status: "not_completed" },
    });
    expect(result).toEqual({ type: "navigate", route: "/(auth)" });
  });

  it("routes unauthenticated first launch (not completed) to /(onboarding)", () => {
    const result = resolveInitialRoute({
      authReady: true,
      user: null,
      role: null,
      onboardingState: { status: "not_completed" },
    });
    expect(result).toEqual({ type: "navigate", route: "/(onboarding)" });
  });

  it("routes unauthenticated completed launch to /(public)", () => {
    const result = resolveInitialRoute({
      authReady: true,
      user: null,
      role: null,
      onboardingState: { status: "completed" },
    });
    expect(result).toEqual({ type: "navigate", route: "/(public)" });
  });

  it("routes unauthenticated storage read failure to /(public) as a safe fallback", () => {
    const result = resolveInitialRoute({
      authReady: true,
      user: null,
      role: null,
      onboardingState: { status: "read_failed", error: new Error("AsyncStorage failure") },
    });
    expect(result).toEqual({ type: "navigate", route: "/(public)" });
  });
});

describe("Onboarding Preferences Service Unit Tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns completed status if stored value is exactly 'true'", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    const result = await isOnboardingCompleted();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("sawiyaa:onboarding:completed:v1");
    expect(result).toEqual({ status: "completed" });
  });

  it("returns not completed status if stored value is null/missing", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await isOnboardingCompleted();
    expect(result).toEqual({ status: "not_completed" });
  });

  it("returns not completed status if stored value is 'false' or malformed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("false");
    const result1 = await isOnboardingCompleted();
    expect(result1).toEqual({ status: "not_completed" });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("malformed_value");
    const result2 = await isOnboardingCompleted();
    expect(result2).toEqual({ status: "not_completed" });
  });

  it("returns read_failed if AsyncStorage.getItem rejects/throws", async () => {
    const readError = new Error("Disk read failure");
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(readError);
    const result = await isOnboardingCompleted();
    expect(result).toEqual({ status: "read_failed", error: readError });
  });

  it("writes 'true' when setOnboardingCompleted(true) is invoked", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await setOnboardingCompleted(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("sawiyaa:onboarding:completed:v1", "true");
  });

  it("writes 'false' when setOnboardingCompleted(false) is invoked", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await setOnboardingCompleted(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("sawiyaa:onboarding:completed:v1", "false");
  });

  it("throws/rejects if AsyncStorage.setItem fails", async () => {
    const writeError = new Error("Disk write failure");
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(writeError);
    await expect(setOnboardingCompleted(true)).rejects.toThrow(writeError);
  });
});
