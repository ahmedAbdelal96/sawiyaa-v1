"use client";

import { useTranslations } from "next-intl";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
} from "../hooks/use-practitioners";
import PractitionerApplicationStatus from "./PractitionerApplicationStatus";
import PractitionerCredentialsList from "./PractitionerCredentialsList";
import PractitionerProfileForm from "./PractitionerProfileForm";
import PractitionerSpecialtiesView from "./PractitionerSpecialtiesView";

const LOCKED_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/90">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{note}</p>
      </div>
      {children}
    </section>
  );
}

export default function PractitionerOnboardingWorkspace() {
  const t = useTranslations("practitioner-area");
  const { data: profileData } = usePractitionerProfile();
  const { data: applicationData } = usePractitionerApplicationStatus();

  const status = applicationData?.application.status ?? null;
  const isLocked = Boolean(status && LOCKED_STATUSES.includes(status as (typeof LOCKED_STATUSES)[number]));
  const lockMessage =
    status === "UNDER_REVIEW"
      ? t("application.statusMessage.UNDER_REVIEW")
      : t("application.statusMessage.SUBMITTED");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <h1 className="text-xl font-semibold text-text-primary dark:text-white/90">
          {t("application.page.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t("application.page.subtitle")}</p>
        {profileData?.profile.profileStatus !== "APPROVED" ? (
          <p className="mt-3 text-xs text-text-muted">{t("application.submit.notReady")}</p>
        ) : null}
      </div>

      {isLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-300">
          {lockMessage}
        </div>
      ) : null}

      <Section
        title={t("profile.page.title")}
        note={t("profile.page.subtitle")}
      >
        <PractitionerProfileForm isEditable={!isLocked} />
      </Section>

      <Section
        title={t("specialties.page.title")}
        note={t("specialties.page.subtitle")}
      >
        <PractitionerSpecialtiesView isEditable={!isLocked} />
      </Section>

      <Section
        title={t("credentials.page.title")}
        note={t("credentials.page.subtitle")}
      >
        <PractitionerCredentialsList isEditable={!isLocked} />
      </Section>

      <Section
        title={t("application.status.heading")}
        note={t("application.submit.confirmHint")}
      >
        <PractitionerApplicationStatus />
      </Section>
    </div>
  );
}
