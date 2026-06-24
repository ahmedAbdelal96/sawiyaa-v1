import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession,
} from "../../src/features/auth/storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../src/features/auth/secure-token-storage", () => ({
  getSecureAuthTokens: jest.fn(),
  setSecureAuthTokens: jest.fn(),
  clearSecureAuthTokens: jest.fn(),
}));

import * as secureTokenStorage from "../../src/features/auth/secure-token-storage";

const V1_KEY = "fayed.mobile.auth.session.v1";
const V2_KEY = "fayed.mobile.auth.session.v2";

function makeLegacySession() {
  return {
    role: "patient",
    user: {
      id: "u_1",
      displayName: "Test",
      status: "ACTIVE",
      roles: ["PATIENT"],
      primaryEmail: "test@example.com",
      isEmailVerified: true,
      primaryPhone: null,
      isPhoneVerified: false,
      practitionerProfileId: null,
      practitionerStatus: null,
    },
    tokens: {
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAt: "2026-01-01T00:00:00.000Z",
      refreshTokenExpiresAt: "2026-02-01T00:00:00.000Z",
    },
  };
}

describe("auth storage secure token migration", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("migrates legacy v1 AsyncStorage tokens to SecureStore and writes v2 metadata", async () => {
    const legacy = makeLegacySession();

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === V2_KEY) return null;
      if (key === V1_KEY) return JSON.stringify(legacy);
      return null;
    });

    (secureTokenStorage.setSecureAuthTokens as jest.Mock).mockResolvedValue(undefined);

    const restored = await getStoredAuthSession();
    expect(restored).not.toBeNull();
    expect(secureTokenStorage.setSecureAuthTokens).toHaveBeenCalledWith(legacy.tokens);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      V2_KEY,
      JSON.stringify({ role: legacy.role, user: legacy.user }),
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(V1_KEY);
  });

  it("fails closed when v2 metadata exists but secure tokens are missing", async () => {
    const legacy = makeLegacySession();

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === V2_KEY) return JSON.stringify({ role: legacy.role, user: legacy.user });
      return null;
    });

    (secureTokenStorage.getSecureAuthTokens as jest.Mock).mockResolvedValue(null);

    const restored = await getStoredAuthSession();
    expect(restored).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(V2_KEY);
  });

  it("storeAuthSession writes tokens to secure storage and only metadata to AsyncStorage", async () => {
    const legacy = makeLegacySession();
    (secureTokenStorage.setSecureAuthTokens as jest.Mock).mockResolvedValue(undefined);

    await storeAuthSession(legacy as any);

    expect(secureTokenStorage.setSecureAuthTokens).toHaveBeenCalledWith(legacy.tokens);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      V2_KEY,
      JSON.stringify({ role: legacy.role, user: legacy.user }),
    );
  });

  it("clearStoredAuthSession clears secure tokens and both v1/v2 session keys", async () => {
    (secureTokenStorage.clearSecureAuthTokens as jest.Mock).mockResolvedValue(undefined);

    await clearStoredAuthSession();

    expect(secureTokenStorage.clearSecureAuthTokens).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(V2_KEY);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(V1_KEY);
  });
});
