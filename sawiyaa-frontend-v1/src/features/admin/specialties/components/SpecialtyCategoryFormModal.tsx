"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import {
  useCreateSpecialtyCategory,
  useSpecialtyCategories,
  useUpdateSpecialtyCategory,
} from "@/features/specialties/hooks/use-specialties";
import type { SpecialtyCategory } from "@/features/specialties/types/specialties.types";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  category?: SpecialtyCategory | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type FormState = {
  nameAr: string;
  nameEn: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  nameAr: "",
  nameEn: "",
  description: "",
};

function toFormState(category: SpecialtyCategory): FormState {
  return {
    nameAr: category.nameAr ?? "",
    nameEn: category.nameEn ?? "",
    description: category.description ?? "",
  };
}

export default function SpecialtyCategoryFormModal({
  isOpen,
  mode,
  category,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("admin-area");
  const createCategoryMutation = useCreateSpecialtyCategory();
  const updateCategoryMutation = useUpdateSpecialtyCategory();
  const categoriesQuery = useSpecialtyCategories(isOpen);
  const [form, setForm] = useState<FormState>(
    mode === "edit" && category ? toFormState(category) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    nameAr?: boolean;
    nameEn?: boolean;
  }>({});
  const isSubmitting =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;

  const nextSortOrder = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? [];
    if (categories.length === 0) return 0;
    return Math.max(...categories.map((item) => item.sortOrder)) + 1;
  }, [categoriesQuery.data?.categories]);

  const handleSubmit = async () => {
    const nameAr = form.nameAr.trim();
    const nameEn = form.nameEn.trim();
    const nextErrors = {
      nameAr: !nameAr,
      nameEn: !nameEn,
    };

    if (nextErrors.nameAr || nextErrors.nameEn) {
      setFieldErrors(nextErrors);
      setError(t("specialtiesAdmin.feedback.validation"));
      return;
    }

    try {
      if (mode === "create") {
        await createCategoryMutation.mutateAsync({
          nameAr,
          nameEn,
          description: form.description.trim() || null,
          sortOrder: nextSortOrder,
        });
        onSuccess(t("specialtiesAdmin.feedback.createCategorySuccess"));
      } else if (category) {
        await updateCategoryMutation.mutateAsync({
          id: category.id,
          data: {
            nameAr,
            nameEn,
            description: form.description.trim() || null,
          },
        });
        onSuccess(t("specialtiesAdmin.feedback.updateCategorySuccess"));
      }
      onClose();
    } catch {
      setError(
        mode === "create"
          ? t("specialtiesAdmin.feedback.createCategoryError")
          : t("specialtiesAdmin.feedback.updateCategoryError"),
      );
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        mode === "create"
          ? t("specialtiesAdmin.categoryForm.createTitle")
          : t("specialtiesAdmin.categoryForm.editTitle")
      }
      description={
        mode === "create"
          ? t("specialtiesAdmin.categoryForm.createNote")
          : t("specialtiesAdmin.categoryForm.editNote")
      }
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
              ? t("specialtiesAdmin.actions.createMain")
              : t("specialtiesAdmin.actions.update")}
          </span>
        )
      }
      cancelLabel={t("applications.directCreate.cancel")}
    >
      <div className="grid gap-4">
        <div className="block">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Arabic name <span className="text-error-500">*</span>
          </Label>
          <InputField
            value={form.nameAr}
            required
            error={!!fieldErrors.nameAr}
            onChange={(event) => {
              setFieldErrors((current) => ({ ...current, nameAr: false }));
              setError(null);
              setForm((current) => ({ ...current, nameAr: event.target.value }));
            }}
            placeholder="مثال: الصحة النفسية"
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
            error={!!fieldErrors.nameEn}
            onChange={(event) => {
              setFieldErrors((current) => ({ ...current, nameEn: false }));
              setError(null);
              setForm((current) => ({ ...current, nameEn: event.target.value }));
            }}
            placeholder="For example: Mental Health"
            className="px-4 py-3"
          />
        </div>

        <div className="block">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("specialtiesAdmin.categoryForm.description")}
          </Label>
          <TextArea
            value={form.description}
            onChange={(value) => {
              setError(null);
              setForm((current) => ({ ...current, description: value }));
            }}
            rows={4}
            placeholder={t("specialtiesAdmin.categoryForm.descriptionPlaceholder")}
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
