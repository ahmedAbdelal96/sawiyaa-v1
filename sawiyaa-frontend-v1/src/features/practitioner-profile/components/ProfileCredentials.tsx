import { getTranslations, getLocale } from "next-intl/server";
import { GraduationCap, ShieldCheck } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = { profile: PractitionerProfile; compact?: boolean };

export default async function ProfileCredentials({ profile, compact = false }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  if (profile.credentialsSummary.totalCredentials <= 0) return null;

  return (
    <div className={compact ? "pt-3 border-t border-border-light/50 dark:border-white/10" : "app-panel rounded-2xl p-5"}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap size={15} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t("sections.credentials")}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light/70 px-2 py-0.5 text-[10px] font-bold text-text-brand dark:bg-primary/15">
          <ShieldCheck size={11} className="text-primary" />
          {t("badges.credentials", {
            approved: profile.credentialsSummary.approvedCredentials,
            total: profile.credentialsSummary.totalCredentials,
          })}
        </span>
      </div>

      <div className="rounded-xl bg-surface-secondary/70 p-2.5 text-xs dark:bg-white/5 border border-border-light/40 space-y-1">
        <div className="flex justify-between">
          <span className="text-text-muted">{t("credential.approved")}</span>
          <span className="font-bold text-text-primary dark:text-white">
            {profile.credentialsSummary.approvedCredentials.toLocaleString(numLocale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{t("credential.total")}</span>
          <span className="font-bold text-text-primary dark:text-white">
            {profile.credentialsSummary.totalCredentials.toLocaleString(numLocale)}
          </span>
        </div>
      </div>
    </div>
  );
}
