"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Info, Loader2, Star, Tag, TriangleAlert } from "lucide-react";
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary dark:text-primary-light" />
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("specialties.current.heading")}
            </h2>
          </div>

          {draft.length === 0 ? (
            <StateCard
              icon={<Tag className="h-8 w-8 text-text-muted" />}
              title={t("specialties.emptyTitle")}
              note={t("specialties.empty")}
              centered={false}
              className="p-5"
            />
          ) : (
            <div className="space-y-3">
              {draft.map((specialty) => (
                <div
                  key={specialty.specialtyId}
                  className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                          {getSpecialtyLabel(specialty)}
                        </p>
                        {specialty.isPrimary ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-text-brand dark:bg-primary/15 dark:text-primary-light">
                            <Star className="h-3 w-3" />
                            {t("specialties.primary")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{specialty.slug}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(specialty.specialtyId)}
                        disabled={specialty.isPrimary || !isEditable}
                        className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
                      >
                        {specialty.isPrimary
                          ? t("specialties.actions.primarySelected")
                          : t("specialties.actions.makePrimary")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(specialty.specialtyId)}
                        disabled={!isEditable}
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700/30 dark:text-red-300 dark:hover:bg-red-900/10"
                      >
                        {t("specialties.actions.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary dark:text-primary-light" />
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("specialties.catalog.heading")}
              </h2>
            </div>

            {isCatalogLoading ? (
              <ListStateSkeleton items={2} heightClass="h-20" />
            ) : isCatalogError ? (
              <StateCard
                icon={<TriangleAlert className="h-8 w-8 text-amber-500" />}
                title={t("specialties.catalog.loadError")}
                note={t("specialties.catalog.loadErrorNote")}
                action={{
                  label: t("specialties.feedback.retry"),
                  onClick: () => refetchCatalog(),
                }}
                centered={false}
                className="p-5"
              />
            ) : availableSpecialties.length === 0 ? (
              <StateCard
                icon={<Tag className="h-8 w-8 text-text-muted" />}
                title={t("specialties.catalog.emptyTitle")}
                note={t("specialties.catalog.emptyNote")}
                centered={false}
                className="p-5"
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="specialty-category-picker"
                    className="mb-2 block text-xs font-medium text-text-secondary"
                  >
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
                  <label
                    htmlFor="specialty-picker"
                    className="mb-2 block text-xs font-medium text-text-secondary"
                  >
                    {t("specialties.catalog.pickerLabel")}
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="specialty-picker"
                      value={selectedSpecialtyId}
                      onChange={(event) => setSelectedSpecialtyId(event.target.value)}
                      disabled={unselectedSpecialties.length === 0 || !selectedCategoryId || !isEditable}
                      className="flex-1 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary dark:bg-white/5 dark:text-white/90"
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

                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!selectedSpecialtyId || unselectedSpecialties.length === 0 || !isEditable}
                      className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("specialties.actions.add")}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-border-light px-4 py-3 text-xs leading-6 text-text-secondary dark:border-white/10">
                  <p>{t("specialties.catalog.selectionNote")}</p>
                  <p className="mt-1 text-text-muted">{t("specialties.catalog.primaryNote")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
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
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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

              <button
                type="button"
                onClick={handleReset}
                disabled={!isEditable || !hasUnsavedChanges || setSpecialtiesMutation.isPending}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
              >
                {t("specialties.actions.reset")}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
