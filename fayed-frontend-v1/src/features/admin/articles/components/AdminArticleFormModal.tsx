"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Save } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { useAdminArticleCategories } from "../hooks/use-admin-articles";
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
  slug: string;
  categoryId: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  categoryId: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  featuredImageAlt: "",
  metaTitle: "",
  metaDescription: "",
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
    slug: article.slug ?? "",
    categoryId: article.category?.id ?? "",
    excerpt: article.excerpt ?? "",
    content: article.content ?? "",
    coverImageUrl: article.coverImageUrl ?? "",
    featuredImageAlt: "",
    metaTitle: article.seo?.metaTitle ?? "",
    metaDescription: article.seo?.metaDescription ?? "",
  };
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
  const categoriesQuery = useAdminArticleCategories(locale, isOpen);
  const initialForm = mode === "edit" && article ? toFormState(article) : EMPTY_FORM;

  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: boolean;
    categoryId?: boolean;
    content?: boolean;
  }>({});

  const categories = useMemo(
    () => (categoriesQuery.data?.items ?? []).map((item) => ({ value: item.id, label: item.title })),
    [categoriesQuery.data?.items],
  );

  const handleChange = (field: keyof FormState, value: string) => {
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: false }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    const nextFieldErrors: { title?: boolean; categoryId?: boolean; content?: boolean } = {};
    if (!title) nextFieldErrors.title = true;
    if (!form.categoryId) nextFieldErrors.categoryId = true;
    if (!content) nextFieldErrors.content = true;

    if (nextFieldErrors.title || nextFieldErrors.categoryId || nextFieldErrors.content) {
      setFieldErrors((current) => ({ ...current, ...nextFieldErrors }));
      setError(t("form.validation.required"));
      return;
    }

    try {
      const payload: CreateAdminArticleInput = {
        locale,
        title,
        slug: mode === "edit" && article?.slug ? article.slug : slugify(form.slug.trim() || title),
        primaryCategoryId: form.categoryId,
        excerpt: form.excerpt.trim() || undefined,
        content,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        featuredImageAlt: form.featuredImageAlt.trim() || undefined,
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
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
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.category")} <span className="text-error-500">*</span>
          </Label>
          <Select
            key={`article-category-${isOpen}-${mode}-${article?.id ?? "new"}`}
            options={categories}
            placeholder={t("form.fields.categoryPlaceholder")}
            defaultValue={form.categoryId}
            className={fieldErrors.categoryId ? "border-error-500" : ""}
            onChange={(value) => handleChange("categoryId", value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.title")} <span className="text-error-500">*</span>
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
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.content")} <span className="text-error-500">*</span>
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

        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.excerpt")}
          </Label>
          <TextArea
            rows={4}
            value={form.excerpt}
            onChange={(value) => handleChange("excerpt", value)}
            placeholder={t("form.fields.excerptPlaceholder")}
            className="min-h-[110px] px-4 py-3"
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.coverImageUrl")}
          </Label>
          <InputField
            value={form.coverImageUrl}
            onChange={(event) => handleChange("coverImageUrl", event.target.value)}
            placeholder={t("form.fields.coverImageUrlPlaceholder")}
            className="px-4 py-3"
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.featuredImageAlt")}
          </Label>
          <InputField
            value={form.featuredImageAlt}
            onChange={(event) => handleChange("featuredImageAlt", event.target.value)}
            placeholder={t("form.fields.featuredImageAltPlaceholder")}
            className="px-4 py-3"
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.metaTitle")}
          </Label>
          <InputField
            value={form.metaTitle}
            onChange={(event) => handleChange("metaTitle", event.target.value)}
            placeholder={t("form.fields.metaTitlePlaceholder")}
            className="px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("form.fields.metaDescription")}
          </Label>
          <TextArea
            rows={4}
            value={form.metaDescription}
            onChange={(value) => handleChange("metaDescription", value)}
            placeholder={t("form.fields.metaDescriptionPlaceholder")}
            className="min-h-[110px] px-4 py-3"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
          {error}
        </p>
      ) : null}
    </FormModal>
  );
}
