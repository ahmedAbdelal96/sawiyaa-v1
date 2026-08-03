"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Globe2,
  Loader2,
  PencilLine,
  ShieldCheck,
  Trash2,
  User,
  Clock,
  Bell,
  Mail,
  Phone,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TimeZonePicker from "@/components/timezone/TimeZonePicker";
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
import type {
  MySettingsNotificationPreferenceItem,
  SettingsLocale,
} from "../types/settings.types";
import {
  ProfileWorkspaceShell,
  ProfileWorkspaceCard,
  ProfileTabs,
  ProfileSummaryCard,
  ProfileInfoSection,
  ProfileInfoRow,
  ProfileInfoGrid,
  ProfileEmptyState,
} from "@/components/shared/profile/ProfileWorkspaceKit";
import Avatar from "@/components/ui/avatar/Avatar";
import { useAuthState } from "@/stores/auth-store";

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
  return new Date(value).toLocaleDateString(
    locale.startsWith("ar") ? "ar-EG" : "en-GB",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
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

function normalizePreferenceRows(
  items: MySettingsNotificationPreferenceItem[],
) {
  return items.slice().sort((a, b) => {
    if (a.typeSlug !== b.typeSlug) return a.typeSlug.localeCompare(b.typeSlug);
    return a.channel.localeCompare(b.channel);
  });
}

function resolveAdminRoleLabel(
  role: string | null | undefined,
  t: any,
  locale?: string,
): string {
  const isAr = locale?.startsWith("ar");
  const fallbackLabel = isAr ? "مسؤول" : "Admin user";

  if (!role) {
    try {
      const trans = t("roles.fallback");
      if (
        trans &&
        typeof trans === "string" &&
        !trans.includes("roles.") &&
        !trans.includes("admin-settings.")
      ) {
        return trans;
      }
    } catch {
      // ignore
    }
    return fallbackLabel;
  }

  const knownRoles = [
    "SUPER_ADMIN",
    "ADMIN",
    "SUPPORT_AGENT",
    "CONTENT_REVIEWER",
  ];
  if (knownRoles.includes(role)) {
    try {
      const translated = t(`roles.${role}` as any);
      if (
        translated &&
        typeof translated === "string" &&
        !translated.includes("roles.") &&
        !translated.includes("admin-settings.")
      ) {
        return translated;
      }
    } catch {
      // ignore
    }
  }

  try {
    const trans = t("roles.fallback");
    if (
      trans &&
      typeof trans === "string" &&
      !trans.includes("roles.") &&
      !trans.includes("admin-settings.")
    ) {
      return trans;
    }
  } catch {
    // ignore
  }
  return fallbackLabel;
}

export default function AdminProfileWorkspace() {
  const t = useTranslations("admin-settings");
  const locale = useLocale();
  const router = useRouter();
  const { tenant, user } = useAuthState();

  const userQuery = useCurrentUser();
  const settingsQuery = useMySettings();
  const notificationQuery = useMySettingsNotificationPreferences();
  const patchPreferences = usePatchMySettingsPreferences();
  const putNotifications = usePutMySettingsNotificationPreferences();
  const patchAccount = usePatchCurrentUserProfile();
  const uploadAvatar = useUploadCurrentUserAvatar();
  const removeAvatar = useRemoveCurrentUserAvatar();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] =
    useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PreferencesFormState>({
    locale: "ar",
    timezone: "Africa/Cairo",
  });
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    displayName: "",
  });
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraftState | null>(null);
  const [notificationDraft, setNotificationDraft] = useState<
    MySettingsNotificationPreferenceItem[]
  >([]);

  const currentUser = userQuery.data;
  const settings = settingsQuery.data?.item;
  const notificationState =
    notificationQuery.data?.item ?? settings?.notificationPreferences;
  const notificationRows = useMemo(
    () => normalizePreferenceRows(notificationState?.items ?? []),
    [notificationState?.items],
  );

  const roleLabel = useMemo(() => {
    const role = user?.role ?? currentUser?.roles?.roles?.[0] ?? null;
    return resolveAdminRoleLabel(role, t, locale);
  }, [user?.role, currentUser?.roles?.roles, t, locale]);

  const canRender =
    !userQuery.isLoading &&
    !settingsQuery.isLoading &&
    !notificationQuery.isLoading;

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
          setFeedback({
            tone: "success",
            message: t("feedback.preferencesSaved"),
          });
        },
        onError: (error) => {
          setFeedback({
            tone: "error",
            message: getErrorMessage(
              error,
              t("feedback.preferencesSaveFailed"),
            ),
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
          setFeedback({
            tone: "success",
            message: t("feedback.notificationsSaved"),
          });
        },
        onError: (error) => {
          setFeedback({
            tone: "error",
            message: getErrorMessage(
              error,
              t("feedback.notificationsSaveFailed"),
            ),
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
        setFeedback({
          tone: "error",
          message: getErrorMessage(error, t("feedback.avatarUpdateFailed")),
        }),
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
      onSuccess: () =>
        setFeedback({ tone: "success", message: t("feedback.avatarRemoved") }),
      onError: (error) =>
        setFeedback({
          tone: "error",
          message: getErrorMessage(error, t("feedback.avatarRemoveFailed")),
        }),
    });
  };

  if (!canRender) {
    return (
      <ProfileWorkspaceCard className="p-6">
        <FormSkeleton />
      </ProfileWorkspaceCard>
    );
  }

  if (!currentUser || !settings || !notificationState) {
    return (
      <ProfileWorkspaceCard className="p-6">
        <h1 className="text-text-primary text-2xl font-semibold sm:text-3xl">
          {t("page.title")}
        </h1>
        <p className="text-error-600 mt-3 text-sm">{t("errors.loadFailed")}</p>
      </ProfileWorkspaceCard>
    );
  }

  const displayName = currentUser.displayName ?? "-";
  const avatarSrc =
    avatarDraft?.previewUrl ?? currentUser.avatarDataUrl ?? null;
  const hasAvatarDraft = Boolean(avatarDraft);
  const hasExistingAvatar = Boolean(currentUser.avatarDataUrl);
  const primaryEmail =
    currentUser.identitySummary.primaryEmail ??
    currentUser.identitySummary.primaryEmailMasked ??
    t("states.notSet");
  const primaryPhone =
    currentUser.identitySummary.primaryPhone ??
    currentUser.identitySummary.primaryPhoneMasked ??
    (locale.startsWith("ar") ? "غير مضاف" : "Not added");

  return (
    <ProfileWorkspaceShell>
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

      <ProfileWorkspaceCard>
        {/* Tabs Row */}
        <div className="border-b border-slate-100 bg-slate-50/30 px-5 pt-2 dark:border-white/5 dark:bg-white/[0.01]">
          <ProfileTabs
            tabs={[
              {
                id: "account",
                label: t("tabs.account"),
                icon: <User className="h-4 w-4" />,
              },
              {
                id: "notifications",
                label: t("tabs.notifications"),
                icon: <Bell className="h-4 w-4" />,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
          />
        </div>

        {/* Content Area: Grid */}
        <div className="grid grid-cols-1 items-start gap-5 p-5 lg:grid-cols-[280px_1fr]">
          {/* Summary Card */}
          <aside className="space-y-4">
            <ProfileSummaryCard>
              <div className="group relative">
                <Avatar
                  src={avatarSrc}
                  name={displayName}
                  size="custom"
                  className="border-primary/20 bg-surface-secondary h-24 w-24 border-2"
                />
                <button
                  type="button"
                  onClick={handleChooseAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title={t("actions.changePhoto")}
                >
                  <User className="h-5 w-5" />
                </button>
              </div>

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

              <h2 className="text-text-primary mt-3 text-lg leading-tight font-bold dark:text-white/95">
                {displayName}
              </h2>
              <p className="text-text-secondary mt-1 max-w-[240px] truncate text-xs dark:text-white/60">
                {primaryEmail}
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {t(
                    `accountStatus.${currentUser.accountStatus}` as Parameters<
                      typeof t
                    >[0],
                  )}
                </span>
                <span className="text-text-secondary max-w-[200px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-white/5">
                  {roleLabel}
                </span>
              </div>

              {(hasAvatarDraft || hasExistingAvatar) && (
                <div className="mt-3.5 w-full space-y-2 border-t border-slate-100 pt-3.5 dark:border-white/5">
                  {hasAvatarDraft ? (
                    <div className="flex w-full flex-col gap-1.5">
                      <Button
                        size="sm"
                        onClick={handleSaveAvatar}
                        disabled={uploadAvatar.isPending}
                        className="w-full"
                      >
                        {t("actions.savePhoto")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAvatarDraft}
                        disabled={uploadAvatar.isPending}
                        className="w-full"
                      >
                        {t("actions.cancel")}
                      </Button>
                    </div>
                  ) : hasExistingAvatar ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={removeAvatar.isPending}
                      startIcon={<Trash2 className="h-4 w-4" />}
                      className="w-full"
                    >
                      {t("actions.removePhoto")}
                    </Button>
                  ) : null}
                </div>
              )}
            </ProfileSummaryCard>
          </aside>

          {/* Active Tab Content */}
          <main className="space-y-4">
            {activeTab === "account" && (
              <div className="space-y-5">
                {/* Section 1: Basic account */}
                <ProfileInfoSection
                  title={t("sections.account.title")}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAccountModal}
                      startIcon={<PencilLine className="h-4 w-4" />}
                    >
                      {t("actions.edit")}
                    </Button>
                  }
                >
                  <ProfileInfoGrid columns={2}>
                    <ProfileInfoRow
                      label={t("sections.account.fields.displayName")}
                      value={displayName}
                      icon={<User className="h-4 w-4" />}
                    />
                    <ProfileInfoRow
                      label={t("sections.account.fields.email")}
                      value={primaryEmail}
                      icon={<Mail className="h-4 w-4" />}
                    />
                    <ProfileInfoRow
                      label={t("sections.account.fields.phone")}
                      value={primaryPhone}
                      icon={<Phone className="h-4 w-4" />}
                    />
                    <ProfileInfoRow
                      label={t("sections.account.fields.createdAt")}
                      value={formatDateValue(currentUser.createdAt, locale)}
                      icon={<Clock className="h-4 w-4" />}
                    />
                  </ProfileInfoGrid>
                </ProfileInfoSection>

                {/* Section 2: Role */}
                <ProfileInfoSection
                  title={locale === "ar" ? "الدور" : "Role"}
                  icon={<ShieldCheck className="h-5 w-5" />}
                >
                  <ProfileInfoGrid columns={2}>
                    <ProfileInfoRow
                      label={locale === "ar" ? "الدور" : "Role"}
                      value={roleLabel}
                      icon={<User className="h-4 w-4" />}
                    />
                    <ProfileInfoRow
                      label={locale === "ar" ? "حالة الحساب" : "Account Status"}
                      value={t(
                        `accountStatus.${currentUser.accountStatus}` as Parameters<
                          typeof t
                        >[0],
                      )}
                      icon={<ShieldCheck className="h-4 w-4" />}
                    />
                  </ProfileInfoGrid>
                </ProfileInfoSection>

                {/* Section 3: Preferences */}
                <ProfileInfoSection
                  title={t("sections.preferences.title")}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openPreferencesModal}
                      startIcon={<PencilLine className="h-4 w-4" />}
                    >
                      {t("actions.edit")}
                    </Button>
                  }
                >
                  <ProfileInfoGrid columns={2}>
                    <ProfileInfoRow
                      label={t("sections.preferences.fields.locale")}
                      value={t(
                        `locales.${settings.preferences.locale ?? "ar"}` as Parameters<
                          typeof t
                        >[0],
                      )}
                      icon={<Globe2 className="h-4 w-4" />}
                    />
                    <ProfileInfoRow
                      label={t("sections.preferences.fields.timezone")}
                      value={settings.preferences.timezone}
                      icon={<Clock className="h-4 w-4" />}
                    />
                  </ProfileInfoGrid>
                </ProfileInfoSection>
              </div>
            )}

            {activeTab === "notifications" && (
              <ProfileInfoSection
                title={t("sections.notifications.title")}
                subtitle={t("sections.notifications.subtitle")}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openNotificationsModal}
                    startIcon={<PencilLine className="h-4 w-4" />}
                  >
                    {t("actions.manageNotifications")}
                  </Button>
                }
              >
                <div className="space-y-2">
                  {notificationRows.map((item) => (
                    <div
                      key={`${item.typeSlug}:${item.channel}`}
                      className="border-border-light flex items-center justify-between rounded-2xl border bg-slate-50/30 px-4 py-3 dark:border-white/5"
                    >
                      <div>
                        <p className="text-text-primary text-sm font-semibold">
                          {item.typeSlug}
                        </p>
                        <p className="text-text-secondary mt-0.5 text-xs">
                          {t(
                            `channels.${item.channel}` as Parameters<
                              typeof t
                            >[0],
                          )}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.enabled
                            ? "bg-success-50 text-success-700"
                            : "bg-surface-tertiary text-text-secondary"
                        }`}
                      >
                        {item.enabled
                          ? t("states.enabled")
                          : t("states.disabled")}
                      </span>
                    </div>
                  ))}
                </div>
              </ProfileInfoSection>
            )}
          </main>
        </div>
      </ProfileWorkspaceCard>

      {/* Account Modal */}
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
            <Label htmlFor="admin-displayName">
              {t("sections.account.fields.displayName")}
            </Label>
            <Input
              id="admin-displayName"
              value={accountForm.displayName}
              onChange={(event) =>
                setAccountForm({ displayName: event.target.value })
              }
              placeholder={t("sections.account.fields.displayName")}
              className="mt-2"
            />
          </div>

          <div className="border-border-light dark:bg-surface-secondary rounded-2xl border bg-white px-4 py-3 dark:border-white/5">
            <p className="text-text-secondary text-xs font-semibold">
              {t("sections.account.fields.email")}
            </p>
            <p className="text-text-primary mt-1 text-sm font-semibold">
              {primaryEmail}
            </p>
          </div>
        </div>
      </FormModal>

      {/* Preferences Modal */}
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
            <Label htmlFor="settings-locale">
              {t("sections.preferences.fields.locale")}
            </Label>
            <select
              id="settings-locale"
              value={preferencesForm.locale}
              onChange={(event) =>
                setPreferencesForm((current) => ({
                  ...current,
                  locale: event.target.value as SettingsLocale,
                }))
              }
              className="app-control dark:bg-surface-secondary text-text-primary border-border-light mt-2 h-11 w-full border bg-white px-4 py-2.5 text-sm"
            >
              <option value="ar">{t("locales.ar")}</option>
              <option value="en">{t("locales.en")}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="settings-timezone">
              {t("sections.preferences.fields.timezone")}
            </Label>
            <TimeZonePicker
              id="settings-timezone"
              value={preferencesForm.timezone}
              onChange={(timezone) =>
                setPreferencesForm((current) => ({ ...current, timezone }))
              }
              placeholder={t("modals.preferences.timezonePlaceholder")}
            />
          </div>
        </div>
      </FormModal>

      {/* Notifications Modal */}
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
              className="border-border-light dark:bg-surface-secondary flex cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 py-3 dark:border-white/5"
            >
              <div>
                <p className="text-text-primary text-sm font-semibold">
                  {item.typeSlug}
                </p>
                <p className="text-text-secondary mt-0.5 text-xs">
                  {t(`channels.${item.channel}` as Parameters<typeof t>[0])}
                </p>
              </div>
              <span className="text-text-primary flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4"
                  checked={item.enabled}
                  onChange={() => handleToggleNotification(index)}
                />
                {item.enabled ? t("states.enabled") : t("states.disabled")}
              </span>
            </label>
          ))}
        </div>
      </FormModal>

      {(patchAccount.isPending ||
        patchPreferences.isPending ||
        putNotifications.isPending ||
        uploadAvatar.isPending ||
        removeAvatar.isPending) && (
        <div className="bg-primary shadow-theme-lg pointer-events-none fixed end-6 bottom-6 z-20 rounded-full px-4 py-2 text-sm font-semibold text-white">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("feedback.saving")}
          </span>
        </div>
      )}
    </ProfileWorkspaceShell>
  );
}
