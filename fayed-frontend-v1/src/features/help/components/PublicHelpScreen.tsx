"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeInfo,
  BookOpen,
  ChevronDown,
  CircleCheckBig,
  Clock3,
  HelpCircle,
  Search,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import Badge from "@/components/ui/badge/Badge";
import InputField from "@/components/form/input/InputField";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { usePublicHelp } from "../hooks/use-help";
import {
  getLocalizedHelpCategoryDescription,
  getLocalizedHelpCategoryTitle,
  getLocalizedHelpQuestionBody,
  getLocalizedHelpQuestionTitle,
  normalizeHelpSearchText,
  sortByHelpOrder,
} from "../lib/help";
import type { HelpCategory, HelpQuestion } from "../types/help.types";

type Props = {
  categorySlug?: string;
};

type SummaryTone = "brand" | "success" | "warning" | "neutral";

type SummaryCardItem = {
  label: string;
  result: string;
  icon: ReactNode;
  tone: SummaryTone;
};

function formatHelpMonthLabel(value: string | null, locale: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-text-muted">
        <Search className="h-4 w-4" />
      </span>
      <InputField
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 ps-11"
      />
    </label>
  );
}

function SummaryGrid({
  items,
}: {
  items: SummaryCardItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const accentClass =
            item.tone === "brand"
              ? "border-primary/20 bg-primary-light/30 text-text-brand dark:border-primary/25 dark:bg-primary/15 dark:text-primary-light"
              : item.tone === "success"
                ? "border-success-200 bg-success-50/85 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-300"
                : item.tone === "warning"
                  ? "border-warning-200 bg-warning-50/85 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300"
                  : "border-border-light bg-white text-text-primary dark:border-border-light dark:bg-surface-secondary/95 dark:text-text-primary";

          return (
            <div
              key={item.label}
              className={`rounded-[20px] border px-4 py-4 shadow-[0_16px_34px_-30px_rgba(34,52,56,0.16)] ${accentClass}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-current shadow-sm dark:bg-white/10">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6 text-current">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-current/78 dark:text-current/82">{item.result}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuestionAccordionItem({
  question,
  locale,
}: {
  question: HelpQuestion;
  locale: string;
}) {
  const t = useTranslations("help");
  const title = getLocalizedHelpQuestionTitle(question, locale);
  const body = getLocalizedHelpQuestionBody(question, locale);

  return (
    <details className="group overflow-hidden rounded-[22px] border border-border-light bg-white shadow-[0_14px_28px_-24px_rgba(34,52,56,0.12)] transition open:shadow-[0_20px_36px_-28px_rgba(34,52,56,0.14)] dark:border-border-light dark:bg-surface-secondary/95">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:hidden sm:px-5">
        <div className="min-w-0 space-y-1 text-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {t("faq.showAnswer")}
          </p>
          <h3 className="text-base font-semibold leading-7 text-text-primary">{title}</h3>
          <p className="text-xs font-medium text-text-muted">
            <span className="group-open:hidden">{t("faq.showAnswer")}</span>
            <span className="hidden group-open:inline">{t("faq.hideAnswer")}</span>
          </p>
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-light bg-surface-secondary text-text-secondary transition group-open:rotate-180 group-open:border-primary/25 group-open:bg-primary group-open:text-white">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className="border-t border-border-light bg-surface/55 px-4 pb-4 pt-4 sm:px-5">
        <p className="text-sm leading-7 text-text-primary">{body}</p>
      </div>
    </details>
  );
}

function HelpSectionCard({
  section,
  locale,
  defaultOpen = false,
}: {
  section: { category: HelpCategory | null; questions: HelpQuestion[] };
  locale: string;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("help");
  const title = section.category
    ? getLocalizedHelpCategoryTitle(section.category, locale)
    : t("questions.uncategorized");
  const description = section.category
    ? getLocalizedHelpCategoryDescription(section.category, locale)
    : "";

  return (
    <details
      className="group overflow-hidden rounded-[24px] border border-border-light bg-white shadow-[0_16px_34px_-30px_rgba(34,52,56,0.18)] dark:border-border-light dark:bg-surface-secondary/95 dark:shadow-[0_16px_34px_-30px_rgba(0,0,0,0.42)]"
      open={defaultOpen}
    >
      <summary className="flex list-none cursor-pointer items-center justify-between gap-4 border-b border-primary/10 bg-primary-light/70 px-5 py-4 text-text-primary outline-none transition hover:bg-primary-light/90 dark:border-primary/15 dark:bg-primary/12 dark:text-text-primary dark:hover:bg-primary/18">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-6 sm:text-base">{title}</p>
          {description ? (
            <p className="mt-1 text-xs font-medium text-text-secondary">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="light" color="info" size="sm">
            {t("public.questionCount", { count: section.questions.length })}
          </Badge>
          <ChevronDown className="h-5 w-5 shrink-0 transition duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {section.questions.map((question) => (
          <QuestionAccordionItem key={question.id} question={question} locale={locale} />
        ))}
      </div>
    </details>
  );
}

function PolicyNotice({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[22px] border border-primary/10 bg-primary-light/35 px-5 py-4 dark:border-primary/20 dark:bg-primary/10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-text-brand shadow-sm dark:bg-surface-secondary dark:text-primary-light">
          <BadgeInfo className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{body}</p>
        </div>
      </div>
    </section>
  );
}

function HelpSupportCard({
  eyebrow,
  title,
  body,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <SurfaceCard
      as="section"
      variant="section"
      className="border-primary/10 bg-primary-light/35 dark:border-primary/20 dark:bg-primary/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary">{body}</p>
        </div>

        <Link
          href="/patient/support"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.34)] transition hover:bg-primary-hover dark:shadow-[0_12px_24px_-16px_rgba(68,161,148,0.22)]"
        >
          {cta}
        </Link>
      </div>
    </SurfaceCard>
  );
}

function HelpScreenSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-56 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
      <div className="h-72 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
      <div className="h-44 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
    </div>
  );
}

export default function PublicHelpScreen({ categorySlug }: Props) {
  const t = useTranslations("help");
  const locale = useLocale();
  const router = useRouter();
  const helpQuery = usePublicHelp("");
  const [searchValue, setSearchValue] = useState("");
  const appError = helpQuery.error ? toAppError(helpQuery.error) : null;

  const categories = useMemo(
    () => sortByHelpOrder((helpQuery.data?.categories ?? []).filter((category) => category.isActive)),
    [helpQuery.data?.categories],
  );
  const questions = useMemo(
    () => sortByHelpOrder((helpQuery.data?.questions ?? []).filter((question) => question.isActive)),
    [helpQuery.data?.questions],
  );

  const selectedCategory = useMemo(
    () => (categorySlug ? categories.find((category) => category.slug === categorySlug) ?? null : null),
    [categories, categorySlug],
  );

  const normalizedSearch = useMemo(() => normalizeHelpSearchText(searchValue), [searchValue]);

  const visibleQuestions = useMemo(() => {
    const scopedQuestions = selectedCategory
      ? questions.filter((question) => question.categoryId === selectedCategory.id)
      : questions;

    if (!normalizedSearch) return scopedQuestions;

    return scopedQuestions.filter((question) => {
      const title = getLocalizedHelpQuestionTitle(question, locale);
      const body = getLocalizedHelpQuestionBody(question, locale);
      const haystack = normalizeHelpSearchText(`${title} ${body}`);
      return haystack.includes(normalizedSearch);
    });
  }, [locale, normalizedSearch, questions, selectedCategory]);

  const visibleSections = useMemo(() => {
    const grouped = new Map<string, { category: HelpCategory | null; questions: HelpQuestion[] }>();

    for (const question of visibleQuestions) {
      const key = question.categoryId ?? "uncategorized";
      const category = question.categoryId
        ? categories.find((item) => item.id === question.categoryId) ?? null
        : null;
      const current = grouped.get(key);
      if (current) {
        current.questions.push(question);
      } else {
        grouped.set(key, { category, questions: [question] });
      }
    }

    const ordered: Array<{ category: HelpCategory | null; questions: HelpQuestion[] }> = [];

    if (selectedCategory) {
      const match = grouped.get(selectedCategory.id);
      if (match) ordered.push(match);
    } else {
      for (const category of categories) {
        const match = grouped.get(category.id);
        if (match) ordered.push(match);
      }

      const uncategorized = grouped.get("uncategorized");
      if (uncategorized) ordered.push(uncategorized);
    }

    return ordered;
  }, [categories, selectedCategory, visibleQuestions]);

  const totalQuestions = questions.length;
  const updatedAtLabel = formatHelpMonthLabel(
    [...categories, ...questions].reduce<string | null>((latest, item) => {
      const updatedAt = item.updatedAt;
      if (!updatedAt) return latest;
      if (!latest) return updatedAt;
      return new Date(updatedAt).getTime() > new Date(latest).getTime() ? updatedAt : latest;
    }, null),
    locale,
  );

  const summaryItems = useMemo<SummaryCardItem[]>(() => {
    const sourceSections =
      selectedCategory && visibleSections.length > 0
        ? visibleSections
        : visibleSections.slice(0, 5);

    return sourceSections.slice(0, 5).map((section, index) => {
      const category = section.category;
      const label = category ? getLocalizedHelpCategoryTitle(category, locale) : t("questions.uncategorized");
      const description = category
        ? getLocalizedHelpCategoryDescription(category, locale)
        : t("public.categoriesNote");
      const countLabel = t("public.questionCount", { count: section.questions.length });
      const tone: SummaryTone =
        index === 0 ? "brand" : index === 1 ? "success" : index === 2 ? "neutral" : index === 3 ? "warning" : "neutral";
      const icon =
        index === 0 ? (
          <CircleCheckBig className="h-5 w-5" />
        ) : index === 1 ? (
          <Clock3 className="h-5 w-5" />
        ) : index === 2 ? (
          <BadgeInfo className="h-5 w-5" />
        ) : index === 3 ? (
          <TimerReset className="h-5 w-5" />
        ) : (
          <HelpCircle className="h-5 w-5" />
        );

      return {
        label,
        result: `${countLabel}${description ? ` · ${description}` : ""}`,
        icon,
        tone,
      };
    });
  }, [locale, selectedCategory, t, visibleSections]);

  if (helpQuery.isLoading && !helpQuery.data) {
    return <HelpScreenSkeleton />;
  }

  if (helpQuery.isError && !helpQuery.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<BookOpen className="h-8 w-8 text-text-muted" />}
          title={t("states.error.heading")}
          note={appError?.message ?? t("states.error.note")}
          action={{
            label: t("states.error.retry"),
            onClick: () => {
              void helpQuery.refetch();
            },
          }}
        />
      </div>
    );
  }

  if (categorySlug && !selectedCategory) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<BookOpen className="h-8 w-8 text-text-muted" />}
          title={t("states.notFound.heading")}
          note={t("states.notFound.note")}
          action={{
            label: t("actions.backToOverview"),
            onClick: () => {
              router.push("/help" as never);
            },
          }}
        />
      </div>
    );
  }

  if (!helpQuery.data || !categories.length || !questions.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<BookOpen className="h-8 w-8 text-text-muted" />}
          title={t("states.empty.heading")}
          note={t("states.empty.note")}
        />
      </div>
    );
  }

  if (selectedCategory && visibleSections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<BookOpen className="h-8 w-8 text-text-muted" />}
          title={normalizedSearch ? t("faq.empty") : t("states.empty.heading")}
          note={normalizedSearch ? t("states.noResults.note") : t("states.empty.note")}
          action={
            normalizedSearch
              ? {
                  label: t("actions.clearSearch"),
                  onClick: () => {
                    setSearchValue("");
                  },
                }
              : undefined
          }
        />
      </div>
    );
  }

  const showingSearchNoResults = normalizedSearch.length > 0 && visibleSections.length === 0;
  const heroTitle = selectedCategory ? getLocalizedHelpCategoryTitle(selectedCategory, locale) : t("public.title");
  const heroDescription = selectedCategory
    ? getLocalizedHelpCategoryDescription(selectedCategory, locale) || t("public.description")
    : t("public.description");

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-text-primary dark:text-text-primary">
      <SurfaceCard
        as="section"
        variant="page"
        className="space-y-5 dark:border-border-light dark:bg-surface-secondary/95 dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)]"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="solid" color="success" size="sm">
                {t("badges.active")}
              </Badge>
              <Badge variant="light" color="info" size="sm">
                {t("public.questionCount", { count: totalQuestions })}
              </Badge>
              <Badge variant="light" color="light" size="sm">
                {t("public.updatedAt", { date: updatedAtLabel })}
              </Badge>
            </div>

            <div className="space-y-3 text-start">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("public.eyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary dark:text-text-primary sm:text-4xl">
                {heroTitle}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
                {heroDescription}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:max-w-xl md:justify-end">
            <SearchField
              value={searchValue}
              onChange={setSearchValue}
              placeholder={t("search.placeholder")}
            />
          </div>
        </div>
      </SurfaceCard>

      {showingSearchNoResults ? (
        <div className="mx-auto max-w-2xl">
          <StateCard
            icon={<BookOpen className="h-8 w-8 text-text-muted" />}
            title={t("faq.empty")}
            note={t("states.noResults.note")}
          />
        </div>
      ) : null}

      {!showingSearchNoResults ? (
        <SurfaceCard
          as="section"
          variant="page"
          className="space-y-6 dark:border-border-light dark:bg-surface-secondary/95 dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)]"
        >
          <header className="space-y-3 border-b border-border-light pb-5 dark:border-border-light/70">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="light" color="primary" size="sm">
                {t("document.eyebrow")}
              </Badge>
              <Badge variant="light" color="success" size="sm">
                {t("summary.title")}
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary sm:text-3xl">
              {t("document.title")}
            </h2>
            <p className="max-w-4xl text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
              {t("document.subtitle")}
            </p>
          </header>

          <div className="rounded-[24px] border border-primary/10 bg-primary-light/25 px-5 py-4 dark:border-primary/20 dark:bg-primary/10">
            <p className="text-sm leading-7 text-text-primary dark:text-text-primary">{t("document.intro")}</p>
          </div>

          <SummaryGrid items={summaryItems} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                {t("document.sectionHeading")}
              </h3>
            </div>

            <div className="space-y-3">
              {visibleSections.map((section, index) => (
                <HelpSectionCard
                  key={section.category?.slug ?? "uncategorized"}
                  section={section}
                  locale={locale}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          </div>

          <PolicyNotice title={t("notice.title")} body={t("notice.body")} />
        </SurfaceCard>
      ) : null}

      <HelpSupportCard
        eyebrow={t("notice.supportTitle")}
        title={t("notice.supportTitle")}
        body={t("notice.supportBody")}
        cta={t("notice.supportCta")}
      />
    </div>
  );
}
