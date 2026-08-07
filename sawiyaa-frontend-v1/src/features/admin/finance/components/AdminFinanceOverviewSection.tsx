"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleDollarSign, LayoutDashboard, Users, ReceiptText } from "lucide-react";
import AdminFinancialOverviewCards from "./AdminFinancialOverviewCards";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { cn } from "@/lib/utils";

type Tab = "collections" | "reviews" | "wallets" | "payouts";

export default function AdminFinanceOverviewSection() {
  const t = useTranslations("admin-accounting");
  const [activeTab, setActiveTab] = useState<Tab>("collections");

  const tabsConfig = [
    {
      id: "collections" as const,
      label: t("overviewCards.tabs.collections"),
      icon: <CircleDollarSign className="h-4 w-4" />,
      component: (
        <AdminFinancialOverviewCards scope="collections" variant="collections" />
      ),
    },
    {
      id: "reviews" as const,
      label: t("overviewCards.tabs.reviews"),
      icon: <LayoutDashboard className="h-4 w-4" />,
      component: (
        <AdminFinancialOverviewCards scope="accounting" variant="reviews" />
      ),
    },
    {
      id: "wallets" as const,
      label: t("overviewCards.tabs.wallets"),
      icon: <Users className="h-4 w-4" />,
      component: (
        <AdminFinancialOverviewCards scope="wallets" variant="wallets" />
      ),
    },
    {
      id: "payouts" as const,
      label: t("overviewCards.tabs.payouts"),
      icon: <ReceiptText className="h-4 w-4" />,
      component: (
        <AdminFinancialOverviewCards scope="payouts" variant="payouts" />
      ),
    },
  ];

  const activeTabConfig = tabsConfig.find((tab) => tab.id === activeTab);

  return (
    <SurfaceCard variant="section" className="space-y-6 rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-light/60 pb-4 dark:border-white/5">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-text-primary">
            {t("overviewCards.title")}
          </h2>
          <p className="text-xs text-text-muted">
            {t("overviewCards.description")}
          </p>
        </div>

        {/* Dynamic Premium Tabs Bar */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-tertiary/75 p-1 dark:bg-white/[0.02]">
          {tabsConfig.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/40 dark:hover:bg-white/[0.02]"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="transition-all duration-300 ease-out">
        {activeTabConfig?.component}
      </div>
    </SurfaceCard>
  );
}
