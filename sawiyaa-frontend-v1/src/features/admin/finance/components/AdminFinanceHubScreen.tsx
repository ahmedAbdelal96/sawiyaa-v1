import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, BarChart3, BookOpenText, CircleDollarSign, LayoutDashboard, Lock, ReceiptText, Scale, Settings2, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import FinancialPageHeader from "@/components/shared/admin/FinancialPageHeader";
import AdminFinanceSummarySection from "./AdminFinanceSummarySection";
import AdminFinanceOverviewSection from "./AdminFinanceOverviewSection";

type Props = {
  locale: string;
};

type DailyCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  actionLabel: string;
  colorTheme: "primary" | "success" | "info" | "warning";
};

type AdvancedItem = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  colorTheme: "indigo" | "danger" | "success";
};

type ReportCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  actionLabel: string;
  colorTheme: "primary" | "indigo";
};

const cardThemeStyles = {
  primary: {
    border: "border-primary-light-hover group-hover:border-primary/50",
    bg: "bg-gradient-to-br from-white to-primary-light/10 dark:from-surface-secondary dark:to-primary-light/[0.01]",
    iconBg: "bg-primary-light text-primary border border-primary-light-hover",
    badgeBg: "bg-primary-light text-primary border border-primary-light-hover",
    footerText: "text-primary",
  },
  success: {
    border: "border-success-border/40 group-hover:border-success/50 dark:border-success-border/20 dark:group-hover:border-success/40",
    bg: "bg-gradient-to-br from-white to-success-soft/30 dark:from-surface-secondary dark:to-success-soft/[0.01]",
    iconBg: "bg-success-soft text-success border border-success-border/30",
    badgeBg: "bg-success-soft text-success border border-success-border/30",
    footerText: "text-success",
  },
  info: {
    border: "border-info-border/40 group-hover:border-info/50 dark:border-info-border/20 dark:group-hover:border-info/40",
    bg: "bg-gradient-to-br from-white to-info-soft/30 dark:from-surface-secondary dark:to-info-soft/[0.01]",
    iconBg: "bg-info-soft text-info border border-info-border/30",
    badgeBg: "bg-info-soft text-info border border-info-border/30",
    footerText: "text-info",
  },
  warning: {
    border: "border-warning-border/40 group-hover:border-warning/50 dark:border-warning-border/20 dark:group-hover:border-warning/40",
    bg: "bg-gradient-to-br from-white to-warning-soft/30 dark:from-surface-secondary dark:to-warning-soft/[0.01]",
    iconBg: "bg-warning-soft text-warning border border-warning-border/30",
    badgeBg: "bg-warning-soft text-warning border border-warning-border/30",
    footerText: "text-warning",
  },
};

const reviewThemeStyles = {
  indigo: {
    border: "border-purple-200/50 hover:border-purple-500/50 dark:border-purple-900/20 dark:hover:border-purple-500/40",
    bg: "bg-gradient-to-br from-white to-purple-50/10 dark:from-surface-secondary dark:to-purple-950/[0.01]",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30",
    textHover: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
  },
  danger: {
    border: "border-danger-border/40 hover:border-danger/50 dark:border-danger-border/20 dark:hover:border-danger/40",
    bg: "bg-gradient-to-br from-white to-danger-soft/10 dark:from-surface-secondary dark:to-danger-soft/[0.01]",
    iconBg: "bg-danger-soft text-danger border border-danger-border/30 dark:bg-danger-soft/10 dark:text-danger-border dark:border-danger-border/20",
    textHover: "group-hover:text-danger dark:group-hover:text-danger-border",
  },
  success: {
    border: "border-success-border/40 hover:border-success/50 dark:border-success-border/20 dark:hover:border-success/40",
    bg: "bg-gradient-to-br from-white to-success-soft/10 dark:from-surface-secondary dark:to-success-soft/[0.01]",
    iconBg: "bg-success-soft text-success border border-success-border/30 dark:bg-success-soft/10 dark:text-success-border dark:border-success-border/20",
    textHover: "group-hover:text-success",
  },
};

const reportThemeStyles = {
  primary: {
    border: "border-primary-light-hover group-hover:border-primary/50",
    bg: "bg-gradient-to-br from-white to-primary-light/10 dark:from-surface-secondary dark:to-primary-light/[0.01]",
    iconBg: "bg-primary-light text-primary border border-primary-light-hover",
    badgeBg: "bg-primary-light text-primary border border-primary-light-hover",
    footerText: "text-primary",
  },
  indigo: {
    border: "border-purple-200/50 group-hover:border-purple-500/50 dark:border-purple-900/20 dark:group-hover:border-purple-500/40",
    bg: "bg-gradient-to-br from-white to-purple-50/10 dark:from-surface-secondary dark:to-purple-950/[0.01]",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30",
    badgeBg: "bg-purple-50 text-purple-600 border border-purple-100/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30",
    footerText: "text-purple-600 dark:text-purple-400",
  },
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
      colorTheme: "primary",
    },
    {
      title: t("hub.cards.dues.title"),
      description: t("hub.cards.dues.description"),
      href: "/admin/practitioner-payouts",
      icon: <Users className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      colorTheme: "success",
    },
    {
      title: t("hub.cards.history.title"),
      description: t("hub.cards.history.description"),
      href: "/admin/practitioner-payouts/history",
      icon: <ReceiptText className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      colorTheme: "info",
    },
    {
      title: t("hub.cards.overview.title"),
      description: t("hub.cards.overview.description"),
      href: "/admin/settlements",
      icon: <LayoutDashboard className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      colorTheme: "warning",
    },
  ];

  const reviewItems: AdvancedItem[] = [
    {
      title: t("hub.advanced.ledger.title"),
      description: t("hub.advanced.ledger.description"),
      href: "/admin/finance/ledger",
      icon: <BookOpenText className="h-5 w-5" />,
      colorTheme: "indigo",
    },
    {
      title: t("hub.advanced.recoveries.title"),
      description: t("hub.advanced.recoveries.description"),
      href: "/admin/finance/practitioner-recoveries",
      icon: <ShieldAlert className="h-5 w-5" />,
      colorTheme: "danger",
    },
    {
      title: t("hub.advanced.reconciliation.title"),
      description: t("hub.advanced.reconciliation.description"),
      href: "/admin/finance/accounting/reconciliation",
      icon: <Scale className="h-5 w-5" />,
      colorTheme: "success",
    },
  ];

  const reportsCards: ReportCard[] = [
    {
      title: t("hub.cards.reportsPaymentsRevenue.title"),
      description: t("hub.cards.reportsPaymentsRevenue.description"),
      href: "/admin/reports/payments-revenue",
      icon: <BarChart3 className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      colorTheme: "primary",
    },
    {
      title: t("hub.cards.reportsPayouts.title"),
      description: t("hub.cards.reportsPayouts.description"),
      href: "/admin/reports/payouts",
      icon: <ReceiptText className="h-5 w-5" />,
      actionLabel: t("hub.openLabel"),
      colorTheme: "indigo",
    },
  ];

  const settingsItems = [
    {
      title: t("hub.advanced.revenueShareRules.title"),
      description: t("hub.advanced.revenueShareRules.description"),
      href: "/admin/platform-settings",
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
      <FinancialPageHeader
        eyebrow={t("hub.eyebrow")}
        title={t("hub.title")}
        description={t("hub.description")}
      />

      <AdminFinanceSummarySection />

      <AdminFinanceOverviewSection />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.daily.title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dailyCards.map((card) => {
            const styles = cardThemeStyles[card.colorTheme];
            return (
              <Link key={card.href} href={card.href as never} className="group block h-full">
                <SurfaceCard
                  variant="section"
                  className={`flex h-full flex-col justify-between gap-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg rounded-[22px] border ${styles.border} ${styles.bg}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${styles.iconBg}`}>
                        {card.icon}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badgeBg}`}>
                        {card.actionLabel}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-text-primary transition-colors duration-250">
                        {card.title}
                      </h3>
                      <p className="max-w-2xl text-xs leading-5 text-text-secondary">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between gap-3 border-t border-border-light/70 pt-4 text-xs font-bold transition-colors duration-250 ${styles.footerText} dark:border-white/5`}>
                    <span>{t("hub.openLabel")}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </SurfaceCard>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.review.title")}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {reviewItems.map((item) => {
            const styles = reviewThemeStyles[item.colorTheme];
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={`group flex flex-col justify-between gap-4 p-5 rounded-[22px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-white/5 ${styles.border} ${styles.bg}`}
              >
                <div className="space-y-4">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${styles.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className={`text-base font-bold text-text-primary transition-colors duration-250 ${styles.textHover}`}>
                      {item.title}
                    </h3>
                    <p className="text-xs leading-5 text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center justify-between gap-3 border-t border-border-light/70 pt-3 text-xs font-semibold dark:border-white/5 transition-colors duration-250 ${styles.textHover}`}>
                  <span>{t("hub.openLabel")}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("hub.groups.reports.title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
          {reportsCards.map((card) => {
            const styles = reportThemeStyles[card.colorTheme];
            return (
              <Link key={card.href} href={card.href as never} className="group block h-full">
                <SurfaceCard
                  variant="section"
                  className={`flex h-full flex-col justify-between gap-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg rounded-[22px] border ${styles.border} ${styles.bg}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${styles.iconBg}`}>
                        {card.icon}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badgeBg}`}>
                        {card.actionLabel}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-text-primary transition-colors duration-250">
                        {card.title}
                      </h3>
                      <p className="max-w-2xl text-xs leading-5 text-text-secondary">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between gap-3 border-t border-border-light/70 pt-4 text-xs font-bold transition-colors duration-250 ${styles.footerText} dark:border-white/5`}>
                    <span>{t("hub.openLabel")}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </SurfaceCard>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Lock className="h-4 w-4 text-status-warning" />
          {t("hub.groups.settings.title")}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href as never}
              className="group flex flex-col justify-between gap-4 rounded-[22px] border border-warning-border/30 bg-white p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg dark:border-warning-border/10 dark:bg-white/5 hover:border-warning/50 bg-gradient-to-br from-white to-warning-soft/10 dark:from-surface-secondary dark:to-warning-soft/[0.01]"
            >
              <div className="space-y-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning border border-warning-border/30 dark:bg-warning-soft/10 dark:text-warning-border dark:border-warning-border/20 transition-transform duration-300 group-hover:scale-105">
                  {item.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-text-primary transition-colors duration-250 group-hover:text-warning">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-5 text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-warning-border/20 pt-3 text-xs font-semibold text-warning transition-colors duration-250">
                <span>{t("hub.openLabel")}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
