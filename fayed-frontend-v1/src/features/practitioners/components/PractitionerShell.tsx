"use client";

import { useEffect, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import DashboardLayout from "@/layout/DashboardLayout";
import {
  practitionerNavigation,
  practitionerOnboardingNavigation,
} from "@/config/navigation";
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

  const { data, isLoading } = usePractitionerProfile();
  const profile = data?.profile;

  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
  const approved = profile?.profileStatus === "APPROVED";
  const onboardingOnlyMode = Boolean(profile && !approved);
  const onboardingPathActive = isOnboardingPath(pathWithoutLocale);

  useEffect(() => {
    if (!profile || approved || onboardingPathActive) {
      return;
    }
    router.replace(ONBOARDING_PATH as never);
  }, [approved, onboardingPathActive, profile, router]);

  const navigation = onboardingOnlyMode
    ? practitionerOnboardingNavigation
    : practitionerNavigation;

  if (isLoading || !profile || (onboardingOnlyMode && !onboardingPathActive)) {
    return (
      <DashboardLayout
        navigation={navigation}
        basePathPrefix="/practitioner"
        layoutVariant="practitioner"
      >
        <div className="rounded-2xl border border-border-light bg-surface-primary p-6 dark:bg-white/5">
          <p className="text-sm text-text-secondary">
            {isLoading ? t("dashboard.page.subtitle") : t("dashboard.feedback.loadError")}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navigation={navigation}
      basePathPrefix="/practitioner"
      layoutVariant="practitioner"
    >
      {children}
    </DashboardLayout>
  );
}
