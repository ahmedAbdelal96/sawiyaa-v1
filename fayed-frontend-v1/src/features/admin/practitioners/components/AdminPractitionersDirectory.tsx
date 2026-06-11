"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Eye,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  AdminStatusBadge,
  AdminTableTabs,
  AdminTableToolbar,
} from "@/components/shared/admin/AdminDashboardKit";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  useAdminPractitioners,
  useRemoveAdminPractitionerAvatar,
  useUpdateAdminPractitionerAvatar,
} from "../hooks/use-admin-practitioners";
import { useAdminCountries } from "@/features/admin/patients/hooks/use-admin-patients";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import type { AdminPractitionerListItem } from "../types/admin-practitioners.types";
import type { PractitionerType } from "@/features/practitioners/types/practitioners.types";
import Button from "@/components/ui/button/Button";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { SUPPORTED_COUNTRY_CODES } from "@/constants/reference-data";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Avatar from "@/components/ui/avatar/Avatar";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
type PractitionerTabValue = "" | "doctor" | "therapist";

export default function AdminPractitionersDirectory() {
  const locale = useLocale();
  const tNav = useTranslations("navigation");
  const tAdmin = useTranslations("admin-area");
  const tListing = useTranslations("practitioners-listing");

  const [search, setSearch] = useState("");
  const [practitionerKind, setPractitionerKind] = useState<PractitionerTabValue>("");
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

  const { data: countries = [] } = useAdminCountries();

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const ratedItems = items.filter((item) => item.ratingSummary.averageRating != null);
  const onlineCount = items.filter((item) => item.isOnlineNow).length;
  const verifiedCount = items.filter((item) => item.isVerified).length;
  const averageRating =
    ratedItems.length > 0
      ? ratedItems.reduce((sum, item) => sum + (item.ratingSummary.averageRating ?? 0), 0) /
        ratedItems.length
      : null;
  const activeTypeTab = practitionerKind;
  const practitionerTabs: Array<{
    value: PractitionerTabValue;
    label: string;
  }> = [
    { value: "", label: tListing("filter.allTypes") },
    { value: "doctor", label: tListing("filter.practitionerTypeDoctor") },
    { value: "therapist", label: tListing("filter.practitionerTypeTherapist") },
  ];

  const columns = useMemo<ColumnDef<AdminPractitionerListItem>[]>(
    () => [
      {
        id: "name",
        header: tAdmin("applications.table.applicant"),
        accessor: (row) => row.displayName ?? tAdmin("applications.table.noName"),
        align: "start",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={row.avatarUrl}
              name={row.displayName ?? ""}
              size="medium"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                {row.displayName ?? tAdmin("applications.table.noName")}
              </p>
              <p className="truncate text-xs text-text-muted">
                {row.professionalTitle || tListing("empty.subtitle")}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-text-muted">
                {row.slug}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: tAdmin("applications.table.type"),
        accessor: (row) => tAdmin(`practitionerType.${row.practitionerType as PractitionerType}`),
        align: "center",
        cell: (row) => (
          <AdminStatusBadge tone="primary">
            {tAdmin(`practitionerType.${row.practitionerType as PractitionerType}`)}
          </AdminStatusBadge>
        ),
      },
      {
        id: "country",
        header: tAdmin("applicationDetails.applicant.country"),
        accessor: (row) => resolveCountryLabel(row.countryCode, countries, locale),
        align: "center",
        hideOnMobile: true,
      },
      {
        id: "rating",
        header: tListing("filter.rating"),
        accessor: (row) => {
          const value = row.ratingSummary.averageRating;
          return value == null ? "-" : `${value.toFixed(1)} (${row.ratingSummary.totalReviews})`;
        },
        align: "center",
        cell: (row) => {
          const value = row.ratingSummary.averageRating;
          return value == null ? (
            <span className="text-sm text-text-muted">-</span>
          ) : (
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-warning-50 text-warning-700">
                <Star className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {value.toFixed(1)}
                </p>
                <p className="text-xs text-text-muted">
                  {row.ratingSummary.totalReviews} {locale === "ar" ? "تقييم" : "reviews"}
                </p>
              </div>
            </div>
          );
        },
        hideOnMobile: true,
      },
      {
        id: "online",
        header: tListing("filter.onlineNow"),
        accessor: (row) => (row.isOnlineNow ? tListing("filter.yes") : tListing("filter.no")),
        align: "center",
        cell: (row) => (
          <AdminStatusBadge tone={row.isOnlineNow ? "success" : "muted"}>
            <span className="inline-flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              {row.isOnlineNow ? tListing("filter.yes") : tListing("filter.no")}
            </span>
          </AdminStatusBadge>
        ),
      },
      {
        id: "verified",
        header: tListing("card.verified"),
        accessor: (row) => (row.isVerified ? tListing("filter.yes") : tListing("filter.no")),
        align: "center",
        cell: (row) => (
          <AdminStatusBadge tone={row.isVerified ? "primary" : "muted"}>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3 w-3" />
              {row.isVerified ? tListing("filter.yes") : tListing("filter.no")}
            </span>
          </AdminStatusBadge>
        ),
      },
    ],
    [tAdmin, tListing, countries, locale],
  );

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
    <>
      <AdminOperationalListShell
        eyebrow={tNav("main.title")}
        title={tNav("main.practitioners")}
        description={
          locale === "ar"
            ? "عرض وإدارة دليل الممارسين مع إبراز الهوية، التقييم، والحالة الحالية."
            : "Browse and manage the practitioner directory."
        }
        summaryCards={
          <>
            <AdminSummaryCard
              label={tNav("main.practitioners")}
              value={typeof pagination?.totalItems === "number" ? pagination.totalItems : "..."}
              hint={locale === "ar" ? "إجمالي النتائج" : "Total results"}
              icon={<Users className="h-4 w-4" />}
              tone="primary"
            />
            <AdminSummaryCard
              label={locale === "ar" ? "متصلون الآن" : "Online now"}
              value={onlineCount}
              hint={locale === "ar" ? "ضمن الصفحة الحالية" : "Current page"}
              icon={<Wifi className="h-4 w-4" />}
              tone="success"
            />
            <AdminSummaryCard
              label={locale === "ar" ? "موثقون" : "Verified"}
              value={verifiedCount}
              hint={locale === "ar" ? "ضمن الصفحة الحالية" : "Current page"}
              icon={<BadgeCheck className="h-4 w-4" />}
              tone="info"
            />
            <AdminSummaryCard
              label={locale === "ar" ? "متوسط التقييم" : "Avg. rating"}
              value={averageRating != null ? averageRating.toFixed(1) : "-"}
              hint={locale === "ar" ? "من النتائج الحالية" : "Current slice"}
              icon={<Star className="h-4 w-4" />}
              tone="warning"
            />
          </>
        }
        filters={
          <div className="space-y-4">
            {/* Type tabs */}
            <AdminTableTabs
              value={activeTypeTab}
              onChange={(nextValue) => {
                setPractitionerKind(nextValue);
                setPage(1);
              }}
              tabs={practitionerTabs}
            />

            {/* Main toolbar: search + quick filters */}
            <AdminTableToolbar
              search={{
                value: search,
                onChange: (value) => {
                  setSearch(value);
                  setPage(1);
                },
                placeholder: tListing("search.placeholder"),
                ariaLabel: tListing("search.button"),
              }}
              actions={
                <Button variant="outline" className="h-9 text-sm" onClick={resetFilters}>
                  {tListing("filter.clearAll")}
                </Button>
              }
              filters={
                <>
                  <label className="flex items-center gap-2 rounded-[16px] border border-border-light bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={onlineOnly}
                      onChange={(event) => {
                        setOnlineOnly(event.target.checked);
                        setPage(1);
                      }}
                      className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-secondary">
                      {tListing("filter.onlineNow")}
                    </span>
                  </label>

                  <select
                    value={minRating}
                    onChange={(event) => {
                      setMinRating(event.target.value as "" | "3" | "4" | "4.5");
                      setPage(1);
                    }}
                    className="app-control h-9 min-w-[9rem] rounded-[18px] px-3 text-sm"
                  >
                    <option value="">{tListing("filter.anyRating")}</option>
                    <option value="3">{tListing("filter.rating3Up")}</option>
                    <option value="4">{tListing("filter.rating4Up")}</option>
                    <option value="4.5">{tListing("filter.rating45Up")}</option>
                  </select>

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
                    className="app-control h-9 min-w-[10rem] rounded-[18px] px-3 text-sm"
                  >
                    <option value="recommended">{tListing("sort.recommended")}</option>
                    <option value="rating">{tListing("sort.rating")}</option>
                    <option value="experience">{tListing("sort.experience")}</option>
                    <option value="newest">{tListing("sort.newest")}</option>
                    <option value="oldest">{tListing("sort.oldest")}</option>
                  </select>
                </>
              }
            />

            {/* Advanced filters toggle */}
            <div className="flex items-end justify-between gap-3">
              <AdvancedFiltersToggleButton
                expanded={showAdvancedFilters}
                hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
                onToggle={() => setShowAdvancedFilters((prev) => !prev)}
              />
            </div>

            {showAdvancedFilters ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {tListing("filter.gender")}
                  </span>
                  <select
                    value={gender}
                    onChange={(event) => {
                      setGender(event.target.value as "" | "male" | "female");
                      setPage(1);
                    }}
                    className="app-control h-9 w-full rounded-[18px] text-sm"
                  >
                    <option value="">{tListing("filter.allGenders")}</option>
                    <option value="male">{tListing("filter.genderMale")}</option>
                    <option value="female">{tListing("filter.genderFemale")}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {tListing("filter.country")}
                  </span>
                  <select
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setPage(1);
                    }}
                    className="app-control h-9 w-full rounded-[18px] text-sm"
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
          </div>
        }
        tableSubtitle={
          typeof pagination?.totalItems === "number"
            ? locale === "ar"
              ? `${pagination.totalItems} نتيجة`
              : `${pagination.totalItems} results`
            : undefined
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
          rowActionsHeader={tAdmin("applications.table.actions")}
          rowActions={(row) => (
            <div className="inline-flex items-center justify-center gap-1.5">
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
      </AdminOperationalListShell>

      {/* Avatar edit modal — business logic unchanged */}
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
              <Avatar
                src={selectedPractitioner.avatarUrl}
                name={selectedPractitioner.displayName ?? ""}
                size="medium"
                className="border border-border-light bg-surface"
              />
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
                disabled={removeAvatarMutation.isPending || !selectedPractitioner.avatarUrl}
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
    </>
  );
}
