import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Briefcase, Compass, Search, Sparkles } from "lucide-react";

const PATH_STYLES = {
  notSure: { icon: Compass, bgClass: "bg-emerald-50", iconClass: "text-emerald-600", ringClass: "ring-emerald-200", cardClass: "border-emerald-200/40 bg-emerald-50/40" },
  knowSpecialty: { icon: Search, bgClass: "bg-sky-50", iconClass: "text-sky-600", ringClass: "ring-sky-200", cardClass: "" },
  chooseDirectly: { icon: Sparkles, bgClass: "bg-indigo-50", iconClass: "text-indigo-600", ringClass: "ring-indigo-200", cardClass: "" },
  practitionerJoin: { icon: Briefcase, bgClass: "bg-amber-50", iconClass: "text-amber-600", ringClass: "ring-amber-200", cardClass: "" },
} as const;

export default async function GuidedEntrySection() {
  const t = await getTranslations("home.startPaths");

  return (
    <section className="px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg leading-8 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {(Object.keys(PATH_STYLES) as Array<keyof typeof PATH_STYLES>).map((key) => {
            const pathKey = key as keyof typeof PATH_STYLES;
            const style = PATH_STYLES[pathKey];
            const isHighlight = pathKey === "notSure";
            const Icon = style.icon;

            return (
              <Link
                key={pathKey}
                href={
                  pathKey === "notSure" ? "/specialties" :
                  pathKey === "knowSpecialty" ? "/specialties" :
                  pathKey === "chooseDirectly" ? "/practitioners" :
                  "/signin?mode=practitioner"
                }
                className={`app-lift group rounded-[28px] border p-6 transition hover:-translate-y-1 ${
                  isHighlight
                    ? `${style.cardClass} shadow-[0_18px_38px_-30px_rgba(45,111,107,0.15)]`
                    : "app-panel border-border-light dark:border-white/8 hover:border-primary/20"
                }`}
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ${style.bgClass} ${style.ringClass} ${style.iconClass}`}
                >
                  <Icon size={22} />
                </div>

                <h3 className="text-lg font-bold text-text-primary dark:text-white/90">
                  {t(`${pathKey}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {t(`${pathKey}.desc`)}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {t(`${pathKey}.cta`)}
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}