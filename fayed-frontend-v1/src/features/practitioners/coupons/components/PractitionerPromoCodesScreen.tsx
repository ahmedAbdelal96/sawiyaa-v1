"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Eye,
  History,
  Plus,
  Pencil,
  RefreshCcw,
  Search,
  Tag,
  CalendarClock,
  BadgePercent,
  CircleAlert,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import { Drawer, ConfirmModal, FormModal } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  PractitionerPageHeader,
  PractitionerStatsGrid,
  PractitionerStatCard,
  PractitionerFilterCard,
  PractitionerTableSection,
  PractitionerSectionCard,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { toAppError } from "@/lib/api/errors";
import {
  useCreatePractitionerCoupon,
  useDisablePractitionerCoupon,
  usePractitionerCoupon,
  usePractitionerCouponRedemptions,
  usePractitionerCoupons,
  useUpdatePractitionerCoupon,
} from "../hooks/use-practitioner-coupons";
import type {
  CouponStatus,
  CreatePractitionerCouponPayload,
  ListPractitionerCouponsParams,
  PractitionerCoupon,
  PractitionerCouponRedemption,
  UpdatePractitionerCouponPayload,
} from "../types";

const STATUS_FILTERS: Array<CouponStatus | "ALL"> = [
  "ALL",
  "ACTIVE",
  "DISABLED",
  "EXPIRED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DRAFT",
];

type CouponFormValues = {
  code: string;
  discountValue: string;
  maxDiscountAmount: string;
  usageLimitTotal: string;
  usageLimitPerPatient: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type FormErrors = Partial<Record<keyof CouponFormValues | "root", string>>;
type DetailTab = "overview" | "redemptions";

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatMoney(value: string | number | null | undefined, locale: string) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function parseDateInputValue(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function normalizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function getStatusTone(status: CouponStatus) {
  if (status === "ACTIVE" || status === "APPROVED") return "success";
  if (status === "EXPIRED" || status === "PENDING_REVIEW") return "warning";
  if (status === "DISABLED" || status === "REJECTED") return "error";
  return "light";
}

function getStatusLabel(t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>, status: CouponStatus) {
  return t(`status.${status}`);
}

function getUsageLabel(coupon: PractitionerCoupon, t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>) {
  const totalLimit = coupon.usageLimitTotal === null ? t("common.unlimited") : coupon.usageLimitTotal;
  const perPatientLimit = coupon.usageLimitPerPatient === null ? t("common.unlimited") : coupon.usageLimitPerPatient;
  return `${coupon.currentUsageCount} / ${totalLimit}, ${t("detail.perPatient")}: ${perPatientLimit}`;
}

function getDateWindowLabel(coupon: PractitionerCoupon, locale: string, t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>) {
  if (!coupon.startsAt && !coupon.endsAt) {
    return t("common.alwaysActive");
  }

  const start = coupon.startsAt ? formatDateTime(coupon.startsAt, locale) : t("common.noStartDate");
  const end = coupon.endsAt ? formatDateTime(coupon.endsAt, locale) : t("common.noEndDate");
  return `${start} → ${end}`;
}

function getDiscountLabel(coupon: PractitionerCoupon, locale: string) {
  return `${formatMoney(coupon.discountValue, locale)}%`;
}

function createEmptyFormValues(): CouponFormValues {
  return {
    code: "",
    discountValue: "",
    maxDiscountAmount: "",
    usageLimitTotal: "",
    usageLimitPerPatient: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
}

function couponToFormValues(coupon: PractitionerCoupon | null): CouponFormValues {
  if (!coupon) return createEmptyFormValues();

  return {
    code: coupon.code,
    discountValue: coupon.discountValue,
    maxDiscountAmount: coupon.maxDiscountAmount ?? "",
    usageLimitTotal: coupon.usageLimitTotal?.toString() ?? "",
    usageLimitPerPatient: coupon.usageLimitPerPatient?.toString() ?? "",
    startsAt: formatDateInputValue(coupon.startsAt),
    endsAt: formatDateInputValue(coupon.endsAt),
    isActive: coupon.isActive,
  };
}

function validateCouponForm(
  values: CouponFormValues,
  t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>,
  currentUsageCount: number,
  initialValues?: CouponFormValues,
) {
  const errors: FormErrors = {};
  const code = normalizeCode(values.code);
  const discount = Number(values.discountValue);
  const maxDiscountAmount = values.maxDiscountAmount.trim()
    ? Number(values.maxDiscountAmount)
    : null;
  const usageLimitTotal = values.usageLimitTotal.trim()
    ? Number(values.usageLimitTotal)
    : null;
  const usageLimitPerPatient = values.usageLimitPerPatient.trim()
    ? Number(values.usageLimitPerPatient)
    : null;
  const startsAt = values.startsAt ? new Date(values.startsAt) : null;
  const endsAt = values.endsAt ? new Date(values.endsAt) : null;

  if (!code) {
    errors.code = t("form.validation.codeRequired");
  } else if (!/^[A-Z0-9_-]+$/.test(code)) {
    errors.code = t("form.validation.codeInvalid");
  }

  if (!values.discountValue.trim()) {
    errors.discountValue = t("form.validation.discountRequired");
  } else if (!Number.isFinite(discount) || discount <= 0) {
    errors.discountValue = t("form.validation.discountPositive");
  } else if (discount > 20) {
    errors.discountValue = t("form.validation.discountTooHigh");
  }

  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
    errors.maxDiscountAmount = t("form.validation.moneyPositive");
  }

  if (usageLimitTotal !== null && (!Number.isFinite(usageLimitTotal) || usageLimitTotal <= 0)) {
    errors.usageLimitTotal = t("form.validation.usagePositive");
  }

  if (
    usageLimitTotal !== null &&
    Number.isFinite(usageLimitTotal) &&
    usageLimitTotal < currentUsageCount
  ) {
    errors.usageLimitTotal = t("form.validation.usageBelowCurrent");
  }

  if (
    usageLimitPerPatient !== null &&
    (!Number.isFinite(usageLimitPerPatient) || usageLimitPerPatient <= 0)
  ) {
    errors.usageLimitPerPatient = t("form.validation.usagePositive");
  }

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    errors.startsAt = t("form.validation.dateInvalid");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    errors.endsAt = t("form.validation.dateInvalid");
  }

  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    errors.endsAt = t("form.validation.dateRangeInvalid");
  }

  if (initialValues && currentUsageCount > 0 && values.discountValue !== initialValues.discountValue) {
    errors.discountValue = t("form.validation.discountLockedAfterRedemption");
  }

  return {
    errors,
    normalizedCode: code,
    discountValue: Number.isFinite(discount) ? discount.toFixed(2) : "",
    maxDiscountAmount:
      maxDiscountAmount !== null && Number.isFinite(maxDiscountAmount)
        ? maxDiscountAmount.toFixed(2)
        : undefined,
    usageLimitTotal:
      usageLimitTotal !== null && Number.isFinite(usageLimitTotal)
        ? Math.trunc(usageLimitTotal)
        : undefined,
    usageLimitPerPatient:
      usageLimitPerPatient !== null && Number.isFinite(usageLimitPerPatient)
        ? Math.trunc(usageLimitPerPatient)
        : undefined,
    startsAt: parseDateInputValue(values.startsAt),
    endsAt: parseDateInputValue(values.endsAt),
    isValid: Object.keys(errors).length === 0,
  };
}

function buildCreatePayload(values: CouponFormValues): CreatePractitionerCouponPayload {
  return {
    code: normalizeCode(values.code),
    discountType: "PERCENTAGE",
    discountValue: Number(values.discountValue).toFixed(2),
    maxDiscountAmount: values.maxDiscountAmount.trim()
      ? Number(values.maxDiscountAmount).toFixed(2)
      : undefined,
    usageLimitTotal: values.usageLimitTotal.trim()
      ? Math.trunc(Number(values.usageLimitTotal))
      : undefined,
    usageLimitPerPatient: values.usageLimitPerPatient.trim()
      ? Math.trunc(Number(values.usageLimitPerPatient))
      : undefined,
    startsAt: parseDateInputValue(values.startsAt),
    endsAt: parseDateInputValue(values.endsAt),
    isActive: values.isActive,
  };
}

function buildUpdatePayload(
  values: CouponFormValues,
  initial: CouponFormValues,
  currentUsageCount: number,
): UpdatePractitionerCouponPayload {
  const payload: UpdatePractitionerCouponPayload = {};

  if (currentUsageCount === 0 && values.discountValue !== initial.discountValue) {
    payload.discountValue = Number(values.discountValue).toFixed(2);
  }

  if (values.maxDiscountAmount !== initial.maxDiscountAmount) {
    payload.maxDiscountAmount = values.maxDiscountAmount.trim()
      ? Number(values.maxDiscountAmount).toFixed(2)
      : undefined;
  }

  if (values.usageLimitTotal !== initial.usageLimitTotal) {
    payload.usageLimitTotal = values.usageLimitTotal.trim()
      ? Math.trunc(Number(values.usageLimitTotal))
      : undefined;
  }

  if (values.usageLimitPerPatient !== initial.usageLimitPerPatient) {
    payload.usageLimitPerPatient = values.usageLimitPerPatient.trim()
      ? Math.trunc(Number(values.usageLimitPerPatient))
      : undefined;
  }

  if (values.startsAt !== initial.startsAt) {
    payload.startsAt = parseDateInputValue(values.startsAt);
  }

  if (values.endsAt !== initial.endsAt) {
    payload.endsAt = parseDateInputValue(values.endsAt);
  }

  if (values.isActive !== initial.isActive) {
    payload.isActive = values.isActive;
  }

  return payload;
}

function getCouponMutationMessage(error: unknown, fallback: string) {
  const appError = toAppError(error);
  return appError.message || fallback;
}

function CouponFormFields({
  values,
  setValues,
  errors,
  liveDiscountError,
  locale,
  t,
  isEdit,
  currentUsageCount,
}: {
  values: CouponFormValues;
  setValues: React.Dispatch<React.SetStateAction<CouponFormValues>>;
  errors: FormErrors;
  liveDiscountError?: string;
  locale: string;
  t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>;
  isEdit: boolean;
  currentUsageCount: number;
}) {
  const discountLocked = isEdit && currentUsageCount > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-primary/15 bg-primary-light px-4 py-4 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold text-text-brand dark:text-primary-light">
              {t("note.title")}
            </p>
            <p className="leading-6">{t("note.body")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.code")}</span>
          <input
            data-testid="promo-code-code-input"
            value={values.code}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                code: normalizeCode(event.target.value),
              }))
            }
            disabled={isEdit}
            placeholder={t("form.codePlaceholder")}
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">
            {isEdit ? t("form.codeReadOnlyHint") : t("form.codeHint")}
          </p>
          {errors.code ? <p className="text-xs text-error-500">{errors.code}</p> : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.discountValue")}</span>
          <div className="relative">
            <input
              data-testid="promo-code-discount-input"
              type="number"
              inputMode="decimal"
              min={0}
              max={20}
              step="0.01"
              value={values.discountValue}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  discountValue: normalizeMoneyInput(event.target.value),
                }))
              }
              disabled={discountLocked}
              className="app-control w-full px-4 py-3 pe-12"
            />
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">
              %
            </span>
          </div>
          <p className="text-xs leading-5 text-text-muted">
            {discountLocked ? t("form.discountLockedHint") : t("form.discountHint")}
          </p>
          {errors.discountValue || liveDiscountError ? (
            <p data-testid="promo-code-discount-error" className="text-xs text-error-500">
              {errors.discountValue ?? liveDiscountError}
            </p>
          ) : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.maxDiscountAmount")}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={values.maxDiscountAmount}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                maxDiscountAmount: normalizeMoneyInput(event.target.value),
              }))
            }
            placeholder={t("form.maxDiscountAmountPlaceholder")}
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">{t("form.maxDiscountAmountHint")}</p>
          {errors.maxDiscountAmount ? (
            <p className="text-xs text-error-500">{errors.maxDiscountAmount}</p>
          ) : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.usageLimitTotal")}</span>
          <input
            type="number"
            min={0}
            step="1"
            value={values.usageLimitTotal}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                usageLimitTotal: normalizeIntegerInput(event.target.value),
              }))
            }
            placeholder={t("form.usageLimitTotalPlaceholder")}
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">{t("form.usageLimitTotalHint")}</p>
          {errors.usageLimitTotal ? (
            <p className="text-xs text-error-500">{errors.usageLimitTotal}</p>
          ) : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.usageLimitPerPatient")}</span>
          <input
            type="number"
            min={0}
            step="1"
            value={values.usageLimitPerPatient}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                usageLimitPerPatient: normalizeIntegerInput(event.target.value),
              }))
            }
            placeholder={t("form.usageLimitPerPatientPlaceholder")}
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">{t("form.usageLimitPerPatientHint")}</p>
          {errors.usageLimitPerPatient ? (
            <p className="text-xs text-error-500">{errors.usageLimitPerPatient}</p>
          ) : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.startsAt")}</span>
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                startsAt: event.target.value,
              }))
            }
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">{t("form.startsAtHint")}</p>
          {errors.startsAt ? <p className="text-xs text-error-500">{errors.startsAt}</p> : null}
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-text-primary">{t("form.endsAt")}</span>
          <input
            type="datetime-local"
            value={values.endsAt}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                endsAt: event.target.value,
              }))
            }
            className="app-control w-full px-4 py-3"
          />
          <p className="text-xs leading-5 text-text-muted">{t("form.endsAtHint")}</p>
          {errors.endsAt ? <p className="text-xs text-error-500">{errors.endsAt}</p> : null}
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-[22px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              isActive: event.target.checked,
            }))
          }
          className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium text-text-primary">{t("form.isActive")}</span>
          <span className="block text-xs leading-5 text-text-muted">{t("form.isActiveHint")}</span>
        </span>
      </label>

      <div className="rounded-[22px] border border-border-light bg-surface-secondary px-4 py-4 text-xs leading-6 text-text-secondary dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{t("note.split")}</p>
        </div>
      </div>

      <div className="rounded-[22px] border border-border-light bg-surface-secondary px-4 py-4 text-xs leading-6 text-text-secondary dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{t("note.sessionOnly")}</p>
        </div>
      </div>
    </div>
  );
}

function CouponFormModal({
  isOpen,
  onClose,
  mode,
  coupon,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  coupon: PractitionerCoupon | null;
}) {
  const t = useTranslations("practitioner-promo-codes");
  const locale = useLocale();
  const createMutation = useCreatePractitionerCoupon();
  const updateMutation = useUpdatePractitionerCoupon();
  const [values, setValues] = useState<CouponFormValues>(() => couponToFormValues(coupon));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const currentUsageCount = coupon?.currentUsageCount ?? 0;
  const initialValues = useMemo(() => couponToFormValues(coupon), [coupon]);
  const isEdit = mode === "edit";

  const validation = validateCouponForm(values, t, currentUsageCount, initialValues);
  const canSubmit = validation.isValid && !createMutation.isPending && !updateMutation.isPending;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    const nextValidation = validateCouponForm(values, t, currentUsageCount, initialValues);
    setErrors(nextValidation.errors);
    if (!nextValidation.isValid) {
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(buildCreatePayload(values));
        toast.success(t("toast.created"));
      } else if (coupon) {
        await updateMutation.mutateAsync({
          id: coupon.id,
          payload: buildUpdatePayload(values, initialValues, currentUsageCount),
        });
        toast.success(t("toast.updated"));
      }
      onClose();
    } catch (error) {
      const safeMessage = getCouponMutationMessage(
        error,
        mode === "create" ? t("toast.createFailed") : t("toast.updateFailed"),
      );
      setSubmitError(safeMessage);
      toast.error(safeMessage);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? t("form.createTitle") : t("form.editTitle")}
      description={mode === "create" ? t("form.createDescription") : t("form.editDescription")}
      eyebrow={t("eyebrow")}
      submitLabel={mode === "create" ? t("form.createSubmit") : t("form.updateSubmit")}
      cancelLabel={t("common.cancel")}
      loading={isPending}
      submitDisabled={!canSubmit}
      onSubmit={handleSubmit}
      submitButtonProps={{ "data-testid": "promo-code-submit-button" }}
      size="2xl"
    >
      <div className="space-y-4">
        {submitError ? (
          <StateCard
            centered={false}
            icon={<CircleAlert className="h-5 w-5 text-error-500" />}
            title={t("error.title")}
            note={submitError}
          />
        ) : null}

        <CouponFormFields
          values={values}
          setValues={setValues}
          errors={errors}
          liveDiscountError={validation.errors.discountValue}
          locale={locale}
          t={t}
          isEdit={isEdit}
          currentUsageCount={currentUsageCount}
        />
      </div>
    </FormModal>
  );
}

function CouponRedemptionsTable({
  coupon,
  locale,
  t,
}: {
  coupon: PractitionerCoupon;
  locale: string;
  t: ReturnType<typeof useTranslations<"practitioner-promo-codes">>;
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const query = usePractitionerCouponRedemptions(coupon.id, { page, limit });
  const redemptions = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  const columns = useMemo<ColumnDef<PractitionerCouponRedemption>[]>(
    () => [
      {
        id: "patient",
        header: t("redemptions.columns.patient"),
        cell: (row) => (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {row.patientDisplayName ?? t("redemptions.anonymousPatient")}
            </p>
            <p className="font-mono text-[11px] text-text-muted">{row.sessionId}</p>
          </div>
        ),
      },
      {
        id: "payment",
        header: t("redemptions.columns.payment"),
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-mono text-sm text-text-primary dark:text-white/95">{row.paymentId}</p>
            <p className="text-xs text-text-muted">{formatDateTime(row.redeemedAt, locale)}</p>
          </div>
        ),
      },
      {
        id: "amounts",
        header: t("redemptions.columns.amounts"),
        cell: (row) => (
          <div className="space-y-1 text-sm text-text-secondary">
            <p>
              {t("redemptions.gross")}:{" "}
              <span className="font-semibold text-text-primary">
                {formatMoney(row.grossAmount, locale)} {row.currencyCode}
              </span>
            </p>
            <p>
              {t("redemptions.discount")}:{" "}
              <span className="font-semibold text-text-brand">
                -{formatMoney(row.discountAmount, locale)} {row.currencyCode}
              </span>
            </p>
          </div>
        ),
      },
      {
        id: "split",
        header: t("redemptions.columns.split"),
        cell: (row) => (
          <div className="space-y-1 text-sm text-text-secondary">
            <p>
              {t("redemptions.platformShare")}:{" "}
              <span className="font-semibold text-text-primary">
                {formatMoney(row.platformDiscountShare, locale)} {row.currencyCode}
              </span>
            </p>
            <p>
              {t("redemptions.practitionerShare")}:{" "}
              <span className="font-semibold text-text-primary">
                {formatMoney(row.practitionerDiscountShare, locale)} {row.currencyCode}
              </span>
            </p>
          </div>
        ),
      },
    ],
    [locale, t],
  );

  if (query.isLoading && !query.data) {
    return <ListStateSkeleton items={4} heightClass="h-24" />;
  }

  if (query.isError) {
    const appError = toAppError(query.error);
    const title =
      appError.statusCode === 403
        ? t("redemptions.deniedTitle")
        : appError.statusCode === 404
          ? t("redemptions.notFoundTitle")
          : t("redemptions.errorTitle");
    const note =
      appError.statusCode === 403
        ? t("redemptions.deniedNote")
        : appError.statusCode === 404
          ? t("redemptions.notFoundNote")
          : appError.message || t("redemptions.errorNote");

    return (
      <StateCard
        centered={false}
        icon={<CircleAlert className="h-5 w-5 text-error-500" />}
        title={title}
        note={note}
        action={{
          label: t("common.retry"),
          onClick: () => void query.refetch(),
        }}
      />
    );
  }

  if (!redemptions.length) {
    return (
      <StateCard
        centered={false}
        icon={<History className="h-5 w-5 text-primary" />}
        title={t("redemptions.emptyTitle")}
        note={t("redemptions.emptyNote")}
      />
    );
  }

  return (
    <DataTable
      data={redemptions}
      columns={columns}
      getRowId={(row) => row.id}
      loading={query.isLoading}
      loadingRows={5}
      striped
      hoverable
      pagination={
        pagination
          ? {
              page: pagination.page,
              limit: pagination.limit,
              total: pagination.total,
              totalPages: pagination.totalPages,
              hasNextPage: pagination.page < pagination.totalPages,
              hasPrevPage: pagination.page > 1,
            }
          : undefined
      }
      onPageChange={(nextPage) => setPage(nextPage)}
      onPageSizeChange={(nextLimit) => {
        setLimit(nextLimit);
        setPage(1);
      }}
      pageSizeOptions={[5, 10, 20]}
      emptyState={{
        title: t("redemptions.emptyTitle"),
        description: t("redemptions.emptyNote"),
      }}
      ariaLabel={t("redemptions.title")}
      caption={t("redemptions.title")}
    />
  );
}

function CouponDetailDrawer({
  couponId,
  tab,
  onClose,
  onEdit,
  onDisable,
  onSwitchTab,
}: {
  couponId: string | null;
  tab: DetailTab;
  onClose: () => void;
  onEdit: (coupon: PractitionerCoupon) => void;
  onDisable: (coupon: PractitionerCoupon) => void;
  onSwitchTab: (tab: DetailTab) => void;
}) {
  const t = useTranslations("practitioner-promo-codes");
  const locale = useLocale();
  const query = usePractitionerCoupon(couponId ?? undefined, Boolean(couponId));
  const coupon = query.data?.item ?? null;

  if (!couponId) {
    return null;
  }

  return (
    <Drawer
      isOpen={Boolean(couponId)}
      onClose={onClose}
      ariaLabel={t("detail.title")}
      className="max-w-4xl"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border-light bg-white px-6 pb-5 pt-6 dark:border-white/10 dark:bg-surface-secondary sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("detail.eyebrow")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-text-primary dark:text-white/95">
                  {coupon?.code ?? t("detail.title")}
                </h2>
                {coupon ? (
                  <Badge
                    variant="light"
                    size="sm"
                    color={getStatusTone(coupon.status) as "success" | "warning" | "error" | "primary" | "light"}
                  >
                    {getStatusLabel(t, coupon.status)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-text-secondary">{t("detail.description")}</p>
            </div>

            {coupon ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={tab === "overview" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => onSwitchTab("overview")}
                >
                  {t("detail.tabs.overview")}
                </Button>
                <Button
                  type="button"
                  variant={tab === "redemptions" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => onSwitchTab("redemptions")}
                >
                  {t("detail.tabs.redemptions")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(coupon)}>
                  <Pencil className="h-4 w-4" />
                  {t("actions.edit")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={!coupon.isActive || coupon.status === "DISABLED"}
                  onClick={() => onDisable(coupon)}
                >
                  <Ban className="h-4 w-4" />
                  {t("actions.disable")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
          {query.isLoading && !coupon ? (
            <ListStateSkeleton items={4} heightClass="h-24" />
          ) : query.isError ? (
            (() => {
              const appError = toAppError(query.error);
              const title =
                appError.statusCode === 403
                  ? t("detail.deniedTitle")
                  : appError.statusCode === 404
                    ? t("detail.notFoundTitle")
                    : t("detail.errorTitle");
              const note =
                appError.statusCode === 403
                  ? t("detail.deniedNote")
                  : appError.statusCode === 404
                    ? t("detail.notFoundNote")
                    : appError.message || t("detail.errorNote");

              return (
                <StateCard
                  centered={false}
                  icon={<CircleAlert className="h-5 w-5 text-error-500" />}
                  title={title}
                  note={note}
                  action={{ label: t("common.retry"), onClick: () => void query.refetch() }}
                />
              );
            })()
          ) : coupon ? tab === "overview" ? (
            <div className="space-y-5">
              <PractitionerStatsGrid cols={4}>
                <PractitionerStatCard
                  label={t("detail.stats.discount")}
                  value={getDiscountLabel(coupon, locale)}
                  hint={t("detail.stats.discountHint")}
                  tone="primary"
                  icon={<BadgePercent className="h-4 w-4" />}
                />
                <PractitionerStatCard
                  label={t("detail.stats.usage")}
                  value={String(coupon.currentUsageCount)}
                  hint={getUsageLabel(coupon, t)}
                  tone="success"
                  icon={<History className="h-4 w-4" />}
                />
                <PractitionerStatCard
                  label={t("detail.stats.window")}
                  value={coupon.startsAt || coupon.endsAt ? t("detail.stats.windowDefined") : t("common.alwaysActive")}
                  hint={getDateWindowLabel(coupon, locale, t)}
                  tone="neutral"
                  icon={<CalendarClock className="h-4 w-4" />}
                />
                <PractitionerStatCard
                  label={t("detail.stats.split")}
                  value={`${coupon.platformSharePercent}% / ${coupon.practitionerSharePercent}%`}
                  hint={t("detail.stats.splitHint")}
                  tone="warning"
                  icon={<ArrowLeftRight className="h-4 w-4" />}
                />
              </PractitionerStatsGrid>

              <div className="grid gap-4 lg:grid-cols-2">
                <PractitionerSectionCard className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("detail.sectionSummary")}
                  </h3>
                  <dl className="space-y-3 text-sm">
                    <DetailRow label={t("detail.code")} value={coupon.code} />
                    <DetailRow label={t("detail.scope")} value={t("detail.sessionOnly")} />
                    <DetailRow label={t("detail.discountType")} value={t(`detail.discountTypes.${coupon.discountType}`)} />
                    <DetailRow label={t("detail.maxDiscount")} value={coupon.maxDiscountAmount ? formatMoney(coupon.maxDiscountAmount, locale) : t("common.notSet")} />
                    <DetailRow label={t("detail.usageLimitTotal")} value={coupon.usageLimitTotal === null ? t("common.unlimited") : String(coupon.usageLimitTotal)} />
                    <DetailRow label={t("detail.usageLimitPerPatient")} value={coupon.usageLimitPerPatient === null ? t("common.unlimited") : String(coupon.usageLimitPerPatient)} />
                  </dl>
                </PractitionerSectionCard>

                <PractitionerSectionCard className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("detail.sectionStatus")}
                  </h3>
                  <dl className="space-y-3 text-sm">
                    <DetailRow label={t("detail.status")} value={getStatusLabel(t, coupon.status)} />
                    <DetailRow label={t("detail.isActive")} value={coupon.isActive ? t("common.yes") : t("common.no")} />
                    <DetailRow label={t("detail.startsAt")} value={formatDateTime(coupon.startsAt, locale)} />
                    <DetailRow label={t("detail.endsAt")} value={formatDateTime(coupon.endsAt, locale)} />
                    <DetailRow label={t("detail.createdAt")} value={formatDateTime(coupon.createdAt, locale)} />
                    <DetailRow label={t("detail.updatedAt")} value={formatDateTime(coupon.updatedAt, locale)} />
                  </dl>
                </PractitionerSectionCard>
              </div>

              <div className="rounded-[22px] border border-border-light bg-primary-light/45 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{t("detail.ruleNote")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-border-light bg-primary-light/45 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                <div className="flex items-start gap-3">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{t("detail.redemptionsNote")}</p>
                </div>
              </div>
              <CouponRedemptionsTable key={coupon.id} coupon={coupon} locale={locale} t={t} />
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
      <dt className="min-w-0 text-text-muted">{label}</dt>
      <dd className="max-w-[55%] text-right font-medium text-text-primary dark:text-white/95">{value}</dd>
    </div>
  );
}

export default function PractitionerPromoCodesScreen() {
  const t = useTranslations("practitioner-promo-codes");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeStatusFilter = parseEnumParam<CouponStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), 10, { min: 1, max: 25 });
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 80 });
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [editingCoupon, setEditingCoupon] = useState<PractitionerCoupon | null>(null);
  const [disableTarget, setDisableTarget] = useState<PractitionerCoupon | null>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const normalized = debouncedSearch.trim();
    if (normalized === searchQuery) return;

    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
      q: normalized || null,
      page: 1,
    });
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams, searchQuery]);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params: ListPractitionerCouponsParams = {
    page,
    limit,
    q: searchQuery || undefined,
    status: activeStatusFilter === "ALL" ? undefined : activeStatusFilter,
  };

  const couponsQuery = usePractitionerCoupons(params, true);
  const coupons = couponsQuery.data?.items ?? [];
  const pagination = couponsQuery.data?.pagination;

  const createMutation = useCreatePractitionerCoupon();
  const updateMutation = useUpdatePractitionerCoupon();
  const disableMutation = useDisablePractitionerCoupon();

  const summary = useMemo(() => {
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter((coupon) => coupon.status === "ACTIVE" && coupon.isActive).length;
    const totalRedemptions = coupons.reduce((accumulator, coupon) => accumulator + coupon.currentUsageCount, 0);

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
    };
  }, [coupons]);

  const hasActiveFilters =
    activeStatusFilter !== "ALL" || Boolean(searchQuery.trim());

  const handleOpenCouponDetail = (couponId: string, tab: DetailTab = "overview") => {
    setSelectedCouponId(couponId);
    setDetailTab(tab);
    setEditingCoupon(null);
    setDisableTarget(null);
  };

  const handleOpenEdit = (coupon: PractitionerCoupon) => {
    setEditingCoupon(coupon);
    setSelectedCouponId(null);
    setDisableTarget(null);
  };

  const handleOpenDisable = (coupon: PractitionerCoupon) => {
    setDisableTarget(coupon);
    setSelectedCouponId(null);
    setEditingCoupon(null);
  };

  const columns = useMemo<ColumnDef<PractitionerCoupon>[]>(
    () => [
      {
        id: "code",
        header: t("table.code"),
        accessor: (row) => row.code,
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-mono text-sm font-semibold tracking-[0.08em] text-text-primary dark:text-white/95">
              {row.code}
            </p>
            <p className="text-xs text-text-muted">{t("table.codeHint")}</p>
          </div>
        ),
      },
      {
        id: "discount",
        header: t("table.discount"),
        accessor: (row) => Number(row.discountValue),
        cell: (row) => (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {getDiscountLabel(row, locale)}
            </p>
            <p className="text-xs text-text-muted">
              {row.maxDiscountAmount ? `${t("table.maxDiscount")}: ${formatMoney(row.maxDiscountAmount, locale)}` : t("table.noMaxDiscount")}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => row.status,
        cell: (row) => (
          <div className="space-y-1">
            <Badge variant="light" size="sm" color={getStatusTone(row.status) as "success" | "warning" | "error" | "primary" | "light"}>
              {getStatusLabel(t, row.status)}
            </Badge>
            <p className="text-xs text-text-muted">
              {row.isActive ? t("table.active") : t("table.inactive")}
            </p>
          </div>
        ),
      },
      {
        id: "usage",
        header: t("table.usage"),
        accessor: (row) => row.currentUsageCount,
        cell: (row) => (
          <div className="space-y-1 text-sm text-text-secondary">
            <p className="font-medium text-text-primary dark:text-white/95">
              {getUsageLabel(row, t)}
            </p>
            <p className="text-xs text-text-muted">{t("table.usageHint")}</p>
          </div>
        ),
      },
      {
        id: "window",
        header: t("table.window"),
        accessor: (row) => row.startsAt ?? row.endsAt ?? "",
        cell: (row) => (
          <div className="space-y-1 text-sm text-text-secondary">
            <p className="font-medium text-text-primary dark:text-white/95">{getDateWindowLabel(row, locale, t)}</p>
            <p className="text-xs text-text-muted">{t("table.windowHint")}</p>
          </div>
        ),
      },
    ],
    [locale, t],
  );

  const listError = couponsQuery.isError ? toAppError(couponsQuery.error) : null;

  return (
    <>
      <div className="space-y-6">
        <PractitionerPageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          actions={
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              startIcon={<Plus className="h-4 w-4" />}
              data-testid="promo-codes-create-button"
            >
              {t("actions.create")}
            </Button>
          }
        />

        <PractitionerStatsGrid cols={3}>
          <PractitionerStatCard
            label={t("summary.totalCodes")}
            value={String(summary.totalCoupons)}
            hint={t("summary.totalCodesHint")}
            tone="primary"
            metricKey="promoCodes.total"
          />
          <PractitionerStatCard
            label={t("summary.activeCodes")}
            value={String(summary.activeCoupons)}
            hint={t("summary.activeCodesHint")}
            tone="success"
            metricKey="promoCodes.active"
          />
          <PractitionerStatCard
            label={t("summary.totalRedemptions")}
            value={String(summary.totalRedemptions)}
            hint={t("summary.totalRedemptionsHint")}
            tone="warning"
            metricKey="promoCodes.redemptions"
          />
        </PractitionerStatsGrid>

        <PractitionerSectionCard className="border-primary/15 bg-primary-light/45 dark:border-primary/20 dark:bg-primary/10">
          <div className="flex items-start gap-3 text-sm leading-6 text-text-secondary">
            <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>{t("note.body")}</p>
          </div>
        </PractitionerSectionCard>

        <PractitionerFilterCard>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <label className="relative block">
              <span className="sr-only">{t("filters.searchLabel")}</span>
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="app-control w-full py-3 ps-11 pe-4"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.status")}
              </span>
              <select
                value={activeStatusFilter}
                onChange={(event) =>
                  updateListQuery({
                    status: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? t("filters.all") : getStatusLabel(t, status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearchInput("");
                  updateListQuery({ q: null, status: null, page: 1 });
                }}
                startIcon={<RefreshCcw className="h-4 w-4" />}
              >
                {t("actions.clearFilters")}
              </Button>
            </div>
          </div>
        </PractitionerFilterCard>

        {couponsQuery.isLoading && !couponsQuery.data ? (
          <ListStateSkeleton items={4} />
        ) : listError ? (
          <StateCard
            title={t("error.title")}
            note={listError.message || t("error.note")}
            action={{
              label: t("common.retry"),
              onClick: () => void couponsQuery.refetch(),
            }}
          />
        ) : (
          <PractitionerTableSection>
            <DataTable
              data={coupons}
              columns={columns}
              getRowId={(row) => row.id}
              loading={couponsQuery.isLoading}
              loadingRows={limit}
              striped
              hoverable
              pagination={
                pagination
                  ? {
                      page: pagination.page,
                      limit: pagination.limit,
                      total: pagination.total,
                      totalPages: pagination.totalPages,
                      hasNextPage: pagination.page < pagination.totalPages,
                      hasPrevPage: pagination.page > 1,
                    }
                  : undefined
              }
              onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
              onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
              pageSizeOptions={[10, 20, 25]}
              emptyState={{
                title: t("empty.title"),
                description: t("empty.description"),
                action: {
                  label: t("empty.action"),
                  onClick: () => setCreateOpen(true),
                },
              }}
              rowActionsHeader={t("table.actions")}
              rowActions={(row) => (
                <div className="flex flex-wrap gap-1.5">
                  <ActionIconButton
                    intent="view"
                    label={t("actions.view")}
                    icon={<Eye className="h-4 w-4" />}
                    onClick={() => handleOpenCouponDetail(row.id, "overview")}
                  />
                  <ActionIconButton
                    intent="manage"
                    label={t("actions.redemptions")}
                    icon={<History className="h-4 w-4" />}
                    onClick={() => handleOpenCouponDetail(row.id, "redemptions")}
                  />
                  <ActionIconButton
                    intent="edit"
                    label={t("actions.edit")}
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => handleOpenEdit(row)}
                  />
                  <ActionIconButton
                    intent="deactivate"
                    label={t("actions.disable")}
                    icon={<Ban className="h-4 w-4" />}
                    disabled={!row.isActive || row.status === "DISABLED"}
                    onClick={() => handleOpenDisable(row)}
                  />
                </div>
              )}
              ariaLabel={t("title")}
              caption={t("title")}
            />
          </PractitionerTableSection>
        )}
      </div>

      <CouponFormModal
        key={`create-${createOpen ? "open" : "closed"}`}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        coupon={null}
      />

      <CouponFormModal
        key={`edit-${editingCoupon?.id ?? "none"}-${editingCoupon ? "open" : "closed"}`}
        isOpen={Boolean(editingCoupon)}
        onClose={() => setEditingCoupon(null)}
        mode="edit"
        coupon={editingCoupon}
      />

      <ConfirmModal
        isOpen={Boolean(disableTarget)}
        onClose={() => setDisableTarget(null)}
        title={t("disableModal.title")}
        description={t("disableModal.description")}
        confirmLabel={t("disableModal.confirm")}
        cancelLabel={t("disableModal.cancel")}
        confirmVariant="danger"
        loading={disableMutation.isPending}
        onConfirm={async () => {
          if (!disableTarget) return;
          try {
            await disableMutation.mutateAsync(disableTarget.id);
            toast.success(t("toast.disabled"));
            setDisableTarget(null);
          } catch (error) {
            const safeMessage = getCouponMutationMessage(error, t("toast.disableFailed"));
            toast.error(safeMessage);
          }
        }}
      >
        <div className="space-y-3 text-sm leading-6 text-text-secondary">
          <p>{t("disableModal.body")}</p>
          {disableTarget ? (
            <div className="rounded-[20px] border border-border-light bg-surface-secondary px-4 py-3 text-xs text-text-secondary dark:bg-white/[0.03]">
              <p className="font-semibold text-text-primary dark:text-white/95">{disableTarget.code}</p>
              <p className="mt-1">
                {t("detail.stats.discount")}: {getDiscountLabel(disableTarget, locale)}
              </p>
            </div>
          ) : null}
        </div>
      </ConfirmModal>

      <CouponDetailDrawer
        couponId={selectedCouponId}
        tab={detailTab}
        onClose={() => setSelectedCouponId(null)}
        onSwitchTab={setDetailTab}
        onEdit={(coupon) => handleOpenEdit(coupon)}
        onDisable={(coupon) => handleOpenDisable(coupon)}
      />
    </>
  );
}
