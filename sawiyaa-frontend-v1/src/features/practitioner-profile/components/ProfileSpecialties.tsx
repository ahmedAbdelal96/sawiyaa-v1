import { getTranslations } from "next-intl/server";
import { Brain, Globe } from "lucide-react";
import type { PractitionerProfile } from "../types/profile";

type Props = {
  profile: PractitionerProfile;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
};

export default async function ProfileSpecialties({
  profile: p,
  specialtyLabels,
  languageLabels,
}: Props) {
  const t = await getTranslations("practitioner-profile.sections");

  return (
    <div className="space-y-6 app-panel rounded-[30px] p-6">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
            <Brain size={19} />
          </div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("specialties")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.specialties.map((specId) => (
            <span
              key={specId}
              className="app-chip rounded-full px-4 py-2 text-sm font-medium"
            >
              {specialtyLabels[specId] ?? specId}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border-light pt-6 dark:border-border-light">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
            <Globe size={19} />
          </div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white/90">
            {t("languages")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.languages.map((code) => (
            <span
              key={code}
              className="app-panel-soft rounded-full px-4 py-2 text-sm font-medium text-text-secondary dark:text-white/75"
            >
              {languageLabels[code] ?? code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
