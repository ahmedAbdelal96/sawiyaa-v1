import { getTranslations, getLocale } from "next-intl/server";
import { GraduationCap, ShieldCheck } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = { profile: PractitionerProfile };

export default async function ProfileCredentials({ profile }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  if (profile.credentialsSummary.totalCredentials <= 0) return null;

  const stats = [
    {
      label: t("credential.total"),
      value: profile.credentialsSummary.totalCredentials.toLocaleString(numLocale),
    },
    {
      label: t("credential.approved"),
      value: profile.credentialsSummary.approvedCredentials.toLocaleString(numLocale),
    },
  ];

  return (
    <div className="app-panel rounded-[30px] p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("sections.credentials")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {t("badges.credentials", {
              approved: profile.credentialsSummary.approvedCredentials,
              total: profile.credentialsSummary.totalCredentials,
            })}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
          <GraduationCap size={20} />
        </div>
      </div>

      <div className="app-panel-soft rounded-[24px] p-5">
        <div className="space-y-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between gap-3 border-b border-border-light pb-4 last:border-b-0 last:pb-0 dark:border-border-light"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-primary" />
                <span className="text-sm text-text-secondary">{stat.label}</span>
              </div>
              <span className="text-base font-semibold text-text-primary dark:text-white/90">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
