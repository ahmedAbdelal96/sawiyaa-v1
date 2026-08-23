"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getProfessionalTitleLabel } from "@/constants/reference-data";
import {
  BadgeCheck,
  Eye,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Users,
  Wifi,
  Globe2,
  GlobeLock,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertTriangle,
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
  useAdminPractitionerPublication,
  useUpdateAdminPractitionerPublication,
} from "../hooks/use-admin-practitioners";
import { useAdminCountries } from "@/features/admin/patients/hooks/use-admin-patients";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import type { AdminPractitionerListItem } from "../types/admin-practitioners.types";
import type { PractitionerType } from "@/features/practitioners/types/practitioners.types";
import Button from "@/components/ui/button/Button";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Avatar from "@/components/ui/avatar/Avatar";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import TextArea from "@/components/form/input/TextArea";
import { cn } from "@/lib/utils";

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
  >("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const hasAdvancedFilters =
    Boolean(gender) || Boolean(country);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<AdminPractitionerListItem | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [publicationPractitioner, setPublicationPractitioner] = useState<AdminPractitionerListItem | null>(null);
  const [publicationReason, setPublicationReason] = useState("");
  const [existingBookingAcknowledged, setExistingBookingAcknowledged] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const updateAvatarMutation = useUpdateAdminPractitionerAvatar();
  const removeAvatarMutation = useRemoveAdminPractitionerAvatar();
  const publicationQuery = useAdminPractitionerPublication(publicationPractitioner?.id ?? null);
  const publicationMutation = useUpdateAdminPractitionerPublication();

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
        header: locale === "ar" ? "الممارس" : "Practitioner",
        accessor: (row) => row.displayName ?? tAdmin("applications.table.noName"),
        align: "start",
        cell: (row) => {
          const rawTitle = row.professionalTitle;
          let resolvedTitle = rawTitle ? getProfessionalTitleLabel(rawTitle, locale) || rawTitle : null;
          if (resolvedTitle && resolvedTitle.includes("—")) {
            const parts = resolvedTitle.split("—").map((p) => p.trim());
            resolvedTitle = parts[1] || parts[0];
          }
          const cleanTitle = resolvedTitle && !resolvedTitle.startsWith("BLOC2F2") ? resolvedTitle : null;

          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative shrink-0">
                <Avatar
                  src={row.avatarUrl}
                  name={row.displayName ?? ""}
                  size="small"
                  className="h-9 w-9 rounded-xl border border-border-light shadow-2xs"
                />
                {row.isOnlineNow && (
                  <span
                    className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500"
                    title={locale === "ar" ? "متصل الآن" : "Online now"}
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-text-primary">
                    {row.displayName ?? tAdmin("applications.table.noName")}
                  </p>
                  {row.isVerified && (
                    <BadgeCheck
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                      aria-label={tListing("card.verified")}
                    />
                  )}
                </div>
                {cleanTitle && (
                  <p className="truncate text-[11px] font-medium text-text-secondary">
                    {cleanTitle}
                  </p>
                )}
                <p className="truncate text-[10px] font-mono text-text-muted" dir="ltr">
                  {row.slug}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "type",
        header: tAdmin("applications.table.type"),
        accessor: (row) => tAdmin(`practitionerType.${row.practitionerType as PractitionerType}`),
        align: "center",
        cell: (row) => (
          <span className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-0.5 text-[11px] font-bold text-text-secondary">
            {tAdmin(`practitionerType.${row.practitionerType as PractitionerType}`)}
          </span>
        ),
      },
      {
        id: "country",
        header: tAdmin("applicationDetails.applicant.country"),
        accessor: (row) => resolveCountryLabel(row.countryCode, countries, locale),
        align: "center",
        cell: (row) => (
          <span className="text-xs font-medium text-text-secondary">
            {resolveCountryLabel(row.countryCode, countries, locale) || "-"}
          </span>
        ),
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
            <span className="text-xs text-text-muted">-</span>
          ) : (
            <div className="inline-flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span className="font-bold text-text-primary tabular-nums">
                {value.toFixed(1)}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">
                ({row.ratingSummary.totalReviews})
              </span>
            </div>
          );
        },
        hideOnMobile: true,
      },
      {
        id: "approval",
        header: tAdmin("practitionersDirectory.publication.approval"),
        accessor: (row) => row.status,
        align: "center",
        cell: (row) => (
          <AdminStatusBadge tone={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"}>
            {row.status === "APPROVED"
              ? tAdmin("practitionersDirectory.publication.approved")
              : row.status === "REJECTED"
                ? tAdmin("practitionersDirectory.publication.rejected")
                : tAdmin("practitionersDirectory.publication.pending")}
          </AdminStatusBadge>
        ),
      },
      {
        id: "publication",
        header: tAdmin("practitionersDirectory.publication.publication"),
        accessor: (row) => (row.isPublicProfilePublished ? "published" : "unpublished"),
        align: "center",
        cell: (row) => (
          <AdminStatusBadge tone={row.isPublicProfilePublished ? "success" : "muted"}>
            <span className="inline-flex items-center gap-1 text-[11px]">
              {row.isPublicProfilePublished ? <Globe2 className="h-3 w-3" /> : <GlobeLock className="h-3 w-3" />}
              {row.isPublicProfilePublished
                ? tAdmin("practitionersDirectory.publication.published")
                : tAdmin("practitionersDirectory.publication.unpublished")}
            </span>
          </AdminStatusBadge>
        ),
      },
    ],
    [tAdmin, tListing, countries, locale],
  );

  const countryOptions = useMemo(() => {
    return countries.map((country) => ({
      value: country.isoCode.toUpperCase(),
      label: locale === "ar" ? country.nativeName || country.name : country.name,
      description: locale === "ar" ? country.name : country.nativeName || undefined,
      searchText: [country.name, country.nativeName, country.isoCode].filter(Boolean).join(" "),
    }));
  }, [countries, locale]);

  const ratingOptions = useMemo(() => [
    { value: "", label: locale === "ar" ? "جميع التقييمات" : "All ratings" },
    { value: "3", label: tListing("filter.rating3Up") },
    { value: "4", label: tListing("filter.rating4Up") },
    { value: "4.5", label: tListing("filter.rating45Up") },
  ], [tListing, locale]);

  const sortOptions = useMemo(() => [
    { value: "newest", label: tListing("sort.newest") },
    { value: "oldest", label: tListing("sort.oldest") },
    { value: "recommended", label: tListing("sort.recommended") },
    { value: "rating", label: tListing("sort.rating") },
    { value: "experience", label: tListing("sort.experience") },
  ], [tListing]);

  const genderOptions = useMemo(() => [
    { value: "", label: tListing("filter.allGenders") },
    { value: "male", label: tListing("filter.genderMale") },
    { value: "female", label: tListing("filter.genderFemale") },
  ], [tListing]);

  const countryOptionsCombined = useMemo(() => [
    { value: "", label: tListing("filter.allCountries") },
    ...countryOptions,
  ], [tListing, countryOptions]);

  const resetFilters = () => {
    setSearch("");
    setPractitionerKind("");
    setGender("");
    setCountry("");
    setOnlineOnly(false);
    setMinRating("");
    setSort("newest");
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
            ? "عرض وإدارة دليل الممارسين مع إبراز الهوية، التقييم، وحالة النشر والاعتماد."
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
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AdminTableTabs
                value={practitionerKind}
                onChange={(nextValue) => {
                  setPractitionerKind(nextValue);
                  setPage(1);
                }}
                tabs={practitionerTabs}
              />
              <div className="flex items-center gap-1.5">
                <Button variant="outline" className="h-8 text-xs px-2.5 py-1" onClick={resetFilters}>
                  {tListing("filter.clearAll")}
                </Button>
                <AdvancedFiltersToggleButton
                  expanded={showAdvancedFilters}
                  hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
                  onToggle={() => setShowAdvancedFilters((prev) => !prev)}
                />
              </div>
            </div>

            {/* Main toolbar: search + quick filters */}
            <AdminTableToolbar
              search={{
                value: search,
                onChange: (value) => {
                  setSearch(value);
                  setPage(1);
                },
                placeholder: locale === "ar" ? "ابحث باسم المختص أو التخصص..." : tListing("search.placeholder"),
                ariaLabel: tListing("search.button"),
              }}
              filters={
                <>
                  <label
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer select-none",
                      onlineOnly
                        ? "bg-primary-light border-primary/30 text-text-brand"
                        : "bg-surface border-border-light text-text-secondary hover:text-text-primary",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={onlineOnly}
                      onChange={(event) => {
                        setOnlineOnly(event.target.checked);
                        setPage(1);
                      }}
                      className="h-3.5 w-3.5 rounded border-border-light text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span>{tListing("filter.onlineNow")}</span>
                  </label>

                  <Select
                    key={`ratingFilter-${minRating}`}
                    defaultValue={minRating}
                    placeholder={locale === "ar" ? "التقييم" : "Rating"}
                    onChange={(value) => {
                      setMinRating(value as "" | "3" | "4" | "4.5");
                      setPage(1);
                    }}
                    options={ratingOptions}
                  />

                  <Select
                    key={`sortFilter-${sort}`}
                    defaultValue={sort}
                    placeholder={locale === "ar" ? "الترتيب" : "Sort"}
                    onChange={(value) => {
                      setSort(
                        value as
                          | "recommended"
                          | "experience"
                          | "rating"
                          | "newest"
                          | "oldest"
                      );
                      setPage(1);
                    }}
                    options={sortOptions}
                  />
                </>
              }
            />

            {showAdvancedFilters ? (
              <div className="grid gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-text-secondary">
                    {tListing("filter.gender")}
                  </span>
                  <Select
                    key={`genderFilter-${gender}`}
                    defaultValue={gender}
                    onChange={(value) => {
                      setGender(value as "" | "male" | "female");
                      setPage(1);
                    }}
                    options={genderOptions}
                  />
                </label>

                <div>
                  <span className="mb-1 block text-xs font-bold text-text-secondary">
                    {tListing("filter.country")}
                  </span>
                  <SearchableCombobox
                    key={`countryFilter-${country}`}
                    value={country || null}
                    onChange={(value) => {
                      setCountry(value);
                      setPage(1);
                    }}
                    options={countryOptionsCombined}
                    placeholder={tListing("filter.country")}
                    searchPlaceholder={locale === "ar" ? "ابحث عن دولة..." : "Search countries..."}
                    emptyMessage={locale === "ar" ? "لا توجد دول مطابقة" : "No countries found"}
                    clearable
                  />
                </div>
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
            <div className="inline-flex items-center justify-center gap-1">
              {/* 1. View 360 Admin Profile */}
              <ActionIconLink
                intent="manage"
                href={`/admin/practitioners/${row.id}`}
                label={locale === "ar" ? "عرض ملف الممارس 360" : "View Practitioner 360"}
                icon={<Eye className="h-4 w-4" />}
              />

              {/* 2. Preview Public Profile in patient view */}
              <ActionIconLink
                intent="view"
                href={`/practitioners/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                label={locale === "ar" ? "معاينة الصفحة العامة للمرضى" : "Preview public profile"}
                icon={<ExternalLink className="h-4 w-4" />}
              />

              {/* 3. Manage Publication Status */}
              <ActionIconButton
                intent={row.isPublicProfilePublished ? "publish" : "neutral"}
                label={
                  row.isPublicProfilePublished
                    ? tAdmin("practitionersDirectory.publication.unpublish")
                    : tAdmin("practitionersDirectory.publication.publish")
                }
                icon={
                  row.isPublicProfilePublished ? (
                    <Globe2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <GlobeLock className="h-4 w-4 text-text-muted" />
                  )
                }
                onClick={() => {
                  setPublicationPractitioner(row);
                  setPublicationReason("");
                  setExistingBookingAcknowledged(false);
                }}
                title={
                  row.status !== "APPROVED"
                    ? tAdmin("practitionersDirectory.publication.mustApprove")
                    : row.isPublicProfilePublished
                      ? tAdmin("practitionersDirectory.publication.unpublish")
                      : tAdmin("practitionersDirectory.publication.publish")
                }
                disabled={row.status !== "APPROVED"}
              />

              {/* 4. Edit Avatar */}
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

      {/* Avatar edit modal */}
      <FormModal
        isOpen={!!selectedPractitioner}
        onClose={closeAvatarModal}
        size="lg"
        title={tAdmin("practitionersDirectory.avatar.title")}
        description={tAdmin("practitionersDirectory.avatar.note")}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={selectedPractitioner?.avatarUrl}
              name={selectedPractitioner?.displayName ?? ""}
              size="large"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {selectedPractitioner?.displayName ?? tAdmin("applications.table.noName")}
              </p>
              <p className="text-xs text-text-muted">
                {selectedPractitioner?.slug}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatar-url-input">
              {tAdmin("practitionersDirectory.avatar.urlLabel")}
            </Label>
            <InputField
              id="avatar-url-input"
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              placeholder={tAdmin("practitionersDirectory.avatar.urlPlaceholder")}
              dir="ltr"
            />
          </div>

          {avatarError ? (
            <p className="text-xs text-status-danger">{avatarError}</p>
          ) : null}

          {avatarSuccess ? (
            <p className="text-xs text-status-success">{avatarSuccess}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAvatarRemove}
              disabled={removeAvatarMutation.isPending || !selectedPractitioner?.avatarUrl}
              className="text-status-danger hover:text-status-danger"
              startIcon={
                removeAvatarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )
              }
            >
              {tAdmin("practitionersDirectory.avatar.removeButton")}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeAvatarModal}
                disabled={updateAvatarMutation.isPending || removeAvatarMutation.isPending}
              >
                {tAdmin("practitionersDirectory.avatar.cancelButton")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAvatarUpdate}
                disabled={updateAvatarMutation.isPending}
                startIcon={
                  updateAvatarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : undefined
                }
              >
                {tAdmin("practitionersDirectory.avatar.saveButton")}
              </Button>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Publication modal */}
      <FormModal
        isOpen={Boolean(publicationPractitioner)}
        onClose={() => setPublicationPractitioner(null)}
        size="lg"
        title={
          publicationPractitioner?.isPublicProfilePublished
            ? tAdmin("practitionersDirectory.publication.titleUnpublish")
            : tAdmin("practitionersDirectory.publication.titlePublish")
        }
        description={
          publicationPractitioner?.isPublicProfilePublished
            ? tAdmin("practitionersDirectory.publication.unpublishDescription")
            : tAdmin("practitionersDirectory.publication.readyDescription")
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={publicationPractitioner?.avatarUrl}
              name={publicationPractitioner?.displayName ?? ""}
              size="medium"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {publicationPractitioner?.displayName ?? tAdmin("applications.table.noName")}
              </p>
              <p className="text-xs text-text-muted">
                {publicationPractitioner?.slug}
              </p>
            </div>
          </div>

          {publicationQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}

          {publicationQuery.data && !publicationPractitioner?.isPublicProfilePublished && !publicationQuery.data.isReadyForPublication ? (
            <div className="space-y-2 rounded-xl border border-border-light bg-surface-secondary/40 p-3">
              <p className="text-xs font-semibold text-text-primary">
                {tAdmin("practitionersDirectory.publication.blockers")}
              </p>
              <ul className="space-y-1 text-xs text-status-danger list-disc ps-4">
                {publicationQuery.data.blockers.map((blocker) => (
                  <li key={blocker.code}>
                    {tAdmin(`practitionersDirectory.publication.blockerMessages.${blocker.code}` as Parameters<typeof tAdmin>[0]) || blocker.code}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {publicationQuery.data?.impact && publicationQuery.data.impact.activeUpcomingCount > 0 ? (
            <div className="space-y-2 rounded-xl border border-status-warning-border bg-status-warning-soft p-3 text-status-warning">
              <p className="text-xs font-semibold">
                {tAdmin("practitionersDirectory.publication.impact")}
              </p>
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-text-muted">{tAdmin("practitionersDirectory.publication.activeBookings")}: </span>
                  <span className="font-semibold text-text-primary">{publicationQuery.data.impact.activeUpcomingCount}</span>
                </div>
                <div>
                  <span className="text-text-muted">{tAdmin("practitionersDirectory.publication.todayBookings")}: </span>
                  <span className="font-semibold text-text-primary">{publicationQuery.data.impact.scheduledTodayCount}</span>
                </div>
                <div>
                  <span className="text-text-muted">{tAdmin("practitionersDirectory.publication.nearestBooking")}: </span>
                  <span className="font-semibold text-text-primary">{publicationQuery.data.impact.nearestUpcomingAt ? new Date(publicationQuery.data.impact.nearestUpcomingAt).toLocaleDateString() : "-"}</span>
                </div>
              </div>
            </div>
          ) : null}

          {publicationPractitioner?.isPublicProfilePublished ? (
            <div className="space-y-2">
              <Label htmlFor="unpublish-reason">
                {tAdmin("practitionersDirectory.publication.reason")} <span className="text-status-danger">*</span>
              </Label>
              <TextArea
                id="unpublish-reason"
                value={publicationReason}
                onChange={(val) => setPublicationReason(typeof val === "string" ? val : (val as any)?.target?.value ?? "")}
                placeholder={tAdmin("practitionersDirectory.publication.reasonPlaceholder")}
                rows={3}
              />
              {publicationQuery.data?.impact && publicationQuery.data.impact.activeUpcomingCount > 0 ? (
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={existingBookingAcknowledged}
                    onChange={(e) => setExistingBookingAcknowledged(e.target.checked)}
                    className="rounded border-border-light text-primary focus:ring-ring-focus"
                  />
                  <span>{tAdmin("practitionersDirectory.publication.confirmExisting")}</span>
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border-light pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPublicationPractitioner(null)}
              disabled={publicationMutation.isPending}
            >
              {tAdmin("practitionersDirectory.publication.close")}
            </Button>
            <Button
              type="button"
              variant={publicationPractitioner?.isPublicProfilePublished ? "outline" : "primary"}
              disabled={
                publicationMutation.isPending ||
                (publicationPractitioner?.isPublicProfilePublished
                  ? !publicationReason.trim() || (Boolean(publicationQuery.data?.impact && publicationQuery.data.impact.activeUpcomingCount > 0) && !existingBookingAcknowledged)
                  : !publicationQuery.data?.isReadyForPublication)
              }
              onClick={async () => {
                if (!publicationPractitioner) return;
                const nextPublished = !publicationPractitioner.isPublicProfilePublished;
                try {
                  await publicationMutation.mutateAsync({
                    practitionerId: publicationPractitioner.id,
                    isPublished: nextPublished,
                    reason: nextPublished ? undefined : publicationReason.trim(),
                  });
                  setPublicationPractitioner(null);
                  refetch();
                } catch {
                  // Error handled by mutation
                }
              }}
              startIcon={publicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {publicationPractitioner?.isPublicProfilePublished
                ? tAdmin("practitionersDirectory.publication.confirmUnpublish")
                : tAdmin("practitionersDirectory.publication.confirmPublish")}
            </Button>
          </div>
        </div>
      </FormModal>
    </>
  );
}
