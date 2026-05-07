import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublicAcademyCourses } from "@/features/academy/api/academy.api";

type Props = {
  locale: string;
};

function formatMoney(
  locale: string,
  amount: string | null,
  currencyCode: string | null,
) {
  if (!amount) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  const currency = currencyCode ?? "EGP";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString(locale === "ar" ? "ar-EG" : locale)} ${currency}`;
  }
}

function formatDate(locale: string, value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AcademyPreviewSection({ locale }: Props) {
  const t = await getTranslations("home.academy");

  let courses: Awaited<ReturnType<typeof getPublicAcademyCourses>>["items"] = [];

  try {
    const data = await getPublicAcademyCourses({ page: 1, limit: 3 });
    courses = data.items ?? [];
  } catch {
    courses = [];
  }

  const highlights = [
    {
      icon: Sparkles,
      title: t("highlights.publicTitle"),
      desc: t("highlights.publicDesc"),
    },
    {
      icon: Layers3,
      title: t("highlights.simpleTitle"),
      desc: t("highlights.simpleDesc"),
    },
    {
      icon: BadgeCheck,
      title: t("highlights.followUpTitle"),
      desc: t("highlights.followUpDesc"),
    },
  ];

  return (
    <section className="px-6 pb-24 pt-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start">
          <div className="app-panel rounded-[36px] p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/85">
              {t("eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-text-primary md:text-4xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
              {t("subtitle")}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-border-light bg-white/85 p-4 shadow-[0_16px_32px_-30px_rgba(25,52,57,0.18)] dark:bg-surface-secondary/85"
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <Icon size={18} />
                    </div>
                    <p className="text-sm font-semibold text-text-primary dark:text-white/92">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/academy"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("cta")}
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="mb-1">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                {t("examplesEyebrow")}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary dark:text-white/92">
                {t("examplesTitle")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {t("examplesNote")}
              </p>
            </div>

            {courses.length > 0 ? (
              courses.map((course) => {
                const price = formatMoney(locale, course.priceAmount, course.currencyCode);
                const startsAt = formatDate(locale, course.startsAt);

                return (
                  <article
                    key={course.id}
                    className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_36px_-30px_rgba(25,52,57,0.18)] dark:bg-surface-secondary/96"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                          {t("courseBadge")}
                        </p>
                        <h4 className="mt-2 text-xl font-bold text-text-primary dark:text-white/92">
                          {course.title}
                        </h4>
                      </div>
                      <span className="rounded-full border border-border-light bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                        {t("publicLabel")}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-text-secondary">
                      {course.shortDescription ?? t("courseNoDescription")}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-text-secondary">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border-light px-3 py-1.5">
                        <CircleDollarSign size={13} className="text-primary" />
                        {price ?? t("free")}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border-light px-3 py-1.5">
                        <CalendarDays size={13} className="text-primary" />
                        {startsAt ? `${t("courseStarts")} ${startsAt}` : t("courseNoDate")}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border-light px-3 py-1.5">
                        <GraduationCap size={13} className="text-primary" />
                        {course.stats
                          ? t("courseEnrollments", {
                              count: course.stats.totalEnrollments,
                            })
                          : t("courseEnrollmentsFallback")}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <Link
                        href={`/academy/${course.slug}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border-light px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary dark:text-white/90"
                      >
                        {t("courseOpen")}
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-[0_18px_36px_-30px_rgba(25,52,57,0.18)] dark:bg-surface-secondary/96">
                <h4 className="text-xl font-bold text-text-primary dark:text-white/92">
                  {t("emptyTitle")}
                </h4>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {t("emptyNote")}
                </p>
                <Link
                  href="/academy"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("courseOpen")}
                  <ArrowLeft size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
