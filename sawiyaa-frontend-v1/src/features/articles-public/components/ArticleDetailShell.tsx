import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  HeartHandshake,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
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

function formatBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-text-primary dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderContent(content: string) {
  return content.split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();

    if (!trimmed) return null;

    // Callout / Note at the bottom or anywhere: --- **ملاحظة:** ...
    if (trimmed.startsWith("---") || trimmed.includes("**ملاحظة:**") || trimmed.includes("**Note:**")) {
      const cleanText = trimmed.replace(/^---\s*/, "").replace(/\*\*/g, "");
      return (
        <div
          key={index}
          className="my-6 rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 dark:bg-amber-950/30 dark:border-amber-800/60"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-300 leading-relaxed">
              {cleanText}
            </p>
          </div>
        </div>
      );
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h2
          key={index}
          dir="auto"
          className="mt-8 mb-3 text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white border-b border-border-light/60 pb-2"
        >
          {trimmed.slice(2)}
        </h2>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3
          key={index}
          dir="auto"
          className="mt-6 mb-2 text-lg sm:text-xl font-bold text-text-primary dark:text-white flex items-center gap-2"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span>{trimmed.slice(3)}</span>
        </h3>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h4
          key={index}
          dir="auto"
          className="mt-5 mb-2 text-base font-bold text-text-primary dark:text-white"
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
        <ul key={index} className="my-4 space-y-2.5 pe-2">
          {lines.map((line, lineIndex) => (
            <li
              key={lineIndex}
              dir="auto"
              className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{formatBoldText(line.replace(/^[-*]\s*/, ""))}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={index}
        dir="auto"
        className="my-3 text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted"
      >
        {formatBoldText(trimmed)}
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
    <div className="mx-auto max-w-5xl space-y-5 text-start">
      {/* Top Back Navigation */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* Hero Article Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-border-light/80 bg-white p-5 sm:p-7 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
          <div className="space-y-3.5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {article.category?.title && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{article.category.title}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{publishedLabel}</span>
              </span>
              {authorLabel && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>{authorLabel}</span>
                  </span>
                </>
              )}
            </div>

            {/* Article Title */}
            <h1
              dir="auto"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary dark:text-white leading-snug"
            >
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p
                dir="auto"
                className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted max-w-2xl"
              >
                {article.excerpt}
              </p>
            )}
          </div>

          {/* Cover Image */}
          {coverImageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-tertiary shadow-xs dark:bg-surface-tertiary">
              <div className="relative aspect-[16/10] w-full">
                <img
                  src={coverImageUrl}
                  alt={article.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 via-teal-500/10 to-primary/5 text-primary">
              <BookOpen className="h-12 w-12 opacity-50" />
            </div>
          )}
        </div>
      </section>

      {/* Main Grid: Content (Left) + Sidebar (Right) */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Article Body Content Card */}
        <article className="rounded-3xl border border-border-light/80 bg-white p-6 sm:p-8 shadow-xs dark:bg-surface-secondary dark:border-border-dark space-y-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderContent(article.content)}
          </div>
        </article>

        {/* Cohesive Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          {/* Guided Matching CTA Card */}
          <section className="rounded-3xl border border-primary/25 bg-linear-to-br from-primary/10 via-teal-500/5 to-white p-5 shadow-xs dark:bg-surface-secondary dark:border-primary/30 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-bold text-text-primary dark:text-white">
                {nextStepTitle}
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-text-secondary dark:text-text-muted">
              {nextStepNote}
            </p>

            <div className="space-y-2 pt-1">
              <Link
                href={primaryCtaHref}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{primaryCtaLabel}</span>
              </Link>
              <Link
                href={secondaryCtaHref}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/40 hover:text-primary transition dark:bg-surface-secondary dark:border-border-dark"
              >
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                <span>{secondaryCtaLabel}</span>
              </Link>
            </div>
          </section>

          {/* Reading Meta Card */}
          <section className="rounded-3xl border border-border-light/80 bg-white p-5 shadow-xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {readingNotesLabel}
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-surface-tertiary/40 p-2.5">
                <span className="text-text-muted flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>{publicationLabel}</span>
                </span>
                <span className="font-bold text-text-primary dark:text-white">{publishedLabel}</span>
              </div>

              {authorLabel && (
                <div className="flex items-center justify-between rounded-xl bg-surface-tertiary/40 p-2.5">
                  <span className="text-text-muted flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>{authorHeadingLabel}</span>
                  </span>
                  <span className="font-bold text-text-primary dark:text-white truncate max-w-[130px]">{authorLabel}</span>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-surface-tertiary/40 p-2.5">
                <span className="text-text-muted flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>وقت القراءة</span>
                </span>
                <span className="font-bold text-text-primary dark:text-white">4 دقائق</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

