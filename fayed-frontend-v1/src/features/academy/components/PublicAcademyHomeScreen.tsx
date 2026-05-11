"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Clock3, GraduationCap, Search, Sparkles } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useAuthStore } from "@/stores/auth-store";
import { resolvePatientCurrencyCode } from "@/features/payments/lib/patient-currency";
import { usePublicAcademyCourses } from "../hooks/use-academy";

function formatCurrency(amount: string | null, currency: string | null, locale: string) {
  if (!amount || !currency) return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PublicAcademyHomeScreen({ locale }: { locale: string }) {
  const t = useTranslations("academy");
  const { user, isInitialized } = useAuthStore();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const authScopeKey = useMemo(() => {
    if (!isInitialized) {
      return "bootstrapping";
    }
    if (!user) {
      return "guest";
    }
    return `auth:${user.id}:${user.role}`;
  }, [isInitialized, user]);

  const query = useMemo(
    () => (submittedSearch.trim() ? { page: 1, limit: 12, q: submittedSearch.trim() } : { page: 1, limit: 12 }),
    [submittedSearch],
  );

  const { data, isLoading, isFetching, isError, refetch } = usePublicAcademyCourses(query, {
    cacheScopeKey: authScopeKey,
  });

  const items = data?.items ?? [];
  const stats = useMemo(
    () => ({
      totalCourses: data?.pagination.totalItems ?? 0,
      totalEnrollments: items.reduce((sum, item) => sum + (item.stats?.totalEnrollments ?? 0), 0),
      paidEnrollments: items.reduce((sum, item) => sum + (item.stats?.paidEnrollments ?? 0), 0),
    }),
    [data?.pagination.totalItems, items],
  );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-border-light bg-[linear-gradient(135deg,rgba(68,161,148,0.12),rgba(255,255,255,0.96))] p-6 shadow-[0_22px_50px_-36px_rgba(34,52,56,0.25)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {t("public.badge")}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
                {t("public.hero.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-text-secondary md:text-base">
                {t("public.hero.subtitle")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: t("public.stats.courses"), value: String(stats.totalCourses), icon: GraduationCap },
                { label: t("public.stats.enrollments"), value: String(stats.totalEnrollments), icon: BadgeCheck },
                { label: t("public.stats.completed"), value: String(stats.paidEnrollments), icon: Clock3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-border-light bg-white/90 p-4 shadow-[0_16px_30px_-24px_rgba(34,52,56,0.28)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-2xl font-bold text-text-primary">{item.value}</div>
                        <div className="text-xs font-medium text-text-muted">{item.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-border-light bg-white/90 p-5 shadow-[0_18px_36px_-28px_rgba(34,52,56,0.22)]">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedSearch(search);
              }}
            >
              <div className="flex items-center gap-3 text-text-primary">
                <Search className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-base font-semibold">{t("public.search.title")}</div>
                  <div className="text-xs text-text-muted">{t("public.search.subtitle")}</div>
                </div>
              </div>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("public.search.placeholder")}
              />
              <Button type="submit" className="w-full" disabled={isFetching}>
                {isFetching ? t("public.search.loading") : t("public.search.action")}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {isError ? (
        <StateCard
          title={t("errors.loadFailed")}
          note={t("errors.generic")}
          action={{
            label: t("errors.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-[28px]"
        />
      ) : null}

      {!isError ? (
        <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{t("public.list.title")}</h2>
            <p className="text-sm text-text-muted">{t("public.list.subtitle")}</p>
          </div>
          <div className="text-sm text-text-muted">
            {t("public.list.count", { count: data?.pagination.totalItems ?? 0 })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[28px] border border-border-light bg-white/80"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const displayCurrency =
                resolvePatientCurrencyCode({
                  currencyCode: item.currencyCode,
                  regionalPricingMode: item.regionalPricingMode,
                  resolvedCountryIsoCode: item.resolvedCountryIsoCode,
                }) ?? item.currencyCode;

              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-[28px] border border-border-light bg-white shadow-[0_16px_34px_-26px_rgba(34,52,56,0.28)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(34,52,56,0.32)]"
                >
                  <div className="h-40 bg-[radial-gradient(circle_at_top_right,rgba(68,161,148,0.24),transparent_35%),linear-gradient(135deg,rgba(235,246,244,0.9),rgba(255,255,255,0.96))] p-5">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                          {item.stats?.totalEnrollments ?? 0} {t("public.card.enrollments")}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-text-muted">
                          {item.publishedAt ? t("public.card.published") : t("public.card.draft")}
                        </span>
                      </div>
                      <div className="text-sm text-text-muted">
                        {formatCurrency(item.priceAmount, displayCurrency, locale) ?? t("public.card.free")}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-text-primary">{item.title}</h3>
                      <p className="line-clamp-3 text-sm leading-6 text-text-secondary">
                        {item.shortDescription ?? t("public.card.noDescription")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-text-muted">
                        {item.startsAt
                          ? new Date(item.startsAt).toLocaleDateString(locale)
                          : t("public.card.noDate")}
                      </div>
                      <Link
                        href={`/${locale}/academy/${item.slug}`}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                      >
                        {t("public.card.open")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border-light bg-white px-6 py-12 text-center text-text-muted">
            {submittedSearch ? t("public.empty.filtered") : t("public.empty.default")}
          </div>
        )}
        </section>
      ) : null}
    </div>
  );
}
