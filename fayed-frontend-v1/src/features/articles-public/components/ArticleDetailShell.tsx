import { Link } from "@/i18n/navigation";
import { ArrowLeft, CalendarDays, Sparkles, UserRound } from "lucide-react";
import PublicArticleTrustBadges from "./PublicArticleTrustBadges";
import type { PublicArticleDetails } from "../types/articles-public.types";
import { resolveCoverImageUrl } from "../lib/resolve-cover-image-url";

type Props = {
  article: PublicArticleDetails;
  backHref: string;
  backLabel: string;
  publishedLabel: string;
  authorLabel: string | null;
  nextStepTitle: string;
  nextStepNote: string;
  readingNotesLabel: string;
  publicationLabel: string;
  authorHeadingLabel: string;
  trustHeadingLabel: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
};

function renderContent(content: string) {
  return content.split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();

    if (!trimmed) return null;

    if (trimmed.startsWith("# ")) {
      return (
        <h2
          key={index}
          className="mt-8 text-2xl font-semibold leading-[1.35] tracking-[-0.02em] text-text-primary dark:text-white/95"
        >
          {trimmed.slice(2)}
        </h2>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3
          key={index}
          className="mt-6 text-xl font-semibold leading-[1.4] tracking-[-0.02em] text-text-primary dark:text-white/95"
        >
          {trimmed.slice(3)}
        </h3>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h4
          key={index}
          className="mt-5 text-lg font-semibold leading-[1.45] text-text-primary dark:text-white/95"
        >
          {trimmed.slice(4)}
        </h4>
      );
    }

    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const isBulletList = lines.length > 1 && lines.every((line) => line.startsWith("- ") || line.startsWith("* "));
    if (isBulletList) {
      return (
        <ul key={index} className="mt-4 space-y-2 pr-5">
          {lines.map((line, lineIndex) => (
            <li
              key={lineIndex}
              className="list-disc text-[16px] leading-8 text-text-secondary marker:text-primary"
            >
              {line.replace(/^[-*]\s*/, "")}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={index} className="mt-4 text-[16px] leading-8 text-text-secondary">
        {trimmed}
      </p>
    );
  });
}

export default function ArticleDetailShell({
  article,
  backHref,
  backLabel,
  publishedLabel,
  authorLabel,
  nextStepTitle,
  nextStepNote,
  readingNotesLabel,
  publicationLabel,
  authorHeadingLabel,
  trustHeadingLabel,
  primaryCtaHref,
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
}: Props) {
  const coverImageUrl = resolveCoverImageUrl(article.coverImageUrl);

  return (
    <div className="px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {backLabel}
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-border-light bg-[linear-gradient(180deg,rgba(245,250,248,0.95),rgba(255,255,255,0.98))] shadow-[0_18px_40px_-32px_rgba(34,52,56,0.28)] dark:border-border-light dark:bg-surface-secondary">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
            <div className="space-y-6 p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                {article.category?.title ? (
                  <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary dark:bg-primary/15">
                    {article.category.title}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-3 py-1 dark:bg-white/5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {publishedLabel}
                </span>
                {authorLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-3 py-1 dark:bg-white/5">
                    <UserRound className="h-3.5 w-3.5" />
                    {authorLabel}
                  </span>
                ) : null}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-text-primary dark:text-white/96 sm:text-4xl lg:text-[3rem] lg:leading-[1.08] rtl:text-right">
                  {article.title}
                </h1>
                {article.excerpt ? (
                  <p className="max-w-2xl text-base leading-8 text-text-secondary sm:text-lg rtl:text-right">
                    {article.excerpt}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{trustHeadingLabel}</span>
                </div>
                <PublicArticleTrustBadges trust={article.trust} />
              </div>
            </div>

            <div className="flex items-center justify-center border-t border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03] lg:border-t-0">
              {coverImageUrl ? (
                <div className="w-full max-w-[620px] overflow-hidden rounded-[28px] border border-border-light bg-[#f5f8f7] shadow-[0_20px_45px_-36px_rgba(34,52,56,0.28)] dark:border-white/8 dark:bg-white/5">
                  <div className="relative aspect-[4/3] sm:aspect-[16/11]">
                    <img
                      src={coverImageUrl}
                      alt={article.title}
                      className="h-full w-full object-contain object-center p-4 sm:p-5"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex w-full max-w-[620px] items-center justify-center rounded-[28px] border border-dashed border-border-light bg-surface-secondary/70 p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="max-w-sm text-sm leading-7 text-text-secondary">
                    {article.excerpt ?? article.category?.title ?? ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="self-start rounded-[32px] border border-border-light bg-white p-5 shadow-[0_14px_36px_-30px_rgba(34,52,56,0.22)] sm:p-7 dark:border-border-light dark:bg-surface-secondary">
            <div className="mx-auto max-w-[72ch] space-y-2 rtl:text-right">
              {renderContent(article.content)}
            </div>
          </article>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_14px_36px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-primary dark:text-white/95 rtl:text-right">
                {nextStepTitle}
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary rtl:text-right">
                {nextStepNote}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={primaryCtaHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/25 hover:bg-primary-light hover:text-primary dark:bg-white/[0.03] dark:text-white/92 dark:hover:bg-white/[0.06]"
                >
                  {secondaryCtaLabel}
                </Link>
              </div>
            </section>

            <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_14px_36px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                {readingNotesLabel}
              </h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 dark:bg-white/[0.04]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {publicationLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/92">
                    {publishedLabel}
                  </p>
                </div>
                {authorLabel ? (
                  <div className="rounded-2xl bg-surface-secondary px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {authorHeadingLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/92">
                      {authorLabel}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 dark:bg-white/[0.04]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {trustHeadingLabel}
                  </p>
                  <div className="mt-2">
                    <PublicArticleTrustBadges trust={article.trust} />
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
