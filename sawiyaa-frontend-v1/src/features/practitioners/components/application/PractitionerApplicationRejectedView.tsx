"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Mail } from "lucide-react";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { usePractitionerApplicationStatus } from "../../hooks/use-practitioners";

export default function PractitionerApplicationRejectedView() {
  const t = useTranslations("practitioner-area.application");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: statusData } = usePractitionerApplicationStatus();
  const application = statusData?.application;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <SurfaceCard variant="page" className="border-danger/20 bg-danger/[0.03] p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-100 text-danger-700 dark:bg-danger-950/60 dark:text-danger-400">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary dark:text-white">
          {isRtl ? "لم يتم قبول طلب الانضمام" : "Application Not Approved"}
        </h1>

        <p className="text-sm leading-relaxed text-text-secondary dark:text-white/80">
          {isRtl
            ? "نعتذر عن عدم قبول طلب الانضمام في الوقت الحالي بناءً على معايير التحقق والاعتماد المهني في سويّة."
            : "We regret to inform you that your application could not be approved at this time based on Sawiyaa's professional credential verification criteria."}
        </p>

        {application?.reviewDecisionReason && (
          <div className="rounded-xl border border-danger-200 bg-surface-primary p-4 text-start dark:border-danger-900/40 dark:bg-white/5">
            <p className="text-xs font-bold text-danger-800 dark:text-danger-300">
              {isRtl ? "سبب القرار:" : "Reason:"}
            </p>
            <p className="mt-1 text-sm text-text-primary dark:text-white/90">
              {application.reviewDecisionReason}
            </p>
          </div>
        )}

        <div className="pt-2">
          <a
            href="mailto:support@sawiyaa.com"
            className="inline-flex items-center gap-2 rounded-xl bg-surface-secondary px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-tertiary dark:bg-white/10 dark:text-white"
          >
            <Mail className="h-4 w-4" />
            {isRtl ? "تواصل مع فريق الدعم الطبي" : "Contact Medical Support"}
          </a>
        </div>
      </SurfaceCard>
    </div>
  );
}
