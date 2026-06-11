"use client";

import { useEffect, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import DashboardLayout from "@/layout/DashboardLayout";
import {
  practitionerNavigation,
  practitionerOnboardingNavigation,
} from "@/config/navigation";
import { useAuthMe } from "@/features/auth/hooks/use-auth";
import { usePractitionerPresenceHeartbeat } from "@/features/presence/hooks/use-presence";
import { usePractitionerProfile } from "../hooks/use-practitioners";

type PractitionerShellProps = {
  children: ReactNode;
};

const ONBOARDING_PATH = "/practitioner/application";

function isOnboardingPath(pathWithoutLocale: string) {
  return (
    pathWithoutLocale === ONBOARDING_PATH ||
    pathWithoutLocale.startsWith(`${ONBOARDING_PATH}/`)
  );
}

export default function PractitionerShell({ children }: PractitionerShellProps) {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const {
    data: authMe,
    isLoading: authLoading,
    isError: authError,
  } = useAuthMe();
  const isOtpVerified = authMe?.isPractitionerOtpVerified === true;
  const shouldLoadProfile = isOtpVerified;
  const { data, isLoading: profileLoading } = usePractitionerProfile(shouldLoadProfile);
  const profile = data?.profile;

  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const approved = profile?.profileStatus === "APPROVED";
  const onboardingPathActive = isOnboardingPath(pathWithoutLocale);
  
  const isLoading = authLoading || profileLoading;
  const isError = authError;

  const heartbeatEnabled =
    isOtpVerified && approved && !isLoading && !isError;

  usePractitionerPresenceHeartbeat(heartbeatEnabled);

  useEffect(() => {
    if (isLoading || isError) return;
    if (!isOtpVerified || !profile || approved || onboardingPathActive) {
      return;
    }
    router.replace(ONBOARDING_PATH as never);
  }, [approved, onboardingPathActive, isOtpVerified, profile, router, isLoading, isError]);

  if (isLoading || isError) {
    return (
      <DashboardLayout
        navigation={[]} // Safe minimal shell, no unauthorized tabs
        basePathPrefix="/practitioner"
        layoutVariant="practitioner"
        messagingRole="practitioner"
        contentMode={onboardingPathActive ? "full" : "constrained"}
      >
        <div className="rounded-2xl border border-border-light bg-surface-primary p-6 dark:bg-white/5 animate-pulse">
          <div className="h-4 w-1/3 bg-surface-secondary rounded mb-2"></div>
          <div className="h-4 w-1/4 bg-surface-secondary rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isOtpVerified) {
    return (
      <DashboardLayout
        navigation={practitionerOnboardingNavigation}
        basePathPrefix="/practitioner"
        layoutVariant="practitioner"
        messagingRole="practitioner"
        contentMode={onboardingPathActive ? "full" : "constrained"}
      >
        <div className="rounded-2xl border border-border-light bg-surface-primary p-6 dark:bg-white/5">
          <p className="text-sm font-semibold text-text-primary dark:text-white">
            {t("onboarding.otpRequiredTitle")}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("onboarding.otpRequiredNote")}
          </p>
          <Link
            href="/signin?mode=practitioner"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {t("onboarding.otpRequiredAction")}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!approved) {
    if (!onboardingPathActive) {
      // Prevent rendering protected content while waiting for redirect
      return (
        <DashboardLayout
          navigation={practitionerOnboardingNavigation}
          basePathPrefix="/practitioner"
          layoutVariant="practitioner"
          messagingRole="practitioner"
          contentMode="full"
        >
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-primary" />
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout
        navigation={practitionerOnboardingNavigation}
        basePathPrefix="/practitioner"
        layoutVariant="practitioner"
        messagingRole="practitioner"
        contentMode="full"
      >
        {children}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navigation={practitionerNavigation}
      basePathPrefix="/practitioner"
      layoutVariant="practitioner"
      messagingRole="practitioner"
      contentMode={onboardingPathActive ? "full" : "constrained"}
    >
      {children}
    </DashboardLayout>
  );
}
