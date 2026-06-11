"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Skeleton } from "@/components/shared/LoadingStates";
import { toAppError } from "@/lib/api/errors";
import {
  usePractitionerProfile,
  useUpdatePractitionerProfile,
} from "../hooks/use-practitioners";
import type { PractitionerProfile } from "../types/practitioners.types";
import {
  PractitionerPageHeader,
  PractitionerSectionCard,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";

type RequirementKey =
  | "approvedProfile"
  | "activeAccount"
  | "packagesEnabled"
  | "packagePurchasesEnabled"
  | "sessionPrice30Egp"
  | "sessionPrice30Usd"
  | "sessionPrice60Egp"
  | "sessionPrice60Usd";

const REQUIREMENT_KEYS: RequirementKey[] = [
  "approvedProfile",
  "activeAccount",
  "packagesEnabled",
  "packagePurchasesEnabled",
  "sessionPrice30Egp",
  "sessionPrice30Usd",
  "sessionPrice60Egp",
  "sessionPrice60Usd",
];

function isRequirementKey(value: string): value is RequirementKey {
  return REQUIREMENT_KEYS.includes(value as RequirementKey);
}

function getMissingRequirements(profile: PractitionerProfile | null): RequirementKey[] {
  if (!profile) return [];

  const missing: RequirementKey[] = [];

  if (profile.profileStatus !== "APPROVED") {
    missing.push("approvedProfile");
  }

  if (profile.pricing.session30.egp === null) {
    missing.push("sessionPrice30Egp");
  }

  if (profile.pricing.session30.usd === null) {
    missing.push("sessionPrice30Usd");
  }

  if (profile.pricing.session60.egp === null) {
    missing.push("sessionPrice60Egp");
  }

  if (profile.pricing.session60.usd === null) {
    missing.push("sessionPrice60Usd");
  }

  return missing;
}

function extractMissingRequirements(error: unknown): string[] {
  const appError = toAppError(error);
  const missing = appError.details?.missingRequirements;

  if (!Array.isArray(missing)) return [];

  return missing.filter((item): item is string => typeof item === "string");
}

type AvailabilityCardProps = {
  profile: PractitionerProfile;
};

function PractitionerPackageAvailabilitySettingsCardContent({
  profile,
}: AvailabilityCardProps) {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const updateProfile = useUpdatePractitionerProfile();

  const [draftEnabled, setDraftEnabled] = useState<boolean>(
    profile.acceptsPackage
  );
  const [serverMissingRequirements, setServerMissingRequirements] = useState<
    string[]
  >([]);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const currentEnabled = profile.acceptsPackage;
  const currentMissingRequirements = useMemo(() => {
    if (!draftEnabled) return [];
    return [...getMissingRequirements(profile), ...serverMissingRequirements];
  }, [draftEnabled, profile, serverMissingRequirements]);

  const displayMissingRequirements = useMemo(
    () => [...new Set(currentMissingRequirements)].filter(isRequirementKey),
    [currentMissingRequirements]
  );

  const hasChanges = draftEnabled !== currentEnabled;
  const canSave =
    hasChanges &&
    !updateProfile.isPending &&
    !(draftEnabled && displayMissingRequirements.length > 0);

  const statusTone = currentEnabled ? "success" : "light";

  const requirementLabel = (key: RequirementKey) =>
    t(`settings.packageAvailability.requirements.${key}` as Parameters<
      typeof t
    >[0]);

  const handleSave = async () => {
    setFeedback(null);

    try {
      await updateProfile.mutateAsync({
        acceptsPackage: draftEnabled,
      });

      setServerMissingRequirements([]);
      setFeedback({
        tone: "success",
        message: t("settings.packageAvailability.feedback.success"),
      });
    } catch (error) {
      const backendMissing = extractMissingRequirements(error);
      if (backendMissing.length > 0) {
        setServerMissingRequirements(backendMissing);
        setFeedback({
          tone: "error",
          message: t("settings.packageAvailability.feedback.missingRequirements"),
        });
        return;
      }

      setServerMissingRequirements([]);
      setFeedback({
        tone: "error",
        message: t("settings.packageAvailability.feedback.error"),
      });
    }
  };

  const hasProfileWarnings = draftEnabled && displayMissingRequirements.length > 0;

  return (
    <div className="space-y-4">
      <PractitionerPageHeader
        eyebrow={t("settings.packageAvailability.eyebrow")}
        title={t("settings.packageAvailability.title")}
        description={t("settings.packageAvailability.description")}
        actions={
          <Badge
            variant="light"
            color={statusTone}
            size="sm"
            startIcon={currentEnabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          >
            {currentEnabled
              ? t("settings.packageAvailability.status.enabled")
              : t("settings.packageAvailability.status.disabled")}
          </Badge>
        }
      />

      <PractitionerSectionCard>
        <div className="rounded-xl border border-border-light bg-surface px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {t("settings.packageAvailability.toggleLabel")}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("settings.packageAvailability.helper")}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={draftEnabled}
              disabled={updateProfile.isPending}
              onClick={() => {
                setFeedback(null);
                setServerMissingRequirements([]);
                setDraftEnabled((current) => !current);
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                draftEnabled
                  ? "border-primary bg-primary/15"
                  : "border-border-light bg-surface-secondary"
              } ${updateProfile.isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform ${
                  draftEnabled
                    ? isRTL
                      ? "-translate-x-5"
                      : "translate-x-5"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {hasProfileWarnings ? (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
            <p className="font-semibold">
              {t("settings.packageAvailability.warning.title")}
            </p>
            <p className="mt-1 leading-6">
              {t("settings.packageAvailability.warning.note")}
            </p>
            <ul className="mt-3 space-y-2">
              {displayMissingRequirements.map((item) => (
                <li key={item} className="flex items-start gap-2 leading-6">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-warning-700" />
                  <span>{requirementLabel(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-text-secondary">
            {hasChanges ? (
              <span>{t("settings.packageAvailability.actions.unsaved")}</span>
            ) : (
              <span>{t("settings.packageAvailability.actions.saved")}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              startIcon={
                updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null
              }
            >
              {updateProfile.isPending
                ? t("settings.packageAvailability.actions.saving")
                : t("settings.packageAvailability.actions.save")}
            </Button>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-6 ${
              feedback.tone === "success"
                ? "border-success-200 bg-success-50 text-success-700"
                : "border-error-200 bg-error-50 text-error-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </PractitionerSectionCard>
    </div>
  );
}

export default function PractitionerPackageAvailabilitySettingsCard() {
  const { data, isLoading, isError, refetch } = usePractitionerProfile();
  const t = useTranslations("practitioner-area");

  const profile = data?.profile ?? null;

  if (isLoading) {
    return (
      <PractitionerSectionCard>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
      </PractitionerSectionCard>
    );
  }

  if (isError || !profile) {
    return (
      <PractitionerSectionCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error-50 text-error-600">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("settings.packageAvailability.title")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("settings.packageAvailability.feedback.loadError")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t("settings.packageAvailability.feedback.retry")}
          </Button>
        </div>
      </PractitionerSectionCard>
    );
  }

  return (
    <PractitionerPackageAvailabilitySettingsCardContent
      key={`${profile.acceptsPackage}-${profile.updatedAt}`}
      profile={profile}
    />
  );
}
