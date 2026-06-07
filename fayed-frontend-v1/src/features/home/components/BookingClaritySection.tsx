import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ClipboardList,
  CreditCard,
  Video,
  Handshake,
} from "lucide-react";

const BOOKING_STEPS = [
  { key: "beforeBooking", icon: ClipboardList, bgClass: "bg-sky-50", iconClass: "text-sky-600", ringClass: "ring-sky-200" },
  { key: "afterPayment", icon: CreditCard, bgClass: "bg-indigo-50", iconClass: "text-indigo-600", ringClass: "ring-indigo-200" },
  { key: "sessionTime", icon: Video, bgClass: "bg-violet-50", iconClass: "text-violet-600", ringClass: "ring-violet-200" },
  { key: "ifProblem", icon: Handshake, bgClass: "bg-amber-50", iconClass: "text-amber-600", ringClass: "ring-amber-200" },
] as const;

export default async function BookingClaritySection() {
  const t = await getTranslations("home.bookingClarity");

  return (
    <section className="px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mt-3 text-base leading-7 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKING_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="app-panel rounded-[24px] p-5">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${step.bgClass} ${step.ringClass} ring-1 text-primary`}>
                  <Icon size={20} className={step.iconClass} />
                </div>
                <h3 className="text-base font-bold text-text-primary dark:text-white/90">
                  {t(`${step.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {t(`${step.key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-6 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:bg-surface"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}