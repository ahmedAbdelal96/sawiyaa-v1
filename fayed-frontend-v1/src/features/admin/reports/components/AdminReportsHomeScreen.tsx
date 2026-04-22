"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BarChart3, CalendarRange, CircleDollarSign, HandCoins, LifeBuoy } from "lucide-react";

const REPORT_CARDS = [
  {
    key: "sessions",
    href: "/admin/reports/sessions",
    icon: <CalendarRange className="h-5 w-5" />,
  },
  {
    key: "paymentsRevenue",
    href: "/admin/reports/payments-revenue",
    icon: <CircleDollarSign className="h-5 w-5" />,
  },
  {
    key: "support",
    href: "/admin/reports/support",
    icon: <LifeBuoy className="h-5 w-5" />,
  },
  {
    key: "careRequests",
    href: "/admin/reports/care-requests",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    key: "payouts",
    href: "/admin/reports/payouts",
    icon: <HandCoins className="h-5 w-5" />,
  },
];

export default function AdminReportsHomeScreen() {
  const t = useTranslations("admin-reports");

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("home.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("home.subtitle")}</p>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {REPORT_CARDS.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className="app-panel group rounded-3xl border border-border-light/80 p-5 transition-colors hover:border-border-focus dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t(`home.cards.${card.key}.title`)}</p>
                    <p className="mt-1 text-xs text-text-muted">{t(`home.cards.${card.key}.note`)}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-text-brand ring-1 ring-inset ring-primary/10 dark:bg-primary/15 dark:text-primary-light">
                    {card.icon}
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted group-hover:text-text-secondary">
                  {t("home.open")}
                </p>
              </Link>
            ))}
          </div>

          <article className="mt-8 rounded-3xl border border-border-light/80 bg-surface px-5 py-4 text-sm text-text-muted dark:border-white/10 dark:bg-white/[0.03]">
            <p className="font-semibold text-text-secondary">{t("home.disclaimer.title")}</p>
            <p className="mt-1">{t("home.disclaimer.note")}</p>
          </article>
        </div>
      </section>
    </div>
  );
}

