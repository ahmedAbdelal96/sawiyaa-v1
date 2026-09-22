import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

export default async function FinalCTASection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.finalCTA"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[32px] bg-[#24564F] p-8 text-center sm:p-12 shadow-md dark:bg-surface-secondary">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -start-10 -top-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -end-10 -bottom-10 h-48 w-48 rounded-full bg-[#C8A979]/15 blur-2xl" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#E6D6B8] mb-4">
              <Sparkles size={13} />
              <span>{locale === "ar" ? "ابدأ خطوتك الأولى اليوم" : "Take your first step today"}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              {t("title")}
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-emerald-100/80">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-3.5">
              <Link
                href="/practitioners"
                className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm sm:text-base font-bold text-[#24564F] shadow-xs transition hover:bg-[#F7F4EE] hover:-translate-y-0.5"
              >
                <span>{t("ctaPrimary")}</span>
                <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
              </Link>

              <Link
                href="/specialties"
                className="sawiyaa-btn-press inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition hover:bg-white/20"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}