"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  Clock,
  Package,
  Sparkles,
  Tag,
  Video,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/auth-store";
import { PriceDisplay } from "@/components/money/PriceDisplay";
import type { PractitionerProfile } from "@/features/practitioner-profile/types/profile";
import { usePublicPractitionerPackagePlans } from "../hooks/use-package-plans";
import { formatDurationLabel, formatPercent } from "../lib/package-plan-display";
import { mapPackagePublicPrice } from "../lib/package-money";
import PackagePurchaseFlowModal from "./PackagePurchaseFlowModal";

type Props = {
  slug: string;
  profile: PractitionerProfile;
};

const AVAILABLE_DURATIONS = [30, 60] as const;

export default function PackagePlansSection({ slug, profile }: Props) {
  const t = useTranslations("practitioner-profile.packages");
  const locale = useLocale();
  const { user, isInitialized } = useAuthStore();
  const isPatient = user?.role === "PATIENT";

  const authScopeKey = useMemo(() => {
    if (!isInitialized) {
      return "bootstrapping";
    }

    if (!user) {
      return "guest";
    }

    return `auth:${user.id}:${user.role}`;
  }, [isInitialized, user]);

  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [purchasePlanCode, setPurchasePlanCode] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const normalizedDuration = useMemo<30 | 60>(() => {
    if (AVAILABLE_DURATIONS.includes(selectedDuration)) {
      return selectedDuration;
    }
    return 60;
  }, [selectedDuration]);

  const selectedSessionMode = "VIDEO" as const;
  const packagePlansQuery = usePublicPractitionerPackagePlans(
    slug,
    {
      durationMinutes: normalizedDuration,
      sessionMode: selectedSessionMode,
    },
    { cacheScopeKey: authScopeKey },
  );

  const plans = packagePlansQuery.data?.items ?? [];

  if (!packagePlansQuery.isLoading && plans.length === 0) {
    return null;
  }

  return (
    <section className="app-panel rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header & Duration Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/50 pb-3 dark:border-white/10">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
              <Package className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-bold text-text-primary dark:text-white/95">
              {t("title")}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-text-secondary dark:bg-white/5 dark:text-text-muted">
              <Video className="h-2.5 w-2.5 text-primary" />
              {t("videoSessionsBadge")}
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        {/* Duration Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted font-medium">
            {t("controls.duration")}:
          </span>
          <div className="inline-flex items-center rounded-xl bg-surface-tertiary/70 p-0.5 border border-border-light/50 dark:bg-white/5 dark:border-white/10">
            {AVAILABLE_DURATIONS.map((duration) => {
              const active = duration === normalizedDuration;
              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setSelectedDuration(duration)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-white shadow-2xs"
                      : "text-text-secondary hover:text-text-primary dark:text-text-muted dark:hover:text-white"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>{formatDurationLabel(duration, locale)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {packagePlansQuery.isLoading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border-light bg-surface-tertiary/40 p-4 dark:bg-white/5"
            >
              <Skeleton className="mb-3 h-5 w-1/2" />
              <Skeleton className="mb-2 h-3 w-3/4" />
              <Skeleton className="mb-4 h-10 w-full rounded-lg" />
              <Skeleton className="mb-3 h-16 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-light bg-surface-tertiary/30 px-4 py-6 text-center text-xs text-text-muted dark:bg-white/5">
          {t("empty")}
        </div>
      ) : (
        /* Package Cards Grid */
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {plans.map(({ item, quote }) => {
            const baseSessionPrice = mapPackagePublicPrice({
              priceStatus: "PAID",
              priceAmount: quote.selectedBaseSessionPrice,
              currencyCode: quote.selectedCurrencyCode,
            });
            const regularTotal = mapPackagePublicPrice({
              priceStatus: "PAID",
              priceAmount: quote.undiscountedTotal,
              currencyCode: quote.selectedCurrencyCode,
            });
            const savings = mapPackagePublicPrice({
              priceStatus: "PAID",
              priceAmount: quote.discountAmount,
              currencyCode: quote.selectedCurrencyCode,
            });
            const payable = mapPackagePublicPrice({
              priceStatus: "PAID",
              priceAmount: quote.patientPayableTotal,
              currencyCode: quote.selectedCurrencyCode,
            });
            const discountPercent = formatPercent(quote.discountPercent);

            const perSessionDiscounted = (
              Number(quote.patientPayableTotal) / quote.sessionCount
            ).toFixed(0);

            const perSessionDiscountedPrice = mapPackagePublicPrice({
              priceStatus: "PAID",
              priceAmount: perSessionDiscounted,
              currencyCode: quote.selectedCurrencyCode,
            });

            const isBestValue =
              item.sessionCount >= 6 || Number(quote.discountPercent) >= 15;

            return (
              <article
                key={item.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-xs ${
                  isBestValue
                    ? "border-primary/40 bg-gradient-to-b from-primary/[0.03] to-white ring-1 ring-primary/20 dark:from-primary/10 dark:to-surface-secondary dark:border-primary/40"
                    : "border-border-light/80 bg-white hover:border-primary/30 dark:border-white/10 dark:bg-surface-secondary"
                }`}
              >
                {/* Popular / Best Value Ribbon */}
                {isBestValue && (
                  <div className="absolute -top-2.5 start-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      <Sparkles className="h-2.5 w-2.5" />
                      {t("popularBadge")}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-text-primary dark:text-white">
                        {locale === "ar"
                          ? t("plan.titleTemplate", { count: item.sessionCount })
                          : item.title}
                      </h4>
                      <p className="text-[11px] text-text-muted leading-tight">
                        {t("plan.descriptionTemplate", {
                          count: item.sessionCount,
                          duration: formatDurationLabel(quote.durationMinutes, locale),
                          discount: discountPercent,
                        })}
                      </p>
                    </div>

                    {/* Discount Badge */}
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300">
                      <Tag className="h-2.5 w-2.5" />
                      <span>{discountPercent}</span>
                    </span>
                  </div>

                  {/* Main Price Block */}
                  <div className="rounded-xl border border-border-light/60 bg-surface-secondary/50 p-3 dark:bg-white/5 dark:border-border-dark">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-medium text-text-muted block">
                          {t("packageTotal")}
                        </span>
                        <div className="text-lg font-bold text-primary dark:text-primary-light">
                          <PriceDisplay price={payable} />
                        </div>
                      </div>

                      {/* Strikethrough Regular Price & Savings */}
                      <div className="text-end space-y-0.5">
                        <p className="text-[11px] text-text-muted line-through">
                          <PriceDisplay price={regularTotal} />
                        </p>
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {t("plan.saveLabel")} <PriceDisplay price={savings} />
                        </p>
                      </div>
                    </div>

                    {/* Effective Price Per Session */}
                    <div className="mt-2 flex items-center justify-between border-t border-border-light/50 pt-2 text-[11px] dark:border-white/10">
                      <span className="text-text-secondary">
                        {t("perSession")}:
                      </span>
                      <div className="flex items-center gap-1 font-bold text-text-primary dark:text-white">
                        <PriceDisplay price={perSessionDiscountedPrice} />
                        <span className="text-[10px] font-normal text-text-muted">
                          ({t("insteadOf")} <PriceDisplay price={baseSessionPrice} />)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <ul className="space-y-1.5 text-[11px] text-text-secondary dark:text-white/80">
                    <li className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        {t("features.video", {
                          duration: formatDurationLabel(quote.durationMinutes, locale),
                        })}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{t("features.schedule")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{t("features.flexible")}</span>
                    </li>
                  </ul>
                </div>

                {/* Primary CTA Button */}
                <div className="mt-4 pt-1">
                  {isPatient ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPurchasePlanCode(item.code);
                        setIsPurchaseModalOpen(true);
                      }}
                      className="sawiyaa-btn-press flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-2xs transition active:scale-[0.98]"
                    >
                      <span>{t("startPurchase")}</span>
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </button>
                  ) : (
                    <Link
                      href="/signin/patient"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white py-2.5 px-3 text-xs font-bold text-text-primary transition hover:border-primary hover:text-primary active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <span>{t("signInToContinue")}</span>
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Bottom Footer Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border-light/50 pt-3 text-xs text-text-muted dark:border-white/10">
        <span>{t("subtitle")}</span>
        <Link
          href="/patient/package-purchases"
          className="inline-flex items-center gap-1 font-bold text-primary transition hover:underline dark:text-primary-light"
        >
          <span>{t("viewPurchases")}</span>
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
      </div>

      {/* Purchase Flow Modal */}
      {isPurchaseModalOpen ? (
        <PackagePurchaseFlowModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          slug={slug}
          profile={profile}
          plans={plans}
          initialPlanCode={purchasePlanCode}
        />
      ) : null}
    </section>
  );
}
