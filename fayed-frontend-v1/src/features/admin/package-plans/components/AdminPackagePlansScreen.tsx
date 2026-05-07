"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, CheckCircle2, FileText, FolderKanban, Pencil, ShieldOff } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { ConfirmModal, DestructiveConfirmModal } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminPackagePlanSettings,
  useAdminPackagePlans,
  useDisableAdminPackagePlan,
  useEnableAdminPackagePlan,
  useUpdateAdminPackagePlanSettings,
} from "../hooks/use-admin-package-plans";
import type {
  AdminPackagePlanItem,
  AdminPackagePlanSettingsItem,
} from "../types/admin-package-plans.types";

type ToggleTarget = {
  code: string;
  title: string;
  nextIsActive: boolean;
};

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatDiscount(value: string) {
  const normalized = value.trim();
  return normalized.endsWith("%") ? normalized : `${normalized}%`;
}

function PackagePlanBadge({ isActive }: { isActive: boolean }) {
  const t = useTranslations("admin-package-plans");

  return (
    <Badge variant="solid" color={isActive ? "success" : "light"} size="sm">
      {isActive ? t("badges.active") : t("badges.inactive")}
    </Badge>
  );
}

function PackagePlanSettingsCard() {
  const t = useTranslations("admin-package-plans");
  const settingsQuery = useAdminPackagePlanSettings();
  const updateSettings = useUpdateAdminPackagePlanSettings();
  const [draft, setDraft] = useState<AdminPackagePlanSettingsItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <SurfaceCard as="section" variant="section" className="space-y-4">
        <div className="space-y-3">
          <ListStateSkeleton items={1} heightClass="h-20" />
        </div>
      </SurfaceCard>
    );
  }

  if (settingsQuery.isError && !settingsQuery.data) {
    const appError = toAppError(settingsQuery.error);

    return (
      <StateCard
        title={t("states.error.heading")}
        note={appError.message || t("settings.feedback.saveError")}
        action={{
          label: t("states.error.retry"),
          onClick: () => settingsQuery.refetch(),
        }}
      />
    );
  }

  const settings = settingsQuery.data?.item ?? null;
  const draftValue = draft ?? settings;
  const dirty = Boolean(
    draft &&
      settings &&
      (draft.packagesEnabled !== settings.packagesEnabled ||
        draft.packagesPurchaseEnabled !== settings.packagesPurchaseEnabled),
  );

  const handleSubmit = async () => {
    if (!draftValue) return;
    setFeedback(null);

    try {
      await updateSettings.mutateAsync({
        packagesEnabled: draftValue.packagesEnabled,
        packagesPurchaseEnabled: draftValue.packagesPurchaseEnabled,
      });
      setFeedback({ tone: "success", message: t("settings.feedback.saveSuccess") });
      setDraft(null);
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({
        tone: "error",
        message: appError.message || t("settings.feedback.saveError"),
      });
    }
  };

  return (
    <SurfaceCard as="section" variant="section" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("settings.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
            {t("settings.title")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
            {t("settings.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="light" color={draft?.packagesEnabled ? "success" : "light"} size="sm">
            {draftValue?.packagesEnabled ? t("settings.status.enabled") : t("settings.status.disabled")}
          </Badge>
          <Badge
            variant="light"
            color={draftValue?.packagesPurchaseEnabled ? "success" : "warning"}
            size="sm"
          >
            {draftValue?.packagesPurchaseEnabled
              ? t("settings.purchaseStatus.enabled")
              : t("settings.purchaseStatus.disabled")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex items-start gap-3 rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={draftValue?.packagesEnabled ?? false}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? { ...current, packagesEnabled: event.target.checked }
                    : {
                        ...(settings ?? {
                          packagesEnabled: false,
                          packagesPurchaseEnabled: false,
                        }),
                        packagesEnabled: event.target.checked,
                      },
                )
              }
              className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
            />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-primary dark:text-white/95">
              {t("settings.fields.packagesEnabled")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-text-secondary">
              {t("settings.fields.packagesEnabledNote")}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={draftValue?.packagesPurchaseEnabled ?? false}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? { ...current, packagesPurchaseEnabled: event.target.checked }
                    : {
                        ...(settings ?? {
                          packagesEnabled: false,
                          packagesPurchaseEnabled: false,
                        }),
                        packagesPurchaseEnabled: event.target.checked,
                      },
                )
              }
              className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
            />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-primary dark:text-white/95">
              {t("settings.fields.packagesPurchaseEnabled")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-text-secondary">
              {t("settings.fields.packagesPurchaseEnabledNote")}
            </span>
          </span>
        </label>
      </div>

      {feedback ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-text-muted">{t("settings.note")}</p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!dirty || updateSettings.isPending || !draftValue}
          startIcon={<FolderKanban className="h-4 w-4" />}
        >
          {updateSettings.isPending ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </SurfaceCard>
  );
}

function PlanStatusCell({ item }: { item: AdminPackagePlanItem }) {
  const t = useTranslations("admin-package-plans");

  return (
    <div className="space-y-1">
      <PackagePlanBadge isActive={item.isActive} />
      <p className="text-xs text-text-muted">
        {item.isActive ? t("list.statusHint.active") : t("list.statusHint.inactive")}
      </p>
    </div>
  );
}

export default function AdminPackagePlansScreen() {
  const t = useTranslations("admin-package-plans");
  const locale = useLocale();
  const plansQuery = useAdminPackagePlans();
  const enableMutation = useEnableAdminPackagePlan();
  const disableMutation = useDisableAdminPackagePlan();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [pendingToggle, setPendingToggle] = useState<ToggleTarget | null>(null);

  const items = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data?.items]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.isActive).length;
    const inactive = items.filter((item) => !item.isActive).length;
    const purchases = items.reduce((total, item) => total + (item.counts.purchaseCount ?? 0), 0);
    return {
      total: items.length,
      active,
      inactive,
      purchases,
    };
  }, [items]);

  const columns = useMemo<ColumnDef<AdminPackagePlanItem>[]>(
    () => [
      {
        id: "code",
        header: t("list.columns.code"),
        accessor: (row) => row.code,
        cell: (row) => (
          <div className="space-y-1">
            <Link
              href={`/admin/package-plans/${row.code}` as never}
              className="font-mono text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              {row.code}
            </Link>
            <p className="text-xs text-text-muted">
              {t("list.codeHint", { purchases: row.counts.purchaseCount })}
            </p>
          </div>
        ),
      },
      {
        id: "title",
        header: t("list.columns.title"),
        accessor: (row) => row.title,
        cell: (row) => (
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">{row.title}</p>
            <p className="line-clamp-2 text-xs leading-5 text-text-secondary">
              {row.description ?? t("common.noDescription")}
            </p>
          </div>
        ),
      },
      {
        id: "sessionCount",
        header: t("list.columns.sessionCount"),
        accessor: (row) => row.sessionCount,
        align: "center",
        cell: (row) => <span className="font-semibold text-text-primary">{row.sessionCount}</span>,
      },
      {
        id: "discountPercent",
        header: t("list.columns.discountPercent"),
        accessor: (row) => row.discountPercent,
        align: "center",
        cell: (row) => (
          <Badge variant="light" color="primary" size="sm">
            {formatDiscount(row.discountPercent)}
          </Badge>
        ),
      },
      {
        id: "status",
        header: t("list.columns.status"),
        accessor: (row) => row.isActive,
        align: "center",
        cell: (row) => <PlanStatusCell item={row} />,
      },
      {
        id: "sortOrder",
        header: t("list.columns.sortOrder"),
        accessor: (row) => row.sortOrder,
        align: "center",
        cell: (row) => <span className="font-semibold text-text-primary">{row.sortOrder}</span>,
      },
    ],
    [t],
  );

  const handleToggle = async () => {
    if (!pendingToggle) return;
    setFeedback(null);

    const plan = items.find((item) => item.code === pendingToggle.code);
    if (!plan) {
      setPendingToggle(null);
      return;
    }

    try {
      if (pendingToggle.nextIsActive) {
        await enableMutation.mutateAsync(plan.code);
      } else {
        await disableMutation.mutateAsync(plan.code);
      }
      setFeedback({
        tone: "success",
        message: pendingToggle.nextIsActive ? t("list.feedback.enableSuccess") : t("list.feedback.disableSuccess"),
      });
      setPendingToggle(null);
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({
        tone: "error",
        message: appError.message || (pendingToggle.nextIsActive ? t("list.feedback.enableError") : t("list.feedback.disableError")),
      });
    }
  };

  if (plansQuery.isLoading && !plansQuery.data) {
    return (
      <AdminOperationalListShell
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      >
        <ListStateSkeleton items={4} heightClass="h-40" />
      </AdminOperationalListShell>
    );
  }

  if (plansQuery.isError || !plansQuery.data) {
    const appError = plansQuery.error ? toAppError(plansQuery.error) : null;
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertTriangle className="h-8 w-8 text-text-muted" />}
          title={t("states.error.heading")}
          note={appError?.message ?? t("states.error.note")}
          action={{
            label: t("states.error.retry"),
            onClick: () => plansQuery.refetch(),
          }}
        />
      </div>
    );
  }

  return (
    <AdminOperationalListShell
      eyebrow={t("page.eyebrow")}
      title={t("page.title")}
      description={t("page.description")}
      notice={
        <SurfaceCard variant="section" className="rounded-[26px]">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-warning-600" />
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("notice.heading")}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{t("notice.note")}</p>
            </div>
          </div>
        </SurfaceCard>
      }
      summaryCards={
        <>
          <AdminSummaryCard label={t("summary.total")} value={stats.total} tone="primary" />
          <AdminSummaryCard label={t("summary.active")} value={stats.active} tone="success" />
          <AdminSummaryCard label={t("summary.inactive")} value={stats.inactive} tone="warning" />
          <AdminSummaryCard label={t("summary.purchases")} value={stats.purchases} tone="neutral" />
        </>
      }
    >
      {feedback ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <PackagePlanSettingsCard />

      <SurfaceCard as="section" variant="section" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("list.tableHeading")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{t("list.tableNote")}</p>
          </div>
        </div>

        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => row.code}
          loading={plansQuery.isLoading}
          striped
          hoverable
          emptyState={{
            icon: <FileText className="h-5 w-5 text-primary" />,
            title: t("states.empty.heading"),
            description: t("states.empty.note"),
          }}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/package-plans/${row.code}` as never}
                className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
              >
                <Pencil className="h-4 w-4" />
                {t("actions.view")}
              </Link>

              <Button
                type="button"
                size="sm"
                variant={row.isActive ? "outline" : "primary"}
                onClick={() =>
                  setPendingToggle({
                    code: row.code,
                    title: row.title,
                    nextIsActive: !row.isActive,
                  })
                }
                startIcon={row.isActive ? <ShieldOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              >
                {row.isActive ? t("actions.disable") : t("actions.enable")}
              </Button>
            </div>
          )}
          ariaLabel={t("list.tableHeading")}
          caption={t("list.tableHeading")}
        />
      </SurfaceCard>

      {pendingToggle ? (
        pendingToggle.nextIsActive ? (
          <ConfirmModal
            isOpen
            onClose={() => setPendingToggle(null)}
            title={t("confirm.enable.title")}
            description={t("confirm.enable.note")}
            confirmLabel={enableMutation.isPending ? t("actions.enabling") : t("confirm.enable.confirm")}
            cancelLabel={t("confirm.cancel")}
            onConfirm={handleToggle}
            loading={enableMutation.isPending}
          >
            <div className="rounded-2xl border border-primary/15 bg-primary-light/40 px-4 py-4 text-sm text-text-secondary dark:bg-primary/10">
              <p className="font-semibold text-text-primary dark:text-white/95">{pendingToggle.title}</p>
              <p className="mt-2">{t("confirm.enable.body")}</p>
            </div>
          </ConfirmModal>
        ) : (
          <DestructiveConfirmModal
            isOpen
            onClose={() => setPendingToggle(null)}
            title={t("confirm.disable.title")}
            description={t("confirm.disable.note")}
            confirmLabel={disableMutation.isPending ? t("actions.disabling") : t("confirm.disable.confirm")}
            cancelLabel={t("confirm.cancel")}
            onConfirm={handleToggle}
            loading={disableMutation.isPending}
          >
            <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-100">
              <p className="font-semibold text-warning-900 dark:text-warning-100">{pendingToggle.title}</p>
              <p className="mt-2">{t("confirm.disable.body")}</p>
            </div>
          </DestructiveConfirmModal>
        )
      ) : null}
    </AdminOperationalListShell>
  );
}
