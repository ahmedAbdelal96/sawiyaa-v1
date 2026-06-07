import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HelpCircle, CreditCard, Video, Receipt } from "lucide-react";

const HELP_ITEMS = [
  { key: "bookingQuestions", icon: HelpCircle, bgClass: "bg-amber-50", iconClass: "text-amber-600", ringClass: "ring-amber-200" },
  { key: "paymentQuestions", icon: CreditCard, bgClass: "bg-sky-50", iconClass: "text-sky-600", ringClass: "ring-sky-200" },
  { key: "sessionAccess", icon: Video, bgClass: "bg-indigo-50", iconClass: "text-indigo-600", ringClass: "ring-indigo-200" },
  { key: "cancellationRefund", icon: Receipt, bgClass: "bg-emerald-50", iconClass: "text-emerald-600", ringClass: "ring-emerald-200" },
] as const;

export default async function HelpPreviewSection() {
  const t = await getTranslations("home.helpPreview");

  return (
    <section className="px-6 py-14 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel overflow-hidden rounded-[28px] p-7 lg:grid lg:grid-cols-2 lg:gap-10 lg:p-9">
          {/* Left: Text */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-xl font-bold text-text-primary md:text-2xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {t("subtitle")}
            </p>

            <ul className="mt-5 space-y-2.5">
              {HELP_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.key}
                    className="flex items-center gap-3 text-sm text-text-secondary"
                  >
                    <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${item.bgClass} ${item.ringClass} ring-1`}>
                      <Icon size={13} className={item.iconClass} />
                    </div>
                    {t(`items.${item.key}`)}
                  </li>
                );
              })}
            </ul>

            <div className="mt-7">
              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:bg-surface"
              >
                {t("cta")}
              </Link>
            </div>
          </div>

          {/* Right: Visual accent */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="relative h-40 w-40">
              <div className="absolute inset-0 rounded-full bg-amber-50/60" />
              <div className="absolute inset-5 rounded-full bg-sky-50/60" />
              <div className="absolute inset-10 flex items-center justify-center rounded-full bg-indigo-50/60">
                <HelpCircle size={32} className="text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}