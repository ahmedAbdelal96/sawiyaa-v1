"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import {
  usePlatformSettingHistory,
  usePlatformSettings,
  usePlatformSettingsChangeSet,
} from "../hooks/use-platform-settings";
import type {
  PlatformSetting,
  PlatformSettingDomain,
} from "../types/platform-settings.types";
import {
  ChangeReview,
  SaveBar,
  SettingRow,
  SettingSection,
} from "./inline/PlatformSettingsInlinePrimitives";
import { formatHumanSettingValue } from "./inline/platform-settings-human-presentation";

type Props = {
  domain: PlatformSettingDomain;
};

export function formatPlatformSettingValue(
  setting: Pick<PlatformSetting, "key" | "value" | "valueType" | "uiMetadata">,
  isAr: boolean,
) {
  return formatHumanSettingValue(setting, setting.value, isAr);
}

export default function PlatformSettingsDomainScreen({ domain }: Props) {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [resetKeys, setResetKeys] = useState<Set<string>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const showDomainToolbar = domain === "advanced";

  const query = usePlatformSettings({
    domain,
    search: showDomainToolbar ? search.trim() || undefined : undefined,
    state: showDomainToolbar ? state || undefined : undefined,
  });
  const changeSetMutation = usePlatformSettingsChangeSet();
  const historyQuery = usePlatformSettingHistory(historyKey);
  const settings = useMemo(
    () =>
      (domain === "advanced"
        ? (query.data?.advancedSettings ?? [])
        : (query.data?.settings ?? [])
      )
        .filter((setting) => setting.primaryDomain === domain)
        .filter(
          (setting) =>
            domain === "advanced" ||
            !setting.capabilities?.advancedOnly &&
              !setting.capabilities?.managedByDedicatedControl &&
              setting.effectiveSource !== "SYSTEM_MANAGED" &&
              setting.effectiveSource !== "ENVIRONMENT" &&
              setting.effectiveSource !== "DEDICATED_CONTROL",
        ),
    [domain, query.data],
  );
  const serverValues = useMemo(
    () =>
      Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
      ),
    [settings],
  );
  const values = draft ?? serverValues;
  const dirtyChanges = useMemo(
    () =>
      settings.flatMap((setting) => {
        const value = values[setting.key];
        const isReset = resetKeys.has(setting.key);
        if (!isReset && valuesEqual(value, serverValues[setting.key]))
          return [];
        return [
          {
            setting,
            before: serverValues[setting.key],
            after: value,
            reset: isReset,
          },
        ];
      }),
    [resetKeys, serverValues, settings, values],
  );
  const sections = useMemo(() => {
    const grouped = new Map<string, PlatformSetting[]>();
    settings.forEach((setting) => {
      const section = setting.section ?? "technical";
      grouped.set(section, [...(grouped.get(section) ?? []), setting]);
    });
    return [...grouped.entries()];
  }, [settings]);
  const historySetting = settings.find((setting) => setting.key === historyKey);
  const hasDirtyChanges = dirtyChanges.length > 0;
  const hasHighRiskChanges = dirtyChanges.some(
    ({ setting }) =>
      setting.capabilities?.requiresConfirmation ||
      setting.capabilities?.requiresStepUp,
  );

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyChanges]);

  const updateDraft = (setting: PlatformSetting, nextValue: unknown) => {
    setSaved(false);
    setConflict(false);
    setSaveError(false);
    setResetKeys((current) => {
      const next = new Set(current);
      next.delete(setting.key);
      return next;
    });
    setDraft((current) => ({
      ...(current ?? serverValues),
      [setting.key]: nextValue,
    }));
    setFieldErrors((current) => ({
      ...current,
      [setting.key]: validateSetting(setting, nextValue, t),
    }));
  };

  const resetDraftValue = (setting: PlatformSetting) => {
    setSaved(false);
    setConflict(false);
    setSaveError(false);
    setDraft((current) => ({
      ...(current ?? serverValues),
      [setting.key]: setting.defaultValue,
    }));
    setResetKeys((current) => new Set(current).add(setting.key));
    setFieldErrors((current) => ({ ...current, [setting.key]: "" }));
  };

  const cancelDraft = () => {
    setDraft(null);
    setResetKeys(new Set());
    setReviewOpen(false);
    setReason("");
    setFieldErrors({});
    setConflict(false);
    setSaveError(false);
  };

  const openReview = () => {
    const nextErrors = Object.fromEntries(
      dirtyChanges
        .map(({ setting, after }) => [
          setting.key,
          validateSetting(setting, after, t),
        ])
        .filter(([, error]) => Boolean(error)),
    );
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setReviewOpen(true);
  };

  const saveChanges = async () => {
    if (!reason.trim() || dirtyChanges.length === 0) return;
    try {
      setConflict(false);
      setSaveError(false);
      await changeSetMutation.mutateAsync({
        domain,
        reason: reason.trim(),
        changes: dirtyChanges.map(({ setting, after, reset }) => ({
          key: setting.key,
          ...(reset ? { reset: true } : { value: after }),
          expectedUpdatedAt: setting.expectedUpdatedAt,
        })),
      });
      if (query.refetch) await query.refetch();
      cancelDraft();
      setSaved(true);
    } catch (error) {
      if (isConflictError(error)) setConflict(true);
      else setSaveError(true);
    }
  };

  const handleBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasDirtyChanges && !window.confirm(t("inline.leaveWarning"))) {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/admin/platform-settings"
            onClick={handleBack}
            className="text-primary inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
          >
            {isAr ? (
              <ArrowRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowLeft className="h-3.5 w-3.5" />
            )}
            {t("domainPage.back")}
          </Link>
          <h1 className="text-text-primary text-2xl font-black tracking-tight md:text-3xl">
            {query.data?.domains?.find(
              (summary) => summary.primaryDomain === domain,
            )?.[isAr ? "titleAr" : "title"] ?? t(`domains.${domain}`)}
          </h1>
          <p className="text-text-secondary max-w-3xl text-sm leading-7">
            {query.data?.domains?.find(
              (summary) => summary.primaryDomain === domain,
            )?.[isAr ? "descriptionAr" : "description"] ??
              t("directory.description")}
          </p>
        </div>
      </div>

      {showDomainToolbar && (
        <div className="border-border-light bg-surface-primary flex flex-col gap-3 rounded-2xl border p-4 md:flex-row">
          <label className="relative block flex-1">
            <Search className="text-text-muted pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              aria-label={t("filters.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("filters.search")}
              className="app-control border-border-light text-text-primary w-full rounded-xl py-3 ps-10 text-sm"
            />
          </label>
          <select
            aria-label={t("filters.state")}
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="app-control border-border-light text-text-primary rounded-xl px-3 py-3 text-xs font-semibold"
          >
            <option value="">{t("filters.allStates")}</option>
            <option value="editable">{t("states.editable")}</option>
            <option value="readonly">{t("states.readonly")}</option>
            <option value="changed">{t("states.changed")}</option>
            <option value="default">{t("states.default")}</option>
          </select>
        </div>
      )}

      {conflict && (
        <div className="border-danger/30 bg-danger-light/30 text-danger flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs font-semibold">
          <span>{t("inline.conflict")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cancelDraft();
              query.refetch?.();
            }}
          >
            {t("inline.reload")}
          </Button>
        </div>
      )}
      {saveError && (
        <p className="border-danger/30 bg-danger-light/30 text-danger rounded-xl border p-3 text-xs font-semibold">
          {t("inline.saveError")}
        </p>
      )}
      {saved && (
        <p className="border-success/30 bg-success-light/30 text-success rounded-xl border p-3 text-xs font-semibold">
          {t("inline.saved")}
        </p>
      )}

      {query.isLoading ? (
        <div className="border-border-light text-text-secondary rounded-2xl border p-10 text-center text-sm">
          {t("states.loading")}
        </div>
      ) : query.isError ? (
        <div className="border-danger/30 text-danger rounded-2xl border p-10 text-center text-sm">
          {t("states.error")}
        </div>
      ) : sections.length === 0 ? (
        <div className="border-border-light text-text-muted rounded-2xl border p-10 text-center text-sm">
          {t("inline.empty")}
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(([section, sectionSettings]) => (
            <SettingSection
              key={section}
              title={t(`domainPage.sections.${section}`)}
            >
              {sectionSettings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  value={values[setting.key]}
                  isAr={isAr}
                  dirty={dirtyChanges.some(
                    (change) => change.setting.key === setting.key,
                  )}
                  error={fieldErrors[setting.key]}
                  onChange={(value) => updateDraft(setting, value)}
                  onReset={
                    setting.capabilities?.canReset
                      ? () => resetDraftValue(setting)
                      : undefined
                  }
                  onHistory={() =>
                    setHistoryKey((current) =>
                      current === setting.key ? null : setting.key,
                    )
                  }
                  historyOpen={historyKey === setting.key}
                  history={
                    historyKey === setting.key && historySetting ? (
                      <HistoryInline
                        setting={historySetting}
                        query={historyQuery}
                        isAr={isAr}
                        t={t}
                      />
                    ) : null
                  }
                />
              ))}
            </SettingSection>
          ))}
        </div>
      )}

      <SaveBar
        count={dirtyChanges.length}
        onCancel={cancelDraft}
        onSave={hasHighRiskChanges ? openReview : saveChanges}
        reason={reason}
        onReasonChange={setReason}
        showReason={!hasHighRiskChanges}
        disabled={
          Object.values(fieldErrors).some(Boolean) ||
          (!hasHighRiskChanges && !reason.trim()) ||
          changeSetMutation.isPending
        }
      />
      {reviewOpen && (
        <ChangeReview
          changes={dirtyChanges}
          reason={reason}
          isAr={isAr}
          isSaving={changeSetMutation.isPending}
          highRisk={hasHighRiskChanges}
          conflict={conflict}
          onReasonChange={setReason}
          onBack={() => setReviewOpen(false)}
          onConfirm={saveChanges}
        />
      )}
    </div>
  );
}

function HistoryInline({
  setting,
  query,
  isAr,
  t,
}: {
  setting: PlatformSetting;
  query: ReturnType<typeof usePlatformSettingHistory>;
  isAr: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="border-border-light bg-surface-secondary/40 mt-3 rounded-xl border p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-text-primary font-semibold">{t("inline.history")}</p>
        <span className="text-text-muted font-mono text-[10px]">
          {setting.key}
        </span>
      </div>
      {query.isLoading ? (
        <p className="text-text-muted mt-2">{t("states.loading")}</p>
      ) : query.data?.items?.length ? (
        <div className="divide-border-light mt-2 divide-y">
          {query.data.items.map((item) => (
            <div
              key={item.id}
              className="text-text-secondary grid gap-1 py-2 md:grid-cols-[1fr_auto]"
            >
              <span>
                {item.changedByUser?.displayName ||
                  item.changedByUser?.emails?.[0]?.email ||
                  "Admin"}{" "}
                · {item.changeAction}
              </span>
              <span>
                {new Date(item.changedAt).toLocaleString(
                  isAr ? "ar-EG" : "en-US",
                )}
              </span>
              <span>{item.reason || t("history.noReason")}</span>
              <span>
                {t("history.before")} {formatSnapshot(item.oldValueSnapshot)} →{" "}
                {t("history.after")} {formatSnapshot(item.newValueSnapshot)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted mt-2">{t("history.empty")}</p>
      )}
    </div>
  );
}

function formatSnapshot(value: unknown) {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value ?? "—");
}

function validateSetting(
  setting: PlatformSetting,
  value: unknown,
  t: (key: string) => string,
) {
  if (value === "" || value === null || value === undefined)
    return t("inline.validationRequired");
  if (
    (setting.valueType === "INTEGER" || setting.valueType === "NUMBER") &&
    typeof value !== "number"
  )
    return t("inline.validationRequired");
  if (setting.valueType === "INTEGER" && !Number.isInteger(value))
    return t("inline.validationInteger");
  if (
    typeof value === "number" &&
    ((setting.minimum !== undefined && value < setting.minimum) ||
      (setting.maximum !== undefined && value > setting.maximum))
  )
    return t("inline.validationRange");
  if (setting.valueType === "JSON" && typeof value === "string")
    return t("inline.validationRequired");
  return "";
}

function valuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== typeof right)
    return false;
  if (typeof left === "object" && typeof right === "object")
    return JSON.stringify(left) === JSON.stringify(right);
  return false;
}

function isConflictError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    response?: { data?: { error?: string }; error?: string };
    status?: number;
    statusCode?: number;
  };
  return (
    candidate.status === 409 ||
    candidate.statusCode === 409 ||
    candidate.response?.data?.error === "CONFIG_WRITE_CONFLICT" ||
    candidate.response?.error === "CONFIG_WRITE_CONFLICT"
  );
}
