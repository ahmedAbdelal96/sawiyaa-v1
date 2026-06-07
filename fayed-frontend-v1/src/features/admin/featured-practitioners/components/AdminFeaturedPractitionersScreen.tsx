"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  ScrollText,
  SquarePen,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import Button from "@/components/ui/button/Button";
import DateField from "@/components/form/input/DateField";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import {
  AdminStatusBadge,
  AdminSectionCard,
} from "@/components/shared/admin/AdminDashboardKit";
import { Drawer, FormModal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { toAppError } from "@/lib/api/errors";
import { PermissionKey, hasPermission } from "@/lib/auth/permissions";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/constants/pagination";
import {
  useAdminFeaturedPlacements,
  useAdminFeaturedPlacementHistory,
  useCreateAdminFeaturedPlacement,
  usePauseAdminFeaturedPlacement,
  useResumeAdminFeaturedPlacement,
  useUpdateAdminFeaturedPlacement,
} from "../hooks/use-admin-featured-practitioners";
import type {
  AdminFeaturedPlacement,
  FeaturedPlacementReason,
  FeaturedPlacementStatus,
  FeaturedPlacementSurface,
} from "../types/admin-featured-practitioners.types";
import FeaturedPractitionerPicker, {
  type FeaturedPractitionerCandidate,
} from "./FeaturedPractitionerPicker";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

type EditorMode = "create" | "edit";
type LifecycleStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "PAUSED";

type FormState = {
  practitioner: FeaturedPractitionerCandidate | null;
  surface: FeaturedPlacementSurface;
  startsAt: string;
  endsAt: string;
  priority: string;
  reason: FeaturedPlacementReason;
  campaignName: string;
  notesInternal: string;
  status: FeaturedPlacementStatus;
};

const STATUS_OPTIONS: Array<FeaturedPlacementStatus | "ALL"> = [
  "ALL",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
];
const SURFACE_OPTIONS: Array<FeaturedPlacementSurface | "ALL"> = [
  "ALL",
  "HOME",
  "DISCOVERY",
];
const REASON_OPTIONS: FeaturedPlacementReason[] = [
  "FEATURED",
  "SPONSORED",
  "DISCOUNT",
  "NEW_SPECIALIST",
  "HIGH_AVAILABILITY",
  "EDITORIAL_PICK",
];

function toDateTimeLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function getPlacementLifecycle(placement: AdminFeaturedPlacement): LifecycleStatus {
  if (placement.status === "PAUSED") return "PAUSED";
  if (placement.endsAt && new Date(placement.endsAt).getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (new Date(placement.startsAt).getTime() > Date.now()) {
    return "SCHEDULED";
  }
  return "ACTIVE";
}

function getLifecycleTone(status: LifecycleStatus) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "SCHEDULED":
      return "info" as const;
    case "EXPIRED":
    case "PAUSED":
      return "neutral" as const;
  }
  return "neutral" as const;
}

function mapActionLabel(action: string, t: ReturnType<typeof useTranslations>) {
  return t(`history.actions.${action}` as Parameters<typeof t>[0]);
}

function getChangedFields(
  beforeSnapshot: Record<string, unknown> | null,
  afterSnapshot: Record<string, unknown> | null,
  t: ReturnType<typeof useTranslations>,
) {
  if (!beforeSnapshot && !afterSnapshot) return [];
  const fields: Array<{ label: string; before: string; after: string }> = [];
  const pairs: Array<{ key: string; labelKey: string }> = [
    { key: "status", labelKey: "fields.status" },
    { key: "surface", labelKey: "fields.surface" },
    { key: "priority", labelKey: "fields.priority" },
    { key: "startsAt", labelKey: "fields.startsAt" },
    { key: "endsAt", labelKey: "fields.endsAt" },
    { key: "reason", labelKey: "fields.reason" },
    { key: "campaignName", labelKey: "fields.campaignName" },
    { key: "notesInternal", labelKey: "fields.notesInternal" },
  ];

  for (const pair of pairs) {
    const beforeValue = beforeSnapshot?.[pair.key] ?? null;
    const afterValue = afterSnapshot?.[pair.key] ?? null;
    if (String(beforeValue ?? "") === String(afterValue ?? "")) continue;

    fields.push({
      label: t(pair.labelKey as Parameters<typeof t>[0]),
      before: beforeValue == null || beforeValue === "" ? "-" : String(beforeValue),
      after: afterValue == null || afterValue === "" ? "-" : String(afterValue),
    });
  }

  return fields;
}

function featuredErrorKey(error: unknown) {
  const appError = toAppError(error);
  switch (appError.code) {
    case "FEATURED_PLACEMENT_NOT_FOUND":
      return "errors.notFound";
    case "FEATURED_PLACEMENT_INVALID_DATE_RANGE":
      return "errors.invalidDateRange";
    case "FEATURED_PLACEMENT_INVALID_PRIORITY":
      return "errors.invalidPriority";
    case "FEATURED_PLACEMENT_EXPIRED_CANNOT_RESUME":
      return "errors.resumeExpired";
    case "FEATURED_PLACEMENT_INVALID_PRACTITIONER":
      return "errors.invalidPractitioner";
    case "FEATURED_PLACEMENT_OVERLAPPING_ACTIVE":
      return "errors.overlap";
    case "FEATURED_PLACEMENT_PRACTITIONER_REQUIRED":
      return "errors.practitionerRequired";
    default:
      return "errors.generic";
  }
}

function createDefaultFormState(): FormState {
  return {
    practitioner: null,
    surface: "HOME",
    startsAt: "",
    endsAt: "",
    priority: "100",
    reason: "FEATURED",
    campaignName: "",
    notesInternal: "",
    status: "ACTIVE",
  };
}

function toFormStateFromPlacement(placement: AdminFeaturedPlacement): FormState {
  return {
    practitioner: placement.practitioner
      ? {
          id: placement.practitioner.id,
          slug: placement.practitioner.slug,
          displayName: placement.practitioner.displayName,
          avatarUrl: placement.practitioner.avatarUrl,
          professionalTitle: placement.practitioner.professionalTitle,
          status: placement.practitioner.status,
          isVerified: placement.practitioner.status === "APPROVED",
        }
      : null,
    surface: placement.surface,
    startsAt: toDateTimeLocalInput(placement.startsAt),
    endsAt: toDateTimeLocalInput(placement.endsAt),
    priority: String(placement.priority),
    reason: placement.reason,
    campaignName: placement.campaignName ?? "",
    notesInternal: placement.notesInternal ?? "",
    status: placement.status,
  };
}

function statusLabelKey(status: LifecycleStatus) {
  return `lifecycle.${status}` as const;
}

export default function AdminFeaturedPractitionersScreen() {
  const t = useTranslations("admin-featured-practitioners");
  const locale = useLocale();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const canManage = hasPermission(
    { permissions: permissionData?.permissions ?? [] },
    PermissionKey.FEATURED_PRACTITIONERS_MANAGE,
  );

  const [statusFilter, setStatusFilter] = useState<FeaturedPlacementStatus | "ALL">("ALL");
  const [surfaceFilter, setSurfaceFilter] = useState<FeaturedPlacementSurface | "ALL">("ALL");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [endsTo, setEndsTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);

  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(createDefaultFormState);
  const [formError, setFormError] = useState<string | null>(null);

  const [pauseTarget, setPauseTarget] = useState<AdminFeaturedPlacement | null>(null);
  const [resumeTarget, setResumeTarget] = useState<AdminFeaturedPlacement | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [historyTarget, setHistoryTarget] = useState<AdminFeaturedPlacement | null>(null);

  const listParams = useMemo(
    () => ({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      surface: surfaceFilter === "ALL" ? undefined : surfaceFilter,
      practitionerSearch: practitionerSearch.trim() || undefined,
      startsFrom: startsFrom || undefined,
      endsTo: endsTo || undefined,
      page,
      limit,
    }),
    [statusFilter, surfaceFilter, practitionerSearch, startsFrom, endsTo, page, limit],
  );

  const placementsQuery = useAdminFeaturedPlacements(listParams);
  const historyQuery = useAdminFeaturedPlacementHistory(historyTarget?.id ?? null);
  const createMutation = useCreateAdminFeaturedPlacement();
  const updateMutation = useUpdateAdminFeaturedPlacement();
  const pauseMutation = usePauseAdminFeaturedPlacement();
  const resumeMutation = useResumeAdminFeaturedPlacement();

  const items = placementsQuery.data?.items ?? [];
  const pagination = placementsQuery.data;

  const derivedStats = useMemo(() => {
    const totals = {
      total: pagination?.total ?? 0,
      active: 0,
      scheduled: 0,
      expired: 0,
      paused: 0,
    };
    for (const item of items) {
      const lifecycle = getPlacementLifecycle(item);
      if (lifecycle === "ACTIVE") totals.active += 1;
      if (lifecycle === "SCHEDULED") totals.scheduled += 1;
      if (lifecycle === "EXPIRED") totals.expired += 1;
      if (lifecycle === "PAUSED") totals.paused += 1;
    }
    return totals;
  }, [items, pagination?.total]);

  const columns = useMemo<ColumnDef<AdminFeaturedPlacement>[]>(
    () => [
      {
        id: "practitioner",
        header: t("table.practitioner"),
        accessor: (row) => row.practitioner?.displayName ?? row.practitionerId,
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-light bg-surface-secondary">
              {row.practitioner?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.practitioner.avatarUrl}
                  alt={row.practitioner.displayName ?? "-"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-text-muted">
                  {(row.practitioner?.displayName ?? "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {row.practitioner?.displayName ?? "-"}
              </p>
              <p className="truncate text-xs text-text-muted">
                {row.practitioner?.professionalTitle ?? row.practitioner?.slug ?? row.practitionerId}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "surface",
        header: t("table.surface"),
        accessor: (row) => t(`surface.${row.surface}` as Parameters<typeof t>[0]),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => t(statusLabelKey(getPlacementLifecycle(row)) as Parameters<typeof t>[0]),
        cell: (row) => {
          const lifecycle = getPlacementLifecycle(row);
          return (
            <AdminStatusBadge tone={getLifecycleTone(lifecycle)}>
              {t(statusLabelKey(lifecycle) as Parameters<typeof t>[0])}
            </AdminStatusBadge>
          );
        },
      },
      {
        id: "startsAt",
        header: t("table.startsAt"),
        accessor: (row) => formatDateTime(row.startsAt, locale),
        hideOnMobile: true,
      },
      {
        id: "endsAt",
        header: t("table.endsAt"),
        accessor: (row) => formatDateTime(row.endsAt, locale),
        hideOnMobile: true,
      },
      {
        id: "priority",
        header: t("table.priority"),
        accessor: (row) => row.priority,
      },
      {
        id: "reason",
        header: t("table.reason"),
        accessor: (row) => t(`reason.${row.reason}` as Parameters<typeof t>[0]),
        hideOnMobile: true,
      },
      {
        id: "campaignName",
        header: t("table.campaign"),
        accessor: (row) => row.campaignName ?? "-",
        hideOnMobile: true,
      },
      {
        id: "updatedAt",
        header: t("table.updatedAt"),
        accessor: (row) => formatDateTime(row.updatedAt, locale),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const resetAndCloseEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setFormState(createDefaultFormState());
    setFormError(null);
  };

  const validateForm = (mode: EditorMode) => {
    if (mode === "create" && !formState.practitioner) {
      return t("validation.practitionerRequired");
    }
    if (!formState.startsAt.trim()) {
      return t("validation.startsAtRequired");
    }
    if (!formState.priority.trim() || Number(formState.priority) <= 0) {
      return t("validation.priorityPositive");
    }
    if (formState.endsAt.trim()) {
      const starts = new Date(formState.startsAt);
      const ends = new Date(formState.endsAt);
      if (
        Number.isNaN(starts.getTime()) ||
        Number.isNaN(ends.getTime()) ||
        ends <= starts
      ) {
        return t("validation.endsAtAfterStartsAt");
      }
    }
    return null;
  };

  const submitEditor = async () => {
    const validationError = validateForm(editorMode);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!formState.practitioner && editorMode === "create") {
      setFormError(t("validation.practitionerRequired"));
      return;
    }

    setFormError(null);

    try {
      if (editorMode === "create" && formState.practitioner) {
        await createMutation.mutateAsync({
          practitionerId: formState.practitioner.id,
          surface: formState.surface,
          startsAt: toIsoOrUndefined(formState.startsAt)!,
          endsAt: toIsoOrUndefined(formState.endsAt),
          priority: Number(formState.priority),
          reason: formState.reason,
          campaignName: formState.campaignName.trim() || undefined,
          notesInternal: formState.notesInternal.trim() || undefined,
        });
        toast.success(t("feedback.createSuccess"));
      } else if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          payload: {
            surface: formState.surface,
            startsAt: toIsoOrUndefined(formState.startsAt),
            endsAt: toIsoOrUndefined(formState.endsAt),
            priority: Number(formState.priority),
            reason: formState.reason,
            campaignName: formState.campaignName.trim() || undefined,
            notesInternal: formState.notesInternal.trim() || undefined,
            status: formState.status,
          },
        });
        toast.success(t("feedback.updateSuccess"));
      }

      resetAndCloseEditor();
    } catch (error) {
      const messageKey = featuredErrorKey(error);
      setFormError(t(messageKey as Parameters<typeof t>[0]));
      toast.error(t(messageKey as Parameters<typeof t>[0]));
    }
  };

  const hasFilters =
    statusFilter !== "ALL" ||
    surfaceFilter !== "ALL" ||
    Boolean(practitionerSearch.trim()) ||
    Boolean(startsFrom) ||
    Boolean(endsTo);

  const readOnlyNotice = !canManage ? (
    <AdminSectionCard
      eyebrow={t("states.readOnlyTitle")}
      title={t("states.readOnlyTitle")}
      description={t("states.readOnlyDescription")}
    >
      <p className="text-sm text-text-secondary">{t("states.readOnlyDescription")}</p>
    </AdminSectionCard>
  ) : null;

  return (
    <div className="space-y-5">
      <AdminOperationalListShell
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
        notice={readOnlyNotice}
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditorMode("create");
                setFormState(createDefaultFormState());
                setFormError(null);
                setEditorOpen(true);
              }}
              startIcon={<Plus className="h-4 w-4" />}
            >
              {t("actions.add")}
            </Button>
          ) : null
        }
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("summary.total")}
              value={derivedStats.total}
              tone="primary"
            />
            <AdminSummaryCard
              label={t("summary.active")}
              value={derivedStats.active}
              tone="success"
            />
            <AdminSummaryCard
              label={t("summary.scheduled")}
              value={derivedStats.scheduled}
              tone="primary"
            />
            <AdminSummaryCard
              label={t("summary.inactive")}
              value={derivedStats.expired + derivedStats.paused}
              tone="neutral"
            />
          </>
        }
        filters={
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-text-muted">
                  {t("filters.search")}
                </span>
                <input
                  type="text"
                  value={practitionerSearch}
                  onChange={(event) => {
                    setPractitionerSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("filters.searchPlaceholder")}
                  className="app-control h-11 w-full rounded-[18px] px-4"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-text-muted">
                  {t("filters.surface")}
                </span>
                <select
                  value={surfaceFilter}
                  onChange={(event) => {
                    setSurfaceFilter(event.target.value as FeaturedPlacementSurface | "ALL");
                    setPage(1);
                  }}
                  className="app-control h-11 w-full rounded-[18px] px-4"
                >
                  {SURFACE_OPTIONS.map((surface) => (
                    <option key={`${surface}`} value={surface}>
                      {surface === "ALL" ? t("filters.all") : t(`surface.${surface}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-text-muted">
                  {t("filters.status")}
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as FeaturedPlacementStatus | "ALL");
                    setPage(1);
                  }}
                  className="app-control h-11 w-full rounded-[18px] px-4"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? t("filters.all") : t(`status.${status}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end justify-end">
                <Button
                  variant="outline"
                  disabled={!hasFilters}
                  onClick={() => {
                    setStatusFilter("ALL");
                    setSurfaceFilter("ALL");
                    setPractitionerSearch("");
                    setStartsFrom("");
                    setEndsTo("");
                    setPage(1);
                  }}
                >
                  {t("actions.clearFilters")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DateField
                label={t("filters.startsFrom")}
                value={startsFrom}
                onChange={(value) => {
                  setStartsFrom(value);
                  setPage(1);
                }}
                placeholder="2026-05-01"
              />
              <DateField
                label={t("filters.endsTo")}
                value={endsTo}
                onChange={(value) => {
                  setEndsTo(value);
                  setPage(1);
                }}
                placeholder="2026-05-30"
              />
            </div>
          </div>
        }
      >
        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={placementsQuery.isLoading}
          error={placementsQuery.isError ? t("errors.generic") : null}
          errorState={{
            title: t("states.listErrorTitle"),
            description: t("states.listErrorDescription"),
            action: { label: t("states.retry"), onClick: () => placementsQuery.refetch() },
          }}
          rowActions={(row) => (
            <div className="flex items-center gap-2">
              <ActionIconButton
                intent="view"
                label={t("actions.history")}
                icon={<ScrollText className="h-4 w-4" />}
                onClick={() => setHistoryTarget(row)}
              />

              {row.practitioner?.slug ? (
                <ActionIconLink
                  intent="view"
                  href={`/${locale}/practitioners/${row.practitioner.slug}`}
                  label={t("actions.openProfile")}
                  icon={<ExternalLink className="h-4 w-4" />}
                />
              ) : null}

              {canManage ? (
                <>
                  <ActionIconButton
                    intent="edit"
                    label={t("actions.edit")}
                    icon={<SquarePen className="h-4 w-4" />}
                    onClick={() => {
                      setEditorMode("edit");
                      setEditingId(row.id);
                      setFormState(toFormStateFromPlacement(row));
                      setFormError(null);
                      setEditorOpen(true);
                    }}
                  />
                  {row.status === "PAUSED" ? (
                    <ActionIconButton
                      intent="publish"
                      label={t("actions.resume")}
                      icon={<PlayCircle className="h-4 w-4" />}
                      onClick={() => {
                        setActionNote("");
                        setResumeTarget(row);
                      }}
                    />
                  ) : row.status === "ACTIVE" ? (
                    <ActionIconButton
                      intent="deactivate"
                      label={t("actions.end")}
                      icon={<PauseCircle className="h-4 w-4" />}
                      onClick={() => {
                        setActionNote("");
                        setPauseTarget(row);
                      }}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          )}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  limit: pagination.limit,
                  total: pagination.total,
                  totalPages: pagination.totalPages,
                  hasPrevPage: pagination.page > 1,
                  hasNextPage: pagination.page < pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyState={{
            title: t("states.emptyTitle"),
            description: t("states.emptyDescription"),
          }}
          ariaLabel={t("title")}
          caption={t("title")}
        />
      </AdminOperationalListShell>

      <FormModal
        isOpen={editorOpen}
        onClose={resetAndCloseEditor}
        title={editorMode === "create" ? t("editor.createTitle") : t("editor.editTitle")}
        description={t("editor.description")}
        submitLabel={
          createMutation.isPending || updateMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("editor.saving")}
            </span>
          ) : editorMode === "create" ? (
            t("editor.createAction")
          ) : (
            t("editor.saveAction")
          )
        }
        cancelLabel={t("editor.cancelAction")}
        onSubmit={submitEditor}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-5">
          <FeaturedPractitionerPicker
            value={formState.practitioner}
            onChange={(practitioner) =>
              setFormState((prev) => ({ ...prev, practitioner }))
            }
            disabled={editorMode === "edit"}
            error={editorMode === "create" && !formState.practitioner ? formError : null}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-text-muted">
                {t("fields.surface")}
              </span>
              <select
                value={formState.surface}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    surface: event.target.value as FeaturedPlacementSurface,
                  }))
                }
                className="app-control h-11 w-full rounded-[18px] px-4"
              >
                <option value="HOME">{t("surface.HOME")}</option>
                <option value="DISCOVERY">{t("surface.DISCOVERY")}</option>
                <option value="ALL">{t("surface.ALL")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-text-muted">
                {t("fields.reason")}
              </span>
              <select
                value={formState.reason}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    reason: event.target.value as FeaturedPlacementReason,
                  }))
                }
                className="app-control h-11 w-full rounded-[18px] px-4"
              >
                {REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`reason.${reason}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <Label htmlFor="featuredStartsAt">{t("fields.startsAt")}</Label>
              <InputField
                id="featuredStartsAt"
                type="datetime-local"
                value={formState.startsAt}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="featuredEndsAt">{t("fields.endsAt")}</Label>
              <InputField
                id="featuredEndsAt"
                type="datetime-local"
                value={formState.endsAt}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, endsAt: event.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="featuredPriority">{t("fields.priority")}</Label>
              <InputField
                id="featuredPriority"
                type="number"
                min={1}
                value={formState.priority}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, priority: event.target.value }))
                }
              />
            </div>

            {editorMode === "edit" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-text-muted">
                  {t("fields.status")}
                </span>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as FeaturedPlacementStatus,
                    }))
                  }
                  className="app-control h-11 w-full rounded-[18px] px-4"
                >
                  <option value="ACTIVE">{t("status.ACTIVE")}</option>
                  <option value="PAUSED">{t("status.PAUSED")}</option>
                  <option value="EXPIRED">{t("status.EXPIRED")}</option>
                </select>
              </label>
            ) : null}

            <div>
              <Label htmlFor="featuredCampaign">{t("fields.campaignName")}</Label>
              <InputField
                id="featuredCampaign"
                value={formState.campaignName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, campaignName: event.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="featuredNotes">{t("fields.notesInternal")}</Label>
            <TextArea
              id="featuredNotes"
              rows={3}
              value={formState.notesInternal}
              onChange={(value) => setFormState((prev) => ({ ...prev, notesInternal: value }))}
            />
          </div>

          {formError && !(editorMode === "create" && !formState.practitioner) ? (
            <p className="text-sm font-medium text-error-500">{formError}</p>
          ) : null}
        </div>
      </FormModal>

      <FormModal
        isOpen={Boolean(pauseTarget)}
        onClose={() => setPauseTarget(null)}
        title={t("end.title")}
        description={t("end.description")}
        submitLabel={pauseMutation.isPending ? t("end.submitting") : t("end.confirm")}
        cancelLabel={t("end.cancel")}
        onSubmit={async () => {
          if (!pauseTarget) return;
          try {
            await pauseMutation.mutateAsync({
              id: pauseTarget.id,
              payload: { note: actionNote.trim() || undefined },
            });
            toast.success(t("feedback.endSuccess"));
            setPauseTarget(null);
            setActionNote("");
          } catch (error) {
            const messageKey = featuredErrorKey(error);
            toast.error(t(messageKey as Parameters<typeof t>[0]));
          }
        }}
        loading={pauseMutation.isPending}
      >
        <Label htmlFor="pauseNote">{t("fields.noteOptional")}</Label>
        <TextArea
          id="pauseNote"
          rows={3}
          value={actionNote}
          onChange={(value) => setActionNote(value)}
        />
      </FormModal>

      <FormModal
        isOpen={Boolean(resumeTarget)}
        onClose={() => setResumeTarget(null)}
        title={t("resume.title")}
        description={t("resume.description")}
        submitLabel={resumeMutation.isPending ? t("resume.submitting") : t("resume.confirm")}
        cancelLabel={t("resume.cancel")}
        onSubmit={async () => {
          if (!resumeTarget) return;
          try {
            await resumeMutation.mutateAsync({
              id: resumeTarget.id,
              payload: { note: actionNote.trim() || undefined },
            });
            toast.success(t("feedback.resumeSuccess"));
            setResumeTarget(null);
            setActionNote("");
          } catch (error) {
            const messageKey = featuredErrorKey(error);
            toast.error(t(messageKey as Parameters<typeof t>[0]));
          }
        }}
        loading={resumeMutation.isPending}
      >
        <Label htmlFor="resumeNote">{t("fields.noteOptional")}</Label>
        <TextArea
          id="resumeNote"
          rows={3}
          value={actionNote}
          onChange={(value) => setActionNote(value)}
        />
      </FormModal>

      <Drawer isOpen={Boolean(historyTarget)} onClose={() => setHistoryTarget(null)} side="right">
        <ModalHeader
          title={t("history.title")}
          description={
            historyTarget
              ? `${historyTarget.practitioner?.displayName ?? "-"} · ${historyTarget.practitioner?.slug ?? historyTarget.practitionerId}`
              : undefined
          }
        />
        <ModalBody>
          {historyQuery.isLoading ? (
            <p className="text-sm text-text-muted">{t("history.loading")}</p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-error-500">{t("errors.generic")}</p>
          ) : (
            <div className="space-y-4">
              {(historyQuery.data ?? []).map((entry) => {
                const changes = getChangedFields(entry.beforeSnapshot, entry.afterSnapshot, t);
                return (
                  <div key={entry.id} className="rounded-2xl border border-border-light bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">
                        {mapActionLabel(entry.action, t)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDateTime(entry.createdAt, locale)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {entry.actor?.displayName ?? t("history.unknownActor")}
                    </p>
                    {entry.note ? (
                      <p className="mt-2 rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                        {entry.note}
                      </p>
                    ) : null}
                    {changes.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {changes.map((change) => (
                          <div
                            key={`${entry.id}-${change.label}`}
                            className="rounded-xl border border-border-light/70 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-text-primary">
                              {change.label}
                            </p>
                            <p className="mt-1 text-xs text-text-muted">
                              {change.before} → {change.after}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </ModalBody>
      </Drawer>
    </div>
  );
}
