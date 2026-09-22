"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import {
  useAdminPractitionerPublication,
  useUpdateAdminPractitionerPublication,
} from "../hooks/use-admin-practitioners";
import { useAuthMe } from "@/features/auth/hooks/use-auth";
import { PermissionKey, hasPermission } from "@/lib/auth/permissions";

export default function AdminPractitionerPublicationCard({
  practitionerId,
}: {
  practitionerId: string;
}) {
  const t = useTranslations("admin-area.practitioners");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: authMe } = useAuthMe();
  const hasReadPermission = hasPermission(authMe as any, PermissionKey.PRACTITIONER_PUBLICATION_READ);
  const hasWritePermission = hasPermission(authMe as any, PermissionKey.PRACTITIONER_PUBLICATION_WRITE);

  const { data: pubData, isLoading, refetch } = useAdminPractitionerPublication(
    hasReadPermission ? practitionerId : null
  );
  const updatePubMutation = useUpdateAdminPractitionerPublication();

  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!hasReadPermission) {
    return (
      <SurfaceCard variant="section" className="p-6 text-center">
        <p className="text-sm text-text-muted">
          {isRtl
            ? "ليس لديك صلاحية لعرض حالة نشر الممارس."
            : "You do not have permission to view practitioner publication status."}
        </p>
      </SurfaceCard>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publication = (pubData as any)?.publication || (pubData as any) || {};
  const isPublished = publication.isPublished === true;
  const canPublish = publication.canPublish === true;
  const readiness = publication.readiness || {};
  const missingRequirements: string[] = publication.missingRequirements || publication.publicationMissingRequirements || [];

  const handlePublish = async () => {
    if (!hasWritePermission || !canPublish) return;

    setIsProcessing(true);
    try {
      await updatePubMutation.mutateAsync({
        practitionerId,
        isPublished: true,
      });
      toast.success(
        isRtl
          ? "تم نشر الملف المهني للممارس بنجاح ليصبح متاحاً للمرضى"
          : "Practitioner published successfully to patient discovery"
      );
      refetch();
    } catch (err: any) {
      toast.error(
        err?.message || (isRtl ? "تعذر نشر الممارس" : "Failed to publish practitioner")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!hasWritePermission || !unpublishReason.trim()) return;

    setIsProcessing(true);
    try {
      await updatePubMutation.mutateAsync({
        practitionerId,
        isPublished: false,
        reason: unpublishReason.trim(),
      });
      toast.success(
        isRtl ? "تم إلغاء نشر الممارس بنجاح" : "Practitioner unpublished successfully"
      );
      setUnpublishModalOpen(false);
      setUnpublishReason("");
      refetch();
    } catch (err: any) {
      toast.error(
        err?.message || (isRtl ? "تعذر إلغاء النشر" : "Failed to unpublish practitioner")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <SurfaceCard
        variant="section"
        className={`p-6 border transition-all ${
          isPublished
            ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
            : "border-border-light bg-surface-primary"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                isPublished
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                  : "bg-surface-secondary text-text-muted dark:bg-white/5"
              }`}
            >
              <Globe className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary dark:text-white">
                  {isRtl ? "حالة النشر والظهور للمرضى" : "Publication & Visibility Status"}
                </h3>
                <Badge variant="solid" color={isPublished ? "success" : "light"} size="sm">
                  {isPublished
                    ? isRtl
                      ? "منشور للعامة"
                      : "Published to Public"
                    : isRtl
                      ? "غير منشور"
                      : "Unpublished"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                {isPublished
                  ? isRtl
                    ? "ملف الممارس متاح حالياً في نتائج البحث والحجز للمرضى."
                    : "Practitioner is live and discoverable for patient booking."
                  : isRtl
                    ? "ملف الممارس مخفي من البحث العام ولا يمكن للمرضى حجزه حتى يتم نشره."
                    : "Practitioner is hidden from search and cannot receive new bookings."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {hasWritePermission && (
            <div className="shrink-0">
              {isPublished ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnpublishModalOpen(true)}
                  disabled={isProcessing}
                  className="gap-2 text-danger border-danger/30 hover:bg-danger-50 dark:hover:bg-danger-950/20"
                >
                  <EyeOff className="h-4 w-4" />
                  {isRtl ? "إلغاء النشر" : "Unpublish Practitioner"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={!canPublish || isProcessing}
                  className="gap-2 font-bold"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {isRtl ? "نشر الممارس للمرضى" : "Publish Practitioner"}
                </Button>
              )}
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* Publication Readiness Checklist */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "قائمة التحقق" : "Readiness Checklist"}
          title={isRtl ? "شروط ومعايير النشر للمرضى" : "Publication Criteria & Verification"}
          description={
            isRtl
              ? "يجب استيفاء الشروط الأربعة أدناه قبل أن يصبح الممارس قابلاً للنشر."
              : "All four core conditions must be met before publishing."
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* 1. Approval */}
          <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            {readiness.isApproved !== false ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white">
                {isRtl ? "اعتماد طلب الانضمام" : "Application Approved"}
              </p>
              <p className="text-[11px] text-text-muted">
                {isRtl ? "تم تدقيق واعتماد الأهلية المهنية" : "Application review passed"}
              </p>
            </div>
          </div>

          {/* 2. Profile Complete */}
          <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            {readiness.isProfileComplete !== false ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white">
                {isRtl ? "اكتمال الملف المهني" : "Profile Completed"}
              </p>
              <p className="text-[11px] text-text-muted">
                {isRtl ? "الاسم، النبذة، المسمى، وسنوات الخبرة" : "Name, bio, title, experience"}
              </p>
            </div>
          </div>

          {/* 3. Active Specialty */}
          <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            {readiness.hasRequiredSpecialty !== false ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white">
                {isRtl ? "تعيين التخصص الرئيسي" : "Active Specialty Assigned"}
              </p>
              <p className="text-[11px] text-text-muted">
                {isRtl ? "تم ربط فئة وتخصص نشط" : "Valid specialty category attached"}
              </p>
            </div>
          </div>

          {/* 4. Four Normal Prices */}
          <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            {readiness.hasRequiredNormalPricing !== false ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white">
                {isRtl ? "الأسعار الأربعة للجلسات المعتادة" : "All 4 Session Prices Configured"}
              </p>
              <p className="text-[11px] text-text-muted">
                {isRtl ? "30 و 60 دقيقة بالجنيه والدولار" : "30m & 60m in EGP & USD"}
              </p>
            </div>
          </div>
        </div>

        {missingRequirements.length > 0 && !canPublish && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            <p className="font-bold">{isRtl ? "المتطلبات المتبقية للنشر:" : "Remaining items required for publication:"}</p>
            <ul className="mt-1.5 list-disc space-y-0.5 ps-4">
              {missingRequirements.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </SurfaceCard>

      {/* UNPUBLISH MODAL */}
      {unpublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border-light bg-surface-primary p-6 shadow-2xl dark:bg-surface-secondary">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-danger">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-base font-bold text-text-primary dark:text-white">
                  {isRtl ? "تأكيد إلغاء نشر الممارس" : "Confirm Unpublish Practitioner"}
                </h3>
              </div>

              <div className="rounded-xl bg-surface-secondary p-3 text-xs leading-relaxed text-text-secondary dark:bg-white/5">
                <p>
                  {isRtl
                    ? "عند إلغاء النشر، لن يظهر الممارس في البحث ولن يتمكن المرضى من حجز جلسات جديدة. الجلسات القائمة لن تتأثر."
                    : "Unpublishing hides the practitioner from discovery and stops new bookings. Existing appointments remain active."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unpublishReason">
                  {isRtl ? "سبب إلغاء النشر (مطلوب لأغراض التدقيق)" : "Unpublish Reason (Required)"} <span className="text-danger">*</span>
                </Label>
                <TextArea
                  id="unpublishReason"
                  rows={3}
                  value={unpublishReason}
                  onChange={(val) => setUnpublishReason(val)}
                  placeholder={
                    isRtl
                      ? "اكتب سبب إيقاف النشر هنا..."
                      : "Explain the reason for unpublishing..."
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUnpublishModalOpen(false);
                    setUnpublishReason("");
                  }}
                  disabled={isProcessing}
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={!unpublishReason.trim() || isProcessing}
                  className="bg-danger hover:bg-danger-hover text-white gap-2"
                >
                  {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isRtl ? "تأكيد إلغاء النشر" : "Confirm Unpublish"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
