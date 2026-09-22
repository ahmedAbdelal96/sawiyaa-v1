import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, KeyRound, Shield, User, Wallet } from "lucide-react";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patient-area" });
  return {
    title: t("placeholder.settings.meta.title") || "Settings",
    description: t("placeholder.settings.meta.description") || "Account and security settings",
  };
}

export default async function PatientSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRtl = locale.startsWith("ar");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      {/* ── Header ── */}
      <div className="border-b border-border-light/60 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
          {isRtl ? "إعدادات الحساب والأمان" : "Account & Security Settings"}
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          {isRtl
            ? "إدارة بيانات حسابك الشخصي، أمان كلمة المرور، وروابط الوصول السريع."
            : "Manage your personal account details, password security, and quick preferences."}
        </p>
      </div>

      {/* ── Quick Account 360 Hub Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/patient/profile"
          className="flex items-center justify-between rounded-2xl border border-border-light/80 bg-white p-4 shadow-xs transition hover:border-primary/40 hover:bg-surface-tertiary/20 dark:bg-surface-secondary dark:border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
              <User size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary dark:text-white">
                {isRtl ? "الملف الشخصي والبيانات" : "Profile & Personal Details"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {isRtl ? "تعديل الاسم، الصورة، والمنطقة الزمنية" : "Update name, photo, and timezone"}
              </p>
            </div>
          </div>
          {isRtl ? <ChevronLeft size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
        </Link>

        <Link
          href="/patient/payments"
          className="flex items-center justify-between rounded-2xl border border-border-light/80 bg-white p-4 shadow-xs transition hover:border-primary/40 hover:bg-surface-tertiary/20 dark:bg-surface-secondary dark:border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary dark:text-white">
                {isRtl ? "المدفوعات والمحفظة" : "Payments & Wallet"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {isRtl ? "رصيد المحفظة، المعاملات، وطرق الدفع" : "Wallet balance, transactions, and methods"}
              </p>
            </div>
          </div>
          {isRtl ? <ChevronLeft size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
        </Link>
      </div>

      {/* ── Password & Security Card ── */}
      <div className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border-light/60 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <Shield size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary dark:text-white">
              {isRtl ? "أمان الحساب وكلمة المرور" : "Password & Security"}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {isRtl
                ? "تغيير كلمة المرور الخاصة بحسابك لضمان حماية بياناتك."
                : "Update your password to ensure your account security."}
            </p>
          </div>
        </div>

        <ChangePasswordForm role="patient" />
      </div>
    </div>
  );
}
