import { getTranslations, getLocale } from "next-intl/server";
import type { PractitionerProfile } from "../types/profile";

type Props = { profile: PractitionerProfile };

export default async function ProfileStats({ profile: p }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile.stats"),
    getLocale(),
  ]);
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const stats = [
    { value: p.reviewCount.toLocaleString(numLocale), label: t("reviews") },
    { value: p.yearsExperience.toString(), label: t("experience") },
  ];

  return (
    <div className="border-b border-border-light bg-white dark:border-border-light dark:bg-surface">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 divide-x divide-border-light rtl:divide-x-reverse dark:divide-border-light">
          {stats.map((stat) => (
            <div key={stat.label} className="py-6 text-center">
              <p className="text-2xl font-bold text-primary md:text-3xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
