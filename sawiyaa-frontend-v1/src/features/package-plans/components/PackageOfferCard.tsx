"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BadgeCheck, Clock, Sparkles, Tag } from "lucide-react";
import { MoneyText } from "@/components/money/MoneyText";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import type { PackageOfferItem } from "../types/package-offers.types";

function avatarText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean) return "DR";
  return clean.slice(0, 2).toUpperCase();
}

export function PackageOfferCard({ offer }: { offer: PackageOfferItem }) {
  const t = useTranslations("package-purchases.discovery.card");
  const locale = useLocale();
  const isArabic = locale === "ar";

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

  const profileHref = `/practitioners/${practitioner.publicSlug}`;
  const bookPackageHref = `/practitioners/${practitioner.publicSlug}?packageCode=${packagePlan.code}&duration=${selectedDuration}`;

  return (
    <article className="app-lift flex h-full flex-col justify-between rounded-[24px] border border-border-light/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#24564F]/30 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10 text-start">
      <div className="space-y-4">
        {/* ── Top Practitioner Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Avatar with verified badge */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#24564F]/20 p-0.5 bg-[#FCFAF6] dark:bg-white/5">
              <PractitionerAvatar
                src={practitioner.avatarUrl}
                alt={practitioner.displayName}
                initials={avatarText(practitioner.displayName)}
                className="h-full w-full rounded-full object-cover"
              />
              <span
                className={`absolute bottom-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#24564F] px-0.5 text-white ${
                  isArabic ? "start-0" : "end-0"
                }`}
                title="مختص معتمد"
              >
                <BadgeCheck size={10} />
              </span>
            </div>

            {/* Name + Title */}
            <div className="min-w-0 flex-1">
              <Link
                href={profileHref}
                dir="auto"
                className="block truncate text-base font-bold text-[#1C2F2B] hover:text-[#24564F] transition-colors dark:text-white"
              >
                {practitioner.displayName}
              </Link>
              <p
                dir="auto"
                className="truncate text-xs font-semibold text-[#24564F] mt-0.5 dark:text-[#A7BFAE]"
              >
                {practitioner.professionalTitle?.trim() || practitioner.specialties[0]?.name || (isArabic ? "أخصائي نفسي معتمد" : "Certified Specialist")}
              </p>
              {practitioner.specialties[0]?.name && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-full bg-[#EEF4EF] border border-[#24564F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#24564F] dark:bg-white/5 dark:text-[#A7BFAE]">
                    {practitioner.specialties[0].name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Discount Badge */}
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <Tag size={11} className="text-emerald-700 dark:text-emerald-400" />
            <span>{t("discountBadge", { percent: packagePlan.discountPercent })}</span>
          </span>
        </div>

        {/* ── Package Details Box ── */}
        <div className="rounded-2xl bg-[#FCFAF6] border border-border-light/70 p-3.5 dark:bg-white/5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24564F] dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{t("sessionsLabel", { sessions: packagePlan.sessionCount })}</span>
            </span>

            {/* Duration Switcher */}
            {offer.availableDurations.length > 1 ? (
              <div className="flex items-center rounded-xl bg-white border border-border-light/60 p-0.5 dark:bg-surface-secondary">
                {offer.availableDurations.map((dur) => (
                  <button
                    key={dur.durationMinutes}
                    type="button"
                    onClick={() => setSelectedDuration(dur.durationMinutes)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      selectedDuration === dur.durationMinutes
                        ? "bg-[#24564F] text-white shadow-2xs"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{dur.durationMinutes} {isArabic ? "د" : "m"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{selectedDuration} {isArabic ? "دقيقة" : "mins"}</span>
              </span>
            )}
          </div>

          {/* Pricing Row */}
          <div className="border-t border-border-light/60 pt-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t("payableTotal")}
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-[#24564F] dark:text-emerald-300">
                {payableMoney ? <MoneyText money={payableMoney} /> : "—"}
              </p>
            </div>

            <div className="text-end">
              {discountMoney && (
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {t("totalSavings", { amount: "" }).trim()} <MoneyText money={discountMoney} />
                </p>
              )}
              {undiscountedMoney && (
                <p className="text-[11px] text-text-muted line-through">
                  <MoneyText money={undiscountedMoney} />
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-4 flex items-center gap-2 pt-1">
        <Link
          href={profileHref}
          className="flex-1 inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-2.5 text-xs font-bold text-text-secondary hover:border-[#24564F]/40 hover:text-[#24564F] transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer text-center"
        >
          {t("viewPractitioner")}
        </Link>
        <Link
          href={bookPackageHref as never}
          className="sawiyaa-btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#24564F] px-3 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1F4A44] active:scale-[0.98] cursor-pointer text-center"
        >
          <span>{t("choosePackage")}</span>
          <ArrowRight size={13} className={isArabic ? "rotate-180" : ""} />
        </Link>
      </div>
    </article>
  );
}
