"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Info, Loader2, Plus, Star, Tag, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormModal } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useSpecialties, useSpecialtyCategories } from "@/features/specialties/hooks/use-specialties";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import Select from "@/components/form/Select";
import {
  usePractitionerSpecialties,
  useSetPractitionerSpecialties,
} from "../hooks/use-practitioners";
import type { PractitionerSpecialty } from "../types/practitioners.types";

type EditableSpecialty = {
  specialtyId: string;
  slug: string;
  title: string | null;
  isPrimary: boolean;
};

function toEditableSpecialties(items: PractitionerSpecialty[]): EditableSpecialty[] {
  return items.map((item) => ({
    specialtyId: item.specialtyId,
    slug: item.slug,
    title: item.title,
    isPrimary: item.isPrimary,
  }));
}

function createSignature(items: EditableSpecialty[]) {
  return JSON.stringify(
    items.map((item) => ({
      specialtyId: item.specialtyId,
      isPrimary: item.isPrimary,
    })),
  );
}

function getSpecialtyLabel(specialty: EditableSpecialty | Specialty) {
  if ("title" in specialty) {
    return specialty.title ?? specialty.slug;
  }

  return specialty.name ?? specialty.slug;
}

type PractitionerSpecialtiesViewProps = {
  isEditable?: boolean;
};

export default function PractitionerSpecialtiesView({
  isEditable = true,
}: PractitionerSpecialtiesViewProps) {
  const t = useTranslations("practitioner-area");

  const {
    data: currentData,
    isLoading: isCurrentLoading,
    isError: isCurrentError,
    refetch: refetchCurrent,
  } = usePractitionerSpecialties();

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useSpecialties();
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useSpecialtyCategories();

  const setSpecialtiesMutation = useSetPractitionerSpecialties();

  const [draft, setDraft] = useState<EditableSpecialty[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!currentData?.specialties) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(toEditableSpecialties(currentData.specialties));
    setFeedback(null);
  }, [currentData?.specialties]);

  const currentSignature = useMemo(
    () => createSignature(toEditableSpecialties(currentData?.specialties ?? [])),
    [currentData?.specialties],
  );

  const draftSignature = useMemo(() => createSignature(draft), [draft]);
  const hasUnsavedChanges = currentSignature !== draftSignature;

  const availableSpecialties = useMemo(
    () => catalogData?.specialties ?? [],
    [catalogData?.specialties],
  );
  const availableCategories = useMemo(
    () => categoriesData?.categories ?? [],
    [categoriesData?.categories],
  );
  const categoryOptions = useMemo(
    () =>
      availableCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [availableCategories],
  );

  useEffect(() => {
    if (availableCategories.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryId("");
      return;
    }

    setSelectedCategoryId((currentValue) =>
      currentValue &&
      availableCategories.some((category) => category.id === currentValue)
        ? currentValue
        : availableCategories[0]!.id,
    );
  }, [availableCategories]);

  const categoryFilteredSpecialties = useMemo(
    () =>
      availableSpecialties.filter((specialty) =>
        selectedCategoryId ? specialty.category?.id === selectedCategoryId : false,
      ),
    [availableSpecialties, selectedCategoryId],
  );

  const unselectedSpecialties = useMemo(
    () =>
      categoryFilteredSpecialties.filter(
        (specialty) =>
          !draft.some((selected) => selected.specialtyId === specialty.id),
      ),
    [categoryFilteredSpecialties, draft],
  );

  useEffect(() => {
    if (unselectedSpecialties.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSpecialtyId("");
      return;
    }

    setSelectedSpecialtyId((currentValue) =>
      currentValue &&
      unselectedSpecialties.some((specialty) => specialty.id === currentValue)
        ? currentValue
        : unselectedSpecialties[0]!.id,
    );
  }, [unselectedSpecialties]);

  const normalizePrimary = (items: EditableSpecialty[]) => {
    const primaryIndex = items.findIndex((item) => item.isPrimary);
    return items.map((item, index) => ({
      ...item,
      isPrimary:
        items.length === 1 ? true : primaryIndex >= 0 ? index === primaryIndex : index === 0,
    }));
  };

  const handleAdd = () => {
    if (!isEditable) {
      return;
    }
    if (!selectedSpecialtyId) {
      return;
    }

    const specialty = availableSpecialties.find((item) => item.id === selectedSpecialtyId);
    if (!specialty) {
      return;
    }

    setFeedback(null);
    setDraft((currentDraft) =>
      normalizePrimary([
        ...currentDraft,
        {
          specialtyId: specialty.id,
          slug: specialty.slug,
          title: specialty.name,
          isPrimary: currentDraft.length === 0,
        },
      ]),
    );
    setIsAddModalOpen(false);
    setSelectedSpecialtyId("");
  };

  const handleRemove = (specialtyId: string) => {
    if (!isEditable) {
      return;
    }
    if (draft.length <= 1) {
      setFeedback({
        tone: "error",
        message: t("specialties.validation.minOne"),
      });
      return;
    }

    setFeedback(null);
    setDraft((currentDraft) =>
      normalizePrimary(
        currentDraft.filter((item) => item.specialtyId !== specialtyId),
      ),
    );
  };

  const handleSetPrimary = (specialtyId: string) => {
    if (!isEditable) {
      return;
    }
    setFeedback(null);
    setDraft((currentDraft) =>
      currentDraft.map((item) => ({
        ...item,
        isPrimary: item.specialtyId === specialtyId,
      })),
    );
  };

  const handleReset = () => {
    if (!isEditable) {
      return;
    }
    setFeedback(null);
    setDraft(toEditableSpecialties(currentData?.specialties ?? []));
  };

  const handleSave = async () => {
    if (!isEditable) {
      return;
    }
    if (draft.length === 0) {
      setFeedback({
        tone: "error",
        message: t("specialties.validation.minOne"),
      });
      return;
    }
    if (!selectedCategoryId) {
      setFeedback({
        tone: "error",
        message: t("specialties.catalog.categoryPlaceholder"),
      });
      return;
    }

    try {
      await setSpecialtiesMutation.mutateAsync({
        primarySpecialtyCategoryId: selectedCategoryId,
        specialtyIds: draft.map((item) => item.specialtyId),
      });

      setFeedback({
        tone: "success",
        message: t("specialties.feedback.success"),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: t("specialties.feedback.saveError"),
      });
    }
  };

  if (isCurrentLoading) {
    return <ListStateSkeleton items={3} heightClass="h-28" />;
  }

  if (isCurrentError || !currentData) {
    return (
      <StateCard
        icon={<TriangleAlert className="h-8 w-8 text-red-500" />}
        title={t("specialties.feedback.loadError")}
        note={t("specialties.feedback.loadErrorNote")}
        action={{
          label: t("specialties.feedback.retry"),
          onClick: () => refetchCurrent(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!isEditable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-300">
          {t("application.statusMessage.UNDER_REVIEW")}
        </div>
      ) : null}
      
      {/* Info Alert Panel */}
      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary-light p-2.5 text-text-brand dark:bg-primary/15 dark:text-primary-light">
            <Info className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("specialties.management.heading")}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("specialties.management.note")}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              {t("specialties.management.replaceHint")}
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Main Specialties Editor Container */}
      <div className="rounded-3xl border border-border-light bg-surface-primary p-6 shadow-theme-xs dark:bg-white/5">
        {/* Header Actions Row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-light/50 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Tag className="h-5 w-5 text-primary dark:text-primary-light" />
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white/95">
                {t("specialties.current.heading")}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {t("specialties.catalog.primaryNote")}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!isEditable || isCatalogLoading}
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-theme-sm transition hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t("specialties.catalog.heading")}
          </button>
        </div>

        {/* Specialties Grid */}
        {draft.length === 0 ? (
          <StateCard
            icon={<Tag className="h-10 w-10 text-text-muted" />}
            title={t("specialties.emptyTitle")}
            note={t("specialties.empty")}
            className="py-12 border-0 bg-transparent"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {draft.map((specialty) => {
              const isPrimary = specialty.isPrimary;
              const cardBgClass = isPrimary
                ? "bg-primary-light/25 border-primary/25 dark:bg-primary/5 dark:border-primary/20"
                : "bg-white border-border-light dark:bg-white/5 hover:border-primary/30 hover:shadow-theme-xs";
              const iconWrapperClass = isPrimary
                ? "bg-primary text-white"
                : "bg-gray-50 text-text-secondary dark:bg-white/5 dark:text-text-muted";
              const IconComponent = isPrimary ? Star : Tag;

              return (
                <div
                  key={specialty.specialtyId}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200",
                    cardBgClass
                  )}
                >
                  <div>
                    {/* Card Header Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition-colors",
                          iconWrapperClass
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-[10px] font-bold text-text-brand dark:bg-primary/15 dark:text-primary-light">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {t("specialties.primary")}
                        </span>
                      )}
                    </div>

                    {/* Card Title Body */}
                    <div className="mt-3.5 mb-5">
                      <h3 className="text-sm font-bold text-text-primary dark:text-white/90">
                        {getSpecialtyLabel(specialty)}
                      </h3>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between gap-2 border-t border-border-light/40 pt-3 dark:border-white/5">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(specialty.specialtyId)}
                        disabled={!isEditable}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-theme-xs transition hover:bg-gray-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-text-muted dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <Star className="h-3 w-3" />
                        {t("specialties.actions.makePrimary")}
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-text-brand dark:text-primary-light">
                        {t("specialties.actions.primarySelected")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(specialty.specialtyId)}
                      disabled={!isEditable || draft.length <= 1}
                      className="inline-flex items-center justify-center rounded-xl bg-transparent px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      {t("specialties.actions.remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Global Save Actions Footer Panel */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border-light/50 pt-5 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("specialties.actions.heading")}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {hasUnsavedChanges
                ? t("specialties.actions.unsavedChanges")
                : t("specialties.actions.noChanges")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isEditable || !hasUnsavedChanges || setSpecialtiesMutation.isPending}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
            >
              {t("specialties.actions.reset")}
            </button>

            <button
               type="button"
               onClick={handleSave}
               disabled={
                 setSpecialtiesMutation.isPending ||
                 !hasUnsavedChanges ||
                 draft.length === 0 ||
                 isCatalogError ||
                 !isEditable
               }
               className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
             >
               {setSpecialtiesMutation.isPending ? (
                 <>
                   <Loader2 className="me-2 h-4 w-4 animate-spin" />
                   {t("specialties.actions.saving")}
                 </>
               ) : (
                 t("specialties.actions.save")
               )}
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal for Adding Specialties */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSpecialtyId("");
        }}
        title={t("specialties.catalog.heading")}
        submitLabel={t("specialties.actions.add")}
        cancelLabel={t("common.cancel") || "إلغاء"}
        onSubmit={handleAdd}
        submitDisabled={!selectedSpecialtyId || unselectedSpecialties.length === 0}
        size="md"
      >
        <div className="space-y-4 py-2">
          {isCategoriesError ? (
            <StateCard
              icon={<TriangleAlert className="h-8 w-8 text-amber-500" />}
              title={t("specialties.catalog.loadError")}
              note={t("specialties.catalog.loadErrorNote")}
              action={{
                label: t("specialties.feedback.retry"),
                onClick: () => refetchCategories(),
              }}
              centered={false}
              className="p-5"
            />
          ) : null}

          <div>
            <label className="mb-2 block text-xs font-semibold text-text-secondary">
              {t("specialties.catalog.categoryLabel")}
            </label>
            <Select
              key={`specialty-category-picker-${availableCategories.length}`}
              options={categoryOptions}
              placeholder={t("specialties.catalog.categoryPlaceholder")}
              defaultValue={selectedCategoryId}
              onChange={(value) => setSelectedCategoryId(value)}
              className="w-full"
              disabled={!isEditable}
            />
          </div>

          {!isCategoriesLoading && !isCategoriesError && categoryFilteredSpecialties.length === 0 ? (
            <StateCard
              icon={<Tag className="h-8 w-8 text-text-muted" />}
              title={t("specialties.catalog.categoryEmptyTitle")}
              note={t("specialties.catalog.categoryEmptyNote")}
              centered={false}
              className="p-5"
            />
          ) : null}

          <div>
            <label className="mb-2 block text-xs font-semibold text-text-secondary">
              {t("specialties.catalog.pickerLabel")}
            </label>
            <select
              value={selectedSpecialtyId}
              onChange={(event) => setSelectedSpecialtyId(event.target.value)}
              disabled={unselectedSpecialties.length === 0 || !selectedCategoryId || !isEditable}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3.5 text-sm text-text-primary outline-none transition focus:border-primary dark:bg-white/5 dark:text-white/90"
            >
              {unselectedSpecialties.length === 0 ? (
                <option value="">{t("specialties.catalog.noAvailableToAdd")}</option>
              ) : (
                unselectedSpecialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {getSpecialtyLabel(specialty)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-2xl border border-dashed border-border-light px-4 py-3 text-xs leading-6 text-text-secondary dark:border-white/10">
            <p>{t("specialties.catalog.selectionNote")}</p>
            <p className="mt-1 text-text-muted">{t("specialties.catalog.primaryNote")}</p>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
