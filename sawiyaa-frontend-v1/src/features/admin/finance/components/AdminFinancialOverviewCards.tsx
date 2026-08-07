"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  RefreshCcw,
  Wallet,
  CheckCircle2,
  Clock3,
  BadgeCheck,
  Grid,
  AlertTriangle,
  Users,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useAdminFinancialOverview } from "../hooks/use-admin-finance-summary";
import type {
  AdminFinancialBucket,
  AdminFinancialOverviewFilters,
  AdminFinancialOverviewScope,
} from "../types/admin-finance-summary.types";
import { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { cn } from "@/lib/utils";

type Variant = "collections" | "reviews" | "wallets" | "payouts" | "all";

const variantCardCounts: Record<Variant, number> = {
  collections: 3,
  reviews: 4,
  wallets: 3,
  payouts: 3,
  all: 4,
};

function formatSecondaryValue(buckets: AdminFinancialBucket[] | undefined, locale: string) {
  if (!buckets || buckets.length === 0) return "—";
  return buckets
    .map((b) => {
      const numeric = Number(b.amount);
      const formattedAmount = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(numeric);
      if (locale === "ar") {
        const name = b.currency === "USD" ? "دولار" : "ج.م";
        return `${formattedAmount} ${name}`;
      } else {
        return b.currency === "USD" ? `$${formattedAmount}` : `EGP ${formattedAmount}`;
      }
    })
    .join(" / ");
}

export default function AdminFinancialOverviewCards({
  scope = "accounting",
  variant = "all",
  filters = {},
}: {
  scope?: AdminFinancialOverviewScope;
  variant?: Variant;
  filters?: AdminFinancialOverviewFilters;
}) {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const resolvedFilters = useMemo(() => {
    if (Object.keys(filters).length) return filters;
    const currency = searchParams.get("currency") || searchParams.get("currencyCode") || undefined;
    const fromDate = searchParams.get("createdFrom") || undefined;
    const rawToDate = searchParams.get("createdTo");
    const toDate = rawToDate ? `${rawToDate}T23:59:59.999Z` : undefined;
    const paymentStatus = searchParams.get("status") || undefined;
    const stage = searchParams.get("stage");
    const reviewStatus =
      stage === "PENDING_REVIEW" || stage === "DECISION_APPROVED" || stage === "APPROVED"
        ? stage
        : undefined;
    return { currency, fromDate, toDate, paymentStatus, reviewStatus };
  }, [filters, searchParams]);

  const query = useAdminFinancialOverview(scope, resolvedFilters);
  const metrics = query.data?.metrics;
  const cardCount = variantCardCounts[variant];

  // Grouped cards definition
  const cards = useMemo<Array<{
    label: string;
    tooltip?: string;
    currencyBuckets?: AdminFinancialBucket[];
    secondaryItems?: Array<{
      label: string;
      value: string | number;
      tone?: "default" | "positive" | "warning" | "negative";
    }>;
    icon: React.ReactNode;
    tone: "neutral" | "primary" | "success" | "warning" | "danger";
  }>>(() => {
    if (!metrics) return [];

    if (variant === "collections") {
      return [
        {
          label: t("overviewCards.metrics.grossCollections"),
          tooltip: t("overviewCards.notes.grossCollections"),
          currencyBuckets: metrics.grossPatientCollections,
          icon: <Wallet className="h-4 w-4" />,
          tone: "primary" as const,
        },
        {
          label: t("overviewCards.metrics.patientCredits"),
          tooltip: t("overviewCards.notes.patientCredits"),
          currencyBuckets: metrics.patientWalletCredits,
          icon: <Wallet className="h-4 w-4" />,
          tone: "neutral" as const,
        },
        {
          label: t("overviewCards.metrics.serviceValue"),
          tooltip: t("overviewCards.notes.serviceValue"),
          currencyBuckets: metrics.completedServiceEconomicValue,
          icon: <CheckCircle2 className="h-4 w-4" />,
          tone: "success" as const,
        },
      ];
    }

    if (variant === "reviews") {
      return [
        {
          label: t("overviewCards.metrics.awaitingReview"),
          tooltip: t("overviewCards.notes.awaitingReview"),
          currencyBuckets: metrics.awaitingAccountantReview,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.suggestedPractitioner"),
              value: formatSecondaryValue(
                metrics.awaitingAccountantReviewSuggestedPractitioner,
                locale,
              ),
            },
          ],
          icon: <Clock3 className="h-4 w-4" />,
          tone: "warning" as const,
        },
        {
          label: t("overviewCards.metrics.approvedAwaitingWallet"),
          tooltip: t("overviewCards.notes.approvedAwaitingWallet"),
          currencyBuckets: metrics.accountantApprovedAwaitingWalletCredit,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.approvedCredited"),
              value: formatSecondaryValue(metrics.accountantApprovedAlreadyWalletCredited, locale),
            },
          ],
          icon: <BadgeCheck className="h-4 w-4" />,
          tone: "success" as const,
        },
        {
          label: t("overviewCards.metrics.platformSuggested"),
          tooltip: t("overviewCards.notes.platformSuggested"),
          currencyBuckets: metrics.platformSuggestedShare,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.platformRemainder"),
              value: formatSecondaryValue(metrics.platformRemainderAfterDecision, locale),
            },
          ],
          icon: <Grid className="h-4 w-4" />,
          tone: "neutral" as const,
        },
        {
          label: t("overviewCards.metrics.additions"),
          tooltip: t("overviewCards.notes.additions"),
          currencyBuckets: metrics.accountingAdditions,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.deductions"),
              value: formatSecondaryValue(metrics.accountingDeductions, locale),
            },
            {
              label: t("overviewCards.metrics.rejected"),
              value: formatSecondaryValue(metrics.rejectedOrExcludedCandidates, locale),
              tone: "negative" as const,
            },
          ],
          icon: <AlertTriangle className="h-4 w-4" />,
          tone: "neutral" as const,
        },
      ];
    }

    if (variant === "wallets") {
      return [
        {
          label: t("overviewCards.metrics.balances"),
          tooltip: t("overviewCards.notes.balances"),
          currencyBuckets: metrics.currentPractitionerWalletBalances,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.outstandingLiability"),
              value: formatSecondaryValue(metrics.outstandingPractitionerWalletLiability, locale),
            },
          ],
          icon: <Users className="h-4 w-4" />,
          tone: "primary" as const,
        },
        {
          label: t("overviewCards.metrics.walletCredits"),
          tooltip: t("overviewCards.notes.walletCredits"),
          currencyBuckets: metrics.practitionerWalletCredits,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.completedPayouts"),
              value: formatSecondaryValue(metrics.completedExternalPayoutDebits, locale),
            },
          ],
          icon: <Wallet className="h-4 w-4" />,
          tone: "neutral" as const,
        },
        {
          label: t("overviewCards.metrics.availableForPayout"),
          tooltip: t("overviewCards.notes.availableForPayout"),
          currencyBuckets: metrics.availableForPayout,
          secondaryItems: [
            {
              label: t("overviewCards.metrics.pendingPayouts"),
              value: formatSecondaryValue(metrics.pendingExternalPractitionerPayouts, locale),
            },
          ],
          icon: <Wallet className="h-4 w-4" />,
          tone: "success" as const,
        },
      ];
    }

    if (variant === "payouts") {
      return [
        {
          label: t("overviewCards.metrics.completedPayouts"),
          tooltip: t("overviewCards.notes.completedPayouts"),
          currencyBuckets: metrics.completedExternalPayoutDebits,
          icon: <CheckCircle2 className="h-4 w-4" />,
          tone: "success" as const,
        },
        {
          label: t("overviewCards.metrics.pendingPayouts"),
          tooltip: t("overviewCards.notes.pendingPayouts"),
          currencyBuckets: metrics.pendingExternalPractitionerPayouts,
          icon: <Clock3 className="h-4 w-4" />,
          tone: "warning" as const,
        },
        {
          label: t("overviewCards.metrics.failedPayouts"),
          tooltip: t("overviewCards.notes.failedPayouts"),
          currencyBuckets: metrics.failedOrReversedExternalPayouts,
          icon: <XCircle className="h-4 w-4" />,
          tone: "danger" as const,
        },
      ];
    }

    // Default 'all' fallback
    return [
      {
        label: t("overviewCards.metrics.grossCollections"),
        tooltip: t("overviewCards.notes.grossCollections"),
        currencyBuckets: metrics.grossPatientCollections,
        icon: <Wallet className="h-4 w-4" />,
        tone: "primary" as const,
      },
      {
        label: t("overviewCards.metrics.serviceValue"),
        tooltip: t("overviewCards.notes.serviceValue"),
        currencyBuckets: metrics.completedServiceEconomicValue,
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "success" as const,
      },
      {
        label: t("overviewCards.metrics.awaitingReview"),
        tooltip: t("overviewCards.notes.awaitingReview"),
        currencyBuckets: metrics.awaitingAccountantReview,
        icon: <Clock3 className="h-4 w-4" />,
        tone: "warning" as const,
      },
      {
        label: t("overviewCards.metrics.platformSuggested"),
        tooltip: t("overviewCards.notes.platformSuggested"),
        currencyBuckets: metrics.platformSuggestedShare,
        icon: <Grid className="h-4 w-4" />,
        tone: "neutral" as const,
      },
    ];
  }, [variant, metrics, t, locale]);

  return (
    <div className="col-span-full space-y-4">
      {/* Borderless Header Zone */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-bold text-text-primary">{t("overviewCards.title")}</h3>
          <p className="text-xs text-text-muted mt-0.5">{t("overviewCards.description")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          startIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="h-8 py-1 px-3 text-xs"
        >
          {query.isFetching ? t("overviewCards.loading") : t("overviewCards.retry")}
        </Button>
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-status-danger-border bg-status-danger-soft/20 p-4 text-xs text-status-danger flex items-center justify-between gap-4">
          <span>{t("overviewCards.error")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            className="h-7 text-[11px] px-2.5"
          >
            {t("overviewCards.retry")}
          </Button>
        </div>
      ) : query.isLoading ? (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            cardCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              className="h-[96px] animate-pulse rounded-xl bg-surface-tertiary/70 border border-border-light/40"
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            cardCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {cards.map((card, idx) => (
            <AdminSummaryCard
              key={idx}
              label={card.label}
              tooltip={card.tooltip}
              currencyBuckets={card.currencyBuckets}
              secondaryItems={card.secondaryItems}
              icon={card.icon}
              tone={card.tone}
              value=""
            />
          ))}
        </div>
      )}
    </div>
  );
}
