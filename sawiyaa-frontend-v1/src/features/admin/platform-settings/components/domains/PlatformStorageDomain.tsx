"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  HardDrive,
  MessageSquare,
  User,
  FileCheck,
  BookOpen,
  Image as ImageIcon,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  History,
  Copy,
  Check,
  Plus,
  Minus,
  X,
  Sliders,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";

interface PlatformStorageDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
}

// Byte conversion helpers
export function bytesToMb(bytes: unknown, fallbackMb = 5): number {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return fallbackMb;
  const mb = num / (1024 * 1024);
  return Number.isInteger(mb) ? mb : Number(mb.toFixed(1));
}

export function mbToBytes(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

// Convert technical MIME types to friendly labels
export function formatMimeTypeToFriendly(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WEBP";
    case "application/pdf":
      return "PDF";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "XLSX";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "PPTX";
    case "text/plain":
      return "TXT";
    default:
      return mime.split("/")[1]?.toUpperCase() ?? mime;
  }
}

export default function PlatformStorageDomain({
  settings,
  onOpenHistory,
}: PlatformStorageDomainProps) {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  const updateMutation = useUpdatePlatformSetting();
  const resetMutation = useResetPlatformSetting();

  // Local drafts state
  const [localDrafts, setLocalDrafts] = useState<Record<string, unknown>>({});

  // Confirmation modal state
  const [activeEditingSetting, setActiveEditingSetting] = useState<{
    setting: PlatformSetting;
    proposedRawValue: unknown;
    displayProposedValue: string;
    displayPreviousValue: string;
    isHighRisk: boolean;
  } | null>(null);

  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to find a setting with fallback
  const getSetting = (
    key: string,
    fallbackDefault: unknown,
    type: "BOOLEAN" | "INTEGER" | "STRING_ARRAY"
  ): PlatformSetting => {
    return (
      settings.find((s) => s.key === key) ?? {
        key,
        label: key,
        labelAr: key,
        description: "",
        descriptionAr: "",
        category: "SYSTEM",
        domain: "file-uploads",
        valueType: type,
        value: fallbackDefault,
        defaultValue: fallbackDefault,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.system",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: `val-${key}`,
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "IMMEDIATE",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: { control: type === "BOOLEAN" ? "toggle" : type === "INTEGER" ? "integer" : "multi-select" },
      }
    );
  };

  // Chat Settings
  const chatEnabledSetting = getSetting("file.uploads.chat.enabled", true, "BOOLEAN");
  const chatMaxImageBytesSetting = getSetting("file.uploads.chat.maxImageBytes", 10 * 1024 * 1024, "INTEGER");
  const chatMaxDocBytesSetting = getSetting("file.uploads.chat.maxDocumentBytes", 10 * 1024 * 1024, "INTEGER");
  const chatMaxFilesSetting = getSetting("file.uploads.chat.maxFilesPerMessage", 3, "INTEGER");
  const chatImageTypesSetting = getSetting("file.uploads.chat.allowedImageMimeTypes", ["image/jpeg", "image/png", "image/webp"], "STRING_ARRAY");
  const chatDocTypesSetting = getSetting("file.uploads.chat.allowedDocumentMimeTypes", ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"], "STRING_ARRAY");

  // Profile Avatars
  const patientAvatarMaxBytesSetting = getSetting("file.uploads.patient-avatar.maxBytes", 5 * 1024 * 1024, "INTEGER");
  const practitionerAvatarMaxBytesSetting = getSetting("file.uploads.practitioner-avatar.maxBytes", 5 * 1024 * 1024, "INTEGER");

  // Practitioner & Verification Documents
  const practitionerCredMaxBytesSetting = getSetting("file.uploads.practitioner-credential.maxBytes", 5 * 1024 * 1024, "INTEGER");
  const payoutProofMaxBytesSetting = getSetting("file.uploads.payout-proof.maxBytes", 10 * 1024 * 1024, "INTEGER");

  // Content Assets
  const articleCoverMaxBytesSetting = getSetting("file.uploads.article-cover.maxBytes", 10 * 1024 * 1024, "INTEGER");
  const academyCoverMaxBytesSetting = getSetting("file.uploads.academy-program-cover.maxBytes", 10 * 1024 * 1024, "INTEGER");

  // Helpers to get draft or current value
  const getCurrentValue = <T,>(setting: PlatformSetting, fallback: T): T => {
    if (setting.key in localDrafts) return localDrafts[setting.key] as T;
    return (setting.value as T) ?? fallback;
  };

  const isSettingDirty = (setting: PlatformSetting): boolean => {
    if (!(setting.key in localDrafts)) return false;
    return JSON.stringify(localDrafts[setting.key]) !== JSON.stringify(setting.value);
  };

  // Values in MB
  const chatEnabled = getCurrentValue(chatEnabledSetting, true);
  const chatImageMb = bytesToMb(getCurrentValue(chatMaxImageBytesSetting, 10 * 1024 * 1024));
  const chatDocMb = bytesToMb(getCurrentValue(chatMaxDocBytesSetting, 10 * 1024 * 1024));
  const chatMaxFiles = getCurrentValue(chatMaxFilesSetting, 3);

  const patientAvatarMb = bytesToMb(getCurrentValue(patientAvatarMaxBytesSetting, 5 * 1024 * 1024));
  const practitionerAvatarMb = bytesToMb(getCurrentValue(practitionerAvatarMaxBytesSetting, 5 * 1024 * 1024));

  const practitionerCredMb = bytesToMb(getCurrentValue(practitionerCredMaxBytesSetting, 5 * 1024 * 1024));
  const payoutProofMb = bytesToMb(getCurrentValue(payoutProofMaxBytesSetting, 10 * 1024 * 1024));

  const articleCoverMb = bytesToMb(getCurrentValue(articleCoverMaxBytesSetting, 10 * 1024 * 1024));
  const academyCoverMb = bytesToMb(getCurrentValue(academyCoverMaxBytesSetting, 10 * 1024 * 1024));

  const allowedImageTypes = getCurrentValue(chatImageTypesSetting, ["image/jpeg", "image/png", "image/webp"]);
  const allowedDocTypes = getCurrentValue(chatDocTypesSetting, ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);

  const handleOpenConfirm = (
    setting: PlatformSetting,
    proposedRawValue: unknown,
    displayProposedValue: string,
    displayPreviousValue: string,
    isHighRisk = false
  ) => {
    setActiveEditingSetting({
      setting,
      proposedRawValue,
      displayProposedValue,
      displayPreviousValue,
      isHighRisk,
    });
    setReason("");
  };

  const handleSaveConfirm = async () => {
    if (!activeEditingSetting || !reason.trim()) return;

    try {
      await updateMutation.mutateAsync({
        key: activeEditingSetting.setting.key,
        value: activeEditingSetting.proposedRawValue,
        reason: reason.trim(),
        expectedUpdatedAt: activeEditingSetting.setting.expectedUpdatedAt,
      });

      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[activeEditingSetting.setting.key];
        return next;
      });

      setFeedback("saved");
      setActiveEditingSetting(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleResetConfirm = async (setting: PlatformSetting) => {
    if (!reason.trim()) return;

    try {
      await resetMutation.mutateAsync({
        key: setting.key,
        reason: reason.trim(),
        expectedUpdatedAt: setting.expectedUpdatedAt,
      });

      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[setting.key];
        return next;
      });

      setFeedback("reset");
      setActiveEditingSetting(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generic Stepper Component for Size in MB
  const renderSizeStepper = (
    setting: PlatformSetting,
    currentMb: number,
    label: string,
    description: string,
    min = 1,
    max = 25
  ) => {
    const rawVal = getCurrentValue(setting, mbToBytes(currentMb));
    const isDirty = isSettingDirty(setting);
    const prevMb = bytesToMb(setting.value);

    return (
      <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">{label}</span>
          <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
            {currentMb} {t("storageDomain.labels.mbUnit")}
          </span>
        </div>
        <p className="text-[11px] text-text-secondary">{description}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => {
                const nextMb = Math.max(min, currentMb - 1);
                setLocalDrafts((prev) => ({ ...prev, [setting.key]: mbToBytes(nextMb) }));
              }}
              disabled={currentMb <= min}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={`Decrease ${label}`}
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="flex min-w-[70px] items-center justify-center px-2 font-mono text-sm font-black text-text-primary">
              <span>{currentMb}</span>
              <span className="ms-1 text-xs text-text-muted">{t("storageDomain.labels.mbUnit")}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextMb = Math.min(max, currentMb + 1);
                setLocalDrafts((prev) => ({ ...prev, [setting.key]: mbToBytes(nextMb) }));
              }}
              disabled={currentMb >= max}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={`Increase ${label}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isDirty && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handleOpenConfirm(
                  setting,
                  mbToBytes(currentMb),
                  `${currentMb} MB`,
                  `${prevMb} MB`,
                  false
                )
              }
              className="h-8 px-3 text-xs font-bold"
            >
              {t("actions.save")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className="animate-fade-in flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{t(`states.${feedback}`)}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: Chat Attachments */}
      <SurfaceCard variant="section" className="space-y-6 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("storageDomain.sections.chat.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("storageDomain.sections.chat.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color={chatEnabled ? "success" : "light"} size="sm">
            {chatEnabled ? t("storageDomain.labels.enabled") : t("storageDomain.labels.disabled")}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Toggle: Chat Uploads Enabled */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {t("storageDomain.labels.enableChatUploads")}
              </span>
              <p className="text-[11px] text-text-secondary">
                {t("storageDomain.labels.enableChatUploadsDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={chatEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [chatEnabledSetting.key]: !chatEnabled,
                  }));
                  handleOpenConfirm(
                    chatEnabledSetting,
                    !chatEnabled,
                    !chatEnabled ? t("storageDomain.labels.enabled") : t("storageDomain.labels.disabled"),
                    chatEnabled ? t("storageDomain.labels.enabled") : t("storageDomain.labels.disabled"),
                    !chatEnabled === false // High risk if disabling
                  );
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  chatEnabled ? "bg-teal-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    chatEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Stepper: Max Files per message */}
          <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                {t("storageDomain.labels.chatMaxFilesPerMsg")}
              </span>
              <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                {chatMaxFiles} {t("storageDomain.labels.filesUnit")}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t("storageDomain.labels.chatMaxFilesPerMsgDesc")}
            </p>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = Math.max(1, chatMaxFiles - 1);
                    setLocalDrafts((prev) => ({ ...prev, [chatMaxFilesSetting.key]: nextVal }));
                  }}
                  disabled={chatMaxFiles <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Decrease Max Files per message"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="flex min-w-[70px] items-center justify-center px-2 font-mono text-sm font-black text-text-primary">
                  <span>{chatMaxFiles}</span>
                  <span className="ms-1 text-xs text-text-muted">{t("storageDomain.labels.filesUnit")}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = Math.min(10, chatMaxFiles + 1);
                    setLocalDrafts((prev) => ({ ...prev, [chatMaxFilesSetting.key]: nextVal }));
                  }}
                  disabled={chatMaxFiles >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Increase Max Files per message"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {isSettingDirty(chatMaxFilesSetting) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleOpenConfirm(
                      chatMaxFilesSetting,
                      chatMaxFiles,
                      `${chatMaxFiles} files`,
                      `${chatMaxFilesSetting.value} files`,
                      false
                    )
                  }
                  className="h-8 px-3 text-xs font-bold"
                >
                  {t("actions.save")}
                </Button>
              )}
            </div>
          </div>

          {/* Stepper: Max Image Bytes */}
          {renderSizeStepper(
            chatMaxImageBytesSetting,
            chatImageMb,
            t("storageDomain.labels.chatMaxImageSize"),
            t("storageDomain.labels.chatMaxImageSizeDesc"),
            1,
            25
          )}

          {/* Stepper: Max Document Bytes */}
          {renderSizeStepper(
            chatMaxDocBytesSetting,
            chatDocMb,
            t("storageDomain.labels.chatMaxDocSize"),
            t("storageDomain.labels.chatMaxDocSizeDesc"),
            1,
            25
          )}
        </div>

        {/* Allowed Formats Chips Visualization */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-slate-900/30">
          <div className="space-y-2">
            <span className="text-xs font-bold text-text-primary">
              🖼️ {t("storageDomain.labels.allowedImageTypes")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allowedImageTypes.map((mime) => (
                <span
                  key={mime}
                  className="inline-flex items-center rounded-lg border border-border-light bg-surface-primary px-2.5 py-1 font-mono text-xs font-bold text-text-primary shadow-2xs"
                >
                  {formatMimeTypeToFriendly(mime)}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-text-primary">
              📄 {t("storageDomain.labels.allowedDocTypes")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allowedDocTypes.map((mime) => (
                <span
                  key={mime}
                  className="inline-flex items-center rounded-lg border border-border-light bg-surface-primary px-2.5 py-1 font-mono text-xs font-bold text-text-primary shadow-2xs"
                >
                  {formatMimeTypeToFriendly(mime)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 2: Profile Avatars */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("storageDomain.sections.profiles.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("storageDomain.sections.profiles.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {renderSizeStepper(
            patientAvatarMaxBytesSetting,
            patientAvatarMb,
            t("storageDomain.labels.patientAvatarSize"),
            t("storageDomain.labels.patientAvatarSizeDesc"),
            1,
            15
          )}

          {renderSizeStepper(
            practitionerAvatarMaxBytesSetting,
            practitionerAvatarMb,
            t("storageDomain.labels.practitionerAvatarSize"),
            t("storageDomain.labels.practitionerAvatarSizeDesc"),
            1,
            15
          )}
        </div>
      </SurfaceCard>

      {/* SECTION 3: Practitioner Credentials & Proofs */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("storageDomain.sections.documents.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("storageDomain.sections.documents.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {renderSizeStepper(
            practitionerCredMaxBytesSetting,
            practitionerCredMb,
            t("storageDomain.labels.practitionerCredSize"),
            t("storageDomain.labels.practitionerCredSizeDesc"),
            1,
            25
          )}

          {renderSizeStepper(
            payoutProofMaxBytesSetting,
            payoutProofMb,
            t("storageDomain.labels.payoutProofSize"),
            t("storageDomain.labels.payoutProofSizeDesc"),
            1,
            25
          )}
        </div>
      </SurfaceCard>

      {/* CONFIRMATION & AUDIT REASON MODAL */}
      {activeEditingSetting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-surface-primary p-6 shadow-xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-light pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">
                  {t("storageDomain.confirmModal.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {activeEditingSetting.setting.key}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditingSetting(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Risk Warning Alert */}
              <div
                className={cn(
                  "flex gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed",
                  activeEditingSetting.isHighRisk
                    ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200"
                    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"
                )}
              >
                <ShieldAlert
                  className={cn(
                    "h-5 w-5 shrink-0",
                    activeEditingSetting.isHighRisk ? "text-rose-600" : "text-amber-600"
                  )}
                />
                <p>
                  {activeEditingSetting.isHighRisk
                    ? t("storageDomain.confirmModal.warningHigh")
                    : t("storageDomain.confirmModal.warningMedium")}
                </p>
              </div>

              {/* Before vs Proposed Comparison */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("storageDomain.confirmModal.previousValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-text-secondary">
                    {activeEditingSetting.displayPreviousValue}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("storageDomain.confirmModal.newValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-primary">
                    {activeEditingSetting.displayProposedValue}
                  </p>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-text-primary">
                  {t("storageDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {t("storageDomain.confirmModal.impactText")}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("storageDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("storageDomain.confirmModal.reasonPlaceholder")}
                  rows={2}
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs text-text-primary focus:bg-surface-primary"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-border-light pt-4">
              <div>
                {activeEditingSetting.setting.source === "OVERRIDE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetConfirm(activeEditingSetting.setting)}
                    disabled={resetMutation.isPending || !reason.trim()}
                    className="text-xs text-danger hover:bg-danger/10"
                  >
                    <RotateCcw className="me-1 h-3.5 w-3.5" />
                    {t("actions.reset")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveEditingSetting(null)}
                >
                  {t("storageDomain.confirmModal.cancelBtn")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveConfirm}
                  disabled={!reason.trim() || updateMutation.isPending}
                  className="gap-1.5 font-bold"
                >
                  {updateMutation.isPending && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {t("storageDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
