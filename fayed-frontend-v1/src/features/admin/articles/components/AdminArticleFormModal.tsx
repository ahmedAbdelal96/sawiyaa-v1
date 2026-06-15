"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImageUp, Loader2, Plus, Save } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import {
  useAdminSpecialties,
  useAdminSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import { resolveCoverImageUrl } from "@/features/articles-public/lib/resolve-cover-image-url";
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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: boolean;
    categoryId?: boolean;
    specialtyId?: boolean;
    content?: boolean;
    coverImageUrl?: boolean;
  }>({});

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data?.categories ?? []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [categoriesQuery.data?.categories],
  );

  const specialtyOptions = useMemo(
    () =>
      (specialtiesQuery.data?.specialties ?? [])
        .filter((item) => item.category?.id === form.categoryId)
        .map((item) => ({ value: item.id, label: item.name ?? item.slug })),
    [specialtiesQuery.data?.specialties, form.categoryId],
  );

  const handleChange = (field: keyof FormState, value: string) => {
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: false }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;

    setError(null);
    setFieldErrors((current) => ({ ...current, coverImageUrl: false }));

    try {
      const result = await uploadCoverMutation.mutateAsync(file);
      setForm((current) => ({ ...current, coverImageUrl: result.url }));
    } catch {
      setFieldErrors((current) => ({ ...current, coverImageUrl: true }));
      setError(t("errors.generic"));
    }
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    const nextFieldErrors: {
      title?: boolean;
      categoryId?: boolean;
      specialtyId?: boolean;
      content?: boolean;
    } = {};
    if (!title) nextFieldErrors.title = true;
    if (!form.categoryId) nextFieldErrors.categoryId = true;
    if (!form.specialtyId) nextFieldErrors.specialtyId = true;
    if (!content) nextFieldErrors.content = true;

    if (
      nextFieldErrors.title ||
      nextFieldErrors.categoryId ||
      nextFieldErrors.specialtyId ||
      nextFieldErrors.content
    ) {
      setFieldErrors((current) => ({ ...current, ...nextFieldErrors }));
      setError(t("form.validation.required"));
      return;
    }

    try {
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
    } catch {
      setError(t("errors.generic"));
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
            error={!!fieldErrors.categoryId}
            onChange={(value) =>
              setForm((current) => ({ ...current, categoryId: value, specialtyId: "" }))
            }
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
            error={!!fieldErrors.specialtyId}
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
            error={!!fieldErrors.title}
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
            error={!!fieldErrors.content}
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
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-status-danger-border bg-status-danger-soft px-4 py-3 text-sm text-status-danger">
          {error}
        </p>
      ) : null}
    </FormModal>
  );
}
