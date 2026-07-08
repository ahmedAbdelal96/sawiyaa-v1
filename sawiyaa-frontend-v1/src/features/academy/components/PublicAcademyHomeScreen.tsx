"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { StateCard } from "@/components/shared/ContentStates";
import { useAuthStore } from "@/stores/auth-store";
import {
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramRegistrationStateLabel,
} from "@/features/academy-programs/lib/academy-program-localization";
import { usePublicAcademyPrograms } from "@/features/academy-programs/hooks/use-academy-programs";
import type { AcademyProgramItem } from "@/features/academy-programs/types/academy-programs.types";

function formatMoney(amount: string | null, currency: "EGP" | "USD", locale: string) {
  if (!amount) {
    return null;
  }

  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function resolveProgramTitle(program: AcademyProgramItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: program.titleAr,
      secondary: program.titleEn,
      fallback: program.title ?? program.slug,
    }) || program.slug
  );
}

function resolveProgramDescription(program: AcademyProgramItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: program.descriptionAr,
      secondary: program.descriptionEn,
      fallback: program.description ?? null,
    }) || null
  );
}

export default function PublicAcademyHomeScreen({
  locale,
  detailBaseHref,
}: {
  locale: string;
  detailBaseHref?: string;
}) {
  const t = useTranslations("academy");
  const { user, isInitialized } = useAuthStore();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const academyDetailBaseHref = detailBaseHref ?? `/${locale}/academy`;
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
    () =>
      submittedSearch.trim()
        ? { page: 1, limit: 12, q: submittedSearch.trim() }
        : { page: 1, limit: 12 },
    [submittedSearch],
  );

  const { data, isLoading, isFetching, isError, refetch } = usePublicAcademyPrograms(query, {
    cacheScopeKey: authScopeKey,
  });

  const items = data?.items ?? [];
  const totalPrograms = data?.pagination.totalItems ?? 0;
  const openRegistrations = items.filter((item) => item.registrationOpen).length;
  const featuredPrograms = items.filter((item) => Boolean(item.publishedAt)).length;

  return (
    <div className="app-max-content mx-auto space-y-8 px-4 py-6 sm:py-8">
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

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: t("public.stats.programs"), value: String(totalPrograms), icon: GraduationCap },
                { label: t("public.stats.open"), value: String(openRegistrations), icon: BadgeCheck },
                { label: t("public.stats.featured"), value: String(featuredPrograms), icon: Sparkles },
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
                        <div className="font-mono text-xl font-bold text-text-primary">
                          {item.value}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {item.label}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
              <p className="mt-0.5 text-xs text-text-muted">{t("public.list.subtitle")}</p>
            </div>
            <div className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-muted">
              {t("public.list.count", { count: totalPrograms })}
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
                const title = resolveProgramTitle(item, locale);
                const description = resolveProgramDescription(item, locale);
                const egpPrice = formatMoney(item.priceEgp, "EGP", locale);
                const usdPrice = formatMoney(item.priceUsd, "USD", locale);

                return (
                  <article
                    key={item.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-border-light bg-white transition hover:border-primary/25 hover:shadow-[0_8px_24px_rgba(36,86,79,0.06)]"
                  >
                    <div className="border-b border-border-light bg-surface-tertiary p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-primary/10 bg-white px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
                          {resolveAcademyProgramRegistrationStateLabel(item.registrationOpen, t)}
                        </span>
                        <span className="rounded-full border border-border-light/70 bg-white px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                          {item.publishedAt ? t("public.card.published") : t("public.card.draft")}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {egpPrice ? (
                          <div className="text-base font-bold text-primary">
                            {t("public.card.priceEgp", { value: egpPrice })}
                          </div>
                        ) : null}
                        {usdPrice ? (
                          <div className="text-sm font-semibold text-text-secondary">
                            {t("public.card.priceUsd", { value: usdPrice })}
                          </div>
                        ) : null}
                        {!egpPrice && !usdPrice ? (
                          <div className="text-base font-bold text-primary">{t("public.card.free")}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 p-5">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-text-primary transition group-hover:text-primary">
                          {title}
                        </h3>
                        <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
                          {description ?? t("public.card.noDescription")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2">
                          <div className="font-bold text-text-muted">{t("public.card.startsAt")}</div>
                          <div className="mt-1 font-semibold text-text-primary">
                            {formatDate(item.startAt, locale) ?? t("public.card.noDate")}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2">
                          <div className="font-bold text-text-muted">{t("public.card.endsAt")}</div>
                          <div className="mt-1 font-semibold text-text-primary">
                            {formatDate(item.endAt, locale) ?? t("public.card.noDate")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border-light/40 bg-white px-5 py-4">
                      <div className="text-xs text-text-muted">
                        {item.maxSeats
                          ? t("public.card.maxSeats", { count: item.maxSeats })
                          : t("public.card.noSeatsLimit")}
                      </div>
                      <Link
                        href={`${academyDetailBaseHref}/${item.slug}`}
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
