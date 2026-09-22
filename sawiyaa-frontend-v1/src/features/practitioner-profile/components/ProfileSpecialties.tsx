import { getTranslations } from "next-intl/server";
import { Brain, Globe } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = {
  profile: PractitionerProfile;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  compact?: boolean;
};

export default async function ProfileSpecialties({
  profile: p,
  specialtyLabels,
  languageLabels,
  compact = false,
}: Props) {
  const t = await getTranslations("practitioner-profile.sections");

  return (
    <div className={compact ? "space-y-3 pt-3 border-t border-border-light/50 dark:border-white/10" : "app-panel rounded-2xl p-5 space-y-4"}>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Brain size={15} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t("specialties")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.specialties.map((specId) => (
            <span
              key={specId}
              className="rounded-full bg-primary-light/70 dark:bg-primary/10 border border-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-text-brand"
            >
              {specialtyLabels[specId] ?? specId}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t("languages")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.languages.map((code) => (
            <span
              key={code}
              className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary"
            >
              {languageLabels[code] ?? code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
