import { getTranslations } from "next-intl/server";

export default async function ListingPageHero() {
  const t = await getTranslations("practitioners-listing.page");

  return (
    <div className="border-b border-border-light/60 bg-[#FCFAF6] dark:bg-[#101919] px-6 py-6 lg:px-12 dark:border-white/5">
      <div className="mx-auto max-w-7xl">
        <div className="text-start max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#24564F]">
            {t("breadcrumb")}
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C2F2B] dark:text-white/95">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-text-secondary dark:text-white/70">
            {t("subtitle")}
          </p>
        </div>
      </div>
    </div>
  );
}
