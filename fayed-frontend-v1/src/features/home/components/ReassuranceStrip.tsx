import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { List, Receipt, Headset } from "lucide-react";

const ITEM_STYLES = {
  choice: { icon: List, iconClass: "text-emerald-600", bgClass: "bg-emerald-50", ringClass: "ring-emerald-200" },
  booking: { icon: Receipt, iconClass: "text-sky-600", bgClass: "bg-sky-50", ringClass: "ring-sky-200" },
  followUp: { icon: Headset, iconClass: "text-amber-600", bgClass: "bg-amber-50", ringClass: "ring-amber-200" },
} as const;

export default async function ReassuranceStrip() {
  const t = await getTranslations("home.reassurance");

  const items = [
    { key: "choice", title: t("choice.title"), desc: t("choice.desc") },
    { key: "booking", title: t("booking.title"), desc: t("booking.desc") },
    { key: "followUp", title: t("followUp.title"), desc: t("followUp.desc") },
  ];

  return (
    <section className="px-6 py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel rounded-[32px] p-6 lg:p-8">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.16em] text-primary/80">
            {t("eyebrow")}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {items.map((item) => {
              const style = ITEM_STYLES[item.key as keyof typeof ITEM_STYLES];
              const Icon = style.icon;
              return (
                <div key={item.key} className="flex items-start gap-4">
                  <div className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bgClass} ${style.ringClass} ring-1 text-primary`}>
                    <Icon size={20} className={style.iconClass} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary dark:text-white/90">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}