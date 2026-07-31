"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit3, Eye, FilePlus2, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import DateField from "@/components/form/input/DateField";
import Label from "@/components/form/Label";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePractitionerProfile } from "../hooks/use-practitioners";
import { formatPractitionerOrViewerDate } from "@/lib/time-formatting";
import { toAppError } from "@/lib/api/errors";
import { useDeletePractitionerCredential, usePractitionerCredentials, useUploadPractitionerCredential, useViewPractitionerCredential } from "../hooks/use-practitioners";
import type { CredentialReviewStatus, CredentialType, PractitionerCredential } from "../types/practitioners.types";

const statusClasses: Record<CredentialReviewStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-600",
};

const credentialTypes: CredentialType[] = [
  "LICENSE",
  "DEGREE",
  "NATIONAL_ID_FRONT",
  "NATIONAL_ID_BACK",
  "PASSPORT",
  "MEMBERSHIP",
  "OTHER",
];

type FormState = {
  credentialType: CredentialType;
  expiresAt: string;
  selectedFileName: string;
  selectedFile: File | null;
};

const initialFormState: FormState = {
  credentialType: "LICENSE",
  expiresAt: "",
  selectedFileName: "",
  selectedFile: null,
};

type PractitionerCredentialsListProps = {
  isEditable?: boolean;
  compact?: boolean;
};

function getCredentialTypeLabel(type: CredentialType, locale: string) {
  const isAr = locale === "ar";
  const labels: Record<CredentialType, string> = {
    LICENSE: isAr ? "ترخيص" : "License",
    DEGREE: isAr ? "شهادة علمية" : "Degree",
    CERTIFICATION: isAr ? "شهادة اعتماد" : "Certification",
    NATIONAL_ID_FRONT: isAr ? "بطاقة الهوية - الوجه الأمامي" : "National ID - Front",
    NATIONAL_ID_BACK: isAr ? "بطاقة الهوية - الوجه الخلفي" : "National ID - Back",
    NATIONAL_ID: isAr ? "بطاقة الهوية الوطنية" : "National ID",
    PASSPORT: isAr ? "جواز سفر" : "Passport",
    MEMBERSHIP: isAr ? "كارنيه النقابة" : "Syndicate card",
    OTHER: isAr ? "أخرى" : "Other",
  };
  return labels[type];
}

export default function PractitionerCredentialsList({
  isEditable = true,
  compact = false,
}: PractitionerCredentialsListProps) {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const dateLocale = isArabic ? "ar-SA" : "en-US";
  const profileQuery = usePractitionerProfile();
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;

  const query = usePractitionerCredentials();
  const uploadCredential = useUploadPractitionerCredential();
  const deleteCredential = useDeletePractitionerCredential();
  const viewCredential = useViewPractitionerCredential();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PractitionerCredential | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [uploadError, setUploadError] = useState("");
  const [viewingCredentialId, setViewingCredentialId] = useState<string | null>(null);

  const rows = useMemo(() => query.data?.credentials ?? [], [query.data?.credentials]);

  const profileStatus = profileQuery.data?.profile.profileStatus;
  const canDelete = isEditable &&
    (profileStatus === "DRAFT" || profileStatus === "REJECTED");

  const copy = {
    viewError: isArabic ? "تعذر فتح المستند. حاول مرة أخرى." : "Could not open the document. Try again.",
    delete: isArabic ? "حذف" : "Delete",
    deleteConfirm: isArabic ? "هل تريد حذف هذا المستند؟" : "Delete this document?",
    deleteSuccess: isArabic ? "تم حذف المستند." : "Document deleted.",
    deleteError: isArabic ? "تعذر حذف المستند. حاول مرة أخرى." : "Could not delete the document. Try again.",
    title: isArabic ? "المستندات" : "Documents",
    add: isArabic ? "رفع مستند" : "Upload document",
    edit: isArabic ? "تعديل" : "Edit",
    modalAddTitle: isArabic ? "رفع مستند" : "Upload document",
    modalEditTitle: isArabic ? "تعديل المستند" : "Edit document",
    modalDescription: isArabic ? "اختر ملفًا من جهازك ثم احفظ." : "Choose a file from your device then save.",
    type: isArabic ? "النوع" : "Type",
    file: isArabic ? "الملف" : "File",
    status: isArabic ? "الحالة" : "Status",
    expiry: isArabic ? "تاريخ الانتهاء" : "Expiry",
    actions: isArabic ? "الإجراء" : "Action",
    noRows: isArabic ? "لا يوجد مستندات مضافة بعد." : "No documents added yet.",
    openFile: isArabic ? "فتح الملف" : "Open file",
    chooseFile: isArabic ? "اختر ملفًا من جهازك" : "Choose a file from your device",
    selectedFile: isArabic ? "الملف المختار" : "Selected file",
    noteUnavailable: isArabic
      ? "ملاحظات المستند غير متاحة للحفظ حالياً في هذا المسار."
      : "Document notes are not available for saving in this flow yet.",
    supportedTypes: isArabic ? "الأنواع المدعومة: PDF أو صورة" : "Supported types: PDF or image",
    maxSize: isArabic ? "الحد الأقصى لحجم الملف 5 ميجابايت" : "Maximum file size is 5MB",
    fileRequired: isArabic ? "يرجى اختيار ملف قبل الحفظ." : "Please choose a file before saving.",
    fileTypeError: isArabic ? "لا يمكن رفع هذا النوع من الملفات." : "This file type is not supported.",
    fileSizeError: isArabic ? "حجم الملف أكبر من المسموح." : "File is larger than the allowed limit.",
    success: isArabic ? "تم رفع المستند بنجاح" : "Document uploaded successfully",
    save: isArabic ? "حفظ" : "Save",
    saveChanges: isArabic ? "حفظ التعديل" : "Save changes",
    cancel: isArabic ? "إلغاء" : "Cancel",
  };

  const handleView = async (credentialId: string) => {
    if (viewCredential.isPending) return;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    setViewingCredentialId(credentialId);
    try {
      const blob = await viewCredential.mutateAsync(credentialId);
      const url = URL.createObjectURL(blob);
      if (popup) popup.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      popup?.close();
      toast.error(copy.viewError);
    } finally {
      setViewingCredentialId(null);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (!canDelete || deleteCredential.isPending || !window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteCredential.mutateAsync(credentialId);
      toast.success(copy.deleteSuccess);
    } catch {
      toast.error(copy.deleteError);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(initialFormState);
    setUploadError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: PractitionerCredential) => {
    setEditingItem(item);
    setForm({
      credentialType: item.credentialType,
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
      selectedFileName: "",
      selectedFile: null,
    });
    setUploadError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (form.credentialType !== "OTHER" && rows.some((item) => item.credentialType === form.credentialType)) {
      setUploadError(t("credentials.feedback.duplicateError"));
      return;
    }

    if (!form.selectedFile) {
      setUploadError(copy.fileRequired);
      return;
    }

    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(form.selectedFile.type)) {
      setUploadError(copy.fileTypeError);
      return;
    }
    if (form.selectedFile.size > 5 * 1024 * 1024) {
      setUploadError(copy.fileSizeError);
      return;
    }

    try {
      setUploadError("");
      await uploadCredential.mutateAsync({
        file: form.selectedFile,
        credentialType: form.credentialType,
        expiresAt: form.expiresAt || null,
      });
      setIsModalOpen(false);
      setEditingItem(null);
      setForm(initialFormState);
      toast.success(copy.success);
    } catch (error) {
      const appError = toAppError(error, { requestPath: "/practitioners/me/credentials/upload" });
      toast.error(appError.message || t("credentials.feedback.uploadError"));
    }
  };

  if (query.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-20" />;
  }

  if (query.isError || !query.data) {
    return (
      <StateCard
        icon={<TriangleAlert className="h-8 w-8 text-red-500" />}
        title={t("credentials.feedback.loadError")}
        note={t("credentials.feedback.loadErrorNote")}
        action={{ label: t("credentials.feedback.retry"), onClick: () => query.refetch() }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{copy.title}</h3>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={openAddModal}
          disabled={!isEditable}
          startIcon={<FilePlus2 className="h-4 w-4" />}
        >
          {copy.add}
        </Button>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-light bg-white ${compact ? "" : ""}`}>
        <div className="grid grid-cols-12 gap-2 border-b border-border-light bg-surface-tertiary/60 px-4 py-3 text-xs font-semibold text-text-secondary">
          <div className="col-span-3">{copy.type}</div>
          <div className="col-span-3">{copy.file}</div>
          <div className="col-span-2">{copy.status}</div>
          <div className="col-span-3">{copy.expiry}</div>
          <div className="col-span-1">{copy.actions}</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-text-secondary">{copy.noRows}</div>
        ) : (
          <div className="divide-y divide-border-light">
            {rows.map((item) => (
              <div key={item.credentialId} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-3 text-text-primary">{t(`credentials.type.${item.credentialType}` as Parameters<typeof t>[0])}</div>
                <div className="col-span-3">
                  <button type="button" onClick={() => void handleView(item.credentialId)} disabled={viewCredential.isPending} className="inline-flex items-center gap-1 text-primary hover:underline">
                    {viewingCredentialId === item.credentialId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    {copy.openFile}
                  </button>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[item.reviewStatus]}`}>
                    {t(`credentials.status.${item.reviewStatus}`)}
                  </span>
                </div>
                <div className="col-span-3 text-text-secondary">
                  {item.expiresAt
                    ? formatPractitionerOrViewerDate(item.expiresAt, practitionerTimeZone, {
                        locale: dateLocale,
                        fallbackText: t("credentials.noExpiry"),
                      })
                    : t("credentials.noExpiry")}
                </div>
                <div className="col-span-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    disabled={!isEditable}
                    className="inline-flex items-center rounded-lg border border-border-light px-2 py-1 text-xs text-text-secondary hover:bg-surface-tertiary"
                    aria-label={copy.edit}
                    title={copy.edit}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  {canDelete ? (
                    <button type="button" onClick={() => void handleDelete(item.credentialId)} disabled={deleteCredential.isPending} className="inline-flex items-center rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50" aria-label={copy.delete} title={copy.delete}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" ariaLabel={editingItem ? copy.modalEditTitle : copy.modalAddTitle}>
        <ModalHeader title={editingItem ? copy.modalEditTitle : copy.modalAddTitle} description={copy.modalDescription} />
        <ModalBody className="space-y-4">
          <div>
            <Label htmlFor="credential-type">{t("credentials.form.typeLabel")}</Label>
            <select
              id="credential-type"
              value={form.credentialType}
              onChange={(event) => setForm((current) => ({ ...current, credentialType: event.target.value as CredentialType }))}
              disabled={!isEditable}
              className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
            >
              {credentialTypes.map((type) => (
                <option key={type} value={type} disabled={type !== "OTHER" && rows.some((item) => item.credentialType === type)}>
                  {t(`credentials.type.${type}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="credential-file">{copy.chooseFile}</Label>
            <input
              id="credential-file"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              disabled={!isEditable}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setForm((current) => ({ ...current, selectedFile: file, selectedFileName: file?.name ?? "" }));
                if (uploadError) setUploadError("");
              }}
              className="app-control h-11 w-full cursor-pointer px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-secondary">{copy.supportedTypes}</p>
            <p className="text-xs text-text-secondary">{copy.maxSize}</p>
            {form.selectedFileName ? (
              <p className="mt-1 text-xs text-text-secondary">{copy.selectedFile}: {form.selectedFileName}</p>
            ) : null}
          </div>

          <p className="rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
            {copy.noteUnavailable}
          </p>

          <DateField
            label={t("credentials.form.expiresAtLabel")}
            placeholder={t("credentials.form.expiresAtPlaceholder")}
            value={form.expiresAt}
            onChange={(value) => setForm((current) => ({ ...current, expiresAt: value }))}
            disabled={!isEditable}
          />

          {uploadError ? (
            <p className="rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-900">{uploadError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isEditable || uploadCredential.isPending}
              startIcon={uploadCredential.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {uploadCredential.isPending ? t("credentials.actions.uploading") : editingItem ? copy.saveChanges : copy.save}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {copy.cancel}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
