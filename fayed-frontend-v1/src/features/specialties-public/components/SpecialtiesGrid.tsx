/**
 * Grouped specialty listing for the public specialties page.
 * Keeps the page honest to real backend data by grouping only on real categories.
 */
import { getTranslations } from "next-intl/server";
import SpecialtyCard from "./SpecialtyCard";
import type { Specialty } from "@/features/specialties/types/specialties.types";

type Props = {
  specialties: Specialty[];
};

type SpecialtyGroup = {
  key: string;
  label: string;
  items: Specialty[];
};

function buildGroups(
  specialties: Specialty[],
  uncategorizedLabel: string,
): SpecialtyGroup[] {
  const map = new Map<string, SpecialtyGroup>();

  for (const specialty of specialties) {
    const key = specialty.category?.slug ?? "uncategorized";
    const label = specialty.category?.name ?? uncategorizedLabel;

    if (!map.has(key)) {
      map.set(key, { key, label, items: [] });
    }

    map.get(key)!.items.push(specialty);
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export default async function SpecialtiesGrid({ specialties }: Props) {
  const t = await getTranslations("specialties-public.listing");

  if (specialties.length === 0) {
    return (
      <div className="app-panel rounded-[30px] px-6 py-16 text-center">
        <p className="text-xl font-semibold text-text-primary dark:text-white/90">
          {t("empty.title")}
        </p>
        <p className="mt-3 text-text-secondary">{t("empty.subtitle")}</p>
      </div>
    );
  }

  const groups = buildGroups(specialties, t("uncategorized"));

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section
          key={group.key}
          id={`category-${group.key}`}
          className="app-panel rounded-[32px] p-6"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border-light pb-4 dark:border-border-light">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/80">
                {t("quickNavTitle")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary dark:text-white/90">
                {t("groupTitle", { category: group.label })}
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {t("groupSubtitle")}
              </p>
            </div>

            <div className="app-chip rounded-full px-4 py-2 text-sm font-medium">
              {group.items.length === 1
                ? t("resultCountSingle")
                : t("resultCount", { count: group.items.length })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((specialty) => (
              <SpecialtyCard
                key={specialty.id}
                specialty={specialty}
                viewLabel={t("viewSpecialty")}
                learnMoreLabel={t("learnMore")}
                categoryBadge={
                  specialty.category?.name
                    ? t("categoryBadge", { category: specialty.category.name })
                    : null
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
