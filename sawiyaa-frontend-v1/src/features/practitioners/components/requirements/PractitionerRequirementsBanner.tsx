"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { usePractitionerRequirements } from "../../hooks/use-practitioners";
import type { PractitionerRequirement } from "../../types/practitioners.types";

export default function PractitionerRequirementsBanner() {
  const t = useTranslations("practitioner-area.requirements");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data } = usePractitionerRequirements();
  const requirements: PractitionerRequirement[] = data?.requirements ?? [];
  const actionableRequirements = requirements.filter(
    (r: PractitionerRequirement) => r.status === "OPEN" || r.status === "REJECTED"
  );

  if (actionableRequirements.length === 0) {
    return null;
  }

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="mb-6 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">
              {isRtl
                ? `لديك (${actionableRequirements.length}) متطلبات وتعديلات تحتاج لاستكمالها`
                : `You have (${actionableRequirements.length}) action items requiring attention`}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              {isRtl
                ? "قام فريق المراجعة بطلب تعديلات على بعض البيانات أو المستندات."
                : "The review team requested updates on some documents or profile details."}
            </p>
          </div>
        </div>

        <Link
          href="/practitioner/application"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-700 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400 shrink-0"
        >
          <span>{isRtl ? "مراجعة واستكمال المتطلبات" : "View & Fulfill"}</span>
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
