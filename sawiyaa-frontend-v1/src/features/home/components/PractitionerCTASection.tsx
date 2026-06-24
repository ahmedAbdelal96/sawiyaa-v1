import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  UserCircle,
  CalendarDays,
  ChartLine,
  Headset,
} from "lucide-react";

const BENEFITS = ["benefit1", "benefit2", "benefit3", "benefit4"] as const;

const FEATURE_ITEMS = [
  { icon: UserCircle, bgClass: "bg-teal-50", iconClass: "text-teal-600", ringClass: "ring-teal-200", labelKey: "profile" },
  { icon: CalendarDays, bgClass: "bg-sky-50", iconClass: "text-sky-600", ringClass: "ring-sky-200", labelKey: "schedule" },
  { icon: ChartLine, bgClass: "bg-indigo-50", iconClass: "text-indigo-600", ringClass: "ring-indigo-200", labelKey: "sessions" },
  { icon: Headset, bgClass: "bg-amber-50", iconClass: "text-amber-600", ringClass: "ring-amber-200", labelKey: "support" },
] as const;

export default async function PractitionerCTASection() {
  const t = await getTranslations("home.practitionerCTA");

  return (
    <section className="px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel overflow-hidden rounded-[32px] p-8 lg:grid lg:grid-cols-2 lg:gap-12 lg:p-12">
          {/* Left: Text */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-text-secondary">
              {t("subtitle")}
            </p>

            <ul className="mt-6 space-y-2.5">
              {BENEFITS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {t(`benefits.${key}`)}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signin?mode=practitioner"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:text-primary"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* Right: Feature icons grid */}
          <div className="mt-6 lg:mt-0">
            <div className="rounded-[24px] bg-surface-tertiary p-5 dark:bg-white/5">
              <div className="grid grid-cols-2 gap-4">
                {FEATURE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.labelKey}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-4 text-center dark:bg-white/5"
                    >
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.bgClass} ${item.ringClass} ring-1`}>
                        <Icon size={22} className={item.iconClass} />
                      </div>
                      <p className="text-xs font-medium text-text-secondary">
                        {t(`features.${item.labelKey}`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}