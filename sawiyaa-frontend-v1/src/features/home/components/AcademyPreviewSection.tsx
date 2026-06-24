import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";

type Props = {
  locale: string;
};

export default async function AcademyPreviewSection({ locale }: Props) {
  const t = await getTranslations("home.academy");

  return (
    <section className="px-6 pb-14 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel rounded-[26px] p-5 lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Text */}
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-200">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">
                  {t("eyebrow")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-text-primary dark:text-white/90">
                  {t("title")}
                </p>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="shrink-0">
              <Link
                href="/academy"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:bg-surface"
              >
                {t("cta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}