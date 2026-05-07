"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, CheckCircle2, Pencil, ShieldOff } from "lucide-react";
import { SurfaceCard, SurfaceHeader, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { ConfirmModal, DestructiveConfirmModal, FormModal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminPackagePlan,
  useDisableAdminPackagePlan,
  useEnableAdminPackagePlan,
  useUpdateAdminPackagePlan,
} from "../hooks/use-admin-package-plans";
import type {
  AdminPackagePlanItem,
  UpdateAdminPackagePlanInput,
} from "../types/admin-package-plans.types";

type Props = {
  code: string;
};

type ToggleTarget = {
  code: string;
  title: string;
  nextIsActive: boolean;
};

type DraftState = UpdateAdminPackagePlanInput;

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

function buildDraft(item: AdminPackagePlanItem): DraftState {
  return {
    title: item.title,
    description: item.description,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  };
}

function isValidSortOrder(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}

export default function AdminPackagePlanDetailScreen({ code }: Props) {
  const t = useTranslations("admin-package-plans");
  const locale = useLocale();
  const planQuery = useAdminPackagePlan(code);
  const updateMutation = useUpdateAdminPackagePlan();
  const enableMutation = useEnableAdminPackagePlan();
  const disableMutation = useDisableAdminPackagePlan();

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<ToggleTarget | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const item = planQuery.data?.item;

  const draftValue = draft ?? (item ? buildDraft(item) : null);
  const dirty = Boolean(
    item &&
      draftValue &&
      (draftValue.title !== item.title ||
        draftValue.description !== item.description ||
        draftValue.sortOrder !== item.sortOrder ||
        draftValue.isActive !== item.isActive),
  );

  const canSave = Boolean(draftValue && draftValue.title.trim() && isValidSortOrder(String(draftValue.sortOrder)));

  const handleSave = async () => {
    if (!item || !draftValue) return;
    setFeedback(null);

    try {
      await updateMutation.mutateAsync({
        code: item.code,
        data: {
          title: draftValue.title.trim(),
          description: draftValue.description?.trim() ? draftValue.description.trim() : null,
          sortOrder: Number(draftValue.sortOrder),
          isActive: draftValue.isActive,
        },
      });
      setFeedback({ tone: "success", message: t("detail.feedback.updateSuccess") });
      setIsEditOpen(false);
      setDraft(null);
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({
        tone: "error",
        message: appError.message || t("detail.feedback.updateError"),
      });
    }
  };

  const handleToggle = async () => {
    if (!pendingToggle) return;
    setFeedback(null);

    try {
      if (pendingToggle.nextIsActive) {
        await enableMutation.mutateAsync(pendingToggle.code);
      } else {
        await disableMutation.mutateAsync(pendingToggle.code);
      }
      setFeedback({
        tone: "success",
        message: pendingToggle.nextIsActive
          ? t("detail.feedback.enableSuccess")
          : t("detail.feedback.disableSuccess"),
      });
      setPendingToggle(null);
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({
        tone: "error",
        message: appError.message || (pendingToggle.nextIsActive ? t("detail.feedback.enableError") : t("detail.feedback.disableError")),
      });
    }
  };

  if (planQuery.isLoading && !item) {
    return (
      <div className="space-y-5">
        <SurfaceCard as="section" variant="page">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </SurfaceCard>
        <ListStateSkeleton items={3} heightClass="h-48" />
      </div>
    );
  }

  if (planQuery.isError || !item) {
    const appError = planQuery.error ? toAppError(planQuery.error) : null;
    const isNotFound = appError?.statusCode === 404 || appError?.code === "PACKAGE_PLAN_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertTriangle className="h-8 w-8 text-text-muted" />}
          title={isNotFound ? t("states.notFound.heading") : t("states.error.heading")}
          note={isNotFound ? t("states.notFound.note") : appError?.message ?? t("states.error.note")}
          action={{
            label: t("states.error.retry"),
            onClick: () => planQuery.refetch(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={t("detail.eyebrow")}
          title={item.title}
          description={t("detail.description")}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href={{ pathname: "/admin/package-plans" }}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
              >
                {t("detail.back")}
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                startIcon={<Pencil className="h-4 w-4" />}
              >
                {t("detail.actions.edit")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={item.isActive ? "outline" : "primary"}
                onClick={() =>
                  setPendingToggle({
                    code: item.code,
                    title: item.title,
                    nextIsActive: !item.isActive,
                  })
                }
                startIcon={item.isActive ? <ShieldOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              >
                {item.isActive ? t("detail.actions.disable") : t("detail.actions.enable")}
              </Button>
            </div>
          }
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={t("detail.summary.code")}
                value={item.code}
                hint={t("detail.summary.codeHint")}
                tone="primary"
              />
              <SurfaceStatCard
                label={t("detail.summary.sessionCount")}
                value={String(item.sessionCount)}
                hint={t("detail.summary.sessionCountHint")}
                tone="neutral"
              />
              <SurfaceStatCard
                label={t("detail.summary.discountPercent")}
                value={formatDiscount(item.discountPercent)}
                hint={t("detail.summary.discountPercentHint")}
                tone="success"
              />
              <SurfaceStatCard
                label={t("detail.summary.purchaseCount")}
                value={String(item.counts.purchaseCount)}
                hint={t("detail.summary.purchaseCountHint")}
                tone="warning"
              />
            </div>
          }
        />
      </SurfaceCard>

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("detail.sections.immutable")}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
                  {t("detail.sections.overview")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {t("detail.sections.overviewNote")}
                </p>
              </div>
              <PackagePlanBadge isActive={item.isActive} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.code")}
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.code}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.sessionCount")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.sessionCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.discountPercent")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {formatDiscount(item.discountPercent)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.status")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.isActive ? t("badges.active") : t("badges.inactive")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-border-light bg-surface/70 p-4 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.createdAt")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {formatDateTime(item.createdAt, locale)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-surface/70 p-4 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.updatedAt")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {formatDateTime(item.updatedAt, locale)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-surface/70 p-4 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.archivedAt")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {formatDateTime(item.archivedAt, locale)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border-light bg-surface/70 p-4 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("detail.fields.purchaseCount")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.counts.purchaseCount}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard as="section" variant="section" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.sections.description")}
            </p>
            <p className="text-sm leading-7 text-text-secondary">
              {item.description ?? t("detail.fields.notAvailable")}
            </p>
          </SurfaceCard>
        </div>

        <div className="space-y-5">
          <SurfaceCard as="section" variant="section" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.actions.heading")}
            </p>
            <p className="text-sm leading-6 text-text-secondary">
              {item.isActive ? t("detail.actions.activeNote") : t("detail.actions.inactiveNote")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                startIcon={<Pencil className="h-4 w-4" />}
              >
                {t("detail.actions.edit")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={item.isActive ? "outline" : "primary"}
                onClick={() =>
                  setPendingToggle({
                    code: item.code,
                    title: item.title,
                    nextIsActive: !item.isActive,
                  })
                }
                startIcon={item.isActive ? <ShieldOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              >
                {item.isActive ? t("detail.actions.disable") : t("detail.actions.enable")}
              </Button>
            </div>
          </SurfaceCard>

          <SurfaceCard as="section" variant="section" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.boundary.heading")}
            </p>
            <ul className="space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("detail.boundary.items.quotes")}</li>
              <li>{t("detail.boundary.items.purchases")}</li>
              <li>{t("detail.boundary.items.history")}</li>
            </ul>
          </SurfaceCard>
        </div>
      </div>

      <FormModal
      isOpen={isEditOpen}
      onClose={() => {
        setIsEditOpen(false);
        setDraft(null);
      }}
        size="lg"
        title={t("detail.modal.title")}
        description={t("detail.modal.description")}
        eyebrow={t("detail.modal.eyebrow")}
        loading={updateMutation.isPending}
        submitDisabled={!dirty || !canSave || updateMutation.isPending}
        submitLabel={updateMutation.isPending ? t("detail.modal.saving") : t("detail.modal.save")}
        cancelLabel={t("detail.modal.cancel")}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("detail.fields.title")}
              </span>
              <input
                value={draftValue?.title ?? ""}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, title: event.target.value } : current))
                }
                className="app-control w-full px-4 py-3"
                placeholder={t("detail.fields.titlePlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("detail.fields.sortOrder")}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={draftValue?.sortOrder ?? 0}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          sortOrder: Number(event.target.value || 0),
                        }
                      : item
                        ? {
                            title: item.title,
                            description: item.description,
                            sortOrder: Number(event.target.value || 0),
                            isActive: item.isActive,
                          }
                        : current,
                  )
                }
                className="app-control w-full px-4 py-3"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
              {t("detail.fields.description")}
            </span>
            <textarea
              rows={4}
              value={draftValue?.description ?? ""}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : item
                      ? {
                          title: item.title,
                          description: event.target.value,
                          sortOrder: item.sortOrder,
                          isActive: item.isActive,
                        }
                      : current,
                )
              }
              className="app-control w-full px-4 py-3"
              placeholder={t("detail.fields.descriptionPlaceholder")}
            />
          </label>

          <label className="flex items-center gap-3 rounded-[22px] border border-border-light bg-surface-secondary/60 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={draftValue?.isActive ?? false}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? { ...current, isActive: event.target.checked }
                    : item
                      ? {
                          title: item.title,
                          description: item.description,
                          sortOrder: item.sortOrder,
                          isActive: event.target.checked,
                        }
                      : current,
                )
              }
              className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-semibold text-text-primary dark:text-white/90">
                {t("detail.fields.isActive")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">
                {t("detail.fields.isActiveNote")}
              </span>
            </span>
          </label>
        </div>
      </FormModal>

      {pendingToggle ? (
        pendingToggle.nextIsActive ? (
          <ConfirmModal
            isOpen
            onClose={() => setPendingToggle(null)}
            title={t("detail.confirm.enable.title")}
            description={t("detail.confirm.enable.note")}
            confirmLabel={enableMutation.isPending ? t("detail.confirm.enable.submitting") : t("detail.confirm.enable.confirm")}
            cancelLabel={t("detail.confirm.cancel")}
            onConfirm={handleToggle}
            loading={enableMutation.isPending}
          >
            <div className="rounded-2xl border border-primary/15 bg-primary-light/40 px-4 py-4 text-sm text-text-secondary dark:bg-primary/10">
              <p className="font-semibold text-text-primary dark:text-white/95">{pendingToggle.title}</p>
              <p className="mt-2">{t("detail.confirm.enable.body")}</p>
            </div>
          </ConfirmModal>
        ) : (
          <DestructiveConfirmModal
            isOpen
            onClose={() => setPendingToggle(null)}
            title={t("detail.confirm.disable.title")}
            description={t("detail.confirm.disable.note")}
            confirmLabel={disableMutation.isPending ? t("detail.confirm.disable.submitting") : t("detail.confirm.disable.confirm")}
            cancelLabel={t("detail.confirm.cancel")}
            onConfirm={handleToggle}
            loading={disableMutation.isPending}
          >
            <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-100">
              <p className="font-semibold text-warning-900 dark:text-warning-100">{pendingToggle.title}</p>
              <p className="mt-2">{t("detail.confirm.disable.body")}</p>
            </div>
          </DestructiveConfirmModal>
        )
      ) : null}
    </div>
  );
}
