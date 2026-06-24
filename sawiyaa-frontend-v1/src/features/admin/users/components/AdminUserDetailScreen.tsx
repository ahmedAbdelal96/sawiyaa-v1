"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  KeyRound,
  LogOut,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { AdminSectionCard, AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import Label from "@/components/form/Label";
import { ConfirmModal, FormModal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import AdminUserStepUpDialog from "./AdminUserStepUpDialog";
import { useAdminStepUp } from "../hooks/use-admin-step-up";
import {
  useAdminUser,
  useAdminUserPermissionOverrides,
} from "../hooks/use-admin-users";
import {
  invalidateAdminUserTokenVersion,
  revokeAdminUserSessions,
  updateAdminUserProfile,
  updateAdminUserRoles,
  updateAdminUserStatus,
} from "../api/admin-users.api";
import {
  ADMIN_USER_INTERNAL_ROLES,
  ADMIN_USER_STATUS_VALUES,
  type AdminUserRole,
} from "../types/admin-users.types";
import {
  ADMIN_USER_ROLE_LABEL_KEYS,
  ADMIN_USER_STATUS_TONE,
  normalizeAdminUserRole,
} from "../utils/admin-users-format";
import { useCurrentUser, useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { PermissionKey } from "@/lib/auth/permissions";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { adminUsersQueryKeys } from "../constants/query-keys";
import { ADMIN_PERMISSION_CATALOG } from "../constants/admin-permission-catalog";

type DetailModal =
  | "profile"
  | "status"
  | "roles"
  | "overrides"
  | "sessions"
  | "token-version"
  | "none";

const DETAIL_MODAL_VALUES: DetailModal[] = [
  "profile",
  "status",
  "roles",
  "overrides",
  "sessions",
  "token-version",
  "none",
];

function roleLabel(t: ReturnType<typeof useTranslations>, role: AdminUserRole) {
  return t(ADMIN_USER_ROLE_LABEL_KEYS[role]);
}

export default function AdminUserDetailScreen({ id }: { id: string }) {
  const t = useTranslations("admin-users");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser(true);
  const { data: currentPermissions } = useCurrentUserPermissions(true);
  const permissions = new Set(currentPermissions?.permissions ?? []);
  const currentUserId = currentUser?.userId ?? null;
  const currentUserIsSuperAdmin = currentUser?.roles.roles?.includes("SUPER_ADMIN") ?? false;

  const activeModal = useMemo<DetailModal>(() => {
    const raw = searchParams.get("modal");
    return DETAIL_MODAL_VALUES.includes(raw as DetailModal) ? (raw as DetailModal) : "none";
  }, [searchParams]);

  useEffect(() => {
    if (activeModal === "overrides") {
      router.replace(`/admin/users/${id}/permissions` as never, { scroll: false });
    }
  }, [activeModal, id, router]);

  const userQuery = useAdminUser(id, true);
  const overridesQuery = useAdminUserPermissionOverrides(id, true);
  const stepUp = useAdminStepUp();

  const detail = userQuery.data?.item;
  const overrides = overridesQuery.data?.items ?? [];

  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileDefaultLocale, setProfileDefaultLocale] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState<(typeof ADMIN_USER_STATUS_VALUES)[number]>("ACTIVE");
  const [statusError, setStatusError] = useState<string | null>(null);

  const [selectedRoles, setSelectedRoles] = useState<AdminUserRole[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserProfile>[1]) =>
      updateAdminUserProfile(id, input),
  });
  const statusMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserStatus>[1]) =>
      updateAdminUserStatus(id, input),
  });
  const rolesMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserRoles>[1]) =>
      updateAdminUserRoles(id, input),
  });
  const revokeMutation = useMutation({ mutationFn: revokeAdminUserSessions });
  const invalidateMutation = useMutation({ mutationFn: invalidateAdminUserTokenVersion });

  const canEditProfile = permissions.has(PermissionKey.ADMIN_USERS_UPDATE);
  const canEditStatus = permissions.has(PermissionKey.ADMIN_USERS_STATUS_UPDATE);
  const canEditRoles = permissions.has(PermissionKey.ADMIN_USERS_ROLES_UPDATE);
  const canReadOverrides = permissions.has(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ);
  const canEditOverrides = permissions.has(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE);
  const canRevokeSessions = permissions.has(PermissionKey.ADMIN_USERS_SESSIONS_REVOKE);
  const canInvalidateTokens = permissions.has(PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE);

  const showSelfWarning = Boolean(currentUserId && currentUserId === id);
  const canAssignSuperAdmin = currentUserIsSuperAdmin;

  const roleOptions = useMemo(
    () => ADMIN_USER_INTERNAL_ROLES.filter((role) => canAssignSuperAdmin || role !== "SUPER_ADMIN"),
    [canAssignSuperAdmin]
  );

  const permissionLabelByKey = useMemo(
    () => new Map(ADMIN_PERMISSION_CATALOG.map((item) => [item.key, t(item.labelKey)] as const)),
    [t]
  );

  const permissionGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        module: string;
        label: string;
        description: string;
        items: typeof overrides;
      }
    >();

    const order: string[] = [];

    for (const item of overrides) {
      const catalogItem = ADMIN_PERMISSION_CATALOG.find((entry) => entry.key === item.permissionKey);
      const moduleKey = catalogItem?.module ?? "other";
      if (!groups.has(moduleKey)) {
        order.push(moduleKey);
        groups.set(moduleKey, {
          module: moduleKey,
          label: catalogItem ? t(catalogItem.moduleLabelKey) : t("permissions.modules.other.title"),
          description: catalogItem
            ? t(`permissions.modules.${moduleKey}.description`)
            : t("permissions.modules.other.description"),
          items: [],
        });
      }

      groups.get(moduleKey)?.items.push(item);
    }

    return order.map((moduleKey) => groups.get(moduleKey)).filter(Boolean) as Array<{
      module: string;
      label: string;
      description: string;
      items: typeof overrides;
    }>;
  }, [overrides, t]);

  /* eslint-disable react-hooks/set-state-in-effect -- draft state is initialized from the latest loaded user snapshot when the modal opens. */
  useEffect(() => {
    if (!detail) return;

    if (activeModal === "profile") {
      setProfileDisplayName(detail.displayName ?? "");
      setProfileDefaultLocale(detail.defaultLocale ?? "");
      setProfileTimezone(detail.timezone ?? "");
      setProfileError(null);
    }

    if (activeModal === "status") {
      setStatusValue(detail.status);
      setStatusError(null);
    }

    if (activeModal === "roles") {
      setSelectedRoles(
        detail.roles.filter((role): role is AdminUserRole => Boolean(normalizeAdminUserRole(role)))
      );
      setRolesError(null);
    }
  }, [activeModal, detail]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const closeModal = () => {
    router.replace(pathname, { scroll: false });
  };

  const openModal = (modal: Exclude<DetailModal, "none">) => {
    if (modal === "sessions" || modal === "token-version") {
      setActionError(null);
    }
    router.push(`${pathname}?modal=${modal}`, { scroll: false });
  };

  const invalidateDetailQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.permissionOverrides(id) }),
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all }),
    ]);
  };

  const handleSensitiveAction = async (action: () => Promise<boolean>) => {
    try {
      await action();
    } catch (cause) {
      const appError = toAppError(cause);

      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await action();
        });
        return;
      }

      throw appError;
    }
  };

  const runProfileUpdate = async () => {
    try {
      await profileMutation.mutateAsync({
        displayName: profileDisplayName.trim(),
        defaultLocale: profileDefaultLocale.trim() || undefined,
        timezone: profileTimezone.trim() || undefined,
      });
      await invalidateDetailQueries();
      closeModal();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setProfileError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const saveProfile = async () => {
    const normalizedDisplayName = profileDisplayName.trim();
    if (normalizedDisplayName.length < 2) {
      setProfileError(t("edit.validation.displayName"));
      return;
    }

    setProfileError(null);
    try {
      await handleSensitiveAction(runProfileUpdate);
    } catch (cause) {
      const appError = toAppError(cause);
      setProfileError(appError.message || t("errors.generic"));
    }
  };

  const runStatusUpdate = async () => {
    try {
      await statusMutation.mutateAsync({ status: statusValue });
      await invalidateDetailQueries();
      closeModal();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setStatusError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const saveStatus = async () => {
    setStatusError(null);
    try {
      await handleSensitiveAction(runStatusUpdate);
    } catch (cause) {
      const appError = toAppError(cause);
      setStatusError(appError.message || t("errors.generic"));
    }
  };

  const runRolesUpdate = async () => {
    const uniqueRoles = Array.from(new Set(selectedRoles)).filter(Boolean) as AdminUserRole[];

    if (uniqueRoles.length === 0) {
      setRolesError(t("roles.validation.roles"));
      return false;
    }

    if (!canAssignSuperAdmin && uniqueRoles.includes("SUPER_ADMIN")) {
      setRolesError(t("roles.validation.superAdmin"));
      return false;
    }

    try {
      await rolesMutation.mutateAsync({ roles: uniqueRoles });
      await invalidateDetailQueries();
      closeModal();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setRolesError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const saveRoles = async () => {
    setRolesError(null);
    try {
      await handleSensitiveAction(runRolesUpdate);
    } catch (cause) {
      const appError = toAppError(cause);
      setRolesError(appError.message || t("errors.generic"));
    }
  };

  const runRevokeSessions = async () => {
    try {
      await revokeMutation.mutateAsync(id);
      await invalidateDetailQueries();
      closeModal();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setActionError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const runInvalidateTokens = async () => {
    try {
      await invalidateMutation.mutateAsync(id);
      await invalidateDetailQueries();
      closeModal();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setActionError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const mutateSelectedRole = (role: AdminUserRole) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  };

  const title = detail?.displayName ?? detail?.emails?.[0] ?? id;
  const primaryEmail = detail?.emails?.[0] ?? null;
  const primaryPhone = detail?.phones?.[0] ?? null;

  if (userQuery.isError) {
    const appError = toAppError(userQuery.error);

    return (
      <AdminSectionCard
        title={appError.statusCode === 404 ? t("errors.notFoundTitle") : t("errors.title")}
        description={
          appError.statusCode === 404 ? t("errors.notFound") : appError.message || t("errors.loadFailed")
        }
          actions={
            <Button
              variant="outline"
              startIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.push("/admin/users" as never)}
            >
              {t("actions.back")}
            </Button>
          }
      >
        <div />
      </AdminSectionCard>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
          <Button
            variant="outline"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/admin/users" as never)}
          >
            {t("actions.back")}
          </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("page.eyebrow")}
              </p>
              <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.03em] text-text-primary">
                {title}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {primaryEmail ?? t("detail.noEmail")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditProfile ? (
              <Button
                variant="outline"
                startIcon={<PencilLine className="h-4 w-4" />}
                onClick={() => openModal("profile")}
              >
                {t("actions.editProfile")}
              </Button>
            ) : null}
            {canEditRoles ? (
              <Button
                variant="outline"
                startIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => openModal("roles")}
              >
                {t("actions.updateRoles")}
              </Button>
            ) : null}
            {canEditStatus ? (
              <Button
                variant="outline"
                startIcon={<ShieldAlert className="h-4 w-4" />}
                onClick={() => openModal("status")}
              >
                {t("actions.updateStatus")}
              </Button>
            ) : null}
            {canReadOverrides ? (
              <Button
                variant="outline"
                startIcon={<SquarePen className="h-4 w-4" />}
                onClick={() => router.push(`/admin/users/${id}/permissions` as never)}
              >
                {t("actions.customizePermissions")}
              </Button>
            ) : null}
            {canRevokeSessions && !showSelfWarning ? (
              <Button
                variant="outline"
                startIcon={<LogOut className="h-4 w-4" />}
                onClick={() => openModal("sessions")}
              >
                {t("actions.revokeSessions")}
              </Button>
            ) : null}
            {canInvalidateTokens && !showSelfWarning ? (
              <Button
                variant="danger"
                startIcon={<KeyRound className="h-4 w-4" />}
                onClick={() => openModal("token-version")}
              >
                {t("actions.invalidateTokens")}
              </Button>
            ) : null}
          </div>
        </div>

        <AdminSectionCard title={t("detail.profile.title")} description={t("detail.profile.description")}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.displayName")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {detail?.displayName ?? t("detail.noValue")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.email")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {primaryEmail ?? t("detail.noValue")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.phone")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {primaryPhone ?? t("detail.noValue")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.tokenVersion")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {detail?.tokenVersion ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.locale")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {detail?.defaultLocale ?? t("detail.noValue")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.timezone")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {detail?.timezone ?? t("detail.noValue")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.status")}
              </p>
              <div className="mt-1">
                {detail ? (
                  <AdminStatusBadge tone={ADMIN_USER_STATUS_TONE[detail.status]}>
                    {t(`status.${detail.status}`)}
                  </AdminStatusBadge>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {t("detail.profile.updatedAt")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {detail ? new Date(detail.updatedAt).toLocaleString(locale) : "-"}
              </p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title={t("detail.roles.title")} description={t("detail.roles.description")}>
          <div className="flex flex-wrap gap-2">
            {detail?.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-primary"
              >
                {roleLabel(t, role)}
              </span>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title={t("detail.security.title")} description={t("detail.security.description")}>
          <div className="flex flex-wrap gap-3">
            {canEditStatus ? (
              <Button
                variant="outline"
                startIcon={<ShieldAlert className="h-4 w-4" />}
                onClick={() => openModal("status")}
              >
                {t("actions.updateStatus")}
              </Button>
            ) : null}
            {canRevokeSessions && !showSelfWarning ? (
              <Button
                variant="outline"
                startIcon={<LogOut className="h-4 w-4" />}
                onClick={() => openModal("sessions")}
              >
                {t("actions.revokeSessions")}
              </Button>
            ) : null}
            {canInvalidateTokens && !showSelfWarning ? (
              <Button
                variant="danger"
                startIcon={<KeyRound className="h-4 w-4" />}
                onClick={() => openModal("token-version")}
              >
                {t("actions.invalidateTokens")}
              </Button>
            ) : null}
          </div>
          {showSelfWarning ? (
            <p className="mt-4 text-sm text-warning-700">{t("detail.security.selfWarning")}</p>
          ) : null}
        </AdminSectionCard>

        {canReadOverrides ? (
          <AdminSectionCard
            title={t("detail.permissions.title")}
            description={t("detail.permissions.description")}
            actions={
              canEditOverrides ? (
                <Button onClick={() => router.push(`/admin/users/${id}/permissions` as never)}>
                  {t("actions.customizePermissions")}
                </Button>
              ) : null
            }
          >
            {overrides.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("detail.permissions.empty")}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                  <span className="rounded-full border border-border-light bg-surface-secondary/70 px-2.5 py-1 font-medium">
                    {overrides.length}
                  </span>
                  <span>{t("detail.permissions.summaryHint")}</span>
                </div>
                <div className="space-y-3">
                  {permissionGroups.map((group) => (
                    <section key={group.module} className="rounded-3xl border border-border-light bg-white p-3 shadow-[0_12px_30px_-28px_rgba(34,52,56,0.22)]">
                      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-sm font-semibold text-text-primary">{group.label}</h4>
                          <p className="text-[11px] leading-4 text-text-secondary">{group.description}</p>
                        </div>
                        <AdminStatusBadge tone="muted">{group.items.length}</AdminStatusBadge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => (
                          <div
                            key={item.permissionKey}
                            className="min-w-0 rounded-2xl border border-border-light bg-surface-secondary/60 px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-text-primary">
                                  {permissionLabelByKey.get(item.permissionKey as PermissionKey) ?? item.permissionKey}
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-text-muted">
                                  {item.reason ?? t("detail.permissions.noReason")}
                                </p>
                              </div>
                              <div className="shrink-0">
                                <AdminStatusBadge tone={item.effect === "ALLOW" ? "success" : "warning"}>
                                  {t(`permissions.states.${item.effect.toLowerCase()}`)}
                                </AdminStatusBadge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </AdminSectionCard>
        ) : null}
      </div>

      <FormModal
        isOpen={activeModal === "profile"}
        onClose={closeModal}
        title={t("edit.title")}
        description={t("edit.description")}
        submitLabel={t("edit.submit")}
        cancelLabel={t("edit.cancel")}
        onSubmit={saveProfile}
        onCancel={closeModal}
        loading={profileMutation.isPending}
        submitDisabled={profileMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("edit.fields.displayName")}</Label>
            <InputField
              value={profileDisplayName}
              onChange={(event) => setProfileDisplayName(event.target.value)}
              error={Boolean(profileError)}
              hint={profileError ?? t("edit.fields.displayNameHint")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("edit.fields.defaultLocale")}</Label>
            <InputField
              value={profileDefaultLocale}
              onChange={(event) => setProfileDefaultLocale(event.target.value)}
              placeholder={t("edit.fields.defaultLocalePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("edit.fields.timezone")}</Label>
            <InputField
              value={profileTimezone}
              onChange={(event) => setProfileTimezone(event.target.value)}
              placeholder={t("edit.fields.timezonePlaceholder")}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={activeModal === "status"}
        onClose={closeModal}
        title={t("statusModal.title")}
        description={t("statusModal.description")}
        submitLabel={t("statusModal.submit")}
        cancelLabel={t("statusModal.cancel")}
        onSubmit={saveStatus}
        onCancel={closeModal}
        loading={statusMutation.isPending}
        submitDisabled={statusMutation.isPending}
      >
        <div className="space-y-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-text-primary">{t("statusModal.fields.status")}</span>
            <select
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as (typeof ADMIN_USER_STATUS_VALUES)[number])}
              className="app-control h-11 w-full rounded-2xl px-4"
            >
              {ADMIN_USER_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}`)}
                </option>
              ))}
            </select>
          </label>
          {statusError ? <p className="text-sm text-error-600">{statusError}</p> : null}
        </div>
      </FormModal>

      <FormModal
        isOpen={activeModal === "roles"}
        onClose={closeModal}
        title={t("rolesModal.title")}
        description={t("rolesModal.description")}
        submitLabel={t("rolesModal.submit")}
        cancelLabel={t("rolesModal.cancel")}
        onSubmit={saveRoles}
        onCancel={closeModal}
        loading={rolesMutation.isPending}
        submitDisabled={rolesMutation.isPending}
        size="xl"
      >
        <div className="space-y-4">
          {showSelfWarning ? (
            <p className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
              {t("rolesModal.selfWarning")}
            </p>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            {roleOptions.map((role) => (
              <label
                key={role}
                className="flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 text-sm text-text-primary"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => mutateSelectedRole(role)}
                />
                <span>{roleLabel(t, role)}</span>
              </label>
            ))}
          </div>
          {rolesError ? <p className="text-sm text-error-600">{rolesError}</p> : null}
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={activeModal === "sessions"}
        onClose={closeModal}
        title={t("sessions.title")}
        description={t("sessions.description")}
        confirmLabel={t("sessions.confirm")}
        cancelLabel={t("sessions.cancel")}
        confirmVariant="danger"
        onConfirm={() => void handleSensitiveAction(runRevokeSessions)}
        loading={revokeMutation.isPending}
      >
        {actionError ? <p className="text-sm text-error-600">{actionError}</p> : null}
      </ConfirmModal>

      <ConfirmModal
        isOpen={activeModal === "token-version"}
        onClose={closeModal}
        title={t("tokenVersion.title")}
        description={t("tokenVersion.description")}
        confirmLabel={t("tokenVersion.confirm")}
        cancelLabel={t("tokenVersion.cancel")}
        confirmVariant="danger"
        onConfirm={() => void handleSensitiveAction(runInvalidateTokens)}
        loading={invalidateMutation.isPending}
      >
        {actionError ? <p className="text-sm text-error-600">{actionError}</p> : null}
      </ConfirmModal>

      <AdminUserStepUpDialog controller={stepUp} />
    </>
  );
}
