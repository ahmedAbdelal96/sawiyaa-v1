"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CheckCircle2,
  Copy,
  Globe2,
  ImageUp,
  Loader2,
  PencilLine,
  Percent,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { FormSkeleton } from "@/components/shared/LoadingStates";
import {
  useCurrentUser,
  usePatchCurrentUserProfile,
  useRemoveCurrentUserAvatar,
  useUploadCurrentUserAvatar,
} from "@/features/users/hooks/use-users";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePatchMySettingsPreferences,
  usePutMySettingsNotificationPreferences,
} from "../hooks/use-settings";
import type { MySettingsNotificationPreferenceItem, SettingsLocale } from "../types/settings.types";

type PreferencesFormState = {
  locale: SettingsLocale;
  timezone: string;
};

type AccountFormState = {
  displayName: string;
};

type AvatarDraftState = {
  file: File;
  previewUrl: string;
};

function formatDateValue(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function normalizePreferenceRows(items: MySettingsNotificationPreferenceItem[]) {
  return items
    .slice()
    .sort((a, b) => {
      if (a.typeSlug !== b.typeSlug) return a.typeSlug.localeCompare(b.typeSlug);
      return a.channel.localeCompare(b.channel);
    });
}

export default function AdminSettingsProfileScreen() {
  const t = useTranslations("admin-settings");
  const locale = useLocale();
  const router = useRouter();

  const userQuery = useCurrentUser();
  const settingsQuery = useMySettings();
  const notificationQuery = useMySettingsNotificationPreferences();
  const patchPreferences = usePatchMySettingsPreferences();
  const putNotifications = usePutMySettingsNotificationPreferences();
  const patchAccount = usePatchCurrentUserProfile();
  const uploadAvatar = useUploadCurrentUserAvatar();
  const removeAvatar = useRemoveCurrentUserAvatar();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications">("profile");
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PreferencesFormState>({
    locale: "ar",
    timezone: "Africa/Cairo",
  });
  const [accountForm, setAccountForm] = useState<AccountFormState>({ displayName: "" });
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraftState | null>(null);
  const [notificationDraft, setNotificationDraft] = useState<MySettingsNotificationPreferenceItem[]>([]);

  const currentUser = userQuery.data;
  const settings = settingsQuery.data?.item;
  const notificationState = notificationQuery.data?.item ?? settings?.notificationPreferences;
  const notificationRows = useMemo(
    () => normalizePreferenceRows(notificationState?.items ?? []),
    [notificationState?.items],
  );

  const roleLabels = useMemo(() => {
    const roles = currentUser?.roles.roles ?? [];
    if (roles.length === 0) return "-";
    return roles.map((role) => t(`roles.${role}` as Parameters<typeof t>[0])).join(" | ");
  }, [currentUser?.roles.roles, t]);

  const canRender = !userQuery.isLoading && !settingsQuery.isLoading && !notificationQuery.isLoading;

  const openAccountModal = () => {
    if (!currentUser) return;
    setFeedback(null);
    setAccountForm({
      displayName: currentUser.displayName ?? "",
    });
    setIsAccountModalOpen(true);
  };

  const openPreferencesModal = () => {
    if (!settings) return;
    setFeedback(null);
    setPreferencesForm({
      locale: (settings.preferences.locale ?? "ar") as SettingsLocale,
      timezone: settings.preferences.timezone ?? "Africa/Cairo",
    });
    setIsPreferencesModalOpen(true);
  };

  const openNotificationsModal = () => {
    if (!notificationState) return;
    setFeedback(null);
    setNotificationDraft(normalizePreferenceRows(notificationState.items));
    setIsNotificationsModalOpen(true);
  };

  const handleSaveAccount = () => {
    setFeedback(null);
    patchAccount.mutate(
      {
        displayName: accountForm.displayName.trim(),
      },
      {
        onSuccess: () => {
          setIsAccountModalOpen(false);
          setFeedback({ tone: "success", message: t("feedback.profileSaved") });
        },
        onError: (error) => {
          setFeedback({
            tone: "error",
            message: getErrorMessage(error, t("feedback.profileSaveFailed")),
          });
        },
      },
    );
  };

  const handleSavePreferences = () => {
    setFeedback(null);
    patchPreferences.mutate(
      {
        locale: preferencesForm.locale,
        timezone: preferencesForm.timezone.trim(),
      },
      {
        onSuccess: () => {
          setIsPreferencesModalOpen(false);
          setFeedback({ tone: "success", message: t("feedback.preferencesSaved") });
        },
        onError: (error) => {
          setFeedback({
            tone: "error",
            message: getErrorMessage(error, t("feedback.preferencesSaveFailed")),
          });
        },
      },
    );
  };

  const handleToggleNotification = (index: number) => {
    setNotificationDraft((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item,
      ),
    );
  };

  const handleSaveNotifications = () => {
    setFeedback(null);
    putNotifications.mutate(
      {
        items: notificationDraft,
      },
      {
        onSuccess: () => {
          setIsNotificationsModalOpen(false);
          setFeedback({ tone: "success", message: t("feedback.notificationsSaved") });
        },
        onError: (error) => {
          setFeedback({
            tone: "error",
            message: getErrorMessage(error, t("feedback.notificationsSaveFailed")),
          });
        },
      },
    );
  };

  const handleChooseAvatar = () => {
    setFeedback(null);
    fileInputRef.current?.click();
  };

  const handleAvatarFileSelected = (file: File | null) => {
    if (!file) return;
    setFeedback(null);

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setFeedback({ tone: "error", message: t("feedback.avatarUpdateFailed") });
      return;
    }

    const maxBytes = 512 * 1024;
    if (file.size > maxBytes) {
      setFeedback({ tone: "error", message: t("feedback.avatarUpdateFailed") });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarDraft({ file, previewUrl });
  };

  useEffect(() => {
    return () => {
      if (avatarDraft?.previewUrl) {
        URL.revokeObjectURL(avatarDraft.previewUrl);
      }
    };
  }, [avatarDraft?.previewUrl]);

  const handleSaveAvatar = () => {
    if (!avatarDraft) return;
    setFeedback(null);

    uploadAvatar.mutate(avatarDraft.file, {
      onSuccess: () => {
        setAvatarDraft((current) => {
          if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
          return null;
        });
        setFeedback({ tone: "success", message: t("feedback.avatarUpdated") });
      },
      onError: (error) =>
        setFeedback({ tone: "error", message: getErrorMessage(error, t("feedback.avatarUpdateFailed")) }),
    });
  };

  const handleCancelAvatarDraft = () => {
    setAvatarDraft((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  const handleRemoveAvatar = () => {
    setFeedback(null);
    removeAvatar.mutate(undefined, {
      onSuccess: () => setFeedback({ tone: "success", message: t("feedback.avatarRemoved") }),
      onError: (error) =>
        setFeedback({ tone: "error", message: getErrorMessage(error, t("feedback.avatarRemoveFailed")) }),
    });
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ tone: "success", message: t("feedback.copied") });
    } catch {
      // no-op
    }
  };

  if (!canRender) {
    return (
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <FormSkeleton />
      </section>
    );
  }

  if (!currentUser || !settings || !notificationState) {
    return (
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t("page.title")}</h1>
        <p className="mt-3 text-sm text-error-600">{t("errors.loadFailed")}</p>
      </section>
    );
  }

  const displayName = currentUser.displayName ?? "-";
  const userInitial = (currentUser.displayName ?? "U").trim().charAt(0).toUpperCase();
  const avatarSrc = avatarDraft?.previewUrl ?? currentUser.avatarDataUrl ?? null;
  const hasAvatarDraft = Boolean(avatarDraft);
  const hasExistingAvatar = Boolean(currentUser.avatarDataUrl);
  const primaryEmail =
    currentUser.identitySummary.primaryEmail ??
    currentUser.identitySummary.primaryEmailMasked ??
    t("states.notSet");
  const primaryPhone =
    currentUser.identitySummary.primaryPhone ??
    currentUser.identitySummary.primaryPhoneMasked ??
    t("states.notSet");

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-lg font-semibold text-primary">
                  {userInitial}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-text-primary sm:text-2xl">{displayName}</h1>
              <p className="mt-1 truncate text-sm text-text-secondary">{primaryEmail}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                  {t(`accountStatus.${currentUser.accountStatus}` as Parameters<typeof t>[0])}
                </span>
                <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">{roleLabels}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleAvatarFileSelected(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleChooseAvatar}
              startIcon={<ImageUp className="h-4 w-4" />}
            >
              {t("actions.changePhoto")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/settings/revenue-share")}
              startIcon={<Percent className="h-4 w-4" />}
            >
              {t("revenueShare.title")}
            </Button>

            {hasAvatarDraft ? (
              <>
                <Button size="sm" onClick={handleSaveAvatar} disabled={uploadAvatar.isPending}>
                  {t("actions.savePhoto")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAvatarDraft}
                  disabled={uploadAvatar.isPending}
                >
                  {t("actions.cancel")}
                </Button>
              </>
            ) : hasExistingAvatar ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={removeAvatar.isPending}
                startIcon={<Trash2 className="h-4 w-4" />}
              >
                {t("actions.removePhoto")}
              </Button>
            ) : null}

            <Button variant="outline" size="sm" onClick={openAccountModal} startIcon={<PencilLine className="h-4 w-4" />}>
              {t("actions.edit")}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "profile" ? "bg-primary text-white" : "bg-surface-tertiary text-text-primary hover:bg-primary-light"
            }`}
          >
            {t("tabs.profile")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "notifications"
                ? "bg-primary text-white"
                : "bg-surface-tertiary text-text-primary hover:bg-primary-light"
            }`}
          >
            {t("tabs.notifications")}
          </button>
        </div>
      </section>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <>
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="app-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">{t("sections.account.title")}</h2>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.account.fields.displayName")}</dt>
                  <dd className="font-medium text-text-primary">{displayName}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.account.fields.email")}</dt>
                  <dd className="font-medium text-text-primary">{primaryEmail}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.account.fields.phone")}</dt>
                  <dd className="font-medium text-text-primary">{primaryPhone}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.account.fields.createdAt")}</dt>
                  <dd className="font-medium text-text-primary">{formatDateValue(currentUser.createdAt, locale)}</dd>
                </div>
              </dl>
            </article>

            <article className="app-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-text-primary">{t("sections.preferences.title")}</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreferencesModal}
                  startIcon={<PencilLine className="h-4 w-4" />}
                >
                  {t("actions.edit")}
                </Button>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.preferences.fields.locale")}</dt>
                  <dd className="font-medium text-text-primary">
                    {t(`locales.${settings.preferences.locale ?? "ar"}` as Parameters<typeof t>[0])}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-text-secondary">{t("sections.preferences.fields.timezone")}</dt>
                  <dd className="font-medium text-text-primary">{settings.preferences.timezone ?? "-"}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="app-panel rounded-[28px] p-5 sm:p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-text-primary">{t("sections.advanced.title")}</span>
                </span>
                <span className="text-sm font-semibold text-text-secondary group-open:text-text-primary">
                  {t("actions.edit")}
                </span>
              </summary>

              <div className="mt-4 rounded-2xl border border-border-light bg-white px-4 py-3">
                <p className="text-xs font-semibold text-text-secondary">{t("sections.advanced.fields.userId")}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-mono text-xs text-text-primary">{currentUser.userId}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(currentUser.userId)}
                    startIcon={<Copy className="h-4 w-4" />}
                  >
                    {t("actions.copy")}
                  </Button>
                </div>
              </div>
            </details>
          </section>
        </>
      ) : (
        <section className="app-panel rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t("sections.notifications.title")}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t("sections.notifications.subtitle")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openNotificationsModal}
              startIcon={<PencilLine className="h-4 w-4" />}
            >
              {t("actions.manageNotifications")}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {notificationRows.map((item) => (
              <div
                key={`${item.typeSlug}:${item.channel}`}
                className="flex items-center justify-between rounded-2xl border border-border-light bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.typeSlug}</p>
                  <p className="text-xs text-text-secondary">
                    {t(`channels.${item.channel}` as Parameters<typeof t>[0])}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.enabled ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-secondary"
                  }`}
                >
                  {item.enabled ? t("states.enabled") : t("states.disabled")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <FormModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={t("modals.account.title")}
        description={t("modals.account.description")}
        submitLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onSubmit={handleSaveAccount}
        onCancel={() => setIsAccountModalOpen(false)}
        loading={patchAccount.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-displayName">{t("sections.account.fields.displayName")}</Label>
            <Input
              id="admin-displayName"
              value={accountForm.displayName}
              onChange={(event) => setAccountForm({ displayName: event.target.value })}
              placeholder={t("sections.account.fields.displayName")}
              className="mt-2"
            />
          </div>

          <div className="rounded-2xl border border-border-light bg-white px-4 py-3">
            <p className="text-xs font-semibold text-text-secondary">{t("sections.account.fields.email")}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{primaryEmail}</p>
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        title={t("modals.preferences.title")}
        description={t("modals.preferences.description")}
        submitLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onSubmit={handleSavePreferences}
        onCancel={() => setIsPreferencesModalOpen(false)}
        loading={patchPreferences.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="settings-locale">{t("sections.preferences.fields.locale")}</Label>
            <select
              id="settings-locale"
              value={preferencesForm.locale}
              onChange={(event) =>
                setPreferencesForm((current) => ({
                  ...current,
                  locale: event.target.value as SettingsLocale,
                }))
              }
              className="app-control mt-2 h-11 w-full px-4 py-2.5 text-sm"
            >
              <option value="ar">{t("locales.ar")}</option>
              <option value="en">{t("locales.en")}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="settings-timezone">{t("sections.preferences.fields.timezone")}</Label>
            <Input
              id="settings-timezone"
              value={preferencesForm.timezone}
              onChange={(event) =>
                setPreferencesForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              placeholder={t("modals.preferences.timezonePlaceholder")}
              className="mt-2"
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        title={t("modals.notifications.title")}
        description={t("modals.notifications.description")}
        submitLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onSubmit={handleSaveNotifications}
        onCancel={() => setIsNotificationsModalOpen(false)}
        loading={putNotifications.isPending}
        size="lg"
      >
        <div className="space-y-2">
          {notificationDraft.map((item, index) => (
            <label
              key={`${item.typeSlug}:${item.channel}`}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-border-light bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.typeSlug}</p>
                <p className="text-xs text-text-secondary">
                  {t(`channels.${item.channel}` as Parameters<typeof t>[0])}
                </p>
              </div>
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={item.enabled}
                  onChange={() => handleToggleNotification(index)}
                />
                {item.enabled ? t("states.enabled") : t("states.disabled")}
              </span>
            </label>
          ))}
        </div>
      </FormModal>

      {(patchAccount.isPending || patchPreferences.isPending || putNotifications.isPending || uploadAvatar.isPending || removeAvatar.isPending) && (
        <div className="pointer-events-none fixed bottom-6 end-6 z-20 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-theme-lg">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("feedback.saving")}
          </span>
        </div>
      )}
    </div>
  );
}
