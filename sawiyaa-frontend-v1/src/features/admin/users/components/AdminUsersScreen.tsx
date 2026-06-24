"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, KeyRound, LogOut, PencilLine, Plus, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  DataTable,
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
  type ColumnDef,
} from "@/components/ui/data-table";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { PermissionKey } from "@/lib/auth/permissions";
import { useCurrentUser, useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { useAdminUsersList } from "../hooks/use-admin-users";
import AdminUserCreateModal from "./AdminUserCreateModal";
import AdminUsersActionDialogs, { type AdminUsersListAction } from "./AdminUsersActionDialogs";
import {
  ADMIN_USER_INTERNAL_ROLES,
  ADMIN_USER_STATUS_VALUES,
  type AdminUserListItem,
  type AdminUserRole,
} from "../types/admin-users.types";
import { ADMIN_USER_ROLE_LABEL_KEYS } from "../utils/admin-users-format";

type FilterRole = AdminUserRole | "ALL";
type FilterStatus = (typeof ADMIN_USER_STATUS_VALUES)[number] | "ALL";

const ROLE_FILTER_OPTIONS: FilterRole[] = ["ALL", ...ADMIN_USER_INTERNAL_ROLES];
const STATUS_FILTER_OPTIONS: FilterStatus[] = ["ALL", ...ADMIN_USER_STATUS_VALUES];

function roleLabel(t: ReturnType<typeof useTranslations>, role: AdminUserRole) {
  return t(ADMIN_USER_ROLE_LABEL_KEYS[role]);
}

export default function AdminUsersScreen() {
  const t = useTranslations("admin-users");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const { data: currentUser } = useCurrentUser(true);

  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const selectedRole = parseEnumParam<FilterRole>(searchParams.get("role"), ROLE_FILTER_OPTIONS, "ALL");
  const selectedStatus = parseEnumParam<FilterStatus>(
    searchParams.get("status"),
    STATUS_FILTER_OPTIONS,
    "ALL"
  );
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 80 });

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<AdminUsersListAction>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const debouncedSearch = useMemo(() => searchInput.trim(), [searchInput]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (debouncedSearch === searchQuery) return;
      const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
        q: debouncedSearch || null,
        page: 1,
      });
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [debouncedSearch, pathname, router, searchParams, searchQuery]);

  const listQuery = useMemo(
    () => ({
      page,
      limit,
      q: searchQuery || undefined,
      role: selectedRole === "ALL" ? undefined : selectedRole,
      status: selectedStatus === "ALL" ? undefined : selectedStatus,
    }),
    [limit, page, searchQuery, selectedRole, selectedStatus]
  );

  const { data, isLoading, isError, refetch } = useAdminUsersList(listQuery, true);

  const permissions = new Set(permissionData?.permissions ?? []);
  const canCreate = permissions.has(PermissionKey.ADMIN_USERS_CREATE);
  const canUpdate = permissions.has(PermissionKey.ADMIN_USERS_UPDATE);
  const canStatus = permissions.has(PermissionKey.ADMIN_USERS_STATUS_UPDATE);
  const canRoles = permissions.has(PermissionKey.ADMIN_USERS_ROLES_UPDATE);
  const canRevoke = permissions.has(PermissionKey.ADMIN_USERS_SESSIONS_REVOKE);
  const canInvalidate = permissions.has(PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE);
  const currentUserId = currentUser?.userId ?? null;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    updateListQuery({
      q: null,
      role: null,
      status: null,
      page: 1,
    });
  };

  const columns = useMemo<ColumnDef<AdminUserListItem>[]>(
    () => [
      {
        id: "displayName",
        header: t("table.columns.user"),
        accessor: (row) => row.displayName ?? row.primaryEmail ?? row.id,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {row.displayName ?? t("table.noName")}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{row.id}</p>
          </div>
        ),
      },
      {
        id: "primaryEmail",
        header: t("table.columns.email"),
        accessor: (row) => row.primaryEmail ?? "",
        cell: (row) => <span className="break-all text-sm text-text-primary">{row.primaryEmail ?? "—"}</span>,
      },
      {
        id: "roles",
        header: t("table.columns.roles"),
        accessor: (row) => row.roles.join(", "),
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-primary"
              >
                {roleLabel(t, role)}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        header: t("table.columns.status"),
        accessor: (row) => row.status,
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              row.status === "ACTIVE"
                ? "bg-success-50 text-success-700"
                : row.status === "SUSPENDED"
                  ? "bg-warning-50 text-warning-700"
                  : row.status === "DELETED"
                    ? "bg-error-50 text-error-700"
                    : "bg-surface-secondary text-text-secondary"
            }`}
          >
            {t(`status.${row.status}`)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: t("table.columns.updatedAt"),
        accessor: (row) => new Date(row.updatedAt).getTime(),
        hideOnMobile: true,
        cell: (row) => new Date(row.updatedAt).toLocaleString(locale),
      },
    ],
    [locale, t]
  );

  const rows = data?.items ?? [];
  const pagination = data?.pagination
    ? {
        page: data.pagination.page,
        limit: data.pagination.limit,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
      }
    : undefined;

  return (
    <>
      <AdminOperationalListShell
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
        actions={
          <>
            {canCreate ? (
              <Button onClick={() => setIsCreateOpen(true)} startIcon={<Plus className="h-4 w-4" />}>
                {t("actions.create")}
              </Button>
            ) : null}
          </>
        }
        filters={
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))_auto]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("filters.searchPlaceholder")}
                  className="app-control h-11 w-full rounded-2xl ps-10 pe-4"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.role")}
              </span>
              <select
                value={selectedRole}
                onChange={(event) => {
                  updateListQuery({
                    role: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  });
                }}
                className="app-control h-11 w-full rounded-2xl px-4"
              >
                {ROLE_FILTER_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role === "ALL" ? t("filters.allRoles") : roleLabel(t, role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.status")}
              </span>
              <select
                value={selectedStatus}
                onChange={(event) => {
                  updateListQuery({
                    status: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  });
                }}
                className="app-control h-11 w-full rounded-2xl px-4"
              >
                {STATUS_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? t("filters.allStatuses") : t(`status.${status}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <FilterClearButton
                onClick={clearFilters}
                disabled={!searchQuery && selectedRole === "ALL" && selectedStatus === "ALL"}
              />
            </div>
          </div>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          error={isError ? new Error(t("errors.loadFailed")) : null}
          errorState={{
            title: t("errors.title"),
            description: t("errors.loadFailed"),
            action: {
              label: t("actions.retry"),
              onClick: () => void refetch(),
            },
          }}
          emptyState={{
            title: t("empty.title"),
            description:
              searchQuery || selectedRole !== "ALL" || selectedStatus !== "ALL"
                ? t("empty.filtered")
                : t("empty.description"),
            action:
              searchQuery || selectedRole !== "ALL" || selectedStatus !== "ALL"
                ? { label: t("empty.clearFilters"), onClick: clearFilters }
                : undefined,
          }}
          pagination={pagination}
          onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
          onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          rowActionsHeader={t("table.columns.actions")}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <ActionIconButton
                label={t("actions.view")}
                intent="view"
                icon={<Eye className="h-4 w-4" />}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  router.push(`/admin/users/${row.id}` as never);
                }}
              />
              {canUpdate ? (
                <ActionIconButton
                  label={t("actions.editProfile")}
                  intent="edit"
                  icon={<PencilLine className="h-4 w-4" />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveAction({ type: "profile", userId: row.id });
                  }}
                />
              ) : null}
              {canStatus ? (
                <ActionIconButton
                  label={t("actions.updateStatus")}
                  intent="deactivate"
                  icon={<ShieldAlert className="h-4 w-4" />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveAction({ type: "status", userId: row.id });
                  }}
                />
              ) : null}
              {canRoles ? (
                <ActionIconButton
                  label={t("actions.updateRoles")}
                  intent="manage"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveAction({ type: "roles", userId: row.id });
                  }}
                />
              ) : null}
              {canRevoke && currentUserId !== row.id ? (
                <ActionIconButton
                  label={t("actions.revokeSessions")}
                  intent="archive"
                  icon={<LogOut className="h-4 w-4" />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveAction({ type: "sessions", userId: row.id });
                  }}
                />
              ) : null}
              {canInvalidate && currentUserId !== row.id ? (
                <ActionIconButton
                  label={t("actions.invalidateTokens")}
                  intent="neutral"
                  icon={<KeyRound className="h-4 w-4" />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveAction({ type: "token-version", userId: row.id });
                  }}
                />
              ) : null}
            </div>
          )}
          className="mt-2"
          striped
        />
      </AdminOperationalListShell>

      <AdminUserCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => void refetch()}
      />

      <AdminUsersActionDialogs
        action={activeAction}
        onClose={() => setActiveAction(null)}
        onCompleted={() => void refetch()}
      />
    </>
  );
}
