import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function FinalCTASection() {
  const t = await getTranslations("home.finalCTA");

  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="bg-[#24564F] overflow-hidden rounded-[36px] p-10 text-center lg:p-14 shadow-sawiyaa-logo dark:bg-surface-secondary">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-emerald-50/90 dark:text-white/80">
            {t("subtitle")}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/practitioners"
              className="app-lift inline-flex items-center gap-2 rounded-2xl bg-[#FCFAF6] px-8 py-4 text-base font-semibold text-[#24564F] shadow-md transition hover:-translate-y-0.5 hover:bg-[#EEF4EF]"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/specialties"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/20"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}