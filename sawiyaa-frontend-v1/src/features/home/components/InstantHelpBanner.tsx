import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Zap, ArrowRight } from "lucide-react";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

export default async function InstantHelpBanner() {
  const [t, locale] = await Promise.all([
    getTranslations("home.instantHelp"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  let onlinePractitioners: Array<{
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    avatarUrl: string | null;
    initials: string;
  }> = [];

  try {
    const data = await fetchPublicPractitioners(locale, {
      onlineNow: true,
      limit: 3,
    });
    onlinePractitioners = data.items.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      avatarUrl: p.avatarUrl,
      initials: p.initials,
    }));
  } catch {
    // Graceful fallback if backend listing is temporarily unavailable
  }

  // If no online practitioners are active from the backend, don't show a fake live indicator
  if (onlinePractitioners.length === 0) {
    return null;
  }

  return (
    <section className="px-6 py-3 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-4 sm:p-5 shadow-xs dark:bg-amber-950/20 dark:border-amber-500/20">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Zap size={20} className="animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm sm:text-base font-bold text-[#1C2F2B] dark:text-white/95">
                  {t("title")}
                </h2>
              </div>
              <p className="text-xs text-text-secondary dark:text-white/70 mt-0.5">
                {t("subtext")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Avatars of online practitioners */}
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {onlinePractitioners.map((p) => (
                <div
                  key={p.id}
                  className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-surface-secondary shadow-xs dark:border-surface-secondary"
                  title={isAr ? p.nameAr : p.nameEn}
                >
                  <PractitionerAvatar
                    src={p.avatarUrl}
                    alt={isAr ? p.nameAr : p.nameEn}
                    initials={p.initials}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            <Link
              href="/practitioners?onlineNow=true"
              className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-amber-700 whitespace-nowrap"
            >
              <span>{t("cta")}</span>
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
