"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  BadgeInfo,
  ChevronDown,
  CircleCheckBig,
  Clock3,
  HelpCircle,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import { Link } from "@/i18n/navigation";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { useRefundPolicy } from "../hooks/use-refund-policies";

type TimelineSummaryItem = {
  label: string;
  result: string;
  icon: ReactNode;
  tone: "brand" | "success" | "warning" | "neutral";
};

type AccordionSection = {
  id: string;
  title: string;
  items: string[];
  defaultOpen?: boolean;
};

function formatPolicyMonthLabel(value: string | null, locale: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function PolicyTimelineSummary({
  items,
}: {
  items: TimelineSummaryItem[];
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
                  : "border-border-light bg-white text-text-primary dark:border-border-light dark:bg-surface-tertiary/80 dark:text-text-primary";

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

function PolicyAccordionSection({ title, items, defaultOpen = false }: AccordionSection) {
  return (
    <details
      className="group overflow-hidden rounded-[24px] border border-border-light bg-white shadow-[0_16px_34px_-30px_rgba(34,52,56,0.18)] dark:border-border-light dark:bg-surface-secondary/95 dark:shadow-[0_16px_34px_-30px_rgba(0,0,0,0.42)]"
      open={defaultOpen}
    >
      <summary className="flex list-none cursor-pointer items-center justify-between gap-4 border-b border-primary/10 bg-primary-light/70 px-5 py-4 text-text-primary outline-none transition hover:bg-primary-light/90 dark:border-primary/15 dark:bg-primary/12 dark:text-text-primary dark:hover:bg-primary/18">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-6 sm:text-base">{title}</p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 transition duration-200 group-open:rotate-180" />
      </summary>

      <div className="px-5 py-5 dark:bg-transparent">
        <ul className="space-y-3 text-sm leading-7 text-text-secondary dark:text-text-secondary">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
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
          <p className="text-sm font-semibold text-text-primary dark:text-text-primary">{title}</p>
          <p className="mt-2 text-sm leading-7 text-text-secondary dark:text-text-secondary">{body}</p>
        </div>
      </div>
    </section>
  );
}

function PolicySupportCard({
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
          <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary dark:text-text-secondary">{body}</p>
        </div>

        <Link
          href="/help"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.34)] transition hover:bg-primary-hover dark:shadow-[0_12px_24px_-16px_rgba(68,161,148,0.22)]"
        >
          {cta}
        </Link>
      </div>
    </SurfaceCard>
  );
}

function SessionRefundPolicySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-56 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
      <div className="h-72 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
      <div className="h-44 rounded-[30px] bg-white/80 shadow-[0_18px_40px_-34px_rgba(34,52,56,0.16)]" />
    </div>
  );
}

export default function SessionRefundPolicyPageScreen() {
  const t = useTranslations("refund-policies.sessionPage");
  const locale = useLocale();
  const policyQuery = useRefundPolicy("SESSION");
  const policy = policyQuery.data?.item ?? null;
  const appError = policyQuery.error ? toAppError(policyQuery.error) : null;

  const policyVersion = policy?.clauseCount ?? 7;
  const updatedAtLabel = formatPolicyMonthLabel(policy?.updatedAt ?? null, locale);
  const policyTitle =
    locale === "ar"
      ? policy?.titleAr || t("hero.title")
      : policy?.titleEn || t("hero.title");

  const timelineSummary = useMemo<TimelineSummaryItem[]>(
    () => [
      {
        label: t("timeline.summary.full.label"),
        result: t("timeline.summary.full.result"),
        icon: <CircleCheckBig className="h-5 w-5" />,
        tone: "brand",
      },
      {
        label: t("timeline.summary.partial.label"),
        result: t("timeline.summary.partial.result"),
        icon: <BadgeInfo className="h-5 w-5" />,
        tone: "success",
      },
      {
        label: t("timeline.summary.limited.label"),
        result: t("timeline.summary.limited.result"),
        icon: <Clock3 className="h-5 w-5" />,
        tone: "neutral",
      },
      {
        label: t("timeline.summary.late.label"),
        result: t("timeline.summary.late.result"),
        icon: <TimerReset className="h-5 w-5" />,
        tone: "warning",
      },
      {
        label: t("timeline.summary.manual.label"),
        result: t("timeline.summary.manual.result"),
        icon: <HelpCircle className="h-5 w-5" />,
        tone: "neutral",
      },
    ],
    [t],
  );

  const accordionSections = useMemo<AccordionSection[]>(
    () => [
      {
        id: "scope",
        title: t("accordion.scope.title"),
        defaultOpen: true,
        items: [
          t("accordion.scope.items.0"),
          t("accordion.scope.items.1"),
          t("accordion.scope.items.2"),
        ],
      },
      {
        id: "eligibility",
        title: t("accordion.eligibility.title"),
        items: [
          t("accordion.eligibility.items.0"),
          t("accordion.eligibility.items.1"),
          t("accordion.eligibility.items.2"),
        ],
      },
      {
        id: "full",
        title: t("accordion.full.title"),
        items: [t("accordion.full.items.0")],
      },
      {
        id: "partial",
        title: t("accordion.partial.title"),
        items: [t("accordion.partial.items.0")],
      },
      {
        id: "limited",
        title: t("accordion.limited.title"),
        items: [t("accordion.limited.items.0")],
      },
      {
        id: "late",
        title: t("accordion.late.title"),
        items: [t("accordion.late.items.0")],
      },
      {
        id: "manual-after-start",
        title: t("accordion.manualAfterStart.title"),
        items: [t("accordion.manualAfterStart.items.0")],
      },
      {
        id: "exceptions",
        title: t("accordion.exceptions.title"),
        items: [
          t("accordion.exceptions.items.0"),
          t("accordion.exceptions.items.1"),
        ],
      },
      {
        id: "manual-review",
        title: t("accordion.manualReview.title"),
        items: [
          t("accordion.manualReview.items.0"),
          t("accordion.manualReview.items.1"),
        ],
      },
      {
        id: "result",
        title: t("accordion.result.title"),
        items: [
          t("accordion.result.items.0"),
          t("accordion.result.items.1"),
          t("accordion.result.items.2"),
        ],
      },
    ],
    [t],
  );

  if (policyQuery.isLoading && !policy) {
    return <SessionRefundPolicySkeleton />;
  }

  if (!policy) {
    return (
    <div className="mx-auto max-w-3xl">
        <StateCard
          icon={<ShieldAlert className="h-8 w-8 text-text-muted" />}
          title={t("fallback.title")}
          note={appError?.message ?? t("fallback.note")}
          action={{
            label: t("fallback.back"),
            href: (
              <Link
                href="/refund-policies"
                className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2 text-sm text-text-secondary transition hover:border-primary/30 hover:text-primary"
              >
                {t("fallback.back")}
              </Link>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-text-primary dark:text-text-primary">
      <SurfaceCard
        as="section"
        variant="page"
        className="space-y-5 dark:border-border-light dark:bg-surface-secondary/95 dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)]"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="solid" color={policy.isActive ? "success" : "warning"} size="sm">
                {policy.isActive ? t("hero.activeBadge") : t("hero.inactiveBadge")}
              </Badge>
              <Badge variant="light" color="info" size="sm">
                {t("hero.versionLabel", { version: policyVersion })}
              </Badge>
              <Badge variant="light" color="light" size="sm">
                {t("hero.updatedAt", { date: updatedAtLabel })}
              </Badge>
            </div>

            <div className="space-y-3 text-start">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("hero.eyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary dark:text-text-primary sm:text-4xl">
                {policyTitle}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
                {t("hero.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex justify-start md:justify-end">
            <Link
              href="/refund-policies"
              className="inline-flex items-center gap-2 rounded-2xl border border-text-brand/30 bg-white px-4 py-3 text-sm font-semibold text-text-brand transition hover:border-primary/40 hover:text-primary dark:border-primary/30 dark:bg-surface-secondary dark:text-text-primary dark:hover:border-primary/50 dark:hover:bg-surface-tertiary"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("hero.back")}
            </Link>
          </div>
        </div>
      </SurfaceCard>

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
              {t("document.subBadge")}
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

        <PolicyTimelineSummary items={timelineSummary} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">{t("accordion.heading")}</h3>
          </div>

          <div className="space-y-3">
            {accordionSections.map((section) => (
              <PolicyAccordionSection key={section.id} {...section} />
            ))}
          </div>
        </div>

        <PolicyNotice title={t("notice.title")} body={t("notice.body")} />
      </SurfaceCard>

      <PolicySupportCard
        eyebrow={t("support.eyebrow")}
        title={t("support.title")}
        body={t("support.body")}
        cta={t("support.cta")}
      />
    </div>
  );
}
