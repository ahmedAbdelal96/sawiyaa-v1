"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, BookOpen, ChevronDown, Search } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import Badge from "@/components/ui/badge/Badge";
import InputField from "@/components/form/input/InputField";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { usePublicHelp } from "../hooks/use-help";
import {
  formatHelpDate,
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

function FaqAccordionItem({
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
    <details className="group rounded-[22px] border border-border-light bg-white shadow-sm transition open:shadow-md dark:bg-surface-secondary">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:hidden sm:px-5">
        <div className="min-w-0 space-y-1 text-start">
          <h3 className="text-base font-semibold leading-7 text-text-primary">{title}</h3>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            <span className="group-open:hidden">{t("faq.showAnswer")}</span>
            <span className="hidden group-open:inline">{t("faq.hideAnswer")}</span>
          </p>
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-light text-text-secondary transition group-open:rotate-180 group-open:text-primary">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className="border-t border-border-light px-4 pb-4 pt-3 sm:px-5">
        <p className="text-sm leading-7 text-text-primary">{body}</p>
      </div>
    </details>
  );
}

export default function PublicHelpScreen({ categorySlug }: Props) {
  const t = useTranslations("help");
  const locale = useLocale();
  const router = useRouter();
  const helpQuery = usePublicHelp("");
  const [searchValue, setSearchValue] = useState("");
  const [manualActiveCategorySlug, setManualActiveCategorySlug] = useState(categorySlug ?? "");
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

  const activeCategorySlug = useMemo(() => {
    if (categorySlug) return categorySlug;
    if (
      manualActiveCategorySlug &&
      visibleSections.some((section) => (section.category?.slug ?? "uncategorized") === manualActiveCategorySlug)
    ) {
      return manualActiveCategorySlug;
    }
    const firstSection = visibleSections[0];
    return firstSection?.category?.slug ?? (firstSection ? "uncategorized" : "");
  }, [categorySlug, manualActiveCategorySlug, visibleSections]);

  if (helpQuery.isLoading && !helpQuery.data) {
    return <div className="h-64 rounded-[28px] bg-white/80 dark:bg-surface-secondary/60" />;
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

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {categorySlug ? (
                <Link
                  href={"/help" as never}
                  className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm transition hover:border-primary/30 hover:text-primary dark:bg-surface-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("actions.backToOverview")}
                </Link>
              ) : (
                <Badge variant="solid" color="primary" size="sm">
                  {t("public.eyebrow")}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
                {selectedCategory
                  ? getLocalizedHelpCategoryTitle(selectedCategory, locale)
                  : t("public.title")}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
                {selectedCategory
                  ? getLocalizedHelpCategoryDescription(selectedCategory, locale) ||
                    t("public.description")
                  : t("public.description")}
              </p>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <SearchField
              value={searchValue}
              onChange={setSearchValue}
              placeholder={t("search.placeholder")}
            />
          </div>
        </div>

        {!categorySlug && visibleSections.length > 1 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">{t("navigation.categories")}</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleSections.map((section) => {
                const slug = section.category?.slug ?? "uncategorized";
                const isActive = activeCategorySlug === slug || (!activeCategorySlug && slug === "uncategorized");
                const label = section.category
                  ? getLocalizedHelpCategoryTitle(section.category, locale)
                  : t("questions.uncategorized");
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => {
                      setManualActiveCategorySlug(slug);
                      const element = document.getElementById(`help-category-${slug}`);
                      element?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border-light bg-white text-text-secondary hover:border-primary/20 hover:text-text-primary dark:bg-surface-secondary"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
                      {section.questions.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
        <div className="space-y-5">
          {visibleSections.map((section) => {
            const category = section.category;
            const title = category ? getLocalizedHelpCategoryTitle(category, locale) : t("questions.uncategorized");
            const description = category ? getLocalizedHelpCategoryDescription(category, locale) : "";
            const sectionSlug = category?.slug ?? "uncategorized";
            return (
              <SurfaceCard
                key={sectionSlug}
                as="section"
                variant="section"
                id={`help-category-${sectionSlug}`}
                className="scroll-mt-28 space-y-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
                      <Badge variant="solid" color="primary" size="sm">
                        {t("public.questionCount", { count: section.questions.length })}
                      </Badge>
                    </div>
                    {description ? (
                      <p className="max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
                    ) : null}
                  </div>
                  {category ? (
                    <span className="text-xs font-medium text-text-muted">
                      {t("public.updatedAt", { date: formatHelpDate(category.updatedAt, locale) })}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {section.questions.map((question) => (
                    <FaqAccordionItem key={question.id} question={question} locale={locale} />
                  ))}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
