"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CircleOff,
  Layers,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { buildUpdatedSearchParams, parseTextParam } from "@/components/ui/data-table";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import Select from "@/components/form/Select";
import {
  useAdminSpecialties,
  useAdminSpecialtyCategories,
  useToggleSpecialtyStatus,
  useUpdateSpecialtyCategory,
} from "@/features/specialties/hooks/use-specialties";
import type {
  Specialty,
  SpecialtyCategory,
} from "@/features/specialties/types/specialties.types";
import SpecialtyFormModal from "./SpecialtyFormModal";
import SpecialtyCategoryFormModal from "./SpecialtyCategoryFormModal";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";

type CatalogFilter = "all" | "primary" | "secondary";

function formatAdminDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function textMatches(value: string | null | undefined, query: string) {
  if (!value) return false;
  return value.toLowerCase().includes(query);
}

export default function AdminSpecialtiesCatalogScreen() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = parseTextParam(searchParams.get("q"), { maxLength: 80 });
  const [search, setSearch] = useState(initialQuery);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [viewFilter, setViewFilter] = useState<CatalogFilter>("all");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<string | null>(null);
  const [specialtyModalState, setSpecialtyModalState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    specialty: Specialty | null;
    initialCategoryId: string;
  }>({
    open: false,
    mode: "create",
    specialty: null,
    initialCategoryId: "",
  });
  const [categoryModalState, setCategoryModalState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    category: SpecialtyCategory | null;
  }>({
    open: false,
    mode: "create",
    category: null,
  });

  useEffect(() => {
    setSearch(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const normalized = debouncedSearch.trim();
    if (normalized === initialQuery) return;
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
      q: normalized || null,
    });
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, initialQuery, pathname, router, searchParams]);

  const specialtiesQuery = useAdminSpecialties(initialQuery ? { q: initialQuery } : undefined);
  const categoriesQuery = useAdminSpecialtyCategories(initialQuery ? { q: initialQuery } : undefined);
  const toggleMutation = useToggleSpecialtyStatus();
  const updateCategoryMutation = useUpdateSpecialtyCategory();

  const categories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data?.categories],
  );
  const specialties = useMemo(
    () => specialtiesQuery.data?.specialties ?? [],
    [specialtiesQuery.data?.specialties],
  );

  const specialtiesByCategory = useMemo(() => {
    const map = new Map<string, Specialty[]>();
    for (const specialty of specialties) {
      if (!specialty.category?.id) continue;
      const existing = map.get(specialty.category.id);
      if (existing) existing.push(specialty);
      else map.set(specialty.category.id, [specialty]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [specialties]);

  const normalizedQuery = normalizeSearch(initialQuery);
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories.filter((category) => {
      if (
        textMatches(category.name, normalizedQuery) ||
        textMatches(category.slug, normalizedQuery) ||
        textMatches(category.description, normalizedQuery)
      ) {
        return true;
      }
      return (specialtiesByCategory.get(category.id) ?? []).some((specialty) =>
        textMatches(specialty.name ?? specialty.slug, normalizedQuery) ||
        textMatches(specialty.slug, normalizedQuery) ||
        textMatches(specialty.description, normalizedQuery),
      );
    });
  }, [categories, normalizedQuery, specialtiesByCategory]);

  const filteredSecondaryRows = useMemo(() => {
    if (!normalizedQuery) return specialties.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    return specialties
      .filter((specialty) =>
        textMatches(specialty.name ?? specialty.slug, normalizedQuery) ||
        textMatches(specialty.slug, normalizedQuery) ||
        textMatches(specialty.description, normalizedQuery) ||
        textMatches(specialty.category?.name, normalizedQuery),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [specialties, normalizedQuery]);

  const specialtyPendingDeactivate = useMemo(
    () => specialties.find((item) => item.id === confirmingDeactivateId) ?? null,
    [confirmingDeactivateId, specialties],
  );
  const nextAutoSortOrder = useMemo(() => {
    if (specialties.length === 0) return 0;
    return Math.max(...specialties.map((item) => item.sortOrder)) + 1;
  }, [specialties]);

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const openCreateCategoryModal = () => {
    setFeedback(null);
    setCategoryModalState({ open: true, mode: "create", category: null });
  };

  const openEditCategoryModal = (category: SpecialtyCategory) => {
    setFeedback(null);
    setCategoryModalState({ open: true, mode: "edit", category });
  };

  const openCreateSpecialtyModal = (initialCategoryId = "") => {
    setFeedback(null);
    setSpecialtyModalState({
      open: true,
      mode: "create",
      specialty: null,
      initialCategoryId,
    });
  };

  const openEditSpecialtyModal = (specialty: Specialty) => {
    setFeedback(null);
    setConfirmingDeactivateId(null);
    setSpecialtyModalState({
      open: true,
      mode: "edit",
      specialty,
      initialCategoryId: specialty.category?.id ?? "",
    });
  };

  const handleDeactivate = async (specialty: Specialty) => {
    try {
      const nextActiveState = !specialty.isActive;
      await toggleMutation.mutateAsync({
        id: specialty.id,
        data: { isActive: nextActiveState },
      });
      setFeedback({
        tone: "success",
        message: nextActiveState
          ? t("specialtiesAdmin.feedback.activateSuccess", {
              title: specialty.name ?? specialty.slug,
            })
          : t("specialtiesAdmin.feedback.deactivateSuccess", {
              title: specialty.name ?? specialty.slug,
            }),
      });
      setConfirmingDeactivateId(null);
    } catch {
      setFeedback({
        tone: "error",
        message: specialty.isActive
          ? t("specialtiesAdmin.feedback.deactivateError")
          : t("specialtiesAdmin.feedback.activateError"),
      });
    }
  };

  const handleToggleCategoryStatus = async (category: SpecialtyCategory) => {
    try {
      const nextActiveState = !category.isActive;
      await updateCategoryMutation.mutateAsync({
        id: category.id,
        data: { isActive: nextActiveState },
      });
      setFeedback({
        tone: "success",
        message: nextActiveState
          ? t("specialtiesAdmin.feedback.activateCategorySuccess", {
              title: category.name,
            })
          : t("specialtiesAdmin.feedback.deactivateCategorySuccess", {
              title: category.name,
            }),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: category.isActive
          ? t("specialtiesAdmin.feedback.deactivateCategoryError")
          : t("specialtiesAdmin.feedback.activateCategoryError"),
      });
    }
  };

  const isLoading = specialtiesQuery.isLoading || categoriesQuery.isLoading;
  const isError = specialtiesQuery.isError || categoriesQuery.isError;
  const isEmpty =
    (viewFilter !== "secondary" && filteredCategories.length === 0) ||
    (viewFilter === "secondary" && filteredSecondaryRows.length === 0);

  const filterOptions = useMemo(
    () => [
      { value: "all", label: t("specialtiesAdmin.structure.filters.all") },
      { value: "primary", label: t("specialtiesAdmin.structure.filters.primaryOnly") },
      { value: "secondary", label: t("specialtiesAdmin.structure.filters.secondaryOnly") },
    ],
    [t],
  );

  return (
    <AdminOperationalListShell
      title={t("specialtiesAdmin.title")}
      notice={
        feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-status-success-border bg-status-success-soft text-status-success"
                : "border-status-danger-border bg-status-danger-soft text-status-danger"
            }`}
          >
            {feedback.message}
          </div>
        ) : null
      }
      summaryCards={
        <>
          <AdminSummaryCard
            label={t("specialtiesAdmin.structure.types.primary")}
            value={categories.length}
            tone="primary"
          />
          <AdminSummaryCard
            label={t("specialtiesAdmin.structure.types.secondary")}
            value={specialties.length}
            tone="primary"
          />
        </>
      }
      filters={
        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:w-80">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("specialtiesAdmin.list.searchPlaceholder")}
              className="app-control w-full py-3 pe-4 ps-10"
            />
          </div>

          <Select
            key={`viewFilter-${viewFilter}`}
            defaultValue={viewFilter}
            onChange={(value) => setViewFilter(value as CatalogFilter)}
            options={filterOptions}
            className="h-11 w-full xl:w-56"
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <Button onClick={openCreateCategoryModal} startIcon={<Layers className="h-4 w-4" />}>
              {t("specialtiesAdmin.actions.createMain")}
            </Button>
            <Button onClick={() => openCreateSpecialtyModal()} startIcon={<Plus className="h-4 w-4" />}>
              {t("specialtiesAdmin.actions.createSecondary")}
            </Button>
          </div>
        </div>
      }
    >
      <section className="space-y-4">
        <SurfaceCard as="section" variant="section">
          <div className="border-b border-border-light px-5 py-4">
            <h3 className="text-sm font-semibold text-text-primary">
              {t("specialtiesAdmin.structure.tableHeading")}
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("specialtiesAdmin.states.loading")}
            </div>
          ) : null}

          {isError ? (
            <div className="space-y-3 px-5 py-8">
              <p className="text-sm text-status-danger">
                {t("specialtiesAdmin.states.error.note")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  specialtiesQuery.refetch();
                  categoriesQuery.refetch();
                }}
              >
                {t("specialtiesAdmin.states.error.retry")}
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-light">
                <thead>
                  <tr className="bg-surface-tertiary border-b border-border-light">
                    <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("specialtiesAdmin.structure.columns.name")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("specialtiesAdmin.structure.columns.type")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("specialtiesAdmin.structure.columns.order")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("specialtiesAdmin.structure.columns.updated")}
                    </th>
                    <th className="px-5 py-3 text-end text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("specialtiesAdmin.structure.columns.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light">
                  {viewFilter !== "secondary"
                    ? filteredCategories.map((category) => {
                      const categorySpecialties = specialtiesByCategory.get(category.id) ?? [];
                      const isExpanded = expandedCategoryIds.has(category.id);
                      return (
                        <Fragment key={category.id}>
                          <tr className="bg-surface-secondary hover:bg-surface-tertiary transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary hover:bg-surface-secondary"
                                  onClick={() => toggleCategoryExpanded(category.id)}
                                  aria-label={t("specialtiesAdmin.structure.expandRow")}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-text-primary">
                                    {category.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-text-muted">{category.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-text-secondary">
                              <div className="flex items-center gap-2">
                                <span>{t("specialtiesAdmin.structure.types.primary")}</span>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs ${
                                    category.isActive
                                      ? "border-status-success-border bg-status-success-soft text-status-success"
                                      : "border-status-warning-border bg-status-warning-soft text-status-warning"
                                  }`}
                                >
                                  {category.isActive
                                    ? t("specialtiesAdmin.badges.active")
                                    : t("specialtiesAdmin.badges.inactive")}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-text-secondary">{category.sortOrder}</td>
                            <td className="px-5 py-4 text-sm text-text-secondary">—</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <ActionIconButton
                                  intent="edit"
                                  label={t("specialtiesAdmin.actions.edit")}
                                  icon={<PencilLine className="h-4 w-4" />}
                                  onClick={() => openEditCategoryModal(category)}
                                />
                                <ActionIconButton
                                  intent="manage"
                                  label={t("specialtiesAdmin.actions.createSecondary")}
                                  icon={<Plus className="h-4 w-4" />}
                                  onClick={() => openCreateSpecialtyModal(category.id)}
                                />
                                {category.isActive ? (
                                  <ActionIconButton
                                    intent="deactivate"
                                    label={t("specialtiesAdmin.actions.deactivateMain")}
                                    icon={<CircleOff className="h-4 w-4" />}
                                    onClick={() => handleToggleCategoryStatus(category)}
                                  />
                                ) : (
                                  <ActionIconButton
                                    intent="publish"
                                    label={t("specialtiesAdmin.actions.activateMain")}
                                    icon={<Plus className="h-4 w-4" />}
                                    onClick={() => handleToggleCategoryStatus(category)}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded
                            ? categorySpecialties.length > 0
                              ? categorySpecialties.map((specialty) => (
                                <tr key={specialty.id} className="bg-surface-secondary hover:bg-surface-tertiary transition-colors">
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 ps-8">
                                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                                        <Tag className="h-4 w-4" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-text-primary">
                                          {specialty.name ?? specialty.slug}
                                        </p>
                                        <p className="mt-0.5 text-xs text-text-muted">{specialty.slug}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-sm text-text-secondary">
                                    <div className="flex items-center gap-2">
                                      <span>{t("specialtiesAdmin.structure.types.secondary")}</span>
                                      <span
                                        className={`rounded-full border px-2.5 py-1 text-xs ${
                                          specialty.isActive
                                            ? "border-status-success-border bg-status-success-soft text-status-success"
                                            : "border-status-warning-border bg-status-warning-soft text-status-warning"
                                        }`}
                                      >
                                        {specialty.isActive
                                          ? t("specialtiesAdmin.badges.active")
                                          : t("specialtiesAdmin.badges.inactive")}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-sm text-text-secondary">{specialty.sortOrder}</td>
                                  <td className="px-5 py-4 text-sm text-text-secondary">
                                    {formatAdminDate(specialty.updatedAt, locale)}
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <ActionIconButton
                                        intent="edit"
                                        label={t("specialtiesAdmin.actions.edit")}
                                        icon={<PencilLine className="h-4 w-4" />}
                                        onClick={() => openEditSpecialtyModal(specialty)}
                                      />
                                      {specialty.isActive ? (
                                        <ActionIconButton
                                          intent="deactivate"
                                          label={t("specialtiesAdmin.actions.deactivate")}
                                          icon={<CircleOff className="h-4 w-4" />}
                                          onClick={() => setConfirmingDeactivateId(specialty.id)}
                                        />
                                      ) : (
                                        <ActionIconButton
                                          intent="publish"
                                          label={t("specialtiesAdmin.actions.activate")}
                                          icon={<Plus className="h-4 w-4" />}
                                          onClick={() => handleDeactivate(specialty)}
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                              : (
                                <tr className="bg-surface-secondary">
                                  <td colSpan={5} className="px-5 py-3 text-sm text-text-muted">
                                    {t("specialtiesAdmin.structure.emptySecondaryInCategory")}
                                  </td>
                                </tr>
                              )
                            : null}
                        </Fragment>
                      );
                    })
                    : filteredSecondaryRows.map((specialty) => (
                      <tr key={specialty.id} className="bg-surface-secondary hover:bg-surface-tertiary transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                              <Tag className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {specialty.name ?? specialty.slug}
                              </p>
                              <p className="mt-0.5 text-xs text-text-muted">{specialty.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-text-secondary">
                          <div className="flex items-center gap-2">
                            <span>
                              {specialty.category?.name
                                ? `${t("specialtiesAdmin.structure.types.secondary")} · ${specialty.category.name}`
                                : t("specialtiesAdmin.structure.types.secondary")}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                specialty.isActive
                                  ? "border-status-success-border bg-status-success-soft text-status-success"
                                  : "border-status-warning-border bg-status-warning-soft text-status-warning"
                              }`}
                            >
                              {specialty.isActive
                                ? t("specialtiesAdmin.badges.active")
                                : t("specialtiesAdmin.badges.inactive")}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-text-secondary">{specialty.sortOrder}</td>
                        <td className="px-5 py-4 text-sm text-text-secondary">
                          {formatAdminDate(specialty.updatedAt, locale)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionIconButton
                              intent="edit"
                              label={t("specialtiesAdmin.actions.edit")}
                              icon={<PencilLine className="h-4 w-4" />}
                              onClick={() => openEditSpecialtyModal(specialty)}
                            />
                            {specialty.isActive ? (
                              <ActionIconButton
                                intent="deactivate"
                                label={t("specialtiesAdmin.actions.deactivate")}
                                icon={<CircleOff className="h-4 w-4" />}
                                onClick={() => setConfirmingDeactivateId(specialty.id)}
                              />
                            ) : (
                              <ActionIconButton
                                intent="publish"
                                label={t("specialtiesAdmin.actions.activate")}
                                icon={<Plus className="h-4 w-4" />}
                                onClick={() => handleDeactivate(specialty)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {isEmpty ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-text-secondary">
                    {initialQuery
                      ? t("specialtiesAdmin.states.empty.filtered")
                      : t("specialtiesAdmin.states.empty.note")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </SurfaceCard>
      </section>

      <CollapsibleHelpCenter
        title={t("specialtiesAdmin.eyebrow")}
        summary={t("specialtiesAdmin.note")}
        sections={[
          {
            heading: t("specialtiesAdmin.scopeHeading"),
            items: [
              t("specialtiesAdmin.scopeItems.activeList"),
              t("specialtiesAdmin.scopeItems.create"),
              t("specialtiesAdmin.scopeItems.edit"),
              t("specialtiesAdmin.scopeItems.deactivate"),
            ],
          },
          {
            heading: t("specialtiesAdmin.boundaryHeading"),
            items: [
              t("specialtiesAdmin.boundaryItems.noInactiveList"),
              t("specialtiesAdmin.boundaryItems.noReactivate"),
              t("specialtiesAdmin.boundaryCard.note"),
            ],
          },
        ]}
      />

      <SpecialtyCategoryFormModal
        key={`${categoryModalState.mode}-${categoryModalState.category?.id ?? "new"}-${categoryModalState.open ? "open" : "closed"}`}
        isOpen={categoryModalState.open}
        mode={categoryModalState.mode}
        category={categoryModalState.category}
        onClose={() => setCategoryModalState((current) => ({ ...current, open: false }))}
        onSuccess={(message) => {
          setFeedback({ tone: "success", message });
          categoriesQuery.refetch();
          specialtiesQuery.refetch();
        }}
      />

      <SpecialtyFormModal
        key={`${specialtyModalState.mode}-${specialtyModalState.specialty?.id ?? "new"}-${specialtyModalState.initialCategoryId}-${specialtyModalState.open ? "open" : "closed"}`}
        isOpen={specialtyModalState.open}
        mode={specialtyModalState.mode}
        specialty={specialtyModalState.specialty}
        defaultSortOrder={nextAutoSortOrder}
        initialCategoryId={specialtyModalState.initialCategoryId}
        onClose={() => setSpecialtyModalState((current) => ({ ...current, open: false }))}
        onSuccess={(message) => {
          setFeedback({ tone: "success", message });
          specialtiesQuery.refetch();
          categoriesQuery.refetch();
        }}
      />

      <DestructiveConfirmModal
        isOpen={Boolean(specialtyPendingDeactivate)}
        onClose={() => setConfirmingDeactivateId(null)}
        title={t("specialtiesAdmin.deactivateConfirm.heading")}
        description={t("specialtiesAdmin.deactivateConfirm.note")}
        confirmLabel={
          toggleMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("specialtiesAdmin.actions.deactivating")}
            </>
          ) : (
            t("specialtiesAdmin.deactivateConfirm.confirm")
          )
        }
        cancelLabel={t("specialtiesAdmin.deactivateConfirm.cancel")}
        onConfirm={() => specialtyPendingDeactivate && handleDeactivate(specialtyPendingDeactivate)}
        loading={toggleMutation.isPending}
      >
        {specialtyPendingDeactivate ? (
          <div className="rounded-2xl border border-status-warning-border bg-status-warning-soft px-4 py-4 text-sm text-status-warning">
            <p className="font-medium">
              {specialtyPendingDeactivate.name ?? specialtyPendingDeactivate.slug}
            </p>
            <p className="mt-1 text-xs text-status-warning/80">
              {specialtyPendingDeactivate.slug}
            </p>
          </div>
        ) : null}
      </DestructiveConfirmModal>
    </AdminOperationalListShell>
  );
}
