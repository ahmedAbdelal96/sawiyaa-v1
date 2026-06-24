import { getTranslations, getLocale } from "next-intl/server";
import { FileText, Sparkles } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = { profile: PractitionerProfile };

export default async function ProfileAbout({ profile: p }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile.sections"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const bio = isAr ? p.bioAr : p.bioEn;
  const approach = isAr ? p.approachAr : p.approachEn;

  return (
    <div className="app-panel rounded-[30px] p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("about")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {bio}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
          <FileText size={20} />
        </div>
      </div>

      {approach && (
        <div className="app-panel-soft mt-6 rounded-[24px] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("approach")}
            </h3>
          </div>
          <p className="text-sm leading-8 text-text-secondary md:text-base">
            {approach}
          </p>
        </div>
      )}
    </div>
  );
}
