import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, BarChart3, BookOpenText, CircleDollarSign, LayoutDashboard, Lock, ReceiptText, Scale, Settings2, TrendingUp, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";

type Props = {
  locale: string;
};

type DailyCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  actionLabel: string;
  tone: "primary" | "neutral" | "success";
};

type AdvancedItem = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

export default async function AdminFinanceHubScreen({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  const dailyCards: DailyCard[] = [
    {
      title: t("hub.cards.payments.title"),
      description: t("hub.cards.payments.description"),
      href: "/admin/payments",
      icon: <CircleDollarSign className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "primary",
    },
    {
      title: t("hub.cards.dues.title"),
      description: t("hub.cards.dues.description"),
      href: "/admin/practitioner-payouts",
      icon: <Users className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "success",
    },
    {
      title: t("hub.cards.history.title"),
      description: t("hub.cards.history.description"),
      href: "/admin/practitioner-payouts/history",
      icon: <ReceiptText className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "neutral",
    },
    {
      title: t("hub.cards.overview.title"),
      description: t("hub.cards.overview.description"),
      href: "/admin/finance/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "neutral",
    },
  ];

  const reviewItems: AdvancedItem[] = [
    {
      title: t("hub.advanced.ledger.title"),
      description: t("hub.advanced.ledger.description"),
      href: "/admin/finance/ledger",
      icon: <BookOpenText className="h-5 w-5" />,
    },
    {
      title: t("hub.advanced.reconciliation.title"),
      description: t("hub.advanced.reconciliation.description"),
      href: "/admin/finance/accounting/reconciliation",
      icon: <Scale className="h-5 w-5" />,
    },
  ];

  const reportsCards: DailyCard[] = [
    {
      title: t("hub.cards.reportsPaymentsRevenue.title"),
      description: t("hub.cards.reportsPaymentsRevenue.description"),
      href: "/admin/reports/payments-revenue",
      icon: <BarChart3 className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "neutral",
    },
    {
      title: t("hub.cards.reportsPayouts.title"),
      description: t("hub.cards.reportsPayouts.description"),
      href: "/admin/reports/payouts",
      icon: <ReceiptText className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      tone: "neutral",
    },
  ];

  const settingsItems: AdvancedItem[] = [
    {
      title: t("hub.advanced.revenueShareRules.title"),
      description: t("hub.advanced.revenueShareRules.description"),
      href: "/admin/settings/revenue-share",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      title: t("hub.cards.refundPolicies.title"),
      description: t("hub.cards.refundPolicies.description"),
      href: "/admin/refund-policies",
      icon: <ReceiptText className="h-5 w-5" />,
    },
    {
      title: t("hub.advanced.paymentGatewayControl.title"),
      description: t("hub.advanced.paymentGatewayControl.description"),
      href: "/admin/payments/gateway-control",
      icon: <Settings2 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <SurfaceHeader
        eyebrow={t("hub.eyebrow")}
        title={t("hub.title")}
        description={t("hub.description")}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.daily.title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dailyCards.map((card) => (
            <Link key={card.href} href={card.href as never} className="group block h-full">
              <SurfaceCard
                variant="section"
                className="flex h-full flex-col justify-between gap-6 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/20 shadow-sawiyaa-card"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/10">
                      {card.icon}
                    </div>
                    <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:border-white/5 dark:bg-white/5">
                      {card.actionLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {card.title}
                    </h3>
                    <p className="max-w-2xl text-xs leading-5 text-text-secondary">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border-light/70 pt-4 text-xs font-semibold text-text-brand dark:border-white/5">
                  <span>{t("hub.openLabel")}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.review.title")}
        </h2>

        <SurfaceCard variant="subtle" className="p-0 border border-border-light bg-white dark:border-white/5 dark:bg-transparent">
          <div className="divide-y divide-border-light/70 dark:divide-white/5">
            {reviewItems.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-secondary sm:px-5"
              >
                <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-light bg-white text-text-brand shadow-[0_10px_20px_-16px_rgba(34,52,56,0.12)] dark:border-white/5 dark:bg-white/5">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </h3>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.reports.title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
          {reportsCards.map((card) => (
            <Link key={card.href} href={card.href as never} className="group block h-full">
              <SurfaceCard
                variant="section"
                className="flex h-full flex-col justify-between gap-6 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/20 shadow-sawiyaa-card"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/10">
                      {card.icon}
                    </div>
                    <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:border-white/5 dark:bg-white/5">
                      {card.actionLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {card.title}
                    </h3>
                    <p className="max-w-2xl text-xs leading-5 text-text-secondary">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border-light/70 pt-4 text-xs font-semibold text-text-brand dark:border-white/5">
                  <span>{t("hub.openLabel")}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Lock className="h-4 w-4 text-status-warning" />
          {t("hub.groups.settings.title")}
        </h2>

        <SurfaceCard variant="subtle" className="p-0 border border-status-warning-border bg-status-warning-soft/30 dark:border-status-warning-border/20 dark:bg-transparent">
          <div className="divide-y divide-status-warning-border/40 dark:divide-white/5">
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-status-warning-soft/40 sm:px-5"
              >
                <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-status-warning-border bg-white text-status-warning shadow-[0_10px_20px_-16px_rgba(34,52,56,0.12)] dark:bg-white/5">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </h3>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
