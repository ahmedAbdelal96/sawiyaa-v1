"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  Clock,
  Package,
  Sparkles,
  SquareArrowOutUpRight,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Video,
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import {
  ListStateSkeleton,
  StateCard,
} from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { MoneyText } from "@/components/money/MoneyText";
import { toAppError, isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchase } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatPackageDisplayTitle,
  getNextUpcomingPackageSession,
  getPackagePurchaseStatusConfig,
  isPackagePurchasePaymentExpired,
  sortPackagePurchaseSessions,
} from "../lib/package-purchase-display";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import type {
  PatientPackagePurchaseItem,
  PatientPackagePurchaseSessionSummary,
} from "../types/package-purchases.types";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import PackageSessionBookingModal from "./PackageSessionBookingModal";

function avatarText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean) return "DR";
  return clean.slice(0, 2).toUpperCase();
}

export default function PatientPackagePurchaseDetailPanel({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isArabic = locale === "ar";

  const patientProfileQuery = usePatientProfile();
  const patientTimeZone = patientProfileQuery.data?.profile.timezone;
  const { data, isLoading, isError, error, refetch } =
    useMyPackagePurchase(purchaseId);

  if (isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.95fr)]">
        <div className="space-y-6">
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={2} heightClass="h-28" />
          </SurfaceCard>
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={4} heightClass="h-16" />
          </SurfaceCard>
        </div>
        <aside className="space-y-6">
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={3} heightClass="h-20" />
          </SurfaceCard>
        </aside>
      </div>
    );
  }

  if (isError || !data) {
    const appError = isError ? toAppError(error) : null;
    const unauthorized = appError ? isUnauthorizedError(appError) : false;
    const notFound = appError?.statusCode === 404;

    return (
      <StateCard
        title={
          unauthorized
            ? t("errors.authHeading")
            : notFound
              ? t("errors.notFoundHeading")
              : t("detail.errorHeading")
        }
        note={
          unauthorized
            ? t("errors.authNote")
            : notFound
              ? t("errors.notFoundNote")
              : t("detail.errorNote")
        }
        action={{
          label: unauthorized ? t("errors.authAction") : t("detail.retry"),
          href: unauthorized ? (
            <Link
              href="/signin/patient"
              className="inline-flex items-center justify-center rounded-2xl bg-[#24564F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4A44]"
            >
              {t("errors.authAction")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center justify-center rounded-2xl bg-[#24564F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4A44]"
            >
              {t("detail.retry")}
            </button>
          ),
        }}
      />
    );
  }

  const purchase = data.item;
  const packageTitleText = formatPackageDisplayTitle({
    title: purchase.title,
    sessionCount: purchase.sessionCount,
    t,
  });

  const baseSessionMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.selectedBaseSessionPrice,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const undiscountedMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.undiscountedTotal,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const discountMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.discountAmount,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const payableMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.patientPayableTotal,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const unavailable = t("detail.fields.notAvailable");

  // Canonical Progress Values directly from Backend Presenter
  const totalCount = purchase.progress?.totalSessions ?? purchase.sessionCount;
  const completedCount = purchase.progress?.completedSessions ?? 0;
  const remainingCount = purchase.progress?.availableSessions ?? 0;
  const progressPercent = purchase.progress?.progressPercent ?? 0;

  const statusConfig = getPackagePurchaseStatusConfig(purchase.status);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);
  const isActive = purchase.status === "ACTIVE";

  // Sorted linked sessions
  const sortedSessions = sortPackagePurchaseSessions(
    purchase.linkedSessions.items,
  );

  return (
    <div className="grid gap-6 text-start lg:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.95fr)]">
      {/* ── Main Column ── */}
      <div className="space-y-6">
        {/* ── Card 1: Plan Progress & Action ── */}
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <div className="border-border-light/60 dark:border-border-dark flex flex-wrap items-start justify-between gap-3 border-b pb-3.5">
            <div>
              <span className="text-xs font-semibold tracking-wider text-[#24564F] uppercase dark:text-[#A7BFAE]">
                {t("detail.packageEyebrow")}
              </span>
              <h2 className="text-text-primary mt-1 text-lg font-bold sm:text-xl dark:text-white">
                {packageTitleText}
              </h2>
            </div>
            <Badge variant="solid" color={statusConfig.tone} size="sm">
              {t(statusConfig.labelKey as any)}
            </Badge>
          </div>

          {/* Progress Box */}
          <div className="border-border-light/70 space-y-2.5 rounded-2xl border bg-[#FCFAF6] p-4 dark:bg-white/5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-text-primary dark:text-white">
                {t("detail.progressHeading")}
              </span>
              <span className="font-mono font-bold text-[#24564F] dark:text-emerald-300">
                {t("detail.progressValue", {
                  completed: completedCount,
                  total: totalCount,
                })}{" "}
                ({progressPercent}%)
              </span>
            </div>

            <div className="bg-border-light/80 h-2 w-full overflow-hidden rounded-full dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#24564F] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-text-muted flex items-center justify-between pt-0.5 text-xs font-medium">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {isArabic
                  ? `متبقي لك ${remainingCount} جلسات للاستفادة منها`
                  : `${remainingCount} sessions remaining`}
              </span>
              <span>
                {t("list.summary.completed")}: {completedCount}
              </span>
            </div>
            </div>

            {isActive ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("detail.activeNotice")}</span>
              </div>
            ) : null}

          {/* Direct CTA */}
          {canContinuePayment ? (
            <div className="pt-1">
              <PackagePurchasePaymentAction
                purchase={purchase}
                label={t("detail.paymentBlock.continuePayment")}
              />
            </div>
          ) : isActive &&
            purchase.practitioner?.publicSlug &&
            remainingCount > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 pt-1 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-800/30 dark:bg-emerald-950/20">
              <p className="text-text-secondary text-xs leading-relaxed">
                {isArabic
                  ? "رصيدك جاهز ومتاح. اختر الوقت الأنسب لك لمتابعة جلستك القادمة."
                  : "Your sessions are ready. Book your next appointment now."}
              </p>
              <PackageSessionBookingModal purchase={purchase} />
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard as="section" variant="section" className="space-y-4">
          <div className="border-border-light/60 dark:border-border-dark border-b pb-3">
            <span className="text-xs font-bold tracking-wider text-[#24564F] uppercase dark:text-[#A7BFAE]">
              {t("detail.financialHeading")}
            </span>
          </div>
          {purchase.payment ? (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-text-muted">{t("detail.financialStatus")}</span><div className="font-semibold">{purchase.payment.status}</div></div>
              <div><span className="text-text-muted">{t("detail.summary.total")}</span><div className="font-semibold">{(() => { const money = mapPackagePurchaseSnapshotMoney({ amount: purchase.payment.amountTotal, selectedCurrencyCode: purchase.payment.currency }); return money ? <MoneyText money={money} /> : unavailable; })()}</div></div>
              <div><span className="text-text-muted">{t("detail.financialRefunds")}</span><div className="font-semibold">{purchase.payment.refunds.length}</div></div>
              {purchase.payment.refunds.map((refund) => (
                <div key={refund.id} className="rounded-xl border border-border-light/70 p-3 dark:border-border-dark">
                  <div className="font-semibold">{refund.status} · {refund.destination === "CUSTOMER_WALLET" ? t("detail.walletRefund") : refund.destination}</div>
                  {(() => { const money = mapPackagePurchaseSnapshotMoney({ amount: refund.amount, selectedCurrencyCode: refund.currency }); return money ? <MoneyText money={money} /> : unavailable; })()}
                  {refund.destination === "CUSTOMER_WALLET" ? <Link href="/patient/wallet" className="mt-1 inline-flex text-xs font-semibold text-[#24564F]">{t("detail.viewWallet")}</Link> : null}
                </div>
              ))}
            </div>
          ) : <p className="text-text-secondary text-sm">{unavailable}</p>}
          {purchase.entitlementHistory.length > 0 ? (
            <div className="border-border-light/70 space-y-2 rounded-2xl border p-3 dark:border-border-dark">
              <h4 className="font-semibold">{t("detail.entitlementHeading")}</h4>
              {purchase.entitlementHistory.map((decision) => (
                <div key={decision.id} className="flex flex-wrap justify-between gap-2 text-xs">
                  <span>{decision.sessionCode ?? decision.sessionId} · {decision.decisionType}</span>
                  <span className="text-text-muted">{formatDatetime(decision.decidedAt, numLocale, patientTimeZone)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </SurfaceCard>

        {/* ── Card 2: Linked Sessions Schedule ── */}
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <div className="border-border-light/60 dark:border-border-dark border-b pb-3">
            <span className="text-xs font-bold tracking-wider text-[#24564F] uppercase dark:text-[#A7BFAE]">
              {t("detail.sessionsEyebrow")}
            </span>
            <h3 className="text-text-primary mt-0.5 text-base font-bold sm:text-lg dark:text-white">
              {t("detail.sessionsHeading")}
            </h3>
            <p className="text-text-secondary mt-0.5 text-xs leading-relaxed">
              {t("detail.sessionsNote")}
            </p>
          </div>

          <div className="space-y-3">
            {/* Booked Sessions */}
            {sortedSessions.map((sess) => {
              const canOpen = [
                "UPCOMING",
                "READY_TO_JOIN",
                "IN_PROGRESS",
              ].includes(sess.status);
              const isSessionCompleted = sess.status === "COMPLETED";

              return (
                <div
                  key={sess.id}
                  className="border-border-light/80 dark:bg-surface-secondary dark:border-border-dark space-y-3 rounded-2xl border bg-white p-3.5 shadow-2xs transition-all hover:border-[#24564F]/30 sm:p-4"
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          isSessionCompleted
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-[#24564F]/10 text-[#24564F] dark:bg-[#24564F]/30 dark:text-[#A7BFAE]"
                        }`}
                      >
                        {sess.packageSessionIndex}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-text-primary text-xs font-bold sm:text-sm dark:text-white">
                            {t("detail.sessionIndex", {
                              current: sess.packageSessionIndex,
                              total: purchase.sessionCount,
                            })}
                          </h4>
                          <span className="text-text-muted text-[11px] font-medium">
                            • {sess.durationMinutes} {t("detail.minutes")}
                          </span>
                        </div>
                        <p className="text-text-secondary mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                          <Calendar
                            size={12}
                            className="text-text-muted shrink-0"
                          />
                          {sess.scheduledStartAt ? (
                            <span>
                              {formatDatetime(
                                sess.scheduledStartAt,
                                numLocale,
                                patientTimeZone,
                              )}
                            </span>
                          ) : (
                            <span className="text-text-muted">
                              {t("detail.sessionNotScheduled")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="border-border-light/50 flex shrink-0 items-center justify-between gap-2 border-t pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                      <SessionStatusBadge status={sess.status} />

                      <Link
                        href={`/patient/sessions/${sess.id}` as never}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          canOpen
                            ? "bg-[#24564F] text-white shadow-2xs hover:bg-[#1F4A44]"
                            : "border-border-light bg-surface-secondary text-text-primary border hover:border-[#24564F]/40 hover:text-[#24564F] dark:bg-white/5"
                        }`}
                      >
                        <span>
                          {canOpen
                            ? t("detail.openSession")
                            : t("detail.viewSession")}
                        </span>
                        <SquareArrowOutUpRight size={12} />
                      </Link>
                    </div>
                  </div>

                  {/* Session Metadata Row */}
                  <div className="text-text-muted border-border-light/50 dark:border-border-dark flex items-center justify-between border-t pt-2 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Video size={12} className="text-primary" />
                      <span>
                        {isArabic
                          ? "جلسة فيديو أونلاين"
                          : "Online Video Session"}
                      </span>
                    </span>
                    <SessionCodeReference
                      sessionId={sess.id}
                      sessionCode={sess.sessionCode}
                      href={`/patient/sessions/${sess.id}`}
                      copyable
                    />
                  </div>
                </div>
              );
            })}

            {/* Unbooked Session Slots */}
            {Array.from({ length: remainingCount }).map((_, idx) => {
              const slotIndex = sortedSessions.length + idx + 1;
              return (
                <div
                  key={`unbooked-slot-${slotIndex}`}
                  className="border-border-light dark:border-border-dark flex flex-col gap-3 rounded-2xl border border-dashed bg-[#FCFAF6]/70 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-border-light/60 text-text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold dark:bg-white/10">
                      {slotIndex}
                    </span>
                    <div>
                      <p className="text-text-primary text-xs font-bold sm:text-sm dark:text-white">
                        {t("detail.sessionIndex", {
                          current: slotIndex,
                          total: purchase.sessionCount,
                        })}
                      </p>
                      <p className="text-text-muted mt-0.5 text-[11px]">
                        {isArabic
                          ? "لم يتم تحديد موعد بعد • الرصيد متاح في باقتك"
                          : "Not scheduled yet • Credit available in your package"}
                      </p>
                    </div>
                  </div>

                  {isActive && purchase.practitioner?.publicSlug && (
                    <PackageSessionBookingModal purchase={purchase} />
                  )}
                </div>
              );
            })}
          </div>
        </SurfaceCard>
      </div>

      {/* Sidebar Column */}
      <aside className="space-y-6">
        {/* Practitioner Identity Card */}
        {purchase.practitioner && (
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
              {t("list.table.practitioner")}
            </span>
            <div className="flex items-center gap-3.5">
              <div className="border-border-light relative h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-[#FCFAF6] dark:bg-white/5">
                <PractitionerAvatar
                  src={purchase.practitioner.avatarUrl}
                  alt={purchase.practitioner.displayName || "Practitioner"}
                  initials={avatarText(purchase.practitioner.displayName)}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  dir="auto"
                  className="text-text-primary truncate text-base font-bold dark:text-white"
                >
                  {purchase.practitioner.displayName}
                </h3>
                {purchase.practitioner.professionalTitle && (
                  <p
                    dir="auto"
                    className="mt-0.5 truncate text-xs font-medium text-[#24564F] dark:text-[#A7BFAE]"
                  >
                    {purchase.practitioner.professionalTitle.trim()}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/practitioners/${purchase.practitioner.publicSlug}`}
              className="border-border-light bg-surface-secondary text-text-primary inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2.5 text-xs font-semibold transition hover:border-[#24564F]/40 hover:text-[#24564F] dark:bg-white/5"
            >
              {t("list.actions.viewPractitioner")}
            </Link>
          </SurfaceCard>
        )}

        {/* Financial Information Card (Persisted Snapshot Pricing) */}
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
            {t("detail.summary.total")}
          </span>

          <div className="space-y-2.5">
            <div className="border-border-light flex items-center justify-between border-b py-1 text-xs dark:border-white/5">
              <span className="text-text-muted">
                {t("detail.fields.baseSessionPrice")}
              </span>
              <span className="text-text-primary font-semibold dark:text-white">
                {baseSessionMoney ? (
                  <MoneyText money={baseSessionMoney} />
                ) : (
                  unavailable
                )}
              </span>
            </div>

            <div className="border-border-light flex items-center justify-between border-b py-1 text-xs dark:border-white/5">
              <span className="text-text-muted">
                {t("detail.fields.undiscountedTotal")}
              </span>
              <span className="text-text-primary font-semibold dark:text-white">
                {undiscountedMoney ? (
                  <MoneyText money={undiscountedMoney} />
                ) : (
                  unavailable
                )}
              </span>
            </div>

            <div className="border-border-light flex items-center justify-between border-b py-1 text-xs dark:border-white/5">
              <span className="text-text-muted">
                {t("detail.fields.discountAmount")}
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {discountMoney ? (
                  <MoneyText money={discountMoney} />
                ) : (
                  unavailable
                )}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 text-sm dark:border-emerald-800/30 dark:bg-emerald-950/20">
              <span className="font-bold text-[#24564F] dark:text-emerald-300">
                {t("detail.fields.patientPayableTotal")}
              </span>
              <span className="text-base font-extrabold text-[#24564F] dark:text-emerald-300">
                {payableMoney ? (
                  <MoneyText money={payableMoney} />
                ) : (
                  unavailable
                )}
              </span>
            </div>
          </div>
        </SurfaceCard>

        {/* Payment Action Block (Pending Payment) */}
        {purchase.status === "PENDING_PAYMENT" && (
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <span className="text-xs font-semibold tracking-wider text-[#24564F] uppercase">
              {t("detail.paymentBlock.eyebrow")}
            </span>
            <h3 className="text-text-primary text-base font-bold dark:text-white">
              {t("detail.paymentBlock.heading")}
            </h3>
            <p className="text-text-secondary text-xs leading-relaxed">
              {paymentExpired
                ? t("detail.paymentBlock.expiredNote")
                : purchase.paymentExpiresAt
                  ? t("detail.paymentBlock.expiresAt", {
                      date: formatDatetime(
                        purchase.paymentExpiresAt,
                        numLocale,
                        patientTimeZone,
                      ),
                    })
                  : t("detail.paymentBlock.noExpiry")}
            </p>
            {canContinuePayment ? (
              <PackagePurchasePaymentAction
                purchase={purchase}
                label={t("detail.paymentBlock.continuePayment")}
              />
            ) : (
              <Badge variant="light" color="light" size="sm">
                {t("detail.paymentBlock.expiredBadge")}
              </Badge>
            )}
          </SurfaceCard>
        )}
      </aside>
    </div>
  );
}
