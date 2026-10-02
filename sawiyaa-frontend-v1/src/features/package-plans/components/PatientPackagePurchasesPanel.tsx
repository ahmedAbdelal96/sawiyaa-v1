"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Clock,
  Package,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StateCard, ListStateSkeleton } from "@/components/shared/ContentStates";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { toAppError, isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchases } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import {
  canContinuePackagePurchasePayment,
  formatDate,
  formatDatetime,
  formatPackageDisplayTitle,
  getNextUpcomingPackageSession,
} from "../lib/package-purchase-display";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

function avatarText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean) return "DR";
  return clean.slice(0, 2).toUpperCase();
}

export default function PatientPackagePurchasesPanel() {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isArabic = locale === "ar";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const patientProfileQuery = usePatientProfile();
  const patientTimeZone = patientProfileQuery.data?.profile.timezone;

  const { data, isLoading, isError, error, refetch } = useMyPackagePurchases({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });

  const purchases = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const appError = isError ? toAppError(error) : null;
  const isAuthError = appError ? isUnauthorizedError(appError) : false;

  if (isError && isAuthError) {
    return (
      <StateCard
        title={t("errors.authHeading")}
        note={t("errors.authNote")}
        action={{
          label: t("errors.authAction"),
          href: (
            <Link
              href="/signin/patient"
              className="inline-flex items-center justify-center rounded-2xl bg-[#24564F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4A44]"
            >
              {t("errors.authAction")}
            </Link>
          ),
        }}
      />
    );
  }

  // Summary Metrics
  const totalCount = pagination?.totalItems ?? purchases.length;
  const pendingCount = purchases.filter((p) => p.status === "PENDING_PAYMENT").length;
  const activeCount = purchases.filter((p) => p.status === "ACTIVE").length;
  const completedCount = purchases.filter((p) => p.status === "COMPLETED").length;

  const hasActiveFilters = Boolean(search || statusFilter);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-4 text-start">
      {/* ── KPI Summary Cards: Compact & Balanced ── */}
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {/* Total Packages */}
        <div className="rounded-2xl border border-border-light/80 bg-white p-3 shadow-2xs dark:bg-surface-secondary dark:border-border-dark flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-text-muted">{t("list.summary.total")}</p>
            <p className="text-lg font-black font-mono text-text-primary dark:text-white">
              {totalCount}
            </p>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-light/50 text-primary dark:bg-primary/20">
            <Package size={15} />
          </span>
        </div>

        {/* Active In-Progress */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3 shadow-2xs dark:bg-emerald-950/20 dark:border-emerald-800/30 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">{t("list.summary.active")}</p>
            <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
              {activeCount}
            </p>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Sparkles size={15} />
          </span>
        </div>

        {/* Pending Confirmation */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3 shadow-2xs dark:bg-amber-950/20 dark:border-amber-800/30 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">{t("list.summary.pending")}</p>
            <p className="text-lg font-black font-mono text-amber-700 dark:text-amber-400">
              {pendingCount}
            </p>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock size={15} />
          </span>
        </div>

        {/* Completed Journeys */}
        <div className="rounded-2xl border border-border-light/80 bg-white p-3 shadow-2xs dark:bg-surface-secondary dark:border-border-dark flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-text-muted">{t("list.summary.completed")}</p>
            <p className="text-lg font-black font-mono text-text-primary dark:text-white">
              {completedCount}
            </p>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            <CheckCircle2 size={15} />
          </span>
        </div>
      </div>

      {/* ── Search & Filter Controls with Action Button ── */}
      <div className="rounded-2xl border border-border-light/80 bg-white p-2.5 sm:p-3 shadow-2xs dark:bg-surface-secondary dark:border-border-dark">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("list.filterSearch")}
              className="w-full rounded-xl border border-border-light bg-surface-tertiary/40 py-2 ps-9 pe-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border-light bg-surface-tertiary/40 py-2 px-3 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer sm:w-48"
            aria-label={t("list.filterAllStatuses")}
          >
            <option value="">{t("list.filterAllStatuses")}</option>
            <option value="ACTIVE">{t("list.status.ACTIVE")}</option>
            <option value="PENDING_PAYMENT">{t("list.status.PENDING_PAYMENT")}</option>
            <option value="COMPLETED">{t("list.status.COMPLETED")}</option>
            <option value="CANCELLED">{t("list.status.CANCELLED")}</option>
            <option value="EXPIRED">{t("list.status.EXPIRED")}</option>
            <option value="REFUNDED">{t("list.status.REFUNDED")}</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-light bg-white px-2.5 py-2 text-xs font-semibold text-text-secondary hover:border-primary hover:text-text-primary transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer shrink-0"
            >
              <RotateCcw size={12} />
              <span>{t("discovery.resetFilters")}</span>
            </button>
          )}

          <Link
            href="/packages"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#24564F] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1F4A44] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>{t("list.emptyAction")}</span>
          </Link>
        </div>
      </div>

      {/* ── Package Purchases List: Streamlined & Scalable ── */}
      {isLoading ? (
        <ListStateSkeleton items={3} heightClass="h-24" />
      ) : isError ? (
        <StateCard
          title={t("list.errorHeading")}
          note={t("list.errorNote")}
          action={{
            label: t("list.retry"),
            onClick: () => refetch(),
          }}
        />
      ) : purchases.length === 0 ? (
        <div className="rounded-3xl border border-border-light/80 bg-white p-8 sm:p-10 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark max-w-lg mx-auto space-y-3.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
            <Package size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {t("list.emptyHeading")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
              {t("list.emptyNote")}
            </p>
          </div>
          <Link
            href="/packages"
            className="inline-flex rounded-xl bg-[#24564F] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1F4A44] transition cursor-pointer"
          >
            {t("list.emptyAction")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => {
            const titleText = formatPackageDisplayTitle({
              title: purchase.title,
              sessionCount: purchase.sessionCount,
              t,
            });

            const completed = purchase.progress?.completedSessions ?? 0;
            const total = purchase.progress?.totalSessions ?? purchase.sessionCount;
            const remaining = purchase.progress?.availableSessions ?? 0;
            const percent = purchase.progress?.progressPercent ?? 0;

            const payableMoney = mapPackagePurchaseSnapshotMoney({
              amount: purchase.patientPayableTotal,
              selectedCurrencyCode: purchase.selectedCurrencyCode,
            });

            const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
            const canContinuePayment = canContinuePackagePurchasePayment(purchase);

            const isPending = purchase.status === "PENDING_PAYMENT";
            const isActive = purchase.status === "ACTIVE";
            const isCompleted = purchase.status === "COMPLETED";

            const statusClass = isActive
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40"
              : isPending
                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/40"
                : isCompleted
                  ? "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-800/40"
                  : "bg-surface-tertiary text-text-secondary border-border-light dark:bg-surface-tertiary dark:text-white/70";

            return (
              <article
                key={purchase.id}
                className="rounded-2xl border border-border-light/80 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-[#24564F]/30 hover:shadow-xs dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
                  {/* ── Section 1: Doctor & Package Identity ── */}
                  <div className="flex items-center gap-3 min-w-0 lg:w-[28%]">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border-light bg-[#FCFAF6] dark:bg-white/5">
                      <PractitionerAvatar
                        src={purchase.practitioner?.avatarUrl}
                        alt={purchase.practitioner?.displayName || "الأخصائي"}
                        initials={avatarText(purchase.practitioner?.displayName)}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/patient/package-purchases/${purchase.id}` as never}
                        className="truncate block text-xs sm:text-sm font-bold text-text-primary hover:text-primary transition-colors dark:text-white"
                        title={titleText}
                      >
                        {titleText}
                      </Link>
                      <p
                        dir="auto"
                        className="truncate text-[11px] font-medium text-text-secondary dark:text-text-muted mt-0.5"
                      >
                        {purchase.practitioner?.displayName || "الأخصائي"}
                        {purchase.practitioner?.professionalTitle && (
                          <span className="text-text-muted"> • {purchase.practitioner.professionalTitle.trim()}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* ── Section 2: Progress Bar & Next Session ── */}
                  <div className="min-w-0 lg:flex-1 bg-[#FCFAF6] border border-border-light/60 rounded-xl p-2.5 dark:bg-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-text-primary dark:text-white">
                        {t("detail.progressValue", { completed, total })}
                      </span>
                      <span className="font-mono text-[#24564F] dark:text-emerald-300">
                        {percent}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-light/80 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#24564F] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
                      <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                        {isArabic ? `متبقي ${remaining} جلسات` : `${remaining} left`}
                      </span>
                      {nextUpcomingSession?.scheduledStartAt ? (
                        <span className="text-primary font-semibold flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDatetime(nextUpcomingSession.scheduledStartAt, numLocale, patientTimeZone)}
                        </span>
                      ) : (
                        <span>{t("list.table.noUpcomingSession")}</span>
                      )}
                    </div>
                  </div>

                  {/* ── Section 3: Status, Price & Quick Actions ── */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-light/50">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusClass}`}
                      >
                        {t(`list.status.${purchase.status}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono text-[#24564F] dark:text-emerald-300">
                        {payableMoney ? <MoneyText money={payableMoney} /> : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/patient/package-purchases/${purchase.id}` as never}
                        className="inline-flex items-center justify-center rounded-lg border border-border-light bg-white px-2.5 py-1.5 text-[11px] font-bold text-text-secondary hover:border-[#24564F]/40 hover:text-[#24564F] transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
                        title={t("list.actions.viewDetails")}
                      >
                        <span>{t("list.actions.viewDetails")}</span>
                      </Link>

                      {canContinuePayment ? (
                        <div className="shrink-0">
                          <PackagePurchasePaymentAction
                            purchase={purchase}
                            label={t("list.actions.continuePayment")}
                          />
                        </div>
                      ) : isActive && purchase.practitioner?.publicSlug && remaining > 0 ? (
                        <Link
                          href={`/practitioners/${purchase.practitioner.publicSlug}`}
                          className="sawiyaa-btn-press inline-flex items-center justify-center gap-1 rounded-lg bg-[#24564F] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition hover:bg-[#1F4A44] active:scale-[0.98] cursor-pointer shrink-0"
                        >
                          <Calendar size={11} />
                          <span>{t("list.actions.bookSession")}</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-white px-4 py-2.5 text-xs font-semibold dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-text-secondary text-[11px]">
                {t("list.pageLabel", { page, totalPages })}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-border-light bg-white px-2.5 py-1 text-text-primary hover:border-primary transition disabled:opacity-40 dark:bg-surface-secondary cursor-pointer text-xs"
                >
                  {t("list.previous")}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg bg-[#24564F] px-2.5 py-1 text-white hover:bg-[#1F4A44] transition shadow-xs disabled:opacity-40 cursor-pointer text-xs"
                >
                  {t("list.next")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
