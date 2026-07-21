"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, CircleDollarSign, Package, Sparkles } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
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

export default function PackagePlansSection({ slug, profile }: Props) {
  const t = useTranslations("practitioner-profile.packages");
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

  const availableDurations = [30, 60] as const;
  const hasAvailablePricing = true;

  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [purchasePlanCode, setPurchasePlanCode] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const normalizedDuration = useMemo<30 | 60>(() => {
    if (availableDurations.includes(selectedDuration)) {
      return selectedDuration;
    }
    return 60;
  }, [availableDurations, selectedDuration]);

  const selectedSessionMode = "VIDEO" as const;
  const packagePlansQuery = usePublicPractitionerPackagePlans(
    slug,
    {
      durationMinutes: normalizedDuration,
      sessionMode: selectedSessionMode,
    },
    {
      enabled: hasAvailablePricing,
      cacheScopeKey: authScopeKey,
    },
  );

  const packagesDisabled = profile.acceptsPackage === false;
  const plans = packagePlansQuery.data?.items ?? [];

  if (packagesDisabled) {
    return null;
  }

  return (
    <section className="rounded-[32px] border border-border-light bg-gradient-to-br from-white to-surface/70 p-5 shadow-sm dark:from-white/4 dark:to-transparent">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {t("eyebrow")}
              </p>
              <h3 className="text-xl font-bold text-text-primary dark:text-white/90">
                {t("title")}
              </h3>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="light" color="info" size="sm" startIcon={<Sparkles size={14} />}>
            {t("mode.video")}
          </Badge>
          <Badge variant="light" color="light" size="sm" startIcon={<CircleDollarSign size={14} />}>
            {t("controls.currency")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              {t("controls.duration")}
            </span>
            {([30, 60] as const).map((duration) => {
              const enabled = availableDurations.includes(duration);
              const active = duration === normalizedDuration;
              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => {
                    if (!enabled) return;
                    setSelectedDuration(duration);
                  }}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-primary dark:bg-white/5"
                  } ${enabled ? "" : "cursor-not-allowed opacity-45"}`}
                  disabled={!enabled}
                >
                  {formatDurationLabel(duration)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            {t("controls.currency")}
          </div>
        </div>

        <div className="rounded-[28px] border border-border-light bg-surface px-4 py-3.5 shadow-sm dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("controls.sessionMode")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                {t("mode.video")}
              </p>
            </div>
            <div className="rounded-2xl bg-primary-light px-3 py-2 text-right dark:bg-primary/15">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {t("availablePlans")}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {plans.length} {plans.length === 1 ? t("plan.single") : t("plan.multiple")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasAvailablePricing ? (
        <div className="mt-5 rounded-[28px] border border-dashed border-border-light bg-surface px-4 py-6 text-sm text-text-muted dark:bg-white/5">
          {t("empty")}
        </div>
      ) : packagePlansQuery.isLoading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[28px] border border-border-light bg-surface p-5 dark:bg-white/5">
              <Skeleton className="mb-4 h-6 w-2/3" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-5/6" />
              <Skeleton className="mb-4 h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-5 rounded-[28px] border border-dashed border-border-light bg-surface px-4 py-6 text-sm text-text-muted dark:bg-white/5">
          {t("empty")}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

            return (
              <article
                key={item.id}
                className="flex h-full flex-col rounded-[28px] border border-border-light bg-white p-5 shadow-[0_10px_24px_-20px_rgba(15,23,38,0.2)] transition hover:-translate-y-0.5 hover:border-primary/30 dark:bg-surface dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      {item.code}
                    </p>
                    <h4 className="text-lg font-semibold text-text-primary dark:text-white/90">
                      {item.title}
                    </h4>
                  </div>
                  <Badge variant="solid" color="primary" size="sm">
                    {discountPercent}
                  </Badge>
                </div>

                {item.description ? (
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{item.description}</p>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-light/35 px-4 py-3 dark:bg-primary/10">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("plan.sessionCount")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
                      {item.sessionCount} {item.sessionCount === 1 ? t("plan.session") : t("plan.sessions")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("selected")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                      {formatDurationLabel(quote.durationMinutes)}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 rounded-[24px] border border-border-light bg-surface px-4 py-4 text-sm dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-secondary">{t("quote.baseSessionPrice")}</dt>
                    <dd className="font-semibold text-text-primary dark:text-white/90">
                      <PriceDisplay price={baseSessionPrice} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-secondary">{t("quote.regularTotal")}</dt>
                    <dd className="font-semibold text-text-primary dark:text-white/90">
                      <PriceDisplay price={regularTotal} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-secondary">{t("quote.discountAmount")}</dt>
                    <dd className="font-semibold text-success-700 dark:text-success-300">
                      {t.rich("plan.save", {
                        amount: () => <PriceDisplay price={savings} />,
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border-light pt-3">
                    <dt className="text-text-secondary">{t("quote.payableTotal")}</dt>
                    <dd className="text-base font-bold text-primary"><PriceDisplay price={payable} /></dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span>
                    {t("controls.currency")}: {t(`currency.${quote.selectedCurrencyCode}`)}
                  </span>
                  <span>•</span>
                  <span>
                    {t("controls.sessionMode")}: {t("mode.video")}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("quote.discount")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                      {discountPercent}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("quote.currency")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                      {quote.selectedCurrencyCode}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {isPatient ? (
                    <Button
                      startIcon={<BadgePercent className="h-4 w-4" />}
                      onClick={() => {
                        setPurchasePlanCode(item.code);
                        setIsPurchaseModalOpen(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      {t("startPurchase")}
                    </Button>
                  ) : (
                    <Link
                  href="/signin?mode=patient"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5 dark:hover:bg-white/10 sm:w-auto"
                    >
                      <BadgePercent className="h-4 w-4" />
                      {t("signInToContinue")}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href="/patient/package-purchases"
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
        >
          {t("viewPurchases")}
        </Link>
      </div>

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
