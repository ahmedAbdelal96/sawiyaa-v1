import { getTranslations } from "next-intl/server";
import { BadgeCheck, Radio, ShieldCheck, Sparkles } from "lucide-react";
import type {
  PractitionerProfile,
  PublicPractitionerPresence,
} from "../types/profile";
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
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/90">
              {t("booking.panelTitle")}
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {t("booking.panelSubtitle")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="app-panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Radio size={15} className="shrink-0 text-text-muted" />
                <span>{presenceLabel}</span>
              </div>
            </div>

            <div className="app-panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Sparkles size={15} className="shrink-0 text-text-muted" />
                <span>
                  {presence?.isInstantBookingEnabled
                    ? t("presence.instantEnabled")
                    : t("presence.instantDisabled")}
                </span>
              </div>
            </div>
          </div>

          <div className="app-panel-soft space-y-3 rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <BadgeCheck size={15} className="shrink-0 text-primary" />
              <span>{t("badges.verified")}</span>
            </div>
            {totalCredentials > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <ShieldCheck size={15} className="shrink-0 text-primary" />
                <span>
                  {t("badges.credentials", {
                    approved: approvedCredentials,
                    total: totalCredentials,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ShieldCheck size={15} className="shrink-0 text-primary" />
              <span>{t("badges.secure")}</span>
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[30px] p-4">
          <PublicAvailabilityViewer slug={profile.slug} />
        </div>
      </div>
    </div>
  );
}
