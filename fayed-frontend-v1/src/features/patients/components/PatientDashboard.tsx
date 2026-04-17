"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, HeartHandshake, LifeBuoy, Sparkles } from "lucide-react";
import { useCurrentUser } from "@/features/users";
import { Skeleton } from "@/components/shared/LoadingStates";

export default function PatientDashboard() {
  const t = useTranslations("patient-dashboard");
  const { data, isLoading, isError, refetch } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="app-panel rounded-[28px] p-6">
          <Skeleton className="mb-3 h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="app-panel rounded-[24px] p-5">
              <Skeleton variant="circular" className="mb-4 h-11 w-11" />
              <Skeleton className="mb-2 h-5 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <section className="app-panel rounded-[28px] p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <p className="mb-4 text-sm font-medium text-text-primary dark:text-white">
            {t("feedback.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-xl border border-border-light bg-surface px-5 py-2 text-sm font-medium text-text-primary transition hover:border-primary hover:text-primary"
          >
            {t("feedback.retry")}
          </button>
        </div>
      </section>
    );
  }

  const greeting = data.displayName
    ? t("greeting.withName", { name: data.displayName })
    : t("greeting.generic");

  return (
    <div className="space-y-5">
      <section className="app-panel rounded-[28px] p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("page.title")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {greeting}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
          {t("page.subtitle")}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <QuickLinkCard
          href="/patient/matching"
          icon={<HeartHandshake className="h-5 w-5" />}
          title={t("quickLinks.matching.title")}
          description={t("quickLinks.matching.description")}
          isPrimary
        />
        <QuickLinkCard
          href="/patient/assessments"
          icon={<Sparkles className="h-5 w-5" />}
          title={t("quickLinks.assessments.title")}
          description={t("quickLinks.assessments.description")}
        />
        <QuickLinkCard
          href="/patient/support"
          icon={<LifeBuoy className="h-5 w-5" />}
          title={t("quickLinks.support.title")}
          description={t("quickLinks.support.description")}
        />
      </section>
    </div>
  );
}

type QuickLinkCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  isPrimary?: boolean;
};

function QuickLinkCard({
  href,
  icon,
  title,
  description,
  isPrimary = false,
}: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-[24px] border p-5 transition ${
        isPrimary
          ? "border-primary/30 bg-primary-light/60 dark:bg-primary/10"
          : "border-border-light bg-surface dark:bg-surface-secondary"
      } hover:border-primary/40`}
    >
      <div>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary dark:bg-surface">
          {icon}
        </div>
        <p className="mb-1 text-sm font-semibold text-text-primary dark:text-white">{title}</p>
        <p className="text-xs leading-relaxed text-text-secondary">{description}</p>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        {title}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </span>
    </Link>
  );
}
