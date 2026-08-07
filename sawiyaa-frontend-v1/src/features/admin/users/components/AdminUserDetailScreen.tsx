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
  Shield,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  User,
  Mail,
  Phone,
  Globe,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { AdminSectionCard, AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import Label from "@/components/form/Label";
import { ConfirmModal, FormModal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
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
import { toAppError } from "@/lib/api/errors";
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
    () => new Map(ADMIN_PERMISSION_CATALOG.map((item) => [item.key, (t as any)(item.labelKey)] as const)),
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
          label: catalogItem ? (t as any)(catalogItem.moduleLabelKey) : (t as any)("permissions.modules.other.title"),
          description: catalogItem
            ? (t as any)(`permissions.modules.${moduleKey}.description`)
            : (t as any)("permissions.modules.other.description"),
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

  // Compute initials for user avatar
  const initials = title
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
      <div className="space-y-6 pb-12">
        {/* Navigation & Header Trail */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
            <span>إدارة النظام</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>المشرفين</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-primary">تفاصيل الحساب</span>
          </div>

          <Button
            variant="outline"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/admin/users" as never)}
            className="self-start md:self-auto"
          >
            {t("actions.back")}
          </Button>
        </div>

        {/* Executive Profile Card (Adaptive Premium Layout) */}
        <div className="rounded-3xl border border-border-light bg-surface-secondary p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* User Avatar + Identity details */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-xl font-black tracking-wider text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 shadow-xs">
                {initials || <User className="h-8 w-8" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-black text-text-primary">
                    {title}
                  </h1>
                  {detail ? (
                    <AdminStatusBadge tone={ADMIN_USER_STATUS_TONE[detail.status]}>
                      {t(`status.${detail.status}`)}
                    </AdminStatusBadge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  {primaryEmail ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-text-muted" />
                      <span className="truncate">{primaryEmail}</span>
                    </span>
                  ) : null}

                  {primaryPhone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-text-muted" />
                      <span>{primaryPhone}</span>
                    </span>
                  ) : null}

                  {detail?.timezone ? (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-text-muted" />
                      <span>{detail.timezone}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Quick Primary Actions in Header Banner */}
            <div className="flex flex-wrap items-center gap-2.5 border-t border-border-light/40 pt-4 md:border-t-0 md:pt-0">
              {canReadOverrides ? (
                <Button
                  onClick={() => router.push(`/admin/users/${id}/permissions` as never)}
                  startIcon={<SquarePen className="h-4 w-4" />}
                  variant="primary"
                >
                  {t("actions.customizePermissions")}
                </Button>
              ) : null}

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
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column (2/3 width) - Profile Details & Custom Overrides */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Metadata Detail Card */}
            <AdminSectionCard
              title={t("detail.profile.title")}
              description={t("detail.profile.description")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Display Name */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.displayName")}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary">
                    {detail?.displayName ?? t("detail.noValue")}
                  </p>
                </div>

                {/* Primary Email */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Mail className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.email")}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary truncate">
                    {primaryEmail ?? t("detail.noValue")}
                  </p>
                </div>

                {/* Primary Phone */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.phone")}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary">
                    {primaryPhone ?? t("detail.noValue")}
                  </p>
                </div>

                {/* Locale & Language */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Globe className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.locale")}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary uppercase">
                    {detail?.defaultLocale ?? t("detail.noValue")}
                  </p>
                </div>

                {/* Timezone */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.timezone")}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary">
                    {detail?.timezone ?? t("detail.noValue")}
                  </p>
                </div>

                {/* Last Updated At */}
                <div className="rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("detail.profile.updatedAt")}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    {detail ? new Date(detail.updatedAt).toLocaleString(locale) : "-"}
                  </p>
                </div>
              </div>
            </AdminSectionCard>

            {/* Custom Permission Overrides Summary */}
            {canReadOverrides ? (
              <AdminSectionCard
                title={t("detail.permissions.title")}
                description={t("detail.permissions.description")}
              >
                {overrides.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-surface-secondary/40 dark:bg-slate-900/20 rounded-2xl border border-dashed border-border-light text-center">
                    <Layers className="h-8 w-8 text-slate-350 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-bold text-text-secondary">
                      {t("detail.permissions.empty")}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">
                      جميع الصلاحيات تُدار تلقائياً حسب الدور المسند للحساب.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 p-4 border border-teal-100 dark:border-teal-900/30 text-xs">
                      <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
                        <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span>يوجد {overrides.length} استثناء مخصص لهذا المستخدم</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/users/${id}/permissions` as never)}
                        className="text-xs font-black text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>فتح مصفوفة الصلاحيات</span>
                        <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {permissionGroups.map((group) => (
                        <div
                          key={group.module}
                          className="rounded-2xl border border-border-light bg-surface-secondary/50 dark:bg-slate-900/40 p-4 shadow-sm"
                        >
                          <div className="mb-2.5 flex items-center justify-between">
                            <h4 className="text-xs font-black text-text-primary">
                              {group.label}
                            </h4>
                            <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-[10px] font-bold text-text-muted">
                              {group.items.length}
                            </span>
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            {group.items.map((item) => (
                              <div
                                key={item.permissionKey}
                                className="flex items-start justify-between gap-3 rounded-xl border border-border-light bg-surface-secondary/60 dark:bg-slate-950/40 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-text-primary">
                                    {permissionLabelByKey.get(item.permissionKey as PermissionKey) ?? item.permissionKey}
                                  </p>
                                  <p className="font-mono text-[10px] text-text-muted truncate mt-0.5">
                                    {item.permissionKey}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shrink-0 ${
                                    item.effect === "ALLOW"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  }`}
                                >
                                  {item.effect === "ALLOW" ? "✓ سماح" : "✕ حظر"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AdminSectionCard>
            ) : null}
          </div>

          {/* Right Sidebar Column (1/3 width) - Roles & Security Console */}
          <div className="space-y-6">
            {/* Internal Roles Card */}
            <AdminSectionCard
              title={t("detail.roles.title")}
              description={t("detail.roles.description")}
            >
              <div className="space-y-2">
                {detail?.roles.map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-teal-550/10 bg-teal-550/5 dark:bg-teal-950/20 p-3.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-primary truncate">
                          {roleLabel(t, role)}
                        </p>
                        <p className="font-mono text-[10px] text-text-muted uppercase">
                          {role}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            {/* Security & Sessions Console */}
            <AdminSectionCard
              title={t("detail.security.title")}
              description={t("detail.security.description")}
            >
              <div className="space-y-3.5">
                {/* Token Version Tile */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">
                        {t("detail.profile.tokenVersion")}
                      </p>
                      <p className="text-xs font-black text-text-primary">
                        {detail?.tokenVersion ?? "-"}
                      </p>
                    </div>
                  </div>

                  {canInvalidateTokens && !showSelfWarning ? (
                    <Button
                      variant="danger"
                      onClick={() => openModal("token-version")}
                      size="sm"
                    >
                      {t("actions.invalidateTokens")}
                    </Button>
                  ) : null}
                </div>

                {/* Revoke Active Sessions Action */}
                {canRevokeSessions && !showSelfWarning ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 dark:bg-slate-900/40 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-450" />
                      <span className="text-xs font-bold text-text-primary">
                        {t("sessions.title")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => openModal("sessions")}
                      size="sm"
                      className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/30"
                    >
                      {t("actions.revokeSessions")}
                    </Button>
                  </div>
                ) : null}

                {/* Self Warning Banner */}
                {showSelfWarning ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-amber-250 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 p-3.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{t("detail.security.selfWarning")}</span>
                  </div>
                ) : null}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>

      {/* Modals for Edit Profile, Update Status, Update Roles, Revoke Sessions, Invalidate Tokens */}
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
    </>
  );
}
