import { getTranslations, getLocale } from "next-intl/server";
import { FileText, Sparkles } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = { profile: PractitionerProfile; compact?: boolean };

export default async function ProfileAbout({ profile: p, compact = false }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile.sections"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const bio = p.bio?.trim() || "";
  const approach = isAr ? p.approachAr : p.approachEn;

  if (!bio && !approach) return null;

  return (
    <div className={compact ? "space-y-2.5" : "app-panel rounded-2xl p-5"}>
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {t("about")}
        </h2>
      </div>

      <p className="text-xs leading-relaxed text-text-secondary">
        {bio}
      </p>

      {approach && (
        <div className="mt-2 rounded-xl bg-surface-secondary/70 p-3 text-xs leading-relaxed dark:bg-white/5 border border-border-light/40 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-text-brand">
            <Sparkles size={12} />
            <span>{t("approach")}</span>
          </div>
          <p className="text-text-secondary">{approach}</p>
        </div>
      )}
    </div>
  );
}
