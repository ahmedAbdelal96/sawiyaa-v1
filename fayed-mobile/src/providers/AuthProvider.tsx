import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSegments } from "expo-router";
import { AxiosError } from "axios";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
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
import { resolvePatientNotificationRoute } from "../features/patient/notifications/routes";
import {
  configureForegroundNotifications,
  extractNotificationHref,
  getPushPermissionStatus,
  revokeCurrentPushRegistration,
  syncPushRegistration,
} from "../features/push/service";
import type { PushRegistrationStatus } from "../features/push/types";
import { configureApiAuthSessionHandlers, setApiAccessToken } from "../lib/api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  role: MobileRole | null;
  isLoading: boolean;
  pushRegistrationStatus: PushRegistrationStatus;
  isPushRegistrationPending: boolean;
  enablePushNotifications: () => Promise<void>;
  refreshPushRegistrationState: () => Promise<void>;
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

function mapPushPermissionStatusToRegistrationStatus(
  permissionStatus: Awaited<ReturnType<typeof getPushPermissionStatus>>,
): PushRegistrationStatus {
  if (permissionStatus === "denied") {
    return "denied";
  }

  if (permissionStatus === "not-supported") {
    return "not-supported";
  }

  if (permissionStatus === "granted") {
    return "registered";
  }

  return "permission-required";
}

function isSupportedMobileRole(role: MobileRole | null | undefined) {
  return role === "patient" || role === "practitioner";
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<PersistedAuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [pushRegistrationStatus, setPushRegistrationStatus] =
    useState<PushRegistrationStatus>("checking");
  const [isPushRegistrationPending, setIsPushRegistrationPending] =
    useState(false);
  const sessionRef = useRef<PersistedAuthSession | null>(null);
  const lastHandledNotificationIdentifierRef = useRef<string | null>(null);

  useEffect(() => {
    configureForegroundNotifications();
  }, []);

  const persistSession = useCallback(
    async (nextSession: PersistedAuthSession | null) => {
      sessionRef.current = nextSession;
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

  const clearAuthenticatedState = useCallback(async () => {
    await persistSession(null);
    queryClient.clear();
    setPushRegistrationStatus("checking");
  }, [persistSession, queryClient]);

  const runPushRegistration = useCallback(
    async (requestPermission: boolean) => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        const permissionStatus = await getPushPermissionStatus();
        setPushRegistrationStatus(
          mapPushPermissionStatusToRegistrationStatus(permissionStatus),
        );
        return;
      }

      setIsPushRegistrationPending(true);
      try {
        const result = await syncPushRegistration(currentSession, {
          requestPermission,
        });
        setPushRegistrationStatus(result.status);
      } finally {
        setIsPushRegistrationPending(false);
      }
    },
    [],
  );

  const refreshPushRegistrationState = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession) {
      await runPushRegistration(false);
      return;
    }

    const permissionStatus = await getPushPermissionStatus();
    setPushRegistrationStatus(
      mapPushPermissionStatusToRegistrationStatus(permissionStatus),
    );
  }, [runPushRegistration]);

  const enablePushNotifications = useCallback(async () => {
    await runPushRegistration(true);
  }, [runPushRegistration]);

  const consumeAuthSuccess = useCallback(
    async (payload: AuthSuccessResponse, nextRole?: MobileRole) => {
      const resolvedRole = nextRole ?? resolveMobileRole(payload.user);
      if (!isSupportedMobileRole(resolvedRole)) {
        await clearAuthenticatedState();
        throw new Error("UNSUPPORTED_MOBILE_ROLE");
      }

      const nextSession: PersistedAuthSession = {
        role: resolvedRole,
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

      if (!isSupportedMobileRole(stored.role)) {
        await clearAuthenticatedState();
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
          : stored.role === "practitioner"
            ? await practitionerRefresh({
                refreshToken: stored.tokens.refreshToken,
                deviceId,
              })
            : null;

      if (!refreshed) {
        await clearAuthenticatedState();
        return;
      }

      await consumeAuthSuccess(refreshed, stored.role);
    } catch {
      await clearAuthenticatedState();
    } finally {
      setIsBootstrapping(false);
    }
  }, [clearAuthenticatedState, consumeAuthSuccess, persistSession]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!session) {
      void refreshPushRegistrationState();
      return;
    }

    void runPushRegistration(false);
  }, [
    isBootstrapping,
    refreshPushRegistrationState,
    runPushRegistration,
    session,
  ]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleResponse = async (
      response: Notifications.NotificationResponse | null,
    ) => {
      if (!response) {
        return;
      }

      const identifier = response.notification.request.identifier;
      if (lastHandledNotificationIdentifierRef.current === identifier) {
        return;
      }

      lastHandledNotificationIdentifierRef.current = identifier;

      const currentSession = sessionRef.current;
      if (currentSession?.role !== "patient") {
        return;
      }

      const href = extractNotificationHref(
        response.notification.request.content.data,
      );
      const targetRoute = href ? resolvePatientNotificationRoute(href) : null;

      router.push((targetRoute ?? "/(patient)/notifications") as any);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleResponse(response);
      },
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void handleResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
      configureApiAuthSessionHandlers({
        refreshAccessToken: async () => {
          const currentSession = sessionRef.current;

        if (!currentSession) {
          return null;
        }

        if (!isSupportedMobileRole(currentSession.role)) {
          return null;
        }

        const deviceId = await getOrCreateDeviceId();
        const refreshed =
          currentSession.role === "patient"
            ? await patientRefresh({
                refreshToken: currentSession.tokens.refreshToken,
                deviceId,
              })
            : await practitionerRefresh({
                refreshToken: currentSession.tokens.refreshToken,
                deviceId,
              });

        if (!refreshed) {
          return null;
        }

        await consumeAuthSuccess(refreshed, currentSession.role);
        return refreshed.tokens.accessToken;
      },
      onAuthFailure: async () => {
        await clearAuthenticatedState();
        router.replace("/(auth)");
      },
    });

    return () => {
      configureApiAuthSessionHandlers(null);
    };
  }, [clearAuthenticatedState, consumeAuthSuccess, router]);

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
      await consumeAuthSuccess(response, "patient");
    },
    [consumeAuthSuccess],
  );

  const signUpPatient = useCallback(
    async (payload: Omit<PatientRegisterRequest, "deviceId">) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await patientRegister({ ...payload, deviceId });
      await consumeAuthSuccess(response, "patient");
    },
    [consumeAuthSuccess],
  );

  const signInPatientWithGoogle = useCallback(
    async (idToken: string) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await patientGoogleAuth({ idToken, deviceId });
      await consumeAuthSuccess(response, "patient");
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
      await consumeAuthSuccess(response, "practitioner");
    },
    [consumeAuthSuccess],
  );

  const signOut = useCallback(async () => {
    const current = session;

    try {
      await revokeCurrentPushRegistration();

      if (current?.role === "patient") {
        await patientLogout(current.tokens.refreshToken);
      } else if (current?.role === "practitioner") {
        await practitionerLogout(current.tokens.refreshToken);
      }
    } catch {
      // Ignore logout transport errors and always clear local session.
    } finally {
      await clearAuthenticatedState();
      router.replace("/(auth)");
    }
  }, [clearAuthenticatedState, router, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      isLoading: isBootstrapping,
      pushRegistrationStatus,
      isPushRegistrationPending,
      enablePushNotifications,
      refreshPushRegistrationState,
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
      enablePushNotifications,
      isPushRegistrationPending,
      pushRegistrationStatus,
      refreshPushRegistrationState,
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
