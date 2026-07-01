import { Link } from "@/i18n/navigation";
import { ArrowRight, Layers, Sparkles, Brain, Apple, Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SpecialtyCard from "./SpecialtyCard";
import type {
  Specialty,
  SpecialtyCategory,
} from "@/features/specialties/types/specialties.types";

type Props = {
  groups: Array<{
    category: SpecialtyCategory;
    specialties: Specialty[];
  }>;
  uncategorizedSpecialties: Specialty[];
};

// Define clean clinical-warmth brand-aligned colors for our main categories
type CategoryTheme = {
  slug: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  textColor: string;
};

function getCategoryTheme(slug: string): CategoryTheme {
  switch (slug) {
    case "mental-health":
      return {
        slug: "mental-health",
        icon: Brain,
        iconBg: "bg-white/10 backdrop-blur-sm border border-white/20",
        iconColor: "text-white",
        badgeBg: "bg-white/15",
        badgeBorder: "border-white/20",
        badgeText: "text-emerald-100",
        gradientFrom: "from-[#24564F]",
        gradientTo: "to-[#193F3A]",
        borderColor: "border-[#24564F]/30",
        textColor: "text-white",
      };
    case "nutrition":
      return {
        slug: "nutrition",
        icon: Apple,
        iconBg: "bg-white/10 backdrop-blur-sm border border-white/20",
        iconColor: "text-white",
        badgeBg: "bg-white/15",
        badgeBorder: "border-white/20",
        badgeText: "text-amber-100",
        gradientFrom: "from-[#B58E58]",
        gradientTo: "to-[#9F7A46]",
        borderColor: "border-[#B58E58]/30",
        textColor: "text-white",
      };
    case "sports-therapy":
      return {
        slug: "sports-therapy",
        icon: Activity,
        iconBg: "bg-white/10 backdrop-blur-sm border border-white/20",
        iconColor: "text-white",
        badgeBg: "bg-white/15",
        badgeBorder: "border-white/20",
        badgeText: "text-cyan-100",
        gradientFrom: "from-[#3F6E58]",
        gradientTo: "to-[#2E5442]",
        borderColor: "border-[#3F6E58]/30",
        textColor: "text-white",
      };
    default:
      return {
        slug: "default",
        icon: Layers,
        iconBg: "bg-white/10 backdrop-blur-sm border border-white/20",
        iconColor: "text-white",
        badgeBg: "bg-white/15",
        badgeBorder: "border-white/20",
        badgeText: "text-white/80",
        gradientFrom: "from-primary",
        gradientTo: "to-[#1F4A44]",
        borderColor: "border-border-light/80",
        textColor: "text-white",
      };
  }
}

export default async function SpecialtiesGrid({
  groups,
  uncategorizedSpecialties,
}: Props) {
  const t = await getTranslations("specialties-public.listing");

  if (groups.length === 0 && uncategorizedSpecialties.length === 0) {
    return (
      <div className="bg-white rounded-[30px] border border-[#E8DED0] px-6 py-16 text-center shadow-sawiyaa-card">
        <p className="text-xl font-semibold text-text-primary dark:text-white/90">
          {t("empty.title")}
        </p>
        <p className="mt-3 text-text-secondary">{t("empty.subtitle")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {groups.map((group) => {
        const theme = getCategoryTheme(group.category.slug);
        const CategoryIcon = theme.icon;

        return (
          <section
            key={group.category.id}
            id={`category-${group.category.slug}`}
            className="rounded-[32px] border border-[#E8DED0] bg-[#FCFAF6] p-8 shadow-sawiyaa-card dark:border-white/5 dark:bg-[#101919]"
          >
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <Link
                href={`/practitioners?specialtyCategorySlug=${group.category.slug}`}
                className={`group flex h-full flex-col rounded-[26px] bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} p-6 shadow-sawiyaa-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${theme.iconBg} ${theme.iconColor} shadow-[0_8px_20px_-8px_rgba(25,52,57,0.3)]`}>
                    <CategoryIcon size={22} />
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                    {group.specialties.length === 1
                      ? t("subSpecialtyCountSingle")
                      : t("subSpecialtyCount", { count: group.specialties.length })}
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {group.category.name}
                </h2>

                <p className="mt-3 flex-1 text-xs leading-6 text-white/80">
                  {group.category.description?.trim() || t("carePathFallback")}
                </p>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
                    <Sparkles size={12} className="text-white/90" />
                    <span>{group.specialties.length > 0 ? t("carePathHasSpecialties") : t("carePathNoSpecialties")}</span>
                  </span>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/15 px-3 py-1.5 rounded-xl border border-white/5 transition hover:bg-white/20">
                    <span>{t("viewCarePath")}</span>
                    <ArrowRight
                      size={12}
                      className="rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                    />
                  </div>
                </div>
              </Link>

              <div className="flex flex-col justify-between">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/80 dark:text-primary-light/80">
                    {t("groupEyebrow")}
                  </p>
                  <h3 className="mt-1.5 text-xl font-bold text-text-primary dark:text-white/90">
                    {t("groupTitle", { category: group.category.name })}
                  </h3>
                </div>

                {group.specialties.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {group.specialties.map((specialty) => (
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
                        categorySlug={group.category.slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-[#E8DED0]/60 bg-white p-6 text-sm text-text-secondary shadow-sawiyaa-small">
                    <p className="font-semibold text-text-primary dark:text-white/90">
                      {t("groupEmptyTitle")}
                    </p>
                    <p className="mt-2 leading-7">{t("groupEmptyNote")}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {uncategorizedSpecialties.length > 0 ? (
        <section
          id="category-uncategorized"
          className="rounded-[32px] border border-[#E8DED0] bg-[#FCFAF6] p-8 shadow-sawiyaa-card dark:border-white/5 dark:bg-[#101919]"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border-light pb-4 dark:border-border-light">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/80">
                {t("groupEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary dark:text-white/90">
                {t("uncategorized")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {t("groupSubtitle")}
              </p>
            </div>

            <div className="app-chip rounded-full px-4 py-2 text-sm font-medium">
              {uncategorizedSpecialties.length === 1
                ? t("subSpecialtyCountSingle")
                : t("subSpecialtyCount", { count: uncategorizedSpecialties.length })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {uncategorizedSpecialties.map((specialty) => (
              <SpecialtyCard
                key={specialty.id}
                specialty={specialty}
                viewLabel={t("viewSpecialty")}
                learnMoreLabel={t("learnMore")}
                categoryBadge={null}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
