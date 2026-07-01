import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Radio, ShieldCheck, Sparkles } from "lucide-react";
import {
  formatPublicMoney,
  getPublicSessionPrices,
} from "@/features/practitioners-discovery/lib/public-pricing";
import type {
  PractitionerProfile,
  PublicPractitionerPresence,
} from "../types/profile";
import PackagePlansSection from "@/features/package-plans/components/PackagePlansSection";
import PublicAvailabilityViewer from "./PublicAvailabilityViewer";

type Props = {
  profile: PractitionerProfile;
  presence: PublicPractitionerPresence | null;
};

function resolvePresenceLabel(
  t: Awaited<ReturnType<typeof getTranslations>>,
  status: PublicPractitionerPresence["status"] | null,
) {
  if (!status) return t("presence.unavailable");

  switch (status) {
    case "ONLINE":
      return t("presence.online");
    case "AWAY":
      return t("presence.away");
    case "BUSY":
      return t("presence.busy");
    case "OFFLINE":
    default:
      return t("presence.offline");
  }
}

export default async function ProfileBookingPanel({
  profile,
  presence,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isArabic = locale === "ar";
  const sessionFeesLabel = isArabic ? "رسوم الجلسة" : t("pricing.sessionFees");
  const sessionFeesHint = isArabic
    ? "يظهر السعر قبل الحجز ويتبع البلد والعملة المحددين."
    : t("pricing.sessionFeesHint");
  const presenceLabel = resolvePresenceLabel(t, presence?.status ?? null);
  const approvedCredentials = profile.credentialsSummary.approvedCredentials;
  const totalCredentials = profile.credentialsSummary.totalCredentials;
  const sessionPrices = getPublicSessionPrices(profile);

  return (
    <div id="booking-panel" className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("booking.panelTitle")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            {t("booking.panelSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-3 py-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Radio size={14} className="shrink-0 text-text-muted" />
              <span>{presenceLabel}</span>
            </div>
          </div>

          <div className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-3 py-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Sparkles size={14} className="shrink-0 text-text-muted" />
              <span>
                {presence?.isInstantBookingEnabled
                  ? t("presence.instantEnabled")
                  : t("presence.instantDisabled")}
              </span>
            </div>
          </div>

          <div className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-3 py-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <BadgeCheck size={14} className="shrink-0 text-primary" />
              <span>{t("badges.verified")}</span>
            </div>
          </div>

          <div className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-3 py-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <ShieldCheck size={14} className="shrink-0 text-primary" />
              <span>
                {totalCredentials > 0
                  ? t("badges.credentials", {
                      approved: approvedCredentials,
                      total: totalCredentials,
                    })
                  : t("badges.secure")}
              </span>
            </div>
          </div>
        </div>

        {sessionPrices.length > 0 ? (
          <div className="rounded-[24px] border border-primary/10 bg-primary-light/35 p-4 dark:bg-primary/10">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
                {sessionFeesLabel}
              </h3>
              <p className="text-xs text-text-secondary">
                {sessionFeesHint}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sessionPrices.map((price) => (
                <div
                  key={price.duration}
                  className="rounded-2xl border border-border-light/60 bg-white px-4 py-3 dark:bg-surface-secondary"
                >
                  <p className="text-xs font-medium text-text-secondary">
                    {price.duration === 30
                      ? t("booking.duration30")
                      : t("booking.duration60")}
                  </p>
                  <p className="mt-1 text-lg font-bold text-text-primary dark:text-white/95">
                    {formatPublicMoney(locale, price.amount, profile.currencyCode)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <PublicAvailabilityViewer
            slug={profile.slug}
            currencyCode={profile.currencyCode ?? null}
            displaySessionPrice30={profile.displaySessionPrice30 ?? null}
            displaySessionPrice60={profile.displaySessionPrice60 ?? null}
          />
        </div>

        <PackagePlansSection slug={profile.slug} profile={profile} />
      </div>
    </div>
  );
}
