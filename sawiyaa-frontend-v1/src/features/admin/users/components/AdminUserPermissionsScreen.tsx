"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import AdminUserStepUpDialog from "./AdminUserStepUpDialog";
import { useAdminStepUp } from "../hooks/use-admin-step-up";
import {
  useAdminUser,
  useAdminUserPermissionOverrides,
} from "../hooks/use-admin-users";
import { updateAdminUserPermissionOverrides } from "../api/admin-users.api";
import {
  ADMIN_PERMISSION_CATALOG,
  ADMIN_PERMISSION_GROUP_ORDER,
  type AdminPermissionCatalogItem,
} from "../constants/admin-permission-catalog";
import { ADMIN_USER_ROLE_LABEL_KEYS } from "../utils/admin-users-format";
import type {
  AdminUserDetails,
  AdminUserPermissionOverride,
  AdminUserPermissionOverrideOperation,
  AdminUserRole,
} from "../types/admin-users.types";
import { PermissionKey, getDefaultPermissionsForRoles } from "@/lib/auth/permissions";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { adminUsersQueryKeys } from "../constants/query-keys";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";

type PermissionDraftState = Record<string, boolean>;

type PermissionRow = {
  key: string;
  defaultChecked: boolean;
  currentChecked: boolean;
  catalogItem?: AdminPermissionCatalogItem;
  override?: AdminUserPermissionOverride;
};

type VisiblePermissionModule = {
  module: string;
  rows: PermissionRow[];
};

function getInitialState(overrides: AdminUserPermissionOverride[], roleDefaultKeys: Set<string>) {
  const state: PermissionDraftState = {};

  for (const item of ADMIN_PERMISSION_CATALOG) {
    state[item.key] = roleDefaultKeys.has(item.key);
  }

  for (const override of overrides) {
    state[override.permissionKey] = override.effect === "ALLOW";
  }

  return state;
}

function groupRows(
  overrides: AdminUserPermissionOverride[],
  state: PermissionDraftState,
  roleDefaultKeys: Set<string>,
) {
  const rowsByModule = new Map<string, PermissionRow[]>();
  const overrideMap = new Map(overrides.map((item) => [item.permissionKey, item] as const));

  for (const item of ADMIN_PERMISSION_CATALOG) {
    const currentChecked = state[item.key] ?? roleDefaultKeys.has(item.key);
    const rows = rowsByModule.get(item.module) ?? [];
    rows.push({
      key: item.key,
      defaultChecked: roleDefaultKeys.has(item.key),
      currentChecked,
      catalogItem: item,
      override: overrideMap.get(item.key),
    });
    rowsByModule.set(item.module, rows);
  }

  for (const override of overrides) {
    if (ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) continue;

    const currentChecked = state[override.permissionKey] ?? override.effect === "ALLOW";
    const rows = rowsByModule.get("other") ?? [];
    rows.push({
      key: override.permissionKey,
      defaultChecked: false,
      currentChecked,
      override,
    });
    rowsByModule.set("other", rows);
  }

  return rowsByModule;
}

function formatPermissionLabel(t: ReturnType<typeof useTranslations>, row: PermissionRow) {
  if (row.catalogItem) return t(row.catalogItem.labelKey);
  return row.key;
}

function formatPermissionDescription(t: ReturnType<typeof useTranslations>, row: PermissionRow) {
  if (row.catalogItem) {
    return t(`permissions.modules.${row.catalogItem.module}.description`);
  }
  return row.override?.reason ?? t("permissions.unknownPermissionDescription");
}

function PermissionMatrixCheckboxCell({
  name,
  checked,
  onChange,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <label
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-primary-light/30"
        } ${checked ? "border-primary bg-primary-light" : "border-border-light bg-white"}`}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${
            checked ? "border-primary bg-primary text-white" : "border-border-strong bg-white"
          }`}
        >
          {checked ? (
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path
                d="M16.25 5.75L8.5 13.5l-4.75-4.75"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function buildOperations(
  overrides: AdminUserPermissionOverride[],
  draft: PermissionDraftState,
  roleDefaultKeys: Set<string>,
): AdminUserPermissionOverrideOperation[] {
  const operations: AdminUserPermissionOverrideOperation[] = [];

  for (const item of ADMIN_PERMISSION_CATALOG) {
    const nextChecked = draft[item.key] ?? roleDefaultKeys.has(item.key);
    const previous = overrides.find((override) => override.permissionKey === item.key);
    const previousChecked = previous ? previous.effect === "ALLOW" : roleDefaultKeys.has(item.key);

    if (nextChecked === previousChecked) continue;

    operations.push({
      permissionKey: item.key,
      effect: nextChecked ? "ALLOW" : "DENY",
    });
  }

  for (const override of overrides) {
    if (ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) continue;

    const nextChecked = draft[override.permissionKey] ?? override.effect === "ALLOW";
    const previousChecked = override.effect === "ALLOW";
    if (nextChecked === previousChecked) continue;

    operations.push({
      permissionKey: override.permissionKey,
      effect: nextChecked ? "ALLOW" : "DENY",
    });
  }

  return operations;
}

function AdminUserPermissionsEditor({
  id,
  initialDetail,
  overrides,
  readOnly,
  onBack,
}: {
  id: string;
  initialDetail: AdminUserDetails;
  overrides: AdminUserPermissionOverride[];
  readOnly: boolean;
  onBack: () => void;
}) {
  const t = useTranslations("admin-users");
  const router = useRouter();
  const queryClient = useQueryClient();
  const stepUp = useAdminStepUp();
  const roleDefaultKeys = useMemo(() => getDefaultPermissionsForRoles(initialDetail.roles), [initialDetail.roles]);
  const adminUsersPath = (path: string) => path;

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [draft, setDraft] = useState<PermissionDraftState>(() => getInitialState(overrides, roleDefaultKeys));
  const [error, setError] = useState<string | null>(null);

  const groupedRows = useMemo(() => groupRows(overrides, draft, roleDefaultKeys), [draft, overrides, roleDefaultKeys]);
  const normalizedSearch = search.trim().toLowerCase();

  const moduleOptions = useMemo(
    () => [
      { value: "all", label: t("permissions.matrix.toolbar.allModules") },
      ...ADMIN_PERMISSION_GROUP_ORDER.map((module) => ({
        value: module,
        label: t(`permissions.modules.${module}.title`),
      })),
    ],
    [t],
  );

  const visibleModules = useMemo(() => {
    const result: VisiblePermissionModule[] = [];

    for (const groupId of ADMIN_PERMISSION_GROUP_ORDER) {
      if (moduleFilter !== "all" && moduleFilter !== groupId) continue;

      const rows = groupedRows.get(groupId) ?? [];
      const filtered = rows.filter((row) => {
        if (showChangedOnly && row.currentChecked === row.defaultChecked) return false;
        if (!normalizedSearch) return true;

        const label = formatPermissionLabel(t, row).toLowerCase();
        const description = formatPermissionDescription(t, row).toLowerCase();
        return (
          label.includes(normalizedSearch) ||
          description.includes(normalizedSearch) ||
          row.key.toLowerCase().includes(normalizedSearch)
        );
      });

      if (filtered.length > 0) result.push({ module: groupId, rows: filtered });
    }

    return result;
  }, [groupedRows, moduleFilter, normalizedSearch, showChangedOnly, t]);

  const operations = useMemo(() => buildOperations(overrides, draft, roleDefaultKeys), [draft, overrides, roleDefaultKeys]);
  const changedCount = operations.length;

  const mutation = useMutation({
    mutationFn: (input: AdminUserPermissionOverrideOperation[]) =>
      updateAdminUserPermissionOverrides(id, { operations: input }),
  });

  const goToDetail = () => {
    router.replace(adminUsersPath(`/admin/users/${id}`) as never, { scroll: false });
  };

  const handleResetDraft = () => {
    setDraft(getInitialState(overrides, roleDefaultKeys));
    setError(null);
  };

  const handleSave = async () => {
    if (readOnly) return;

    if (operations.length === 0) {
      setError(t("permissions.validation.noChanges"));
      return;
    }

    setError(null);

    const persist = async () => {
      await mutation.mutateAsync(operations);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.permissionOverrides(id) }),
        queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all }),
      ]);
      toast.success(t("permissions.page.saved"));
      goToDetail();
    };

    try {
      await persist();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          try {
            await persist();
          } catch (retryCause) {
            const retryError = toAppError(retryCause);
            setError(retryError.message || t("errors.generic"));
          }
        });
        return;
      }

      setError(appError.message || t("errors.generic"));
    }
  };

  const title = initialDetail.displayName ?? initialDetail.emails?.[0] ?? id;
  const primaryEmail = initialDetail.emails?.[0] ?? null;
  const primaryPhone = initialDetail.phones?.[0] ?? null;
  const canEdit = !readOnly;

  return (
    <>
      <div className="space-y-5 pb-24">
        <AdminPageHeader
          eyebrow={t("page.eyebrow")}
          title={t("permissions.page.title")}
          description={t("permissions.page.description")}
          actions={
            <Button variant="outline" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
              {t("actions.back")}
            </Button>
          }
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="muted">{title}</AdminStatusBadge>
              {primaryEmail ? <AdminStatusBadge tone="muted">{primaryEmail}</AdminStatusBadge> : null}
              {primaryPhone ? <AdminStatusBadge tone="muted">{primaryPhone}</AdminStatusBadge> : null}
              <AdminStatusBadge tone="muted">{t(`status.${initialDetail.status}`)}</AdminStatusBadge>
              {initialDetail.roles.map((role) => (
                <AdminStatusBadge key={role} tone="muted">
                  {t(ADMIN_USER_ROLE_LABEL_KEYS[role])}
                </AdminStatusBadge>
              ))}
            </div>
          }
        />

        <AdminSectionCard
          title={t("permissions.summary.title")}
          description={t("permissions.summary.description")}
        >
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border-light bg-surface-secondary/55 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("detail.profile.displayName")}
              </p>
              <p className="mt-1 text-[13px] font-medium text-text-primary">{title}</p>
            </div>
            <div className="rounded-2xl border border-border-light bg-surface-secondary/55 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("detail.profile.email")}
              </p>
              <p className="mt-1 text-[13px] font-medium text-text-primary">{primaryEmail ?? t("detail.noEmail")}</p>
            </div>
            <div className="rounded-2xl border border-border-light bg-surface-secondary/55 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("detail.profile.phone")}
              </p>
              <p className="mt-1 text-[13px] font-medium text-text-primary">{primaryPhone ?? t("detail.noValue")}</p>
            </div>
            <div className="rounded-2xl border border-border-light bg-surface-secondary/55 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("permissions.page.changeCount")}
              </p>
              <p className="mt-1 text-[13px] font-medium text-text-primary">
                {t("permissions.page.changeCountValue", { count: changedCount })}
              </p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t("permissions.matrix.title")}
          description={t("permissions.matrix.description")}
          actions={
            canEdit ? (
              <AdminStatusBadge tone={changedCount > 0 ? "primary" : "muted"}>
                {changedCount > 0
                  ? t("permissions.page.unsavedChanges", { count: changedCount })
                  : t("permissions.page.noChanges")}
              </AdminStatusBadge>
            ) : null
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(220px,0.9fr)_minmax(0,auto)_auto]">
              <div className="space-y-1">
                <Label>{t("permissions.search.label")}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <InputField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("permissions.search.placeholder")}
                    className="ps-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("permissions.matrix.toolbar.moduleLabel")}</Label>
                <select
                  className="app-control h-10 w-full rounded-xl border border-border-light bg-white px-3 text-[13px] text-text-primary"
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                >
                  {moduleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-0.5">
                <label className="flex w-full items-center gap-2.5 rounded-2xl border border-border-light bg-white px-3 py-2.5 text-[13px] font-medium text-text-primary">
                  <input
                    type="checkbox"
                    checked={showChangedOnly}
                    onChange={(event) => setShowChangedOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20"
                  />
                  <span>{t("permissions.matrix.toolbar.showChangedOnly")}</span>
                </label>
              </div>

              <div className="flex items-end justify-end pb-0.5">
                <Button variant="outline" startIcon={<RotateCcw className="h-4 w-4" />} onClick={handleResetDraft} disabled={!canEdit || changedCount === 0}>
                  {t("permissions.matrix.toolbar.resetChanges")}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-primary-light/40 px-3 py-3 text-[13px] text-text-secondary">
              <p className="font-medium text-text-primary">{t("permissions.summary.title")}</p>
              <p className="mt-1 leading-5">{t("permissions.summary.description")}</p>
            </div>

            {readOnly ? (
              <div className="rounded-3xl border border-warning-200 bg-warning-50 px-3 py-3 text-[13px] text-warning-700">
                {t("permissions.page.readOnlyNote")}
              </div>
            ) : null}

            <div className="space-y-4">
              {visibleModules.map(({ module, rows }) => {
                const moduleLabel = t(`permissions.modules.${module}.title`);
                const moduleDescription = t(`permissions.modules.${module}.description`);
                const customCount = rows.filter((row) => row.currentChecked !== row.defaultChecked).length;
                const changedCheckedCount = rows.filter((row) => row.currentChecked).length;

                return (
                  <section key={module} className="rounded-[26px] border border-border-light bg-white p-3 shadow-[0_14px_30px_-28px_rgba(34,52,56,0.22)] sm:p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold text-text-primary">{moduleLabel}</h3>
                        <p className="text-xs leading-5 text-text-secondary">{moduleDescription}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AdminStatusBadge tone="muted">{t("permissions.moduleCounts.total", { count: rows.length })}</AdminStatusBadge>
                        {customCount > 0 ? (
                          <AdminStatusBadge tone="primary">
                            {t("permissions.moduleCounts.custom", { count: customCount })}
                          </AdminStatusBadge>
                        ) : null}
                      </div>
                    </div>

                    <div className="no-scrollbar overflow-x-auto">
                      <table className="w-full min-w-full table-fixed border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="sticky start-0 z-20 w-40 border-b border-border-light bg-white px-3 py-3 text-start align-bottom">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-text-primary">
                                  {t("permissions.matrix.headers.permission")}
                                </p>
                              </div>
                            </th>
                            {rows.map((row) => {
                              const rowLabel = formatPermissionLabel(t, row);
                              return (
                                <th
                                  key={row.key}
                                  className="border-b border-border-light px-2.5 py-3 text-center align-bottom"
                                  title={row.catalogItem ? `${rowLabel} • ${row.key}` : rowLabel}
                                >
                                  <div className="space-y-0.5 text-center">
                                    <p className="break-words text-[11px] font-semibold leading-4 text-text-primary">{rowLabel}</p>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th className="sticky start-0 z-10 border-b border-border-light bg-surface-secondary/45 px-3 py-3 text-start align-middle">
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-text-primary">{t("permissions.matrix.roleRow")}</p>
                              </div>
                            </th>
                            {rows.map((row) => (
                              <td key={`${row.key}-role`} className="border-b border-border-light px-2.5 py-3 text-center align-middle">
                                <span
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    row.defaultChecked
                                      ? "bg-success-50 text-success-700"
                                      : "bg-surface-secondary text-text-muted"
                                  }`}
                                  title={
                                    row.defaultChecked ? t("permissions.matrix.roleGranted") : t("permissions.matrix.roleMissing")
                                  }
                                >
                                  {row.defaultChecked ? "✓" : "−"}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <th className="sticky start-0 z-10 border-b border-border-light bg-surface-secondary/60 px-3 py-3 text-start align-middle">
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-text-primary">{t("permissions.matrix.userRow")}</p>
                              </div>
                            </th>
                            {rows.map((row) => {
                              return (
                                <td key={row.key} className="border-b border-border-light px-2.5 py-3 align-middle">
                                  <PermissionMatrixCheckboxCell
                                    name={row.key}
                                    checked={row.currentChecked}
                                    onChange={(next) =>
                                      setDraft((currentDraft) => ({
                                        ...currentDraft,
                                        [row.key]: next,
                                      }))
                                    }
                                    disabled={!canEdit}
                                  />
                                  <div className="mt-1.5 flex justify-center gap-1">
                                    {row.currentChecked !== row.defaultChecked ? (
                                      <span
                                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                          row.currentChecked
                                            ? "bg-success-50 text-success-700"
                                            : "bg-error-50 text-error-700"
                                        }`}
                                      >
                                        {row.currentChecked ? t("permissions.matrix.custom") : t("permissions.matrix.blocked")}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span>{t("permissions.moduleCounts.total", { count: rows.length })}</span>
                      <span>•</span>
                      <span>{t("permissions.matrix.changedCount", { count: customCount })}</span>
                      <span>•</span>
                      <span>{t("permissions.matrix.checkedCount", { count: changedCheckedCount })}</span>
                    </div>
                  </section>
                );
              })}

              {visibleModules.length === 0 ? (
                <div className="rounded-3xl border border-border-light bg-surface-secondary/60 px-4 py-6 text-sm text-text-secondary">
                  {t("permissions.page.noMatches")}
                </div>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>

        {canEdit ? (
          <div className="sticky bottom-4 z-20">
            <div className="rounded-[24px] border border-border-light bg-white/95 p-4 shadow-[0_18px_40px_-28px_rgba(34,52,56,0.32)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {changedCount > 0
                      ? t("permissions.page.unsavedChanges", { count: changedCount })
                      : t("permissions.page.noChanges")}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{t("permissions.page.saveHint")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" startIcon={<RotateCcw className="h-4 w-4" />} onClick={handleResetDraft} disabled={!canEdit || changedCount === 0}>
                    {t("permissions.matrix.toolbar.resetChanges")}
                  </Button>
                  <Button variant="outline" onClick={onBack}>
                    {t("permissions.page.backToUser")}
                  </Button>
                  <Button
                    onClick={() => void handleSave()}
                    disabled={changedCount === 0 || mutation.isPending}
                  >
                    {mutation.isPending ? t("permissions.page.saving") : t("permissions.page.save")}
                  </Button>
                </div>
              </div>
              {error ? <p className="mt-3 text-sm text-error-600">{error}</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <AdminUserStepUpDialog controller={stepUp} />
    </>
  );
}

export default function AdminUserPermissionsScreen({ id }: { id: string }) {
  const t = useTranslations("admin-users");
  const router = useRouter();
  const { data: currentPermissions, isLoading: permissionsLoading } = useCurrentUserPermissions(true);
  const userQuery = useAdminUser(id, true);
  const overridesQuery = useAdminUserPermissionOverrides(id, true);
  const { isLoading, isError, error } = overridesQuery;

  const permissions = new Set(currentPermissions?.permissions ?? []);
  const canReadOverrides = permissions.has(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ);
  const canEditOverrides = permissions.has(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE);

  if (isError) {
    const appError = toAppError(error);
    return (
      <AdminSectionCard
        title={appError.statusCode === 404 ? t("errors.notFoundTitle") : t("errors.title")}
        description={appError.statusCode === 404 ? t("errors.notFound") : appError.message || t("errors.loadFailed")}
          actions={
            <Button
              variant="outline"
              startIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.replace(`/admin/users/${id}` as never, { scroll: false })}
            >
              {t("actions.back")}
            </Button>
          }
      >
        <div />
      </AdminSectionCard>
    );
  }

  if (permissionsLoading || isLoading || !userQuery.data?.item || !overridesQuery.data) {
    return (
      <AdminSectionCard
        title={t("permissions.page.loadingTitle")}
        description={t("permissions.page.loadingDescription")}
      >
        <div className="space-y-3">
          <div className="h-4 w-48 animate-pulse rounded-full bg-surface-secondary" />
          <div className="h-24 animate-pulse rounded-3xl bg-surface-secondary" />
          <div className="h-56 animate-pulse rounded-3xl bg-surface-secondary" />
        </div>
      </AdminSectionCard>
    );
  }

  if (!canReadOverrides) {
    return <AdminSectionCard title={t("errors.title")} description={t("errors.loadFailed")}><div /></AdminSectionCard>;
  }

  return (
    <AdminUserPermissionsEditor
      key={`${id}-${overridesQuery.dataUpdatedAt}`}
      id={id}
      initialDetail={userQuery.data.item}
      overrides={overridesQuery.data.items}
      readOnly={!canEditOverrides}
      onBack={() => router.replace(`/admin/users/${id}` as never, { scroll: false })}
    />
  );
}
