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
import {
  getLocalizedSpecialtyCategoryName,
} from "@/features/specialties/utils/localized-specialty";
import { useLocale } from "next-intl";

type FormState = {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  newCategoryNameAr: string;
  newCategoryNameEn: string;
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
  nameAr: "",
  nameEn: "",
  description: "",
  newCategoryNameAr: "",
  newCategoryNameEn: "",
};

const CREATE_CATEGORY_SENTINEL = "__create_new_category__";

function toFormState(specialty: Specialty): FormState {
  return {
    categoryId: specialty.category?.id ?? "",
    nameAr: specialty.nameAr ?? "",
    nameEn: specialty.nameEn ?? "",
    description: specialty.description ?? "",
    newCategoryNameAr: "",
    newCategoryNameEn: "",
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
  const locale = useLocale();
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
    names?: boolean;
  }>({});

  const isSubmitting =
    createMutation.isPending ||
    createCategoryMutation.isPending ||
    updateMutation.isPending;

  const handleChange = (field: keyof FormState, value: string) => {
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: false, names: false }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const nameAr = form.nameAr.trim();
    const nameEn = form.nameEn.trim();
    const isCreatingCategory = form.categoryId === CREATE_CATEGORY_SENTINEL;
    const newCategoryNameAr = form.newCategoryNameAr.trim();
    const newCategoryNameEn = form.newCategoryNameEn.trim();
    const nextFieldErrors: { categoryId?: boolean; names?: boolean } = {};

    if (!form.categoryId) nextFieldErrors.categoryId = true;
    if (!nameAr || !nameEn) nextFieldErrors.names = true;
    if (isCreatingCategory && (!newCategoryNameAr || !newCategoryNameEn)) {
      nextFieldErrors.categoryId = true;
    }

    if (nextFieldErrors.categoryId || nextFieldErrors.names) {
      setFieldErrors((current) => ({ ...current, ...nextFieldErrors }));
      setError(t("specialtiesAdmin.feedback.validation"));
      return;
    }

    const resolvedSlug =
      mode === "edit" && specialty
        ? specialty.slug
        : generateSpecialtySlug(nameEn || nameAr);
    let resolvedCategoryId = form.categoryId;
    if (isCreatingCategory) {
      try {
        const categoryResult = await createCategoryMutation.mutateAsync({
          nameAr: newCategoryNameAr,
          nameEn: newCategoryNameEn,
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
      mode === "edit" && specialty ? specialty.sortOrder : defaultSortOrder;

    const payload = {
      categoryId: resolvedCategoryId,
      slug: resolvedSlug,
      nameAr,
      nameEn,
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
                label: getLocalizedSpecialtyCategoryName(category, locale),
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
          <div className="block md:col-span-2 space-y-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Arabic primary category name <span className="text-error-500">*</span>
              </Label>
              <InputField
                value={form.newCategoryNameAr}
                required
                error={!!fieldErrors.categoryId}
                onChange={(event) => handleChange("newCategoryNameAr", event.target.value)}
                placeholder="مثال: علم النفس الإكلينيكي"
                className="px-4 py-3"
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                English primary category name <span className="text-error-500">*</span>
              </Label>
              <InputField
                value={form.newCategoryNameEn}
                required
                error={!!fieldErrors.categoryId}
                onChange={(event) => handleChange("newCategoryNameEn", event.target.value)}
                placeholder="For example: Clinical Psychology"
                className="px-4 py-3"
              />
            </div>
          </div>
        ) : null}

        <div className="block">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Arabic name <span className="text-error-500">*</span>
          </Label>
          <InputField
            value={form.nameAr}
            required
            error={!!fieldErrors.names}
            onChange={(event) => handleChange("nameAr", event.target.value)}
            placeholder="مثال: العلاج السلوكي المعرفي"
            className="px-4 py-3"
          />
        </div>

        <div className="block">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            English name <span className="text-error-500">*</span>
          </Label>
          <InputField
            value={form.nameEn}
            required
            error={!!fieldErrors.names}
            onChange={(event) => handleChange("nameEn", event.target.value)}
            placeholder="For example: Cognitive Behavioral Therapy"
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
