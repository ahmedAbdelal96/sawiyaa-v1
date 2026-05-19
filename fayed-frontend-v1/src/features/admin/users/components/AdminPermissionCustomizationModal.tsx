"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { FormModal } from "@/components/ui/modal";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import type { AdminStepUpController } from "../hooks/use-admin-step-up";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import type {
  AdminUserPermissionEffect,
  AdminUserPermissionOverride,
  AdminUserPermissionOverrideOperation,
} from "../types/admin-users.types";
import {
  ADMIN_PERMISSION_CATALOG,
  ADMIN_PERMISSION_GROUP_ORDER,
  type AdminPermissionCatalogItem,
} from "../constants/admin-permission-catalog";

type PermissionState = "DEFAULT" | AdminUserPermissionEffect;

type PermissionDraftState = Record<string, PermissionState>;

type PermissionRow = {
  key: string;
  current: PermissionState;
  catalogItem?: AdminPermissionCatalogItem;
  override?: AdminUserPermissionOverride;
};

type AdminPermissionCustomizationModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  overrides: AdminUserPermissionOverride[];
  loading?: boolean;
  stepUp: AdminStepUpController;
  onClose: () => void;
  onSubmit: (operations: AdminUserPermissionOverrideOperation[]) => Promise<void>;
};

function getInitialState(overrides: AdminUserPermissionOverride[]) {
  const state: PermissionDraftState = {};

  for (const item of ADMIN_PERMISSION_CATALOG) {
    state[item.key] = "DEFAULT";
  }

  for (const override of overrides) {
    state[override.permissionKey] = override.effect;
  }

  return state;
}

function getModuleLabelKey(module: string) {
  const catalogItem = ADMIN_PERMISSION_CATALOG.find((item) => item.module === module);
  return catalogItem?.moduleLabelKey ?? "permissions.modules.other";
}

function groupRows(overrides: AdminUserPermissionOverride[], state: PermissionDraftState) {
  const rowsByModule = new Map<string, PermissionRow[]>();
  const overrideMap = new Map(overrides.map((item) => [item.permissionKey, item] as const));

  for (const item of ADMIN_PERMISSION_CATALOG) {
    const current = state[item.key] ?? "DEFAULT";
    const rows = rowsByModule.get(item.module) ?? [];
    rows.push({ key: item.key, current, catalogItem: item, override: overrideMap.get(item.key) });
    rowsByModule.set(item.module, rows);
  }

  for (const override of overrides) {
    if (ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) continue;

    const current = state[override.permissionKey] ?? override.effect;
    const rows = rowsByModule.get("other") ?? [];
    rows.push({ key: override.permissionKey, current, override });
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

function PermissionStateSelector({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: PermissionState;
  onChange: (next: PermissionState) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("admin-users");

  const options: Array<{ value: PermissionState; label: string; tone: "muted" | "success" | "danger" }> = [
    { value: "DEFAULT", label: t("permissions.states.default"), tone: "muted" },
    { value: "ALLOW", label: t("permissions.states.allow"), tone: "success" },
    { value: "DENY", label: t("permissions.states.deny"), tone: "danger" },
  ];

  return (
    <div className="grid gap-1.5 sm:grid-cols-3">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:border-primary/30 hover:bg-primary-light/40"
            } ${
              option.tone === "success"
                ? active
                  ? "border-success-500 bg-success-50 text-success-700"
                  : "border-border-light bg-white text-text-secondary"
                : option.tone === "danger"
                  ? active
                    ? "border-error-500 bg-error-50 text-error-700"
                    : "border-border-light bg-white text-text-secondary"
                  : active
                    ? "border-primary bg-primary-light text-text-brand"
                    : "border-border-light bg-white text-text-secondary"
            }`}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={active}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export default function AdminPermissionCustomizationModal({
  isOpen,
  title,
  description,
  submitLabel,
  cancelLabel,
  overrides,
  loading = false,
  stepUp,
  onClose,
  onSubmit,
}: AdminPermissionCustomizationModalProps) {
  const t = useTranslations("admin-users");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionDraftState>(() => getInitialState(overrides));
  const groupedRows = useMemo(() => groupRows(overrides, draft), [draft, overrides]);

  const normalizedSearch = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    const result = new Map<string, PermissionRow[]>();

    for (const groupId of ADMIN_PERMISSION_GROUP_ORDER) {
      const rows = groupedRows.get(groupId) ?? [];
      const filtered = normalizedSearch
        ? rows.filter((row) => {
            const label = formatPermissionLabel(t, row).toLowerCase();
            const description = formatPermissionDescription(t, row).toLowerCase();
            return (
              label.includes(normalizedSearch) ||
              description.includes(normalizedSearch) ||
              row.key.toLowerCase().includes(normalizedSearch)
            );
          })
        : rows;

      if (filtered.length > 0) {
        result.set(groupId, filtered);
      }
    }

    return result;
  }, [groupedRows, normalizedSearch, t]);

  const handleClose = () => {
    setSearch("");
    setError(null);
    setDraft(getInitialState(overrides));
    onClose();
  };

  const handleSubmit = async () => {
    const operations: AdminUserPermissionOverrideOperation[] = [];

    for (const item of ADMIN_PERMISSION_CATALOG) {
      const nextState = draft[item.key] ?? "DEFAULT";
      const previous = overrides.find((override) => override.permissionKey === item.key);
      const previousState = previous?.effect ?? "DEFAULT";

      if (nextState === previousState) continue;

      operations.push({
        permissionKey: item.key,
        effect: nextState === "DEFAULT" ? null : nextState,
      });
    }

    for (const override of overrides) {
      if (ADMIN_PERMISSION_CATALOG.some((item) => item.key === override.permissionKey)) continue;

      const nextState = draft[override.permissionKey] ?? "DEFAULT";
      const previousState = override.effect;
      if (nextState === previousState) continue;

      operations.push({
        permissionKey: override.permissionKey,
        effect: nextState === "DEFAULT" ? null : nextState,
      });
    }

    if (operations.length === 0) {
      setError(t("permissions.validation.noChanges"));
      return;
    }

    setError(null);
    try {
      await onSubmit(operations);
      handleClose();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          try {
            await onSubmit(operations);
            handleClose();
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

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onSubmit={handleSubmit}
      onCancel={handleClose}
      loading={loading}
      submitDisabled={loading}
      size="2xl"
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-primary/15 bg-primary-light/40 px-4 py-4 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">{t("permissions.summary.title")}</p>
          <p className="mt-1 leading-6">{t("permissions.summary.description")}</p>
        </div>

        <div className="space-y-1.5">
          <Label>{t("permissions.search.label")}</Label>
          <InputField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("permissions.search.placeholder")}
          />
        </div>

        <div className="space-y-4">
          {ADMIN_PERMISSION_GROUP_ORDER.map((module) => {
            const rows = visibleGroups.get(module);
            if (!rows || rows.length === 0) return null;

            const moduleLabelKey = getModuleLabelKey(module);

            return (
              <section key={module} className="rounded-[24px] border border-border-light bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold text-text-primary">{t(moduleLabelKey)}</h3>
                    <p className="text-sm leading-6 text-text-secondary">{t(`permissions.modules.${module}.description`)}</p>
                  </div>
                  <AdminStatusBadge tone="muted">{rows.length}</AdminStatusBadge>
                </div>

                <div className="space-y-3">
                  {rows.map((row) => {
                    const rowLabel = formatPermissionLabel(t, row);
                    const rowDescription = formatPermissionDescription(t, row);
                    const current = row.current ?? "DEFAULT";
                    const badgeTone =
                      current === "ALLOW" ? "success" : current === "DENY" ? "danger" : "muted";

                    return (
                      <div
                        key={row.key}
                        className="rounded-2xl border border-border-light bg-surface-secondary/55 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-text-primary">{rowLabel}</p>
                              <AdminStatusBadge tone={badgeTone}>
                                {t(`permissions.states.${current.toLowerCase()}`)}
                              </AdminStatusBadge>
                            </div>
                            <p className="text-sm leading-6 text-text-secondary">{rowDescription}</p>
                            <p className="text-xs font-medium text-text-muted">{row.key}</p>
                          </div>

                          <div className="min-w-[260px]">
                            <PermissionStateSelector
                              name={row.key}
                              value={current}
                              onChange={(next) =>
                                setDraft((currentDraft) => ({
                                  ...currentDraft,
                                  [row.key]: next,
                                }))
                              }
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {error ? <p className="text-sm text-error-600">{error}</p> : null}
      </div>
    </FormModal>
  );
}
