"use client";

import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  usePractitionerCredentials,
  useUploadPractitionerCredential,
  useDeletePractitionerCredential,
  useViewPractitionerCredential,
} from "../../hooks/use-practitioners";
import type {
  CredentialType,
  PractitionerCredential,
} from "../../types/practitioners.types";

type DocumentRequirementConfig = {
  key: string;
  type: CredentialType;
  titleKey: string;
  descriptionKey: string;
  acceptedTypes: CredentialType[];
};

export default function PractitionerDocumentsSection({
  countryCode,
  isLocked = false,
}: {
  countryCode?: string | null;
  isLocked?: boolean;
}) {
  const t = useTranslations("practitioner-area.application.documents");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: credentialsData, isLoading } = usePractitionerCredentials();
  const uploadMutation = useUploadPractitionerCredential();
  const deleteMutation = useDeletePractitionerCredential();
  const viewMutation = useViewPractitionerCredential();

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<CredentialType | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const credentials: PractitionerCredential[] = credentialsData?.credentials ?? [];

  // Determine required document slots based on country
  const isEgypt = !countryCode || countryCode.toUpperCase() === "EG";

  const documentSlots: DocumentRequirementConfig[] = isEgypt
    ? [
        {
          key: "national_id_front",
          type: "NATIONAL_ID_FRONT",
          titleKey: "nationalIdFront.title",
          descriptionKey: "nationalIdFront.description",
          acceptedTypes: ["NATIONAL_ID_FRONT"],
        },
        {
          key: "national_id_back",
          type: "NATIONAL_ID_BACK",
          titleKey: "nationalIdBack.title",
          descriptionKey: "nationalIdBack.description",
          acceptedTypes: ["NATIONAL_ID_BACK"],
        },
        {
          key: "academic_degree",
          type: "DEGREE",
          titleKey: "degree.title",
          descriptionKey: "degree.description",
          acceptedTypes: ["DEGREE"],
        },
        {
          key: "professional_license",
          type: "MEMBERSHIP",
          titleKey: "professionalLicense.title",
          descriptionKey: "professionalLicense.description",
          acceptedTypes: ["MEMBERSHIP", "LICENSE"],
        },
      ]
    : [
        {
          key: "national_id",
          type: "NATIONAL_ID",
          titleKey: "nationalId.title",
          descriptionKey: "nationalId.description",
          acceptedTypes: ["NATIONAL_ID", "NATIONAL_ID_FRONT"],
        },
        {
          key: "academic_degree",
          type: "DEGREE",
          titleKey: "degree.title",
          descriptionKey: "degree.description",
          acceptedTypes: ["DEGREE"],
        },
        {
          key: "professional_license",
          type: "MEMBERSHIP",
          titleKey: "professionalLicense.title",
          descriptionKey: "professionalLicense.description",
          acceptedTypes: ["MEMBERSHIP", "LICENSE"],
        },
      ];

  const handleFileSelect = async (
    targetType: CredentialType,
    file: File | null
  ) => {
    if (!file) return;

    // Validate size: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        isRtl
          ? "حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميجابايت)"
          : "File size exceeds maximum allowed size (5MB)"
      );
      return;
    }

    setUploadingType(targetType);
    try {
      await uploadMutation.mutateAsync({
        file,
        credentialType: targetType,
      });
      toast.success(
        isRtl ? "تم رفع المستند بنجاح" : "Document uploaded successfully"
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isRtl ? "فشل رفع المستند. يرجى المحاولة ثانية" : "Failed to upload document")
      );
    } finally {
      setUploadingType(null);
    }
  };

  const handlePreview = async (credentialId: string) => {
    try {
      setPreviewingId(credentialId);
      const blob = await viewMutation.mutateAsync(credentialId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error(
        isRtl ? "تعذر فتح معاينة المستند" : "Failed to open document preview"
      );
    } finally {
      setPreviewingId(null);
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      await deleteMutation.mutateAsync(credentialId);
      toast.success(
        isRtl ? "تم حذف المستند بنجاح" : "Document removed successfully"
      );
    } catch (err: any) {
      toast.error(
        err?.message || (isRtl ? "تعذر حذف المستند" : "Failed to remove document")
      );
    }
  };

  return (
    <div className="space-y-4">
      {documentSlots.map((slot) => {
        // Find if this requirement slot is satisfied
        const uploaded = credentials.find((c) =>
          slot.acceptedTypes.includes(c.credentialType)
        );

        const isUploading = uploadingType === slot.type;
        const isPreviewing = previewingId === uploaded?.credentialId;

        return (
          <div
            key={slot.key}
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              uploaded
                ? "border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                : "border-border-light bg-surface-primary dark:bg-white/[0.02]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    uploaded
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-surface-secondary text-text-muted dark:bg-white/5"
                  }`}
                >
                  {uploaded ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-text-primary dark:text-white">
                      {t(slot.titleKey as any, {
                        defaultValue:
                          slot.key === "national_id_front"
                            ? "بطاقة الرقم القومي (الوجه الأمامي)"
                            : slot.key === "national_id_back"
                              ? "بطاقة الرقم القومي (الوجه الخلفي)"
                              : slot.key === "academic_degree"
                                ? "شهادة المؤهل الدراسي"
                                : "كارنيه النقابة أو ترخيص مزاولة المهنة",
                      })}
                    </h4>
                    {uploaded ? (
                      <Badge variant="solid" color="success" size="sm">
                        {isRtl ? "تم الرفع" : "Uploaded"}
                      </Badge>
                    ) : (
                      <Badge variant="light" color="warning" size="sm">
                        {isRtl ? "مطلوب" : "Required"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {t(slot.descriptionKey as any, {
                      defaultValue:
                        slot.key === "national_id_front"
                          ? "صورة واضحة للوجه الأمامي للبطاقة الشخصية سارية المفعول."
                          : slot.key === "national_id_back"
                            ? "صورة واضحة للوجه الخلفي للبطاقة الشخصية."
                            : slot.key === "academic_degree"
                              ? "شهادة التخرج أو الدرجة العلمية في التخصص النفسي أو الإرشادي."
                              : "إثبات القيد في النقابة المهنية أو ترخيص مزاولة المهنة المعتمد.",
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[slot.key] = el;
                  }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) handleFileSelect(slot.type, file);
                    e.target.value = "";
                  }}
                  disabled={isLocked || isUploading}
                />

                {uploaded ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(uploaded.credentialId)}
                      disabled={isPreviewing}
                      className="gap-1.5 text-xs"
                    >
                      {isPreviewing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {isRtl ? "معاينة" : "View"}
                    </Button>

                    {!isLocked && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRefs.current[slot.key]?.click()}
                          disabled={isUploading}
                          className="gap-1.5 text-xs text-text-muted hover:text-text-primary"
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {isRtl ? "استبدال" : "Replace"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(uploaded.credentialId)}
                          disabled={deleteMutation.isPending}
                          className="gap-1.5 text-xs text-danger hover:bg-danger-50 dark:hover:bg-danger-950/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {isRtl ? "حذف" : "Remove"}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRefs.current[slot.key]?.click()}
                    disabled={isLocked || isUploading}
                    className="gap-2 text-xs"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isRtl ? "رفع الملف" : "Upload File"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
