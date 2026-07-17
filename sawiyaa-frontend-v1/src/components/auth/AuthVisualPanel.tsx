"use client";

import { useLocale, useTranslations } from "next-intl";

type StepKey = "c1" | "c2" | "c3" | "p1" | "p2" | "p3";

type AuthVisualPanelProps = {
  mode: "patient" | "practitioner" | "admin" | "forgot";
  tab?: "signin" | "signup" | "otp" | "forgot";
};

export default function AuthVisualPanel({ mode, tab = "signin" }: AuthVisualPanelProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const isSignUp = tab === "signup";
  const showSteps = isSignUp && (mode === "patient" || mode === "practitioner");

  // Determine what steps to show
  const stepKeys: StepKey[] = mode === "practitioner" 
    ? ["p1", "p2", "p3"] 
    : ["c1", "c2", "c3"];

  // Custom text for Sign In / Forgot Password
  const getTagline = () => {
    if (mode === "patient") {
      return isRtl ? "رعايتك النفسية والجسدية تبدأ هنا" : "Your mental & physical care starts here";
    }
    if (mode === "practitioner") {
      return isRtl ? "مساحة عمل مصممة للممارسين" : "A workspace tailored for specialists";
    }
    if (mode === "admin") {
      return isRtl ? "بوابة التشغيل والتحكم الآمن" : "Secure operations & control portal";
    }
    return isRtl ? "خطوة بخطوة نحو التوازن العلاجي" : "Step-by-step towards therapeutic balance";
  };

  const getSubtext = () => {
    if (mode === "patient") {
      return isRtl 
        ? "احجز جلساتك العلاجية مع أفضل المعالجين والمختصين بسرية تامة وأمان."
        : "Book therapeutic sessions with top vetted specialists in full privacy and safety.";
    }
    if (mode === "practitioner") {
      return isRtl
        ? "أدوات متطورة لإدارة جلساتك، حضور المتدربين، ومتابعة مرضاك بكل سلاسة."
        : "Advanced tools to manage your sessions, track learners, and follow up with patients smoothly.";
    }
    if (mode === "admin") {
      return isRtl
        ? "إدارة الحسابات، مراجعة طلبات المعالجين، تنظيم الأكاديمية والعمليات المالية."
        : "Manage user accounts, review specialist requests, run academy programs and reconcile finances.";
    }
    return isRtl
      ? "استعد الوصول لحسابك لمواصلة رحلتك العلاجية بخصوصية وسهولة."
      : "Recover your account access to continue your wellness journey in private security.";
  };

  return (
    <div className="relative flex flex-col justify-between h-full p-10 bg-[#24564F] text-white select-none">
      {/* Decorative Brand SVG background shapes */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      {/* Top Tagline */}
      <div className="relative z-10 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
          {isSignUp ? t("signUpGuidance.eyebrow") : t("authShell.badge")}
        </p>
        <h2 className="text-2xl font-bold leading-tight tracking-tight">
          {isSignUp 
            ? (mode === "practitioner" ? t("signUpGuidance.practitionerTitle") : t("signUpGuidance.patientTitle"))
            : getTagline()
          }
        </h2>
        {!showSteps && (
          <p className="text-sm leading-relaxed text-emerald-100/80">
            {getSubtext()}
          </p>
        )}
      </div>

      {/* Center Graphic or Steps */}
      <div className="relative z-10 my-auto py-8">
        {showSteps ? (
          <div className="space-y-4">
            {stepKeys.map((key, idx) => (
              <div
                key={key}
                className="flex items-start gap-4 rounded-2xl bg-white/8 border border-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/12"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary dark:bg-white dark:text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {t(`signUpGuidance.steps.${key}.title`)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/80">
                    {t(`signUpGuidance.steps.${key}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-6">
            {/* Custom abstract premium wellness SVG */}
            <svg className="w-full max-w-[200px] opacity-90 animate-pulse duration-[8000ms]" viewBox="0 0 200 200" fill="none">
              {/* Outer calm circles */}
              <circle cx="100" cy="100" r="80" stroke="#A7BFAE" strokeWidth="1.5" strokeDasharray="6 6" className="opacity-40" />
              <circle cx="100" cy="100" r="60" stroke="#C8A979" strokeWidth="1.5" className="opacity-70" />
              {/* Overlapping organic wellness blobs */}
              <path d="M100 40 C130 40 160 70 160 100 C160 130 130 160 100 160 C70 160 40 130 40 100 C40 70 70 40 100 40 Z" fill="#EEF4EF" fillOpacity="0.08" />
              <path d="M110 50 C135 55 150 75 145 100 C140 125 120 145 95 140 C70 135 55 115 60 90 C65 65 85 45 110 50 Z" fill="#C8A979" fillOpacity="0.1" />
              
              {/* Central brand mark logo display */}
              <g transform="translate(80, 80)">
                <rect width="40" height="40" rx="12" fill="#FFFFFF" className="shadow-lg" />
                <image href="/images/logo/icon.png" x="6" y="6" width="28" height="28" />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Guidance Note */}
      <div className="relative z-10 rounded-2xl bg-white/5 border border-white/10 p-4 text-xs leading-relaxed text-emerald-100/90">
        {isSignUp 
          ? (mode === "practitioner" ? t("signUpGuidance.practitionerNext") : t("signUpGuidance.patientNext"))
          : (isRtl ? "سويّة رعاية متكاملة متوازنة" : "Sawiyaa: Balanced integrated care")
        }
      </div>
    </div>
  );
}
