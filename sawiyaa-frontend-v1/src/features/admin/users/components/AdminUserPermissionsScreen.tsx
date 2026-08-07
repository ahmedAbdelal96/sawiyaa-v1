"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/shared/admin/AdminDashboardKit";
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
} from "../types/admin-users.types";
import {
  PermissionKey,
  getDefaultPermissionsForRoles,
} from "@/lib/auth/permissions";
import { toAppError } from "@/lib/api/errors";
import { adminUsersQueryKeys } from "../constants/query-keys";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";

import type {
  DensityMode,
  ModuleGroupData,
  OverrideEffect,
  PermissionDraftState,
  PermissionRowData,
  RiskFilterValue,
  StateFilterValue,
} from "./permissions/permissions.types";

import { PermissionSummaryCard } from "./permissions/PermissionSummaryCard";
import { PermissionToolbar } from "./permissions/PermissionToolbar";
import { PermissionLegend } from "./permissions/PermissionLegend";
import { PermissionBulkBar } from "./permissions/PermissionBulkBar";
import { PermissionTable } from "./permissions/PermissionTable";
import { PermissionSaveBar } from "./permissions/PermissionSaveBar";

function getInitialDraftState(overrides: AdminUserPermissionOverride[]): PermissionDraftState {
  const state: PermissionDraftState = {};
  for (const item of ADMIN_PERMISSION_CATALOG) {
    const existing = overrides.find((o) => o.permissionKey === item.key);
    state[item.key] = existing ? existing.effect : "INHERITED";
  }
  for (const override of overrides) {
    if (!ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) {
      state[override.permissionKey] = override.effect;
    }
  }
  return state;
}

function buildAllRows(
  overrides: AdminUserPermissionOverride[],
  draft: PermissionDraftState,
  roleDefaultKeys: Set<string>,
): PermissionRowData[] {
  const rows: PermissionRowData[] = [];
  const overrideMap = new Map(overrides.map((item) => [item.permissionKey, item] as const));

  // Catalog items
  for (const item of ADMIN_PERMISSION_CATALOG) {
    const defaultChecked = roleDefaultKeys.has(item.key);
    const existingOverride = overrideMap.get(item.key);
    const initialOverrideEffect: OverrideEffect = existingOverride ? existingOverride.effect : "INHERITED";
    const currentDraftEffect: OverrideEffect = draft[item.key] ?? "INHERITED";

    let effectiveAllowed = defaultChecked;
    if (currentDraftEffect === "ALLOW") effectiveAllowed = true;
    else if (currentDraftEffect === "DENY") effectiveAllowed = false;

    rows.push({
      key: item.key,
      module: item.module,
      defaultChecked,
      initialOverrideEffect,
      currentDraftEffect,
      effectiveAllowed,
      catalogItem: item,
      override: existingOverride,
      isModified: currentDraftEffect !== initialOverrideEffect,
    });
  }

  // Non-catalog overrides from backend
  for (const override of overrides) {
    if (ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) continue;

    const defaultChecked = false;
    const initialOverrideEffect: OverrideEffect = override.effect;
    const currentDraftEffect: OverrideEffect = draft[override.permissionKey] ?? override.effect;

    let effectiveAllowed = false;
    if (currentDraftEffect === "ALLOW") effectiveAllowed = true;
    else if (currentDraftEffect === "DENY") effectiveAllowed = false;

    rows.push({
      key: override.permissionKey,
      module: "other",
      defaultChecked,
      initialOverrideEffect,
      currentDraftEffect,
      effectiveAllowed,
      override,
      isModified: currentDraftEffect !== initialOverrideEffect,
    });
  }

  return rows;
}

function buildOperations(allRows: PermissionRowData[]): AdminUserPermissionOverrideOperation[] {
  const operations: AdminUserPermissionOverrideOperation[] = [];

  for (const row of allRows) {
    if (!row.isModified) continue;

    if (row.currentDraftEffect === "ALLOW") {
      operations.push({ permissionKey: row.key, effect: "ALLOW" });
    } else if (row.currentDraftEffect === "DENY") {
      operations.push({ permissionKey: row.key, effect: "DENY" });
    } else if (row.currentDraftEffect === "INHERITED") {
      // Reverting to role default
      operations.push({
        permissionKey: row.key,
        effect: row.defaultChecked ? "ALLOW" : "DENY",
      });
    }
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
  const roleDefaultKeys = useMemo(() => getDefaultPermissionsForRoles(initialDetail.roles), [initialDetail.roles]);
  const adminUsersPath = (path: string) => path;

  // Filter States
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<StateFilterValue>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilterValue>("all");

  // UX States
  const [density, setDensity] = useState<DensityMode>("compact");
  const [showLegend, setShowLegend] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    () => new Set(ADMIN_PERMISSION_GROUP_ORDER),
  );

  // Auto-expand modules when search or active filters are applied
  useEffect(() => {
    if (search.trim() || moduleFilter !== "all" || stateFilter !== "all" || riskFilter !== "all") {
      setCollapsedModules(new Set());
    }
  }, [search, moduleFilter, stateFilter, riskFilter]);

  // Draft State
  const [draft, setDraft] = useState<PermissionDraftState>(() => getInitialDraftState(overrides));
  const [error, setError] = useState<string | null>(null);

  // Restore density preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("admin_permissions_density");
      if (stored === "compact" || stored === "comfortable") {
        setDensity(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDensityChange = (mode: DensityMode) => {
    setDensity(mode);
    try {
      localStorage.setItem("admin_permissions_density", mode);
    } catch {
      // ignore
    }
  };

  // Compute all rows with current draft & initial override state
  const allRows = useMemo(
    () => buildAllRows(overrides, draft, roleDefaultKeys),
    [overrides, draft, roleDefaultKeys],
  );

  // Overall Statistics
  const totalCatalogCount = ADMIN_PERMISSION_CATALOG.length;
  const roleAllowedCount = allRows.filter((r) => r.defaultChecked).length;
  const explicitAllowCount = allRows.filter((r) => r.currentDraftEffect === "ALLOW").length;
  const explicitDenyCount = allRows.filter((r) => r.currentDraftEffect === "DENY").length;
  const pendingChangesCount = allRows.filter((r) => r.isModified).length;

  // Filter rows based on search, module, state, and risk
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRows.filter((row) => {
      // Search
      if (normalizedSearch) {
        const label = row.catalogItem ? (t as any)(row.catalogItem.labelKey).toLowerCase() : row.key.toLowerCase();
        const description = row.catalogItem
          ? (t as any)(`permissions.modules.${row.catalogItem.module}.description`).toLowerCase()
          : (row.override?.reason ?? "").toLowerCase();
        const keyMatch = row.key.toLowerCase().includes(normalizedSearch);

        if (!label.includes(normalizedSearch) && !description.includes(normalizedSearch) && !keyMatch) {
          return false;
        }
      }

      // Module Filter
      if (moduleFilter !== "all" && row.module !== moduleFilter) {
        return false;
      }

      // State Filter
      if (stateFilter === "overriddenOnly" && row.currentDraftEffect === "INHERITED") return false;
      if (stateFilter === "inheritedOnly" && row.currentDraftEffect !== "INHERITED") return false;
      if (stateFilter === "explicitAllow" && row.currentDraftEffect !== "ALLOW") return false;
      if (stateFilter === "explicitDeny" && row.currentDraftEffect !== "DENY") return false;
      if (stateFilter === "effectiveAllow" && !row.effectiveAllowed) return false;
      if (stateFilter === "effectiveDeny" && row.effectiveAllowed) return false;

      // Risk Filter
      if (riskFilter !== "all") {
        const rowRisk = row.catalogItem?.risk ?? "normal";
        if (rowRisk !== riskFilter) return false;
      }

      return true;
    });
  }, [allRows, moduleFilter, riskFilter, search, stateFilter, t]);

  // Group filtered rows by module
  const moduleGroups = useMemo(() => {
    const groupsMap = new Map<string, PermissionRowData[]>();

    for (const row of filteredRows) {
      const list = groupsMap.get(row.module) ?? [];
      list.push(row);
      groupsMap.set(row.module, list);
    }

    const result: ModuleGroupData[] = [];

    for (const moduleKey of ADMIN_PERMISSION_GROUP_ORDER) {
      const rows = groupsMap.get(moduleKey);
      if (!rows || rows.length === 0) continue;

      let title = moduleKey;
      let description = "";
      try {
        title = (t as any)(`permissions.modules.${moduleKey}.title`);
        description = (t as any)(`permissions.modules.${moduleKey}.description`);
      } catch {
        // fallback
      }

      result.push({
        module: moduleKey,
        title,
        description,
        rows,
        totalCount: rows.length,
        roleAllowedCount: rows.filter((r) => r.defaultChecked).length,
        effectiveAllowedCount: rows.filter((r) => r.effectiveAllowed).length,
        effectiveDeniedCount: rows.filter((r) => !r.effectiveAllowed).length,
        explicitAllowCount: rows.filter((r) => r.currentDraftEffect === "ALLOW").length,
        explicitDenyCount: rows.filter((r) => r.currentDraftEffect === "DENY").length,
        modifiedCount: rows.filter((r) => r.isModified).length,
      });
    }

    return result;
  }, [filteredRows, t]);

  // Collapse / Expand All
  const isAllCollapsed =
    moduleGroups.length > 0 &&
    moduleGroups.every((g) => collapsedModules.has(g.module));

  const handleToggleCollapseAll = () => {
    if (isAllCollapsed) {
      setCollapsedModules(new Set());
    } else {
      setCollapsedModules(new Set(moduleGroups.map((g) => g.module)));
    }
  };

  const handleToggleCollapseModule = (moduleKey: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  // Row Selection Handlers
  const handleToggleSelectRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleSelectModule = (moduleRowsKeys: string[], forceState?: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allSelected = moduleRowsKeys.every((k) => next.has(k));
      const shouldSelect = forceState ?? !allSelected;

      for (const key of moduleRowsKeys) {
        if (shouldSelect) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  // Draft Effect Change Handlers
  const handleChangeRowEffect = (key: string, nextEffect: OverrideEffect) => {
    setDraft((prev) => ({
      ...prev,
      [key]: nextEffect,
    }));
    setError(null);
  };

  const handleModuleBulkEffect = (moduleRowsKeys: string[], effect: OverrideEffect) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of moduleRowsKeys) {
        next[key] = effect;
      }
      return next;
    });
    setError(null);
  };

  // Bulk Selection Operations
  const handleGrantSelected = () => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of selectedKeys) {
        next[key] = "ALLOW";
      }
      return next;
    });
    setError(null);
  };

  const handleDenySelected = () => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of selectedKeys) {
        next[key] = "DENY";
      }
      return next;
    });
    setError(null);
  };

  const handleResetSelected = () => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of selectedKeys) {
        next[key] = "INHERITED";
      }
      return next;
    });
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedKeys(new Set());
  };

  const handleResetDraft = () => {
    setDraft(getInitialDraftState(overrides));
    setSelectedKeys(new Set());
    setError(null);
  };

  // Operations for mutation
  const operations = useMemo(() => buildOperations(allRows), [allRows]);

  const mutation = useMutation({
    mutationFn: (input: AdminUserPermissionOverrideOperation[]) =>
      updateAdminUserPermissionOverrides(id, { operations: input }),
  });

  const goToDetail = () => {
    router.replace(adminUsersPath(`/admin/users/${id}`) as never, { scroll: false });
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
      setError(appError.message || t("errors.generic"));
    }
  };

  const canEdit = !readOnly;

  return (
    <div className="space-y-5 pb-24">
      {/* Top Page Header */}
      <AdminPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("permissions.page.title")}
        description={t("permissions.page.description")}
        actions={
          <Button
            variant="outline"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={onBack}
          >
            {t("actions.back")}
          </Button>
        }
      />

      {/* User Header & KPI Summary Card */}
      <PermissionSummaryCard
        user={initialDetail}
        totalCatalogCount={totalCatalogCount}
        roleAllowedCount={roleAllowedCount}
        explicitAllowCount={explicitAllowCount}
        explicitDenyCount={explicitDenyCount}
        pendingChangesCount={pendingChangesCount}
      />

      {/* ReadOnly Warning if viewer is unprivileged */}
      {readOnly ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300">
          {t("permissions.page.readOnlyNote")}
        </div>
      ) : null}

      {/* Interactive Filters & Search Toolbar */}
      <PermissionToolbar
        search={search}
        onSearchChange={setSearch}
        moduleFilter={moduleFilter}
        onModuleFilterChange={setModuleFilter}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        density={density}
        onDensityChange={handleDensityChange}
        isAllCollapsed={isAllCollapsed}
        onToggleCollapseAll={handleToggleCollapseAll}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend((prev) => !prev)}
        hasChanges={pendingChangesCount > 0}
        onResetChanges={handleResetDraft}
        canEdit={canEdit}
      />

      {/* Permission State Legend (Toggleable) */}
      {showLegend ? <PermissionLegend /> : null}

      {/* Floating Multi-Select Bulk Actions Bar */}
      <PermissionBulkBar
        selectedCount={selectedKeys.size}
        onGrantSelected={handleGrantSelected}
        onDenySelected={handleDenySelected}
        onResetSelected={handleResetSelected}
        onClearSelection={handleClearSelection}
      />

      {/* Main Enterprise Permission Table Matrix */}
      <AdminSectionCard
        title={t("permissions.matrix.title")}
        description={t("permissions.matrix.description")}
        actions={
          canEdit ? (
            <AdminStatusBadge tone={pendingChangesCount > 0 ? "primary" : "muted"}>
              {pendingChangesCount > 0
                ? t("permissions.page.unsavedChanges", { count: pendingChangesCount })
                : t("permissions.page.noChanges")}
            </AdminStatusBadge>
          ) : null
        }
      >
        <PermissionTable
          moduleGroups={moduleGroups}
          density={density}
          selectedKeys={selectedKeys}
          onToggleSelectRow={handleToggleSelectRow}
          onToggleSelectModule={handleToggleSelectModule}
          onChangeRowEffect={handleChangeRowEffect}
          onModuleBulkEffect={handleModuleBulkEffect}
          collapsedModules={collapsedModules}
          onToggleCollapseModule={handleToggleCollapseModule}
          canEdit={canEdit}
        />
      </AdminSectionCard>

      {/* Sticky Bottom Save / Action Bar */}
      <PermissionSaveBar
        changedCount={pendingChangesCount}
        isSaving={mutation.isPending}
        error={error}
        onReset={handleResetDraft}
        onBack={onBack}
        onSave={() => void handleSave()}
        canEdit={canEdit}
      />
    </div>
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
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-600 animate-spin" />
            <span className="text-xs font-bold text-text-muted">{t("permissions.page.loadingTitle")}</span>
          </div>
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </AdminSectionCard>
    );
  }

  if (!canReadOverrides) {
    return (
      <AdminSectionCard title={t("errors.title")} description={t("errors.loadFailed")}>
        <div />
      </AdminSectionCard>
    );
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
