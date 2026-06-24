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
    <div className="app-max-content mx-auto space-y-8 px-4 py-6 sm:py-8">
      {/* Clinically warm, flat hero section compliant with Sawiyaa design system */}
      <section className="overflow-hidden rounded-[24px] border border-border-light bg-surface-tertiary p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("public.badge")}
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {t("public.hero.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                {t("public.hero.subtitle")}
              </p>
            </div>

            {/* Flat stats grid */}
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
                    className="rounded-[16px] border border-border-light bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xl font-bold text-text-primary font-mono">{item.value}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{item.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clean, flat search form container */}
          <div className="rounded-[20px] border border-border-light bg-white p-5">
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
                  <div className="text-sm font-bold">{t("public.search.title")}</div>
                  <div className="text-xs text-text-muted">{t("public.search.subtitle")}</div>
                </div>
              </div>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("public.search.placeholder")}
                className="w-full"
              />
              <Button type="submit" className="w-full rounded-[14px]" disabled={isFetching}>
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
          className="rounded-[20px]"
        />
      ) : null}

      {!isError ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border-light pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{t("public.list.title")}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t("public.list.subtitle")}</p>
            </div>
            <div className="text-xs font-semibold text-text-muted bg-surface-tertiary px-3 py-1 rounded-full border border-border-light">
              {t("public.list.count", { count: data?.pagination.totalItems ?? 0 })}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[20px] border border-border-light bg-surface-tertiary"
                />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-border-light bg-white transition hover:border-primary/25 hover:shadow-[0_8px_24px_rgba(36,86,79,0.06)]"
                  >
                    {/* Header: Clean layout without busy colors */}
                    <div className="border-b border-border-light bg-surface-tertiary p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary border border-primary/10 shadow-sm">
                          {item.stats?.totalEnrollments ?? 0} {t("public.card.enrollments")}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-text-muted border border-border-light/70">
                          {item.publishedAt ? t("public.card.published") : t("public.card.draft")}
                        </span>
                      </div>
                      <div className="mt-4 text-base font-bold text-primary font-mono">
                        {formatCurrency(item.priceAmount, displayCurrency, locale) ?? t("public.card.free")}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 space-y-4 p-5">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-text-primary transition group-hover:text-primary">
                          {item.title}
                        </h3>
                        <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
                          {item.shortDescription ?? t("public.card.noDescription")}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 border-t border-border-light/40 px-5 py-4 bg-white">
                      <div className="text-xs text-text-muted">
                        {item.startsAt
                          ? new Date(item.startsAt).toLocaleDateString(locale)
                          : t("public.card.noDate")}
                      </div>
                      <Link
                        href={`/${locale}/academy/${item.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-[12px] bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                      >
                        {t("public.card.open")}
                        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-border-light bg-white px-6 py-12 text-center text-text-muted">
              {submittedSearch ? t("public.empty.filtered") : t("public.empty.default")}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
