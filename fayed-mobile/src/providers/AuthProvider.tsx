import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSegments } from "expo-router";
import { AxiosError } from "axios";
import {
  getAuthMe,
  patientGoogleAuth,
  patientLogin,
  patientLogout,
  patientRefresh,
  patientRegister,
  practitionerForgotPassword,
  practitionerLogin,
  practitionerLogout,
  practitionerRefresh,
  practitionerRegister,
  practitionerResetPassword,
  practitionerVerifyOtp,
} from "../features/auth/api";
import type {
  AuthSuccessResponse,
  AuthenticatedUser,
  MobileRole,
  OtpChallengeResponse,
  PatientLoginRequest,
  PatientRegisterRequest,
  PersistedAuthSession,
  PractitionerForgotPasswordRequest,
  PractitionerLoginRequest,
  PractitionerRegisterRequest,
  PractitionerResetPasswordRequest,
  PractitionerVerifyOtpRequest,
} from "../features/auth/contracts";
import {
  clearStoredAuthSession,
  getOrCreateDeviceId,
  getStoredAuthSession,
  storeAuthSession,
} from "../features/auth/storage";
import { resolveMobileRole } from "../features/auth/roles";
import { setApiAccessToken } from "../lib/api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  role: MobileRole | null;
  isLoading: boolean;
  signInPatient: (
    payload: Omit<PatientLoginRequest, "deviceId">,
  ) => Promise<void>;
  signInPatientWithGoogle: (idToken: string) => Promise<void>;
  signUpPatient: (
    payload: Omit<PatientRegisterRequest, "deviceId">,
  ) => Promise<void>;
  startPractitionerLogin: (
    payload: PractitionerLoginRequest,
  ) => Promise<OtpChallengeResponse>;
  verifyPractitionerOtp: (
    payload: Omit<PractitionerVerifyOtpRequest, "deviceId">,
  ) => Promise<void>;
  signUpPractitioner: (
    payload: PractitionerRegisterRequest,
  ) => ReturnType<typeof practitionerRegister>;
  requestPractitionerPasswordReset: (
    payload: PractitionerForgotPasswordRequest,
  ) => ReturnType<typeof practitionerForgotPassword>;
  resetPractitionerPassword: (
    payload: PractitionerResetPasswordRequest,
  ) => ReturnType<typeof practitionerResetPassword>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUnauthorized(error: unknown) {
  return error instanceof AxiosError && error.response?.status === 401;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<PersistedAuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback(
    async (nextSession: PersistedAuthSession | null) => {
      setSession(nextSession);
      setApiAccessToken(nextSession?.tokens.accessToken ?? null);

      if (nextSession) {
        await storeAuthSession(nextSession);
        return;
      }

      await clearStoredAuthSession();
    },
    [],
  );

  const consumeAuthSuccess = useCallback(
    async (payload: AuthSuccessResponse) => {
      const nextSession: PersistedAuthSession = {
        role: resolveMobileRole(payload.user),
        user: payload.user,
        tokens: payload.tokens,
      };

      await persistSession(nextSession);
    },
    [persistSession],
  );

  const restoreSession = useCallback(async () => {
    setIsBootstrapping(true);

    try {
      const stored = await getStoredAuthSession();
      if (!stored) {
        await persistSession(null);
        return;
      }

      setApiAccessToken(stored.tokens.accessToken);

      try {
        await getAuthMe();
        setSession(stored);
        return;
      } catch (error) {
        if (!isUnauthorized(error)) {
          throw error;
        }
      }

      const deviceId = await getOrCreateDeviceId();
      const refreshed =
        stored.role === "patient"
          ? await patientRefresh({
              refreshToken: stored.tokens.refreshToken,
              deviceId,
            })
          : await practitionerRefresh({
              refreshToken: stored.tokens.refreshToken,
              deviceId,
            });

      await consumeAuthSuccess(refreshed);
    } catch {
      await persistSession(null);
    } finally {
      setIsBootstrapping(false);
    }
  }, [consumeAuthSuccess, persistSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const group = segments[0];
    const inAuthGroup = group === "(auth)";
    const inPatientGroup = group === "(patient)";
    const inPractitionerGroup = group === "(practitioner)";

    if (!session) {
      if (!inAuthGroup) {
        router.replace("/(auth)");
      }
      return;
    }

    if (session.role === "patient" && (inAuthGroup || inPractitionerGroup)) {
      router.replace("/(patient)");
      return;
    }

    if (session.role === "practitioner" && (inAuthGroup || inPatientGroup)) {
      router.replace("/(practitioner)");
    }
  }, [isBootstrapping, router, segments, session]);

  const signInPatient = useCallback(
    async (payload: Omit<PatientLoginRequest, "deviceId">) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await patientLogin({ ...payload, deviceId });
      await consumeAuthSuccess(response);
    },
    [consumeAuthSuccess],
  );

  const signUpPatient = useCallback(
    async (payload: Omit<PatientRegisterRequest, "deviceId">) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await patientRegister({ ...payload, deviceId });
      await consumeAuthSuccess(response);
    },
    [consumeAuthSuccess],
  );

  const signInPatientWithGoogle = useCallback(
    async (idToken: string) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await patientGoogleAuth({ idToken, deviceId });
      await consumeAuthSuccess(response);
    },
    [consumeAuthSuccess],
  );

  const startPractitionerLogin = useCallback(
    async (payload: PractitionerLoginRequest) => {
      return practitionerLogin(payload);
    },
    [],
  );

  const verifyPractitionerOtp = useCallback(
    async (payload: Omit<PractitionerVerifyOtpRequest, "deviceId">) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await practitionerVerifyOtp({ ...payload, deviceId });
      await consumeAuthSuccess(response);
    },
    [consumeAuthSuccess],
  );

  const signOut = useCallback(async () => {
    const current = session;

    try {
      if (current?.role === "patient") {
        await patientLogout(current.tokens.refreshToken);
      } else if (current?.role === "practitioner") {
        await practitionerLogout(current.tokens.refreshToken);
      }
    } catch {
      // Ignore logout transport errors and always clear local session.
    } finally {
      await persistSession(null);
      router.replace("/(auth)");
    }
  }, [persistSession, router, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      isLoading: isBootstrapping,
      signInPatient,
      signInPatientWithGoogle,
      signUpPatient,
      startPractitionerLogin,
      verifyPractitionerOtp,
      signUpPractitioner: practitionerRegister,
      requestPractitionerPasswordReset: practitionerForgotPassword,
      resetPractitionerPassword: practitionerResetPassword,
      signOut,
    }),
    [
      isBootstrapping,
      session,
      signInPatient,
      signInPatientWithGoogle,
      signOut,
      signUpPatient,
      startPractitionerLogin,
      verifyPractitionerOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
