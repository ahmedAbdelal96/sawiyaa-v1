import { getTranslations } from "next-intl/server";
import { BadgeCheck, Radio, ShieldCheck, Sparkles } from "lucide-react";
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
  const t = await getTranslations("practitioner-profile");
  const presenceLabel = resolvePresenceLabel(t, presence?.status ?? null);
  const approvedCredentials = profile.credentialsSummary.approvedCredentials;
  const totalCredentials = profile.credentialsSummary.totalCredentials;

  return (
    <div id="booking-panel" className="app-panel rounded-[34px] p-6 lg:p-7">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("booking.panelTitle")}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {t("booking.panelSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="app-panel-soft rounded-full px-3.5 py-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Radio size={15} className="shrink-0 text-text-muted" />
              <span>{presenceLabel}</span>
            </div>
          </div>

          <div className="app-panel-soft rounded-full px-3.5 py-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Sparkles size={15} className="shrink-0 text-text-muted" />
              <span>
                {presence?.isInstantBookingEnabled
                  ? t("presence.instantEnabled")
                  : t("presence.instantDisabled")}
              </span>
            </div>
          </div>

          <div className="app-panel-soft rounded-full px-3.5 py-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <BadgeCheck size={15} className="shrink-0 text-primary" />
              <span>{t("badges.verified")}</span>
            </div>
          </div>

          <div className="app-panel-soft rounded-full px-3.5 py-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ShieldCheck size={15} className="shrink-0 text-primary" />
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

        <div className="app-panel rounded-[30px] p-3 sm:p-4">
          <PublicAvailabilityViewer slug={profile.slug} />
        </div>

        <PackagePlansSection slug={profile.slug} profile={profile} />
      </div>
    </div>
  );
}
