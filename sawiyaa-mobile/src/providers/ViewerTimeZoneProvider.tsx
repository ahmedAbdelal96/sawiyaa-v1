import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";
import {
  patientProfileQueryKeys,
  usePatientProfile,
} from "../features/patient/profile/hooks";
import { usePractitionerProfile } from "../features/practitioner/profile/hooks";
import { practitionerProfileQueryKeys } from "../features/practitioner/profile/hooks";
import { initializeCurrentUserTimezone } from "../features/auth/api";
import {
  resolveDeviceTimeZone,
  isMissingPersistedTimeZone,
  setMobileTimeZoneContext,
} from "../lib/time-formatting";

export function ViewerTimeZoneProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const attemptedUserIds = useRef(new Set<string>());
  const patientProfile = usePatientProfile(role === "patient");
  const practitionerProfile = usePractitionerProfile(role === "practitioner");
  const profileTimeZone =
    role === "patient"
      ? patientProfile.data?.profile.timezone
      : role === "practitioner"
        ? practitionerProfile.data?.profile.timezone
        : null;

  useEffect(() => {
    // The formatter resolves the current device IANA zone on demand. Keeping
    // only the authenticated profile zone here prevents stale user state from
    // leaking across logout/login while allowing foreground refreshes.
    setMobileTimeZoneContext({ profileTimeZone });
  }, [profileTimeZone, role, user?.id]);

  useEffect(() => {
    if (!user?.id || (role !== "patient" && role !== "practitioner")) return;

    const profileQuery =
      role === "patient" ? patientProfile : practitionerProfile;
    if (!profileQuery.isSuccess || attemptedUserIds.current.has(user.id))
      return;

    // Non-empty values, including invalid legacy values, are not silently
    // repaired. Only a genuinely missing timezone is eligible for initialization.
    if (!isMissingPersistedTimeZone(profileTimeZone)) return;

    attemptedUserIds.current.add(user.id);
    const detected = resolveDeviceTimeZone();
    if (!detected) return;

    void initializeCurrentUserTimezone(detected)
      .then((result) => {
        setMobileTimeZoneContext({ profileTimeZone: result.timezone });
        if (role === "patient") {
          void queryClient.invalidateQueries({
            queryKey: patientProfileQueryKeys.all,
          });
        } else {
          void queryClient.invalidateQueries({
            queryKey: practitionerProfileQueryKeys.all,
          });
        }
      })
      .catch(() => {
        // Device detection/persistence is best-effort and must not block login.
      });
  }, [
    patientProfile,
    practitionerProfile,
    profileTimeZone,
    queryClient,
    role,
    user?.id,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setMobileTimeZoneContext({ profileTimeZone });
      }
    });

    return () => subscription.remove();
  }, [profileTimeZone]);

  return children;
}
