"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Image as ImageIcon, Loader2, Search, Trash2 } from "lucide-react";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  useAdminPractitioners,
  useRemoveAdminPractitionerAvatar,
  useUpdateAdminPractitionerAvatar,
} from "../hooks/use-admin-practitioners";
import type { AdminPractitionerListItem } from "../types/admin-practitioners.types";
import type { PractitionerType } from "@/features/practitioners/types/practitioners.types";
import Button from "@/components/ui/button/Button";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { SUPPORTED_COUNTRY_CODES } from "@/constants/reference-data";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

export default function AdminPractitionersDirectory() {
  const tNav = useTranslations("navigation");
  const tAdmin = useTranslations("admin-area");
  const tListing = useTranslations("practitioners-listing");

  const [search, setSearch] = useState("");
  const [practitionerKind, setPractitionerKind] = useState<"" | "doctor" | "therapist">("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [country, setCountry] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [minRating, setMinRating] = useState<"" | "3" | "4" | "4.5">("");
  const [sort, setSort] = useState<
    "recommended" | "experience" | "rating" | "newest" | "oldest"
  >("recommended");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const hasAdvancedFilters =
    Boolean(practitionerKind) || Boolean(gender) || Boolean(country) || Boolean(minRating);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<AdminPractitionerListItem | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const updateAvatarMutation = useUpdateAdminPractitionerAvatar();
  const removeAvatarMutation = useRemoveAdminPractitionerAvatar();

  const { data, isLoading, isError, refetch } = useAdminPractitioners({
    search: debouncedSearch.trim() || undefined,
    practitionerKind: practitionerKind || undefined,
    gender: gender || undefined,
    country: country || undefined,
    onlineNow: onlineOnly || undefined,
    minRating: minRating ? Number(minRating) : undefined,
    sort,
    page,
    limit: pageSize,
  });

  const columns = useMemo<ColumnDef<AdminPractitionerListItem>[]>(
    () => [
      {
        id: "name",
        header: tAdmin("applications.table.applicant"),
        accessor: (row) => row.displayName ?? tAdmin("applications.table.noName"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary dark:text-white">
              {row.displayName ?? tAdmin("applications.table.noName")}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.professionalTitle || "-"}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        header: tAdmin("applications.table.type"),
        accessor: (row) =>
          tAdmin(`practitionerType.${row.practitionerType as PractitionerType}`),
      },
      {
        id: "country",
        header: tAdmin("applicationDetails.applicant.country"),
        accessor: (row) => {
          if (!row.countryCode) return "-";
          const code = row.countryCode.toLowerCase();
          if (code === "eg") return tListing("countries.eg");
          if (code === "sa") return tListing("countries.sa");
          if (code === "ae") return tListing("countries.ae");
          if (code === "kw") return tListing("countries.kw");
          if (code === "jo") return tListing("countries.jo");
          return row.countryCode;
        },
        hideOnMobile: true,
      },
      {
        id: "rating",
        header: tListing("filter.rating"),
        accessor: (row) => {
          const value = row.ratingSummary.averageRating;
          return value == null ? "-" : `${value.toFixed(1)} (${row.ratingSummary.totalReviews})`;
        },
        hideOnMobile: true,
      },
      {
        id: "online",
        header: tListing("filter.onlineNow"),
        accessor: (row) =>
          row.isOnlineNow ? tListing("filter.yes") : tListing("filter.no"),
        cell: (row) => (
          <span className="inline-flex items-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                row.isOnlineNow ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {row.isOnlineNow ? tListing("filter.yes") : tListing("filter.no")}
            </span>
          </span>
        ),
      },
      {
        id: "verified",
        header: tListing("card.verified"),
        accessor: (row) =>
          row.isVerified ? tListing("filter.yes") : tListing("filter.no"),
      },
    ],
    [tAdmin, tListing],
  );

  const pagination = data?.pagination;
  const items = data?.items ?? [];
  const countryOptions = useMemo(() => {
    return SUPPORTED_COUNTRY_CODES.map((code) => ({
      value: code.toUpperCase(),
      label: tListing(`countries.${code}`),
    }));
  }, [tListing]);

  const resetFilters = () => {
    setSearch("");
    setPractitionerKind("");
    setGender("");
    setCountry("");
    setOnlineOnly(false);
    setMinRating("");
    setSort("recommended");
    setPage(1);
  };

  const closeAvatarModal = () => {
    setSelectedPractitioner(null);
    setAvatarUrlInput("");
    setAvatarError(null);
    setAvatarSuccess(null);
  };

  const handleAvatarUpdate = async () => {
    if (!selectedPractitioner) return;

    const trimmed = avatarUrlInput.trim();
    setAvatarError(null);
    setAvatarSuccess(null);

    if (!trimmed) {
      setAvatarError(tAdmin("practitionersDirectory.avatar.validation.required"));
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setAvatarError(tAdmin("practitionersDirectory.avatar.validation.invalidUrl"));
      return;
    }

    try {
      await updateAvatarMutation.mutateAsync({
        practitionerId: selectedPractitioner.id,
        avatarUrl: trimmed,
      });
      setSelectedPractitioner((current) =>
        current ? { ...current, avatarUrl: trimmed } : current,
      );
      setAvatarSuccess(tAdmin("practitionersDirectory.avatar.feedback.updateSuccess"));
    } catch {
      setAvatarError(tAdmin("practitionersDirectory.avatar.feedback.updateError"));
    }
  };

  const handleAvatarRemove = async () => {
    if (!selectedPractitioner) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      await removeAvatarMutation.mutateAsync(selectedPractitioner.id);
      setSelectedPractitioner((current) =>
        current ? { ...current, avatarUrl: null } : current,
      );
      setAvatarUrlInput("");
      setAvatarSuccess(tAdmin("practitionersDirectory.avatar.feedback.removeSuccess"));
    } catch {
      setAvatarError(tAdmin("practitionersDirectory.avatar.feedback.removeError"));
    }
  };

  return (
    <AdminOperationalListShell
      title={tNav("main.practitioners")}
      summaryCards={
        <AdminSummaryCard
          label={tNav("main.practitioners")}
          value={typeof pagination?.totalItems === "number" ? pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {tListing("search.button")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={tListing("search.placeholder")}
                  className="app-control w-full py-3 pe-4 ps-10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {tListing("filter.practitionerType")}
              </span>
              <select
                value={practitionerKind}
                onChange={(event) => {
                  setPractitionerKind(event.target.value as "" | "doctor" | "therapist");
                  setPage(1);
                }}
                className="app-control h-11 w-full"
              >
                <option value="">{tListing("filter.allTypes")}</option>
                <option value="doctor">{tListing("filter.practitionerTypeDoctor")}</option>
                <option value="therapist">{tListing("filter.practitionerTypeTherapist")}</option>
              </select>
            </label>

            <div className="flex items-end justify-end">
              <AdvancedFiltersToggleButton
                expanded={showAdvancedFilters}
                hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
                onToggle={() => setShowAdvancedFilters((prev) => !prev)}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary dark:bg-white/5 dark:text-white/90">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(event) => {
                  setOnlineOnly(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              {tListing("filter.onlineNow")}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {tListing("filter.rating")}
              </span>
              <select
                value={minRating}
                onChange={(event) => {
                  setMinRating(event.target.value as "" | "3" | "4" | "4.5");
                  setPage(1);
                }}
                className="app-control h-11 w-full"
              >
                <option value="">{tListing("filter.anyRating")}</option>
                <option value="3">{tListing("filter.rating3Up")}</option>
                <option value="4">{tListing("filter.rating4Up")}</option>
                <option value="4.5">{tListing("filter.rating45Up")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {tListing("sort.label")}
              </span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(
                    event.target.value as
                      | "recommended"
                      | "experience"
                      | "rating"
                      | "newest"
                      | "oldest",
                  );
                  setPage(1);
                }}
                className="app-control h-11 w-full"
              >
                <option value="recommended">{tListing("sort.recommended")}</option>
                <option value="rating">{tListing("sort.rating")}</option>
                <option value="experience">{tListing("sort.experience")}</option>
                <option value="newest">{tListing("sort.newest")}</option>
                <option value="oldest">{tListing("sort.oldest")}</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button variant="outline" className="h-11 w-full" onClick={resetFilters}>
                {tListing("filter.clearAll")}
              </Button>
            </div>
          </div>

          {showAdvancedFilters ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {tListing("filter.gender")}
                </span>
                <select
                  value={gender}
                  onChange={(event) => {
                    setGender(event.target.value as "" | "male" | "female");
                    setPage(1);
                  }}
                  className="app-control h-11 w-full"
                >
                  <option value="">{tListing("filter.allGenders")}</option>
                  <option value="male">{tListing("filter.genderMale")}</option>
                  <option value="female">{tListing("filter.genderFemale")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {tListing("filter.country")}
                </span>
                <select
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setPage(1);
                  }}
                  className="app-control h-11 w-full"
                >
                  <option value="">{tListing("filter.allCountries")}</option>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </>
      }
    >
      <DataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        error={isError ? tListing("error.title") : null}
        errorState={{
          title: tListing("error.title"),
          description: tListing("error.subtitle"),
          action: {
            label: tListing("error.retry"),
            onClick: () => refetch(),
          },
        }}
        rowActions={(row) => (
          <div className="flex items-center gap-2">
            <ActionIconButton
              intent="edit"
              label={tAdmin("practitionersDirectory.avatar.openModal")}
              icon={<ImageIcon className="h-4 w-4" />}
              onClick={() => {
                setSelectedPractitioner(row);
                setAvatarUrlInput(row.avatarUrl ?? "");
                setAvatarError(null);
                setAvatarSuccess(null);
              }}
            />
            <ActionIconLink
              intent="view"
              href={`/practitioners/${row.slug}`}
              label={tAdmin("applications.table.viewAction")}
              icon={<Eye className="h-4 w-4" />}
            />
          </div>
        )}
        pagination={
          pagination
            ? {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.totalItems,
                totalPages: pagination.totalPages,
                hasPrevPage: pagination.page > 1,
                hasNextPage: pagination.page < pagination.totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => setPage(nextPage)}
        onPageSizeChange={(nextLimit) => {
          setPageSize(nextLimit);
          setPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyState={{
          title: tListing("empty.title"),
          description: tListing("empty.subtitle"),
        }}
        ariaLabel={tNav("main.practitioners")}
        caption={tNav("main.practitioners")}
      />

      <FormModal
        isOpen={!!selectedPractitioner}
        onClose={closeAvatarModal}
        size="lg"
        title={tAdmin("practitionersDirectory.avatar.title")}
        description={tAdmin("practitionersDirectory.avatar.note")}
        submitLabel={
          updateAvatarMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tAdmin("practitionersDirectory.avatar.actions.saving")}
            </span>
          ) : (
            tAdmin("practitionersDirectory.avatar.actions.save")
          )
        }
        cancelLabel={tAdmin("practitionersDirectory.avatar.actions.close")}
        loading={updateAvatarMutation.isPending}
        onSubmit={handleAvatarUpdate}
      >
        {selectedPractitioner ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary p-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-border-light bg-surface">
                {selectedPractitioner.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedPractitioner.avatarUrl}
                    alt={selectedPractitioner.displayName ?? "-"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                    {tAdmin("practitionersDirectory.avatar.empty")}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {selectedPractitioner.displayName ?? tAdmin("applications.table.noName")}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {selectedPractitioner.professionalTitle ?? "-"}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="adminPractitionerAvatarUrl">
                {tAdmin("practitionersDirectory.avatar.fieldLabel")}
              </Label>
              <InputField
                id="adminPractitionerAvatarUrl"
                type="url"
                placeholder={tAdmin("practitionersDirectory.avatar.placeholder")}
                value={avatarUrlInput}
                onChange={(event) => setAvatarUrlInput(event.target.value)}
                error={!!avatarError}
              />
              <p className="mt-1.5 text-xs text-text-muted">
                {tAdmin("practitionersDirectory.avatar.hint")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={
                  removeAvatarMutation.isPending || !selectedPractitioner.avatarUrl
                }
                onClick={handleAvatarRemove}
                startIcon={
                  removeAvatarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )
                }
              >
                {removeAvatarMutation.isPending
                  ? tAdmin("practitionersDirectory.avatar.actions.removing")
                  : tAdmin("practitionersDirectory.avatar.actions.remove")}
              </Button>
            </div>

            {avatarSuccess ? (
              <p className="text-sm font-medium text-success-600">{avatarSuccess}</p>
            ) : null}
            {avatarError ? (
              <p className="text-sm font-medium text-error-500">{avatarError}</p>
            ) : null}
          </div>
        ) : null}
      </FormModal>
    </AdminOperationalListShell>
  );
}
