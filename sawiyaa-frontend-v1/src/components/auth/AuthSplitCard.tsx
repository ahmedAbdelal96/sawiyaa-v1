"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthVisualPanel from "./AuthVisualPanel";
import { ChevronLeft } from "lucide-react";

type AuthSplitCardProps = {
  title: string;
  subtitle?: string;
  mode: "patient" | "practitioner" | "admin" | "forgot";
  activeTab?: "signin" | "signup" | "otp" | "forgot";
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function AuthSplitCard({
  title,
  subtitle,
  mode,
  activeTab,
  children,
  backHref,
  backLabel,
}: AuthSplitCardProps) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const isRtl = locale === "ar";

  const showTabs = activeTab && (activeTab === "signin" || activeTab === "signup") && (mode === "patient" || mode === "practitioner");

  const tabs = [
    { id: "signin", label: isRtl ? "تسجيل الدخول" : "Sign In", href: `/signin?mode=${mode}` },
    { id: "signup", label: isRtl ? "إنشاء حساب" : "Create Account", href: `/signup?mode=${mode}` },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Main card containing split panels */}
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-border-light bg-white/80 shadow-[0_24px_70px_rgba(36,86,79,0.05)] backdrop-blur-md dark:border-white/5 dark:bg-surface-secondary/75 grid grid-cols-1 lg:grid-cols-12 lg:min-h-[600px]">
        {/* Left Side: Form Panel */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between p-8 sm:p-10">
          <div>
            {/* Auth Heading inside the card */}
            <div className="mb-6 max-w-2xl select-none">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-text-secondary">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Optional Back Button inside the form area */}
            {backHref && (
              <div className="mb-6 flex">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-light bg-surface-secondary/40 hover:bg-surface-secondary/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-text-secondary transition-all hover:text-text-primary shadow-theme-xs active:scale-[0.98]"
                >
                  <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform ${isRtl ? "rotate-180" : ""}`} />
                  <span>{backLabel || t("backToHome")}</span>
                </Link>
              </div>
            )}

            {/* Segmented Tab Switcher (Sign In vs Create Account) */}
            {showTabs && (
              <div className="mb-8 p-1 bg-surface-tertiary dark:bg-white/5 border border-border-light/60 dark:border-white/5 rounded-2xl flex gap-1 select-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={`flex-1 py-3 text-center text-sm font-semibold rounded-xl transition-all active:scale-[0.99] ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50 dark:hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Render Actual Form */}
            {children}
          </div>
        </div>

        {/* Right Side: Colored Brand Visual Panel */}
        <div className="col-span-12 lg:col-span-5">
          <AuthVisualPanel mode={mode} tab={activeTab} />
        </div>
      </div>
    </div>
  );
}
