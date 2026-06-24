import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function FinalCTASection() {
  const t = await getTranslations("home.finalCTA");

  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel overflow-hidden rounded-[36px] p-10 text-center lg:p-14">
          <h2 className="text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-text-secondary">
            {t("subtitle")}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/practitioners"
              className="app-lift inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-[0_18px_32px_-20px_rgba(95,143,139,0.5)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/specialties"
              className="app-panel inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-primary transition hover:bg-primary-light"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}