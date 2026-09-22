"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Clock3,
  ShieldCheck,
  FileCheck2,
  User,
} from "lucide-react";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { usePractitionerApplicationStatus } from "../../hooks/use-practitioners";
import PractitionerDocumentsSection from "./PractitionerDocumentsSection";

export default function PractitionerApplicationSubmittedView() {
  const t = useTranslations("practitioner-area.application");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: statusData } = usePractitionerApplicationStatus();
  const application = statusData?.application;
  const snapshot = application?.submissionSnapshot as Record<string, any> | null;

  const submittedAt = application?.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString(
        isRtl ? "ar-EG" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Calm Status Hero Card */}
      <SurfaceCard
        variant="page"
        className="border-primary/20 bg-primary/[0.03] p-6 sm:p-8 dark:bg-primary/[0.05]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20">
              <Clock3 className="h-3.5 w-3.5 animate-pulse text-primary" />
              <span>
                {application?.status === "UNDER_REVIEW"
                  ? isRtl
                    ? "الطلب قيد المراجعة والتدقيق"
                    : "Application Under Review"
                  : isRtl
                    ? "تم استلام طلبك بنجاح"
                    : "Application Submitted"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary dark:text-white">
              {isRtl
                ? "طلب الانضمام قيد المراجعة لدى فريق سويّة"
                : "Your Application is Being Reviewed"}
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-white/80">
              {isRtl
                ? "شكراً لانضمامك إلى سويّة. يقوم فريق التدقيق الطبي والإداري بمراجعة بياناتك ومستنداتك المهنية. نتوقع الرد خلال يوم عمل واحد (24 ساعة)."
                : "Thank you for applying to Sawiyaa. Our medical review team is reviewing your profile and credentials. We expect to respond within 1 business day."}
            </p>

            {submittedAt && (
              <p className="text-xs text-text-muted">
                {isRtl ? "تاريخ تقديم الطلب:" : "Submitted on:"}{" "}
                <span className="font-semibold text-text-primary dark:text-white">
                  {submittedAt}
                </span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-primary p-4 text-center dark:bg-white/5 sm:w-56 shrink-0 shadow-sm">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-xs font-bold text-text-primary dark:text-white">
              {isRtl ? "لا يوجد إجراء مطلوب منك حالياً" : "No Action Required"}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {isRtl
                ? "سنرسل إشعاراً فور انتهاء المراجعة"
                : "We will notify you upon review completion"}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* Snapshot Summary */}
      {snapshot && (
        <SurfaceCard variant="section" className="space-y-4 p-6">
          <SurfaceHeader
            eyebrow={isRtl ? "ملخص البيانات" : "Summary"}
            title={isRtl ? "البيانات المسجلة في الطلب" : "Submitted Details"}
          />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <p className="text-xs text-text-muted">{isRtl ? "الاسم" : "Name"}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white mt-0.5">
                {snapshot.displayName || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">{isRtl ? "نوع التخصص" : "Type"}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white mt-0.5">
                {snapshot.practitionerType || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">{isRtl ? "المسمى المهني" : "Title"}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white mt-0.5">
                {snapshot.professionalTitle || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">{isRtl ? "سنوات الخبرة" : "Experience"}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white mt-0.5">
                {snapshot.yearsOfExperience} {isRtl ? "سنوات" : "years"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">{isRtl ? "الدولة" : "Country"}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white mt-0.5">
                {snapshot.countryCode || "-"}
              </p>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* Uploaded Documents Preview (Read-only) */}
      <SurfaceCard variant="section" className="space-y-4 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "المستندات المرفقة" : "Documents"}
          title={isRtl ? "المستندات المرفوعة للمراجعة" : "Submitted Documents"}
        />
        <PractitionerDocumentsSection countryCode={snapshot?.countryCode} isLocked={true} />
      </SurfaceCard>
    </div>
  );
}
