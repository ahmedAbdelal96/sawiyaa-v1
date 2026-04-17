import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Compass, HeartHandshake, Search, Sparkles } from "lucide-react";

const ENTRY_CONFIG = [
  {
    key: "matching",
    href: "/signup/patient",
    icon: Compass,
    emphasis: "primary",
    requiresAccount: true,
  },
  {
    key: "assessment",
    href: "/signup/patient",
    icon: Sparkles,
    emphasis: "soft",
    requiresAccount: true,
  },
  {
    key: "practitioners",
    href: "/practitioners",
    icon: Search,
    emphasis: "soft",
    requiresAccount: false,
  },
  {
    key: "support",
    href: "/signin/patient",
    icon: HeartHandshake,
    emphasis: "soft",
    requiresAccount: true,
  },
] as const;

export default async function GuidedEntrySection() {
  const t = await getTranslations("home.guidedEntry");

  return (
    <section className="px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel rounded-[36px] p-6">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-text-secondary">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {ENTRY_CONFIG.map((item) => {
              const Icon = item.icon;
              const isPrimary = item.emphasis === "primary";

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`app-lift rounded-[28px] border p-5 transition hover:-translate-y-1 ${
                    isPrimary
                      ? "border-primary/15 bg-primary-light shadow-[0_18px_38px_-30px_rgba(45,111,107,0.28)] dark:border-primary/20 dark:bg-primary/10"
                      : "app-panel border-border-light dark:border-white/8"
                  }`}
                >
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isPrimary
                        ? "bg-primary text-white"
                        : "bg-surface-tertiary text-primary ring-1 ring-inset ring-primary/8 dark:bg-white/10"
                    }`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-text-primary dark:text-white/90">
                      {t(`${item.key}.title`)}
                    </h3>
                    {item.requiresAccount ? (
                      <span className="app-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
                        {t("accountRequired")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    {t(`${item.key}.desc`)}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    {t(`${item.key}.cta`)}
                    <ArrowRight size={14} className="rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
