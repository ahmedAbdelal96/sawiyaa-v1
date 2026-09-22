"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileCheck2,
  Edit3,
  Upload,
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import {
  usePractitionerRequirements,
  useSaveApplicationDraft,
  useUploadPractitionerCredential,
  useSubmitPractitionerApplication,
} from "../../hooks/use-practitioners";
import type {
  PractitionerRequirement,
} from "../../types/practitioners.types";

export default function PractitionerRequirementsHub() {
  const t = useTranslations("practitioner-area.requirements");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data, isLoading, refetch } = usePractitionerRequirements();
  const saveDraftMutation = useSaveApplicationDraft();
  const uploadCredentialMutation = useUploadPractitionerCredential();
  const submitApplicationMutation = useSubmitPractitionerApplication();

  const requirements: PractitionerRequirement[] = data?.requirements ?? [];

  // Active fulfillment state
  const [activeFulfillmentReq, setActiveFulfillmentReq] = useState<PractitionerRequirement | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenFulfillment = (req: PractitionerRequirement) => {
    setActiveFulfillmentReq(req);
    setFieldValue("");
    setSelectedFile(null);
  };

  const handleCloseFulfillment = () => {
    setActiveFulfillmentReq(null);
    setFieldValue("");
    setSelectedFile(null);
  };

  const handleFulfillSubmit = async () => {
    if (!activeFulfillmentReq) return;

    setIsSubmitting(true);
    try {
      if (activeFulfillmentReq.credentialType && selectedFile) {
        // Document fulfillment
        await uploadCredentialMutation.mutateAsync({
          file: selectedFile,
          credentialType: activeFulfillmentReq.credentialType,
        });
      } else if (activeFulfillmentReq.fieldPath) {
        // Field fulfillment
        const payload: Record<string, any> = {};
        if (activeFulfillmentReq.fieldPath === "yearsOfExperience") {
          payload.yearsOfExperience = Number(fieldValue);
        } else {
          payload[activeFulfillmentReq.fieldPath] = fieldValue;
        }
        await saveDraftMutation.mutateAsync(payload);
      }

      // Re-submit application snapshot to trigger status progression if in onboarding
      await submitApplicationMutation.mutateAsync({});

      toast.success(
        isRtl
          ? "تم إرسال التعديل المطلوب للمراجعة بنجاح"
          : "Requested update submitted for review"
      );
      handleCloseFulfillment();
      refetch();
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isRtl ? "تعذر إرسال التعديل، يرجى المحاولة ثانية" : "Failed to submit update")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requirements.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-text-primary dark:text-white">
          {isRtl ? "لا توجد متطلبات أو تعديلات مطلوبة حالياً" : "No Actionable Requirements"}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {isRtl
            ? "كافة بياناتك ومستنداتك معتمدة ولا يوجد إجراء مطلوب منك."
            : "All your profile details and documents are verified."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      {/* Top Notice */}
      <SurfaceCard variant="page" className="border-amber-200 bg-amber-50/40 p-6 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary dark:text-white">
              {isRtl
                ? `سويّة بحاجة إلى استكمال (${requirements.length}) من المتطلبات`
                : `Sawiyaa Needs (${requirements.length}) Items from You`}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary dark:text-white/80">
              {isRtl
                ? "قام فريق المراجعة بطلب تحديث بعض البيانات أو المستندات لمتابعة اعتماد حسابك. يرجى استكمال كل عنصر مباشرة."
                : "The review team has requested updates for specific items. Please complete each requirement directly below."}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.map((req) => {
          const isSubmitted = req.status === "SUBMITTED";
          const isRejected = req.status === "REJECTED";

          return (
            <SurfaceCard
              key={req.id}
              variant="section"
              className={`p-5 transition-all ${
                isSubmitted
                  ? "border-primary/20 bg-primary/[0.02]"
                  : "border-border-light bg-surface-primary"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary dark:text-white">
                      {req.title}
                    </h3>
                    <Badge
                      variant="solid"
                      color={isSubmitted ? "primary" : isRejected ? "error" : "warning"}
                      size="sm"
                    >
                      {isSubmitted
                        ? isRtl
                          ? "تم الإرسال للمراجعة"
                          : "Submitted for Review"
                        : isRejected
                          ? isRtl
                            ? "يتطلب إعادة التعديل"
                            : "Needs Revision"
                          : isRtl
                            ? "مطلوب إجراء"
                            : "Action Required"}
                    </Badge>
                  </div>

                  {/* Reason & Instructions */}
                  <div className="rounded-xl border border-border-light bg-surface-secondary/50 p-3 text-xs leading-relaxed text-text-secondary dark:border-white/5 dark:bg-white/[0.02]">
                    <p className="font-semibold text-text-primary dark:text-white">
                      {isRtl ? "ملاحظة المراجع:" : "Reviewer Note:"}
                    </p>
                    <p className="mt-0.5">{req.reason}</p>
                    {req.instructions && (
                      <p className="mt-1 text-text-muted italic">{req.instructions}</p>
                    )}
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="self-end sm:self-center shrink-0">
                  {isSubmitted ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Clock3 className="h-4 w-4" />
                      <span>{isRtl ? "قيد المراجعة" : "Under Review"}</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenFulfillment(req)}
                      className="gap-2 text-xs font-bold"
                    >
                      {req.credentialType ? (
                        <Upload className="h-3.5 w-3.5" />
                      ) : (
                        <Edit3 className="h-3.5 w-3.5" />
                      )}
                      {isRtl ? "استكمال وتعديل" : "Fulfill Requirement"}
                    </Button>
                  )}
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {/* FULFILLMENT MODAL / DIALOG */}
      {activeFulfillmentReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-surface-primary p-6 shadow-2xl dark:bg-surface-secondary">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-text-primary dark:text-white">
                  {activeFulfillmentReq.title}
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  {activeFulfillmentReq.reason}
                </p>
              </div>

              {/* Document Uploader */}
              {activeFulfillmentReq.credentialType ? (
                <div className="space-y-2">
                  <Label>
                    {isRtl ? "اختر الملف الجديد (PDF أو صورة)" : "Select New File (PDF or Image)"} <span className="text-danger">*</span>
                  </Label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-hover"
                  />
                  {selectedFile && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {isRtl ? "تم اختيار:" : "Selected:"} {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
                /* Field Input */
                <div className="space-y-2">
                  <Label>
                    {isRtl ? "القيمة الجديدة المعدلة" : "Updated Value"} <span className="text-danger">*</span>
                  </Label>
                  {activeFulfillmentReq.fieldPath === "bio" ? (
                    <TextArea
                      rows={4}
                      value={fieldValue}
                      onChange={(val) => setFieldValue(val)}
                      placeholder={isRtl ? "اكتب النص المعدل هنا..." : "Enter updated text here..."}
                    />
                  ) : (
                    <InputField
                      type={activeFulfillmentReq.fieldPath === "yearsOfExperience" ? "number" : "text"}
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      placeholder={isRtl ? "أدخل القيمة المعدلة..." : "Enter updated value..."}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseFulfillment}
                  disabled={isSubmitting}
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFulfillSubmit}
                  disabled={
                    isSubmitting ||
                    (activeFulfillmentReq.credentialType ? !selectedFile : !fieldValue.trim())
                  }
                  className="gap-2"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isRtl ? "إرسال التعديل" : "Submit Update"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
