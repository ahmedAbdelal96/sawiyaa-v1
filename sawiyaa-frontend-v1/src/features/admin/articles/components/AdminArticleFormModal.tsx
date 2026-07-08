"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImageUp, Loader2, Plus, Save } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import FieldErrorMessage from "@/components/form/error/FieldErrorMessage";
import { FormErrorSummary } from "@/components/form/error/FormErrorSummary";
import {
  useAdminSpecialties,
  useAdminSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";
import { resolveCoverImageUrl } from "@/features/articles-public/lib/resolve-cover-image-url";
import { normalizeFormError, type NormalizedFormError } from "@/lib/form-errors";
import { useUploadAdminArticleCover } from "../hooks/use-admin-articles";
import type {
  AdminArticleItem,
  CreateAdminArticleInput,
} from "../types/admin-articles.types";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  article?: AdminArticleItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminArticleInput) => Promise<void>;
};

type FormState = {
  title: string;
  categoryId: string;
  specialtyId: string;
  content: string;
  coverImageUrl: string;
};

type FormFieldName = keyof Pick<
  FormState,
  "title" | "categoryId" | "specialtyId" | "content" | "coverImageUrl"
>;

const EMPTY_FORM: FormState = {
  title: "",
  categoryId: "",
  specialtyId: "",
  content: "",
  coverImageUrl: "",
};

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized) return normalized;
  return `article-${Date.now().toString(36)}`;
}

function toFormState(article: AdminArticleItem): FormState {
  return {
    title: article.title ?? "",
    categoryId: "",
    specialtyId: "",
    content: article.content ?? "",
    coverImageUrl: article.coverImageUrl ?? "",
  };
}

function summarizeExcerpt(value: string) {
  const normalized = value
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return undefined;
  return normalized.slice(0, 220);
}

export default function AdminArticleFormModal({
  isOpen,
  mode,
  article,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslations("admin-articles");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const categoriesQuery = useAdminSpecialtyCategories(undefined, isOpen);
  const specialtiesQuery = useAdminSpecialties(undefined, isOpen);
  const uploadCoverMutation = useUploadAdminArticleCover();
  const initialForm = mode === "edit" && article ? toFormState(article) : EMPTY_FORM;

  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<NormalizedFormError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormFieldName, string>>>({});

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data?.categories ?? []).map((item) => ({
        value: item.id,
        label: getLocalizedSpecialtyCategoryName(item, locale),
      })),
    [categoriesQuery.data?.categories, locale],
  );

  const specialtyOptions = useMemo(
    () =>
      (specialtiesQuery.data?.specialties ?? [])
        .filter((item) => item.category?.id === form.categoryId)
        .map((item) => ({
          value: item.id,
          label: getLocalizedSpecialtyName(item, locale),
        })),
    [specialtiesQuery.data?.specialties, form.categoryId, locale],
  );

  const clearFields = (...fields: FormFieldName[]) => {
    if (fields.length === 0) {
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        delete next[field];
      });
      return next;
    });
  };

  const handleChange = (
    field: FormFieldName,
    value: string,
    clearRelatedFields: FormFieldName[] = [],
  ) => {
    setError(null);
    clearFields(field, ...clearRelatedFields);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;

    setError(null);
    clearFields("coverImageUrl");

    try {
      const result = await uploadCoverMutation.mutateAsync(file);
      setForm((current) => ({ ...current, coverImageUrl: result.url }));
    } catch {
      setFieldErrors((current) => ({
        ...current,
        coverImageUrl: t("errors.coverUploadFailed"),
      }));
      setError({
        message: t("errors.saveFailed"),
        fieldErrors: { coverImageUrl: t("errors.coverUploadFailed") },
        statusCode: 500,
      });
    }
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    const nextFieldErrors: Partial<Record<FormFieldName, string>> = {};
    if (!title) nextFieldErrors.title = t("form.validation.titleRequired");
    if (!form.categoryId) nextFieldErrors.categoryId = t("form.validation.categoryRequired");
    if (!form.specialtyId) nextFieldErrors.specialtyId = t("form.validation.specialtyRequired");
    if (!content) nextFieldErrors.content = t("form.validation.contentRequired");

    if (
      nextFieldErrors.title ||
      nextFieldErrors.categoryId ||
      nextFieldErrors.specialtyId ||
      nextFieldErrors.content
    ) {
      setFieldErrors((current) => ({ ...current, ...nextFieldErrors }));
      setError({
        message: t("errors.reviewRequired"),
        fieldErrors: nextFieldErrors as Record<string, string>,
        statusCode: 400,
      });
      return;
    }

    try {
      setError(null);
      const payload: CreateAdminArticleInput = {
        locale,
        title,
        slug: mode === "edit" && article?.slug ? article.slug : slugify(title),
        specialtyId: form.specialtyId,
        excerpt: summarizeExcerpt(content),
        content,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      const normalized = normalizeFormError(error, t("errors.saveFailed"));
      const normalizedFieldErrors = Object.entries(normalized.fieldErrors).reduce<Partial<Record<FormFieldName, string>>>(
        (acc, [field, message]) => {
          if (field === "title" || field === "categoryId" || field === "specialtyId" || field === "content" || field === "coverImageUrl") {
            acc[field] = message;
          }
          return acc;
        },
        {},
      );

      if (Object.keys(normalizedFieldErrors).length > 0) {
        setFieldErrors((current) => ({ ...current, ...normalizedFieldErrors }));
      }

      setError({
        ...normalized,
        fieldErrors: {
          ...normalizedFieldErrors,
        },
      });
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={mode === "create" ? t("form.createTitle") : t("form.editTitle")}
      description={mode === "create" ? t("form.createNote") : t("form.editNote")}
      eyebrow={t("form.eyebrow")}
      loading={loading}
      onSubmit={handleSubmit}
      submitLabel={
        loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "create" ? t("actions.creating") : t("actions.saving")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {mode === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? t("actions.create") : t("actions.save")}
          </span>
        )
      }
      cancelLabel={t("actions.cancel")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {locale === "ar" ? "التخصص الرئيسي" : "Main specialty"}{" "}
            <span className="text-status-danger">*</span>
          </Label>
          <Select
            key={`article-main-category-${isOpen}-${mode}-${article?.id ?? "new"}`}
            options={categoryOptions}
            placeholder={locale === "ar" ? "اختر تخصص رئيسي" : "Choose main specialty"}
            defaultValue={form.categoryId}
            error={Boolean(fieldErrors.categoryId)}
            hint={fieldErrors.categoryId}
            onChange={(value) => {
              handleChange("categoryId", value, ["specialtyId"]);
              setForm((current) => ({ ...current, specialtyId: "" }));
            }}
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {locale === "ar" ? "التخصص الفرعي" : "Sub-specialty"}{" "}
            <span className="text-status-danger">*</span>
          </Label>
          <Select
            key={`article-specialty-${isOpen}-${mode}-${article?.id ?? "new"}`}
            options={specialtyOptions}
            placeholder={
              form.categoryId
                ? locale === "ar"
                  ? "اختر تخصص فرعي"
                  : "Choose sub-specialty"
                : locale === "ar"
                  ? "اختر التخصص الرئيسي أولاً"
                  : "Select main specialty first"
            }
            defaultValue={form.specialtyId}
            error={Boolean(fieldErrors.specialtyId)}
            hint={fieldErrors.specialtyId}
            onChange={(value) => handleChange("specialtyId", value)}
          />
          {!form.categoryId ? (
            <p className="mt-1 text-xs text-text-muted">
              {locale === "ar"
                ? "لا يمكن اختيار تخصص فرعي قبل اختيار تخصص رئيسي."
                : "Sub-specialty is disabled until main specialty is selected."}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {t("form.fields.title")} <span className="text-status-danger">*</span>
          </Label>
          <InputField
            value={form.title}
            required
            error={Boolean(fieldErrors.title)}
            hint={fieldErrors.title}
            onChange={(event) => handleChange("title", event.target.value)}
            placeholder={t("form.fields.titlePlaceholder")}
            className="px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {t("form.fields.content")} <span className="text-status-danger">*</span>
          </Label>
          <TextArea
            rows={8}
            value={form.content}
            error={Boolean(fieldErrors.content)}
            hint={fieldErrors.content}
            onChange={(value) => handleChange("content", value)}
            placeholder={t("form.fields.contentPlaceholder")}
            className="min-h-[180px] px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {locale === "ar" ? "صورة الغلاف" : "Cover image"}
          </Label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-light px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary">
              <ImageUp className="h-4 w-4" />
              <span>
                {uploadCoverMutation.isPending
                  ? locale === "ar"
                    ? "جاري رفع الصورة..."
                    : "Uploading image..."
                  : locale === "ar"
                    ? "اختر صورة من الجهاز"
                    : "Choose image from device"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploadCoverMutation.isPending}
                onChange={(event) => handleCoverUpload(event.target.files?.[0])}
              />
            </label>
            {form.coverImageUrl ? (
              <div className="rounded-xl border border-border-light p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveCoverImageUrl(form.coverImageUrl) ?? form.coverImageUrl}
                  alt="article cover"
                  className="max-h-40 w-auto rounded-lg object-contain"
                />
              </div>
            ) : null}
            <FieldErrorMessage message={fieldErrors.coverImageUrl} />
          </div>
        </div>
      </div>

      <FormErrorSummary
        className="mt-4"
        message={error?.message}
        details={error?.requestId ? t("errors.referenceId", { requestId: error.requestId }) : undefined}
      />
    </FormModal>
  );
}
