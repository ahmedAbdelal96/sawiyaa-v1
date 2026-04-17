"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import {
  useCreateSpecialtyCategory,
  useCreateSpecialty,
  useSpecialtyCategories,
  useUpdateSpecialty,
} from "@/features/specialties/hooks/use-specialties";
import type { Specialty } from "@/features/specialties/types/specialties.types";

type FormState = {
  categoryId: string;
  title: string;
  description: string;
  newCategoryTitle: string;
};

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  specialty?: Specialty | null;
  defaultSortOrder: number;
  initialCategoryId?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const EMPTY_FORM: FormState = {
  categoryId: "",
  title: "",
  description: "",
  newCategoryTitle: "",
};

const CREATE_CATEGORY_SENTINEL = "__create_new_category__";

function toFormState(specialty: Specialty): FormState {
  return {
    categoryId: specialty.category?.id ?? "",
    title: specialty.name ?? "",
    description: specialty.description ?? "",
    newCategoryTitle: "",
  };
}

function generateSpecialtySlug(title: string) {
  const normalized = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized) return normalized;

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `specialty-${Date.now()}-${randomSuffix}`;
}

export default function SpecialtyFormModal({
  isOpen,
  mode,
  specialty,
  defaultSortOrder,
  initialCategoryId,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("admin-area");
  const safeT = (key: string, fallback: string) => {
    try {
      return t(key as Parameters<typeof t>[0]);
    } catch {
      return fallback;
    }
  };
  const createMutation = useCreateSpecialty();
  const createCategoryMutation = useCreateSpecialtyCategory();
  const updateMutation = useUpdateSpecialty();
  const categoriesQuery = useSpecialtyCategories(isOpen);

  const initialForm =
    mode === "edit" && specialty
      ? toFormState(specialty)
      : {
          ...EMPTY_FORM,
          categoryId: initialCategoryId ?? "",
        };
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    categoryId?: boolean;
    title?: boolean;
  }>({});

  const isSubmitting =
    createMutation.isPending ||
    createCategoryMutation.isPending ||
    updateMutation.isPending;

  const handleChange = (field: keyof FormState, value: string) => {
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: false }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    const isCreatingCategory = form.categoryId === CREATE_CATEGORY_SENTINEL;
    const newCategoryTitle = form.newCategoryTitle.trim();
    const nextFieldErrors: { categoryId?: boolean; title?: boolean } = {};

    if (!form.categoryId) nextFieldErrors.categoryId = true;
    if (!title) nextFieldErrors.title = true;
    if (isCreatingCategory && !newCategoryTitle) nextFieldErrors.categoryId = true;

    if (nextFieldErrors.categoryId || nextFieldErrors.title) {
      setFieldErrors((current) => ({ ...current, ...nextFieldErrors }));
      setError(t("specialtiesAdmin.feedback.validation"));
      return;
    }

    const resolvedSlug =
      mode === "edit" && specialty
        ? specialty.slug
        : generateSpecialtySlug(title);
    let resolvedCategoryId = form.categoryId;
    if (isCreatingCategory) {
      try {
        const categoryResult = await createCategoryMutation.mutateAsync({
          title: newCategoryTitle,
        });
        resolvedCategoryId = categoryResult.category.id;
      } catch {
        setError(
          safeT(
            "specialtiesAdmin.feedback.createCategoryError",
            "Could not create the primary category right now.",
          ),
        );
        return;
      }
    }
    const resolvedSortOrder =
      mode === "edit" && specialty
        ? specialty.sortOrder
        : defaultSortOrder;

    const payload = {
      categoryId: resolvedCategoryId,
      slug: resolvedSlug,
      title,
      description: form.description.trim() || null,
      sortOrder: resolvedSortOrder,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        onSuccess(t("specialtiesAdmin.feedback.createSuccess"));
      } else if (specialty) {
        await updateMutation.mutateAsync({
          id: specialty.id,
          data: payload,
        });
        onSuccess(t("specialtiesAdmin.feedback.updateSuccess"));
      }

      onClose();
    } catch {
      setError(
        mode === "create"
          ? t("specialtiesAdmin.feedback.createError")
          : t("specialtiesAdmin.feedback.updateError"),
      );
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={mode === "create" ? t("specialtiesAdmin.form.createTitle") : t("specialtiesAdmin.form.editTitle")}
      description={mode === "create" ? t("specialtiesAdmin.form.createNote") : t("specialtiesAdmin.form.editNote")}
      eyebrow={t("specialtiesAdmin.eyebrow")}
      loading={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={
        isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "create"
              ? t("specialtiesAdmin.actions.creating")
              : t("specialtiesAdmin.actions.updating")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {mode === "create"
              ? safeT("specialtiesAdmin.actions.createSecondary", "Create sub-specialty")
              : t("specialtiesAdmin.actions.update")}
          </span>
        )
      }
      cancelLabel={t("applications.directCreate.cancel")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="block md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("specialtiesAdmin.fields.category")}{" "}
            <span className="text-error-500">*</span>
          </Label>
          <Select
            key={`specialty-category-${isOpen}`}
            options={[
              ...(categoriesQuery.data?.categories ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              })),
              {
                value: CREATE_CATEGORY_SENTINEL,
                label: safeT(
                  "specialtiesAdmin.form.createCategoryOption",
                  "Add new primary category",
                ),
              },
            ]}
            placeholder={t("specialtiesAdmin.form.categoryPlaceholder")}
            defaultValue={form.categoryId}
            className={fieldErrors.categoryId ? "border-error-500" : ""}
            onChange={(value) => handleChange("categoryId", value)}
          />
        </div>

        {form.categoryId === CREATE_CATEGORY_SENTINEL ? (
          <div className="block md:col-span-2">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {safeT("specialtiesAdmin.form.newCategoryTitle", "Primary category name")}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <InputField
              value={form.newCategoryTitle}
              required
              error={!!fieldErrors.categoryId}
              onChange={(event) => handleChange("newCategoryTitle", event.target.value)}
              placeholder={safeT(
                "specialtiesAdmin.form.newCategoryTitlePlaceholder",
                "For example: Clinical Psychology",
              )}
              className="px-4 py-3"
            />
          </div>
        ) : null}

        <div className="block">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("specialtiesAdmin.fields.title")}{" "}
            <span className="text-error-500">*</span>
          </Label>
          <InputField
            value={form.title}
            required
            error={!!fieldErrors.title}
            onChange={(event) => handleChange("title", event.target.value)}
            placeholder={t("specialtiesAdmin.form.titleSimplePlaceholder")}
            className="px-4 py-3"
          />
        </div>

        <div className="block md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("specialtiesAdmin.fields.description")}
          </Label>
          <TextArea
            value={form.description}
            onChange={(value) => handleChange("description", value)}
            rows={5}
            placeholder={t("specialtiesAdmin.form.descriptionPlaceholder")}
            className="min-h-[132px] px-4 py-3"
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
