"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/avatar/Avatar";
import Badge from "@/components/ui/badge/Badge";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import type { PackageOfferItem } from "../types/package-offers.types";
import { Clock, Sparkles } from "lucide-react";

export function PackageOfferCard({ offer }: { offer: PackageOfferItem }) {
  const t = useTranslations("package-purchases.discovery.card");
  const [selectedDuration, setSelectedDuration] = useState<number>(
    offer.selectedDurationMinutes,
  );

  const activeDurationObj =
    offer.availableDurations.find(
      (d) => d.durationMinutes === selectedDuration,
    ) || offer.availableDurations[0];

  const activeQuote = activeDurationObj?.quote || offer.activeQuote;

  const payableMoney = mapPackagePurchaseSnapshotMoney({
    amount: activeQuote.patientPayableTotal,
    selectedCurrencyCode: activeQuote.currencyCode,
  });

  const undiscountedMoney = mapPackagePurchaseSnapshotMoney({
    amount: activeQuote.undiscountedTotal,
    selectedCurrencyCode: activeQuote.currencyCode,
  });

  const discountMoney = mapPackagePurchaseSnapshotMoney({
    amount: activeQuote.discountAmount,
    selectedCurrencyCode: activeQuote.currencyCode,
  });

  const practitioner = offer.practitioner;
  const packagePlan = offer.packagePlan;

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-border-light bg-white p-6 shadow-[0_10px_28px_-20px_rgba(15,23,38,0.14)] transition-all hover:-translate-y-0.5 hover:border-primary/30 dark:bg-surface dark:shadow-none">
      {/* Top Practitioner Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            src={practitioner.avatarUrl}
            name={practitioner.displayName}
            size="large"
            className="h-14 w-14 rounded-2xl border border-border-light"
          />
          <div className="min-w-0">
            <Link
              href={`/practitioners/${practitioner.publicSlug}`}
              className="block truncate text-base font-bold text-text-primary hover:text-primary transition-colors dark:text-white"
            >
              {practitioner.displayName}
            </Link>
            <p className="truncate text-xs font-medium text-text-secondary mt-0.5">
              {practitioner.professionalTitle ||
                practitioner.specialties[0]?.name ||
                ""}
            </p>
          </div>
        </div>

        <span className="shrink-0">
          <Badge variant="solid" color="primary" size="md">
            {t("discountBadge", { percent: packagePlan.discountPercent })}
          </Badge>
        </span>
      </div>

      {/* Package Header */}
      <div className="mt-5 rounded-2xl bg-surface-secondary/70 p-4 dark:bg-white/5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("sessionsLabel", { sessions: packagePlan.sessionCount })}
          </span>

          {/* Duration Switcher */}
          {offer.availableDurations.length > 1 ? (
            <div className="flex items-center rounded-xl bg-surface-tertiary p-1 dark:bg-white/10">
              {offer.availableDurations.map((dur) => (
                <button
                  key={dur.durationMinutes}
                  type="button"
                  onClick={() => setSelectedDuration(dur.durationMinutes)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    selectedDuration === dur.durationMinutes
                      ? "bg-white text-primary shadow-xs dark:bg-surface dark:text-white"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {dur.durationMinutes}m
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-text-secondary">
              {selectedDuration}m
            </span>
          )}
        </div>

        {packagePlan.description && (
          <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {packagePlan.description}
          </p>
        )}
      </div>

      {/* Pricing Summary */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-primary-light/30 px-4 py-3 dark:bg-primary/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {t("payableTotal")}
          </p>
          <p className="mt-1 text-xl font-extrabold text-primary">
            {payableMoney ? <MoneyText money={payableMoney} /> : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {discountMoney ? t("totalSavings", { amount: "" }).trim() : t("originalPrice", { amount: "" }).trim()}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            {discountMoney ? (
              <span className="text-sm font-bold text-success-700 dark:text-success-300">
                <MoneyText money={discountMoney} />
              </span>
            ) : null}
            {undiscountedMoney ? (
              <span className="text-xs text-text-muted line-through">
                <MoneyText money={undiscountedMoney} />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3 pt-2">
        <Link
          href={`/practitioners/${practitioner.publicSlug}`}
          className="flex-1 inline-flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
        >
          {t("viewPractitioner")}
        </Link>
        <Link
          href={`/practitioners/${practitioner.publicSlug}?packageCode=${packagePlan.code}`}
          className="flex-1 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-primary-hover active:scale-95"
        >
          {t("choosePackage")}
        </Link>
      </div>
    </article>
  );
}
