"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { BadgeCheck, Camera, Eye, FilePenLine, Loader2, Upload, Trash2 } from "lucide-react";
import { z } from "zod";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { FormSkeleton } from "@/components/shared/LoadingStates";
import {
  usePractitionerProfile,
  usePractitionerReadiness,
  useSubmitPractitionerApplication,
} from "../hooks/use-practitioners";
import type {
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerProfile,
  PractitionerType,
  SubmitPractitionerApplicationRequest,
} from "../types/practitioners.types";

type ProfileRequestFormData = {
  displayName?: string;
  professionalTitle?: string;
  bio?: string;
  yearsOfExperience?: string;
  sessionPrice30Egp?: string;
  sessionPrice30Usd?: string;
  sessionPrice60Egp?: string;
  sessionPrice60Usd?: string;
  practitionerType?: PractitionerType | "";
  practitionerGender?: PractitionerGender | "";
  countryCode?: string;
  locale?: "ar" | "en" | "";
  timezone?: string;
  payoutMethodType?: PractitionerPayoutMethodType | "";
  payoutAccountHolderName?: string;
  payoutBankName?: string;
  payoutBankAccountNumber?: string;
  payoutIban?: string;
  payoutWalletProvider?: string;
  payoutWalletIdentifier?: string;
  payoutOtherDetails?: string;
};

type AvatarDraftMode = "keep" | "replace" | "remove";

type AvatarDraftState = {
  mode: AvatarDraftMode;
  file: File | null;
  previewUrl: string | null;
};

type ApplicationSnapshot = {
  applicant?: {
    displayName?: string | null;
    locale?: string | null;
    timezone?: string | null;
  };
  profile?: {
    practitionerType?: string | null;
    practitionerGender?: string | null;
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    countryCode?: string | null;
    avatarUrl?: string | null;
    pricing?: {
      session30?: {
        egp?: number | null;
        usd?: number | null;
      } | null;
      session60?: {
        egp?: number | null;
        usd?: number | null;
      } | null;
    } | null;
  };
  payoutDestination?: {
    methodType?: string | null;
    accountHolderName?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    iban?: string | null;
    walletProvider?: string | null;
    walletIdentifier?: string | null;
    otherDetails?: string | null;
  } | null;
} | null;

const selectClasses =
  "app-control h-11 w-full appearance-none px-4 py-2.5 text-sm text-text-primary";

const textareaClasses =
  "app-control min-h-[120px] w-full px-4 py-3 text-sm text-text-primary";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PAGE_CARD = "app-panel rounded-[30px] p-5 sm:p-6";
const SECTION_CARD = "app-panel rounded-[28px] p-5 sm:p-6";
const SOFT_CARD = "app-panel-soft rounded-[22px] p-4";

function getInitials(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return "P";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getReadableValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && value.trim().length === 0) return "-";
  return String(value);
}

function formatMoneyValue(value: number | string | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "-";

  const numericValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numericValue)) return "-";

  try {
    return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return String(numericValue);
  }
}

function parseOptionalMoneyInput(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function formatPayoutDestinationLabel(
  payoutDestination: PractitionerProfile["payoutDestination"],
  t: ReturnType<typeof useTranslations>,
) {
  if (!payoutDestination?.methodType) {
    return t("profile.request.noPayoutDestination");
  }

  return [
    t(`profile.payoutMethodType.${payoutDestination.methodType}` as Parameters<typeof t>[0]),
    payoutDestination.accountHolderName,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildSnapshotChanges(
  profile: PractitionerProfile,
  snapshot: ApplicationSnapshot,
  t: ReturnType<typeof useTranslations>,
  locale: string,
) {
  if (!snapshot) return [];

  const changes: Array<{ label: string; value: string }> = [];
  const applicant = snapshot.applicant ?? {};
  const requestedProfile = snapshot.profile ?? {};
  const requestedPayoutDestination = snapshot.payoutDestination ?? null;
  const requestedPricing = requestedProfile.pricing ?? null;

  const addChange = (label: string, currentValue: string | number | null | undefined, requestedValue: string | number | null | undefined) => {
    if (requestedValue === undefined) return;
    const current = getReadableValue(currentValue);
    const requested = getReadableValue(requestedValue);
    if (current === requested) return;
    changes.push({
      label,
      value: `${current} → ${requested}`,
    });
  };

  addChange(t("profile.fields.displayName.label"), profile.displayName, applicant.displayName);
  addChange(
    t("profile.fields.professionalTitle.label"),
    profile.professionalTitle,
    requestedProfile.professionalTitle,
  );
  addChange(t("profile.fields.bio.label"), profile.bio, requestedProfile.bio);
  addChange(t("profile.fields.countryCode.label"), profile.countryCode, requestedProfile.countryCode);
  addChange(t("profile.fields.locale.label"), profile.locale, applicant.locale);
  addChange(t("profile.fields.timezone.label"), profile.timezone, applicant.timezone);
  addChange(
    t("profile.fields.yearsOfExperience.label"),
    profile.yearsOfExperience,
    requestedProfile.yearsOfExperience,
  );
  addChange(
    t("profile.fields.sessionPrice30Egp.label"),
    formatMoneyValue(profile.pricing.session30.egp, locale),
    requestedPricing?.session30?.egp === undefined
      ? undefined
      : formatMoneyValue(requestedPricing.session30?.egp, locale),
  );
  addChange(
    t("profile.fields.sessionPrice30Usd.label"),
    formatMoneyValue(profile.pricing.session30.usd, locale),
    requestedPricing?.session30?.usd === undefined
      ? undefined
      : formatMoneyValue(requestedPricing.session30?.usd, locale),
  );
  addChange(
    t("profile.fields.sessionPrice60Egp.label"),
    formatMoneyValue(profile.pricing.session60.egp, locale),
    requestedPricing?.session60?.egp === undefined
      ? undefined
      : formatMoneyValue(requestedPricing.session60?.egp, locale),
  );
  addChange(
    t("profile.fields.sessionPrice60Usd.label"),
    formatMoneyValue(profile.pricing.session60.usd, locale),
    requestedPricing?.session60?.usd === undefined
      ? undefined
      : formatMoneyValue(requestedPricing.session60?.usd, locale),
  );
  addChange(
    t("profile.fields.practitionerType.label"),
    t(`profile.practitionerType.${profile.practitionerType}` as Parameters<typeof t>[0]),
    requestedProfile.practitionerType ? t(`profile.practitionerType.${requestedProfile.practitionerType}` as Parameters<typeof t>[0]) : undefined,
  );
  addChange(
    t("profile.fields.practitionerGender.label"),
    profile.practitionerGender ? t(`profile.practitionerGender.${profile.practitionerGender}` as Parameters<typeof t>[0]) : "-",
    requestedProfile.practitionerGender ? t(`profile.practitionerGender.${requestedProfile.practitionerGender}` as Parameters<typeof t>[0]) : undefined,
  );

  if (requestedProfile.avatarUrl !== undefined) {
    const currentAvatar = profile.avatarUrl ? t("profile.request.photoProvided") : t("profile.request.photoEmpty");
    const requestedAvatar = requestedProfile.avatarUrl ? t("profile.request.photoProvided") : t("profile.request.photoRemoved");
    if (currentAvatar !== requestedAvatar) {
      changes.push({
        label: t("profile.avatar.title"),
        value: `${currentAvatar} → ${requestedAvatar}`,
      });
    }
  }

  if (requestedPayoutDestination !== undefined) {
    const currentPayout = formatPayoutDestinationLabel(profile.payoutDestination, t);
    const requestedPayout = requestedPayoutDestination
      ? [
          t(`profile.payoutMethodType.${requestedPayoutDestination.methodType ?? "OTHER"}` as Parameters<typeof t>[0]),
          requestedPayoutDestination.accountHolderName,
        ]
          .filter(Boolean)
          .join(" · ")
      : t("profile.request.noPayoutDestination");

    if (currentPayout !== requestedPayout) {
      changes.push({
        label: t("profile.sections.payoutDestination"),
        value: `${currentPayout} → ${requestedPayout}`,
      });
    }
  }

  return changes.slice(0, 12);
}

function formatReadinessRequirement(
  requirement: string,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (requirement) {
    case "primarySpecialtyCategoryId":
      return t("profile.readiness.requirements.primarySpecialtyCategoryId");
    case "payoutAccountHolderName":
      return t("profile.readiness.requirements.payoutAccountHolderName");
    case "payoutDestination":
      return t("profile.readiness.requirements.payoutDestination");
    default:
      return requirement;
  }
}

async function compressAvatarToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Avatar preview failed to load."));
      element.src = objectUrl;
    });

    const maxDimension = 512;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/webp", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function PractitionerProfileWorkspace() {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const router = useRouter();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraftState>({
    mode: "keep",
    file: null,
    previewUrl: null,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError, refetch } = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const submitApplication = useSubmitPractitionerApplication();

  const profile = data?.profile;
  const readiness = readinessQuery.data?.readiness ?? null;
  const application = profile?.applicationStatusSummary ?? null;
  const snapshot = application?.submissionSnapshot as ApplicationSnapshot;
  const hasPrimarySpecialty =
    Boolean(profile?.primarySpecialtyCategoryId?.trim()) ||
    Boolean(profile?.specialties.some((specialty) => specialty.isPrimary));
  const hasPayoutAccountHolderName = Boolean(profile?.payoutDestination?.accountHolderName?.trim());

  const profileSchema = useMemo(
    () =>
      z.object({
        displayName: z.string().max(80, { message: t("profile.validation.displayNameMax") }).optional(),
        professionalTitle: z.string().max(191, { message: t("profile.validation.professionalTitleMax") }).optional(),
        bio: z.string().max(4000, { message: t("profile.validation.bioMax") }).optional(),
        yearsOfExperience: z
          .string()
          .optional()
          .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
            message: t("profile.validation.yearsMin"),
          })
          .refine((value) => !value || Number(value) <= 80, {
            message: t("profile.validation.yearsMax"),
          }),
        sessionPrice30Egp: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") },
        ),
        sessionPrice30Usd: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") },
        ),
        sessionPrice60Egp: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") },
        ),
        sessionPrice60Usd: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") },
        ),
        practitionerType: z.string().optional(),
        practitionerGender: z.string().optional(),
        countryCode: z.string().max(3, { message: t("profile.validation.countryCodeMax") }).optional(),
        locale: z.string().optional(),
        timezone: z.string().max(80, { message: t("profile.validation.timezoneMax") }).optional(),
        payoutMethodType: z.string().optional(),
        payoutAccountHolderName: z.string().max(191, { message: t("profile.validation.payoutAccountHolderNameMax") }).optional(),
        payoutBankName: z.string().max(191, { message: t("profile.validation.payoutBankNameMax") }).optional(),
        payoutBankAccountNumber: z.string().max(191, { message: t("profile.validation.payoutBankAccountNumberMax") }).optional(),
        payoutIban: z.string().max(191, { message: t("profile.validation.payoutIbanMax") }).optional(),
        payoutWalletProvider: z.string().max(191, { message: t("profile.validation.payoutWalletProviderMax") }).optional(),
        payoutWalletIdentifier: z.string().max(191, { message: t("profile.validation.payoutWalletIdentifierMax") }).optional(),
        payoutOtherDetails: z.string().max(1000, { message: t("profile.validation.payoutOtherDetailsMax") }).optional(),
      }).superRefine((value, ctx) => {
        const methodType = value.payoutMethodType?.trim() ?? "";
        const hasText = (input: string | undefined) => Boolean(input?.trim().length);

        if (!methodType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payoutMethodType"],
            message: t("profile.validation.payoutDestinationRequired"),
          });
          return;
        }

        if (!hasText(value.payoutAccountHolderName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payoutAccountHolderName"],
            message: t("profile.validation.payoutDestinationRequired"),
          });
        }

        switch (methodType) {
          case "BANK_ACCOUNT":
            if (!hasText(value.payoutBankName)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutBankName"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            if (!hasText(value.payoutBankAccountNumber)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutBankAccountNumber"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            break;
          case "IBAN":
            if (!hasText(value.payoutIban)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutIban"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            break;
          case "WALLET":
            if (!hasText(value.payoutWalletProvider)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutWalletProvider"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            if (!hasText(value.payoutWalletIdentifier)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutWalletIdentifier"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            break;
          case "OTHER":
            if (!hasText(value.payoutOtherDetails)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payoutOtherDetails"],
                message: t("profile.validation.payoutDestinationRequired"),
              });
            }
            break;
          default:
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["payoutMethodType"],
              message: t("profile.validation.payoutDestinationRequired"),
            });
        }
      }),
    [t],
  );

  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileRequestFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      professionalTitle: "",
      bio: "",
      yearsOfExperience: "",
      sessionPrice30Egp: "",
      sessionPrice30Usd: "",
      sessionPrice60Egp: "",
      sessionPrice60Usd: "",
      practitionerType: "",
      practitionerGender: "",
      countryCode: "",
      locale: "",
      timezone: "",
      payoutMethodType: "",
      payoutAccountHolderName: "",
      payoutBankName: "",
      payoutBankAccountNumber: "",
      payoutIban: "",
      payoutWalletProvider: "",
      payoutWalletIdentifier: "",
      payoutOtherDetails: "",
    },
  });

  useEffect(() => {
    return () => {
      if (avatarDraft.previewUrl) {
        URL.revokeObjectURL(avatarDraft.previewUrl);
      }
    };
  }, [avatarDraft.previewUrl]);

  const handleAvatarFileSelected = (file: File | null) => {
    setFeedback(null);
    setAvatarDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      if (!file) {
        return { mode: current.mode === "remove" ? "remove" : "keep", file: null, previewUrl: null };
      }

      if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
        setFeedback({
          tone: "error",
          message: t("profile.avatar.validation.invalidType"),
        });
        return { mode: "keep", file: null, previewUrl: null };
      }

      if (file.size > MAX_AVATAR_SIZE) {
        setFeedback({
          tone: "error",
          message: t("profile.avatar.validation.fileTooLarge"),
        });
        return { mode: "keep", file: null, previewUrl: null };
      }

      return {
        mode: "replace",
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
  };

  const handleKeepCurrentPhoto = () => {
    setFeedback(null);
    setAvatarDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return { mode: "keep", file: null, previewUrl: null };
    });
  };

  const handleRemovePhoto = () => {
    setFeedback(null);
    setAvatarDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return { mode: "remove", file: null, previewUrl: null };
    });
  };

  const watchedPayoutMethodType = watch("payoutMethodType");
  const watchedPayoutAccountHolderName = watch("payoutAccountHolderName");
  const watchedPayoutBankName = watch("payoutBankName");
  const watchedPayoutBankAccountNumber = watch("payoutBankAccountNumber");
  const watchedPayoutIban = watch("payoutIban");
  const watchedPayoutWalletProvider = watch("payoutWalletProvider");
  const watchedPayoutWalletIdentifier = watch("payoutWalletIdentifier");
  const watchedPayoutOtherDetails = watch("payoutOtherDetails");

  const payoutValidation = useMemo(() => {
    const methodType = watchedPayoutMethodType?.trim() ?? "";
    const hasText = (value: string | undefined) => Boolean(value?.trim().length);

    const validation = {
      hasIssue: false,
      methodTypeError: false,
      accountHolderNameError: false,
      bankNameError: false,
      bankAccountNumberError: false,
      ibanError: false,
      walletProviderError: false,
      walletIdentifierError: false,
      otherDetailsError: false,
    };

    if (!methodType) {
      validation.hasIssue = true;
      validation.methodTypeError = true;
      return validation;
    }

    validation.accountHolderNameError = !hasText(watchedPayoutAccountHolderName);

    switch (methodType) {
      case "BANK_ACCOUNT":
        validation.bankNameError = !hasText(watchedPayoutBankName);
        validation.bankAccountNumberError = !hasText(watchedPayoutBankAccountNumber);
        break;
      case "IBAN":
        validation.ibanError = !hasText(watchedPayoutIban);
        break;
      case "WALLET":
        validation.walletProviderError = !hasText(watchedPayoutWalletProvider);
        validation.walletIdentifierError = !hasText(watchedPayoutWalletIdentifier);
        break;
      case "OTHER":
        validation.otherDetailsError = !hasText(watchedPayoutOtherDetails);
        break;
      default:
        validation.methodTypeError = true;
        break;
    }

    validation.hasIssue =
      validation.methodTypeError ||
      validation.accountHolderNameError ||
      validation.bankNameError ||
      validation.bankAccountNumberError ||
      validation.ibanError ||
      validation.walletProviderError ||
      validation.walletIdentifierError ||
      validation.otherDetailsError;

    return validation;
  }, [
    watchedPayoutAccountHolderName,
    watchedPayoutBankAccountNumber,
    watchedPayoutBankName,
    watchedPayoutIban,
    watchedPayoutMethodType,
    watchedPayoutOtherDetails,
    watchedPayoutWalletIdentifier,
    watchedPayoutWalletProvider,
  ]);

  const isPendingReview = application?.status === "SUBMITTED" || application?.status === "UNDER_REVIEW";
  const canSubmitApplication = readiness?.canSubmitApplication === true;
  const canRequestChanges = Boolean(profile) && !isPendingReview;
  const selectedAvatarPreview = avatarDraft.previewUrl ?? profile?.avatarUrl ?? null;
  const currentRequestChanges = profile ? buildSnapshotChanges(profile, snapshot, t, locale) : [];
  const currentApplicationStatus = application?.status ?? null;
  const readinessMissingRequirements = readiness?.missingRequirements ?? [];
  const hasFormErrors = Object.keys(errors).length > 0;
  const submitDisabled = !hasPrimarySpecialty || payoutValidation.hasIssue || hasFormErrors;
  const specialtiesHelpRoute = `/${locale}/practitioner/specialties`;

  const openRequestModal = () => {
    if (!profile || isPendingReview) return;

    submitApplication.reset();
    reset({
      displayName: profile.displayName ?? "",
      professionalTitle: profile.professionalTitle ?? "",
      bio: profile.bio ?? "",
      yearsOfExperience: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
      sessionPrice30Egp: profile.pricing.session30.egp != null ? String(profile.pricing.session30.egp) : "",
      sessionPrice30Usd: profile.pricing.session30.usd != null ? String(profile.pricing.session30.usd) : "",
      sessionPrice60Egp: profile.pricing.session60.egp != null ? String(profile.pricing.session60.egp) : "",
      sessionPrice60Usd: profile.pricing.session60.usd != null ? String(profile.pricing.session60.usd) : "",
      practitionerType: profile.practitionerType ?? "",
      practitionerGender: profile.practitionerGender ?? "",
      countryCode: profile.countryCode ?? "",
      locale: (profile.locale as "ar" | "en" | "") ?? "",
      timezone: profile.timezone ?? "",
      payoutMethodType: profile.payoutDestination?.methodType ?? "",
      payoutAccountHolderName: profile.payoutDestination?.accountHolderName ?? "",
      payoutBankName: profile.payoutDestination?.bankName ?? "",
      payoutBankAccountNumber: profile.payoutDestination?.bankAccountNumber ?? "",
      payoutIban: profile.payoutDestination?.iban ?? "",
      payoutWalletProvider: profile.payoutDestination?.walletProvider ?? "",
      payoutWalletIdentifier: profile.payoutDestination?.walletIdentifier ?? "",
      payoutOtherDetails: profile.payoutDestination?.otherDetails ?? "",
    });
    setAvatarDraft({
      mode: profile.avatarUrl ? "keep" : "remove",
      file: null,
      previewUrl: null,
    });
    setFeedback(null);
    setIsRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    submitApplication.reset();
    setAvatarDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return { mode: "keep", file: null, previewUrl: null };
    });
  };

  const onSubmitRequest = async (formData: ProfileRequestFormData) => {
    if (!profile) return;
    if (!hasPrimarySpecialty) {
      setFeedback({
        tone: "error",
        message: t("profile.request.feedback.primarySpecialtyRequired"),
      });
      return;
    }

    setFeedback(null);

    let requestedAvatarUrl: string | null | undefined;
    if (avatarDraft.mode === "replace" && avatarDraft.file) {
      requestedAvatarUrl = await compressAvatarToDataUrl(avatarDraft.file);
    } else if (avatarDraft.mode === "remove") {
      requestedAvatarUrl = null;
    }

    const payload: SubmitPractitionerApplicationRequest = {
      displayName: formData.displayName?.trim() || undefined,
      professionalTitle:
        formData.professionalTitle === undefined
          ? undefined
          : formData.professionalTitle.trim().length > 0
            ? formData.professionalTitle.trim()
            : null,
      bio:
        formData.bio === undefined
          ? undefined
          : formData.bio.trim().length > 0
            ? formData.bio.trim()
            : null,
      yearsOfExperience:
        formData.yearsOfExperience && formData.yearsOfExperience.trim().length > 0
          ? Number(formData.yearsOfExperience)
          : null,
      practitionerType: (formData.practitionerType || undefined) as PractitionerType | undefined,
      practitionerGender:
        formData.practitionerGender === undefined
          ? undefined
          : formData.practitionerGender === ""
            ? null
            : (formData.practitionerGender as PractitionerGender),
      countryCode:
        formData.countryCode === undefined
          ? undefined
          : formData.countryCode.trim().length > 0
            ? formData.countryCode.trim()
            : null,
      locale:
        formData.locale === "ar" || formData.locale === "en" ? formData.locale : undefined,
      timezone:
        formData.timezone === undefined
          ? undefined
          : formData.timezone.trim().length > 0
            ? formData.timezone.trim()
            : undefined,
      sessionPrice30Egp: parseOptionalMoneyInput(formData.sessionPrice30Egp),
      sessionPrice30Usd: parseOptionalMoneyInput(formData.sessionPrice30Usd),
      sessionPrice60Egp: parseOptionalMoneyInput(formData.sessionPrice60Egp),
      sessionPrice60Usd: parseOptionalMoneyInput(formData.sessionPrice60Usd),
      payoutDestination:
        formData.payoutMethodType && formData.payoutMethodType.length > 0
          ? {
              methodType: formData.payoutMethodType as PractitionerPayoutMethodType,
              accountHolderName: formData.payoutAccountHolderName?.trim() || undefined,
              bankName: formData.payoutBankName?.trim() || undefined,
              bankAccountNumber: formData.payoutBankAccountNumber?.trim() || undefined,
              iban: formData.payoutIban?.trim() || undefined,
              walletProvider: formData.payoutWalletProvider?.trim() || undefined,
              walletIdentifier: formData.payoutWalletIdentifier?.trim() || undefined,
              otherDetails: formData.payoutOtherDetails?.trim() || undefined,
            }
          : undefined,
      avatarUrl: requestedAvatarUrl,
    };

    try {
      await submitApplication.mutateAsync(payload);
      setFeedback({
        tone: "success",
        message: t("profile.request.feedback.success"),
      });
      closeRequestModal();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error, t("profile.request.feedback.error")),
      });
    }
  };

  if (isLoading) {
    return (
      <section className={PAGE_CARD}>
        <FormSkeleton />
      </section>
    );
  }

  if (isError || !profile) {
    return (
      <section className={PAGE_CARD}>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium text-text-primary">{t("profile.feedback.loadError")}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {t("profile.feedback.retry")}
          </Button>
        </div>
      </section>
    );
  }

  const applicationStatusLabel =
    currentApplicationStatus === null
      ? t("profile.request.noRequest")
      : t(`application.status.${currentApplicationStatus}` as Parameters<typeof t>[0]);

  const readinessLabel = canSubmitApplication
    ? t("profile.readiness.ready")
    : t("profile.readiness.notReady");

  const readinessTone = canSubmitApplication ? "success" : "warning";
  const payoutValidationMessage = t("profile.validation.payoutDestinationRequired");
  const payoutSectionClassName = `${SOFT_CARD} ${
    payoutValidation.hasIssue ? "border border-error-200 bg-error-50/30" : ""
  }`;
  const specialtiesSectionClassName = `${SOFT_CARD} ${
    hasPrimarySpecialty ? "" : "border border-error-200 bg-error-50/30"
  }`;
  const payoutSummaryCardClassName = `${SOFT_CARD} ${
    hasPayoutAccountHolderName ? "" : "border border-error-200 bg-error-50/30"
  }`;
  const hasAvatar = Boolean(profile.avatarUrl);
  const avatarInitials = getInitials(profile.displayName);
  const displaySpecialties = profile.specialties.slice(0, 4);
  const payoutSummary = formatPayoutDestinationLabel(profile.payoutDestination, t);
  const credentialSummary = profile.credentialSummary;

  return (
    <div className="space-y-4 sm:space-y-5">
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className={PAGE_CARD}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border-light bg-surface-secondary">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={t("profile.avatar.alt")} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-text-muted">
                  {avatarInitials}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                  {t("profile.page.eyebrow")}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    currentApplicationStatus === "APPROVED"
                      ? "bg-success-50 text-success-700"
                      : currentApplicationStatus === "UNDER_REVIEW" || currentApplicationStatus === "SUBMITTED"
                        ? "bg-warning-50 text-warning-700"
                        : "bg-surface-tertiary text-text-secondary"
                  }`}
                >
                  {applicationStatusLabel}
                </span>
              </div>

              <h1 className="truncate text-2xl font-semibold text-text-primary sm:text-3xl">
                {profile.displayName ?? t("profile.page.fallbackTitle")}
              </h1>

              <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                {t("profile.page.subtitle")}
              </p>

              <div className="flex flex-wrap gap-2">
                {profile.practitionerType ? (
                  <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
                    {t(`profile.practitionerType.${profile.practitionerType}` as Parameters<typeof t>[0])}
                  </span>
                ) : null}
                {profile.countryCode ? (
                  <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
                    {profile.countryCode}
                  </span>
                ) : null}
                {profile.timezone ? (
                  <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
                    {profile.timezone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
            <Button
              size="sm"
              onClick={openRequestModal}
              disabled={!canRequestChanges}
              startIcon={<FilePenLine className="h-4 w-4" />}
            >
              {currentApplicationStatus === "CHANGES_REQUESTED" || currentApplicationStatus === "REJECTED"
                ? t("profile.actions.reviseRequest")
                : t("profile.actions.requestChanges")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                document.getElementById("profile-live-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              startIcon={<Eye className="h-4 w-4" />}
            >
              {t("profile.actions.reviewLiveProfile")}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className={`${SOFT_CARD} border-t-2 border-t-primary/30`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.summary.reviewState")}
            </p>
            <p className="mt-2 text-base font-semibold text-text-primary">
              {applicationStatusLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {currentApplicationStatus
                ? t(`profile.request.statusMessage.${currentApplicationStatus}` as Parameters<typeof t>[0])
                : t("profile.request.noRequestHint")}
            </p>
          </div>

          <div className={SOFT_CARD}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.summary.readiness")}
            </p>
            <p className="mt-2 text-base font-semibold text-text-primary">{readinessLabel}</p>
            <p className={`mt-1 text-xs leading-5 ${readinessTone === "success" ? "text-success-700" : "text-warning-700"}`}>
              {canSubmitApplication
                ? t("profile.readiness.readyNote")
                : t("profile.readiness.notReadyNote")}
            </p>
            {!canSubmitApplication && readinessMissingRequirements.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5 text-warning-700">
                {readinessMissingRequirements.map((item) => (
                  <li key={item}>- {formatReadinessRequirement(item, t)}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className={SOFT_CARD}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.summary.credentials")}
            </p>
            <p className="mt-2 text-base font-semibold text-text-primary">
              {credentialSummary.totalCredentials}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {t("profile.summary.credentialsNote", {
                count: credentialSummary.totalCredentials,
                pending: credentialSummary.pendingCount,
                approved: credentialSummary.approvedCount,
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.95fr]">
        <article id="profile-live-section" className={SECTION_CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t("profile.sections.liveProfile")}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t("profile.sections.liveProfileNote")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ProfileFieldCard label={t("profile.fields.displayName.label")} value={profile.displayName} />
            <ProfileFieldCard label={t("profile.fields.professionalTitle.label")} value={profile.professionalTitle} />
            <ProfileFieldCard
              label={t("profile.fields.practitionerType.label")}
              value={t(`profile.practitionerType.${profile.practitionerType}` as Parameters<typeof t>[0])}
            />
            <ProfileFieldCard
              label={t("profile.fields.practitionerGender.label")}
              value={profile.practitionerGender ? t(`profile.practitionerGender.${profile.practitionerGender}` as Parameters<typeof t>[0]) : null}
            />
            <ProfileFieldCard label={t("profile.fields.countryCode.label")} value={profile.countryCode} />
            <ProfileFieldCard label={t("profile.fields.timezone.label")} value={profile.timezone} />
            <ProfileFieldCard label={t("profile.fields.locale.label")} value={profile.locale} />
            <ProfileFieldCard
              label={t("profile.fields.yearsOfExperience.label")}
              value={profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : null}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.sections.sessionPricing")}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileFieldCard
                label={t("profile.fields.sessionPrice30Egp.label")}
                value={formatMoneyValue(profile.pricing.session30.egp, locale)}
              />
              <ProfileFieldCard
                label={t("profile.fields.sessionPrice30Usd.label")}
                value={formatMoneyValue(profile.pricing.session30.usd, locale)}
              />
              <ProfileFieldCard
                label={t("profile.fields.sessionPrice60Egp.label")}
                value={formatMoneyValue(profile.pricing.session60.egp, locale)}
              />
              <ProfileFieldCard
                label={t("profile.fields.sessionPrice60Usd.label")}
                value={formatMoneyValue(profile.pricing.session60.usd, locale)}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("profile.fields.bio.label")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {profile.bio ?? t("profile.request.emptyValue")}
              </p>
            </div>

            <div className={payoutSummaryCardClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("profile.sections.payoutDestination")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">{payoutSummary}</p>
              {!hasPayoutAccountHolderName ? (
                <p className="mt-2 text-xs leading-5 text-error-700">
                  {t("profile.request.payoutAccountHolderRequired")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.sections.specialties")}
            </p>
            <div className={`mt-2 rounded-2xl p-3 ${specialtiesSectionClassName}`}>
              <div className="flex flex-wrap gap-2">
              {displaySpecialties.length > 0 ? (
                displaySpecialties.map((specialty) => (
                  <span
                    key={specialty.specialtyId}
                    className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary"
                  >
                    {specialty.title ?? specialty.slug}
                    {specialty.isPrimary ? ` · ${t("profile.specialties.primary")}` : ""}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-secondary">{t("profile.specialties.empty")}</span>
              )}
              </div>
              {!hasPrimarySpecialty ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-6 text-error-700">
                  <span>{t("profile.request.primarySpecialtyRequired")}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(specialtiesHelpRoute)}
                  >
                    {t("profile.actions.openSpecialties")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        <article className={SECTION_CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t("profile.sections.changeRequest")}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t("profile.sections.changeRequestNote")}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                currentApplicationStatus === "APPROVED"
                  ? "bg-success-50 text-success-700"
                  : currentApplicationStatus === "UNDER_REVIEW" || currentApplicationStatus === "SUBMITTED"
                    ? "bg-warning-50 text-warning-700"
                    : "bg-surface-tertiary text-text-secondary"
              }`}
            >
              {applicationStatusLabel}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <ProfileFieldCard
              label={t("profile.request.submittedAt")}
              value={formatDateTime(application?.submittedAt ?? null, locale)}
            />
            <ProfileFieldCard
              label={t("profile.request.reviewedAt")}
              value={formatDateTime(application?.reviewedAt ?? null, locale)}
            />
            <ProfileFieldCard
              label={t("profile.request.reviewedBy")}
              value={application?.reviewedByUserId}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("profile.request.changeSummary")}
            </p>
            {currentRequestChanges.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {currentRequestChanges.map((item) => (
                  <li
                    key={`${item.label}-${item.value}`}
                    className="flex items-start gap-2 text-sm leading-6 text-text-primary"
                  >
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{item.label}:</span> {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("profile.request.noChanges")}
              </p>
            )}
          </div>

          {application?.reviewDecisionReason || application?.reviewNotes ? (
            <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("profile.request.adminNote")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {application?.reviewDecisionReason ?? application?.reviewNotes ?? "-"}
              </p>
            </div>
          ) : null}
        </article>
      </section>

      <section className={SECTION_CARD}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">{t("profile.sections.avatar")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("profile.avatar.pageHint")}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={openRequestModal}
            disabled={!canRequestChanges}
            startIcon={<Camera className="h-4 w-4" />}
          >
            {t("profile.actions.updateAvatar")}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
          <div className="flex h-40 w-40 overflow-hidden rounded-[28px] border border-border-light bg-surface-secondary">
            {selectedAvatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedAvatarPreview} alt={t("profile.avatar.alt")} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-text-muted">
                {avatarInitials}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("profile.avatar.liveLabel")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {hasAvatar ? t("profile.avatar.livePresent") : t("profile.avatar.liveEmpty")}
              </p>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("profile.avatar.hint")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("profile.avatar.hintBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <FormModal
        isOpen={isRequestModalOpen}
        onClose={closeRequestModal}
        size="2xl"
        title={t("profile.request.modalTitle")}
        description={t("profile.request.modalDescription")}
        submitLabel={
          submitApplication.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("profile.actions.submitting")}
            </span>
          ) : (
            t("profile.actions.submitRequest")
          )
        }
        cancelLabel={t("profile.actions.cancelRequest")}
        onSubmit={handleSubmit(onSubmitRequest)}
        submitDisabled={submitDisabled}
        loading={submitApplication.isPending}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/15 bg-primary-light/30 p-4 text-sm leading-6 text-text-primary">
            {t("profile.request.notice")}
          </div>

          {!hasPrimarySpecialty ? (
            <div className="rounded-2xl border border-error-200 bg-error-50 p-4 text-sm leading-6 text-error-700">
              <p>{t("profile.request.primarySpecialtyRequired")}</p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(specialtiesHelpRoute)}
                >
                  {t("profile.actions.openSpecialties")}
                </Button>
              </div>
            </div>
          ) : null}

          {!canSubmitApplication ? (
            <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm leading-6 text-warning-800">
              <p>{t("profile.readiness.notReadyNote")}</p>
              {readinessMissingRequirements.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {readinessMissingRequirements.map((item) => (
                    <li key={item}>- {formatReadinessRequirement(item, t)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={SOFT_CARD}>
              <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.identity")}</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="displayName">{t("profile.fields.displayName.label")}</Label>
                  <Input id="displayName" type="text" placeholder={t("profile.fields.displayName.placeholder")} error={!!errors.displayName} {...register("displayName")} />
                  {errors.displayName ? <p className="mt-1.5 text-xs text-error-500">{errors.displayName.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor="countryCode">{t("profile.fields.countryCode.label")}</Label>
                  <Input id="countryCode" type="text" placeholder={t("profile.fields.countryCode.placeholder")} error={!!errors.countryCode} {...register("countryCode")} />
                  {errors.countryCode ? <p className="mt-1.5 text-xs text-error-500">{errors.countryCode.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor="locale">{t("profile.fields.locale.label")}</Label>
                  <select id="locale" className={selectClasses} {...register("locale")}>
                    <option value="">{t("profile.fields.locale.placeholder")}</option>
                    <option value="ar">{t("profile.locale.ar")}</option>
                    <option value="en">{t("profile.locale.en")}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="timezone">{t("profile.fields.timezone.label")}</Label>
                  <Input id="timezone" type="text" placeholder={t("profile.fields.timezone.placeholder")} error={!!errors.timezone} {...register("timezone")} />
                  {errors.timezone ? <p className="mt-1.5 text-xs text-error-500">{errors.timezone.message}</p> : null}
                </div>
              </div>
            </section>

            <section className={SOFT_CARD}>
              <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.professional")}</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="professionalTitle">{t("profile.fields.professionalTitle.label")}</Label>
                  <Input id="professionalTitle" type="text" placeholder={t("profile.fields.professionalTitle.placeholder")} error={!!errors.professionalTitle} {...register("professionalTitle")} />
                  {errors.professionalTitle ? <p className="mt-1.5 text-xs text-error-500">{errors.professionalTitle.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor="practitionerType">{t("profile.fields.practitionerType.label")}</Label>
                  <select id="practitionerType" className={selectClasses} {...register("practitionerType")}>
                    <option value="">{t("profile.fields.practitionerType.placeholder")}</option>
                    {(["PSYCHOLOGIST", "PSYCHIATRIST", "NUTRITIONIST", "WEIGHT_LOSS_SPECIALIST", "COUNSELOR", "OTHER"] as PractitionerType[]).map((type) => (
                      <option key={type} value={type}>
                        {t(`profile.practitionerType.${type}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="practitionerGender">{t("profile.fields.practitionerGender.label")}</Label>
                  <select id="practitionerGender" className={selectClasses} {...register("practitionerGender")}>
                    <option value="">{t("profile.fields.practitionerGender.placeholder")}</option>
                    <option value="MALE">{t("profile.practitionerGender.MALE")}</option>
                    <option value="FEMALE">{t("profile.practitionerGender.FEMALE")}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="yearsOfExperience">{t("profile.fields.yearsOfExperience.label")}</Label>
                  <Input id="yearsOfExperience" type="number" placeholder={t("profile.fields.yearsOfExperience.placeholder")} error={!!errors.yearsOfExperience} {...register("yearsOfExperience")} />
                  {errors.yearsOfExperience ? <p className="mt-1.5 text-xs text-error-500">{errors.yearsOfExperience.message}</p> : null}
                </div>
              </div>
            </section>

            <section className={`${SOFT_CARD} lg:col-span-2`}>
              <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.sessionPricing")}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sessionPrice30Egp">{t("profile.fields.sessionPrice30Egp.label")}</Label>
                  <Input
                    id="sessionPrice30Egp"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("profile.fields.sessionPrice30Egp.placeholder")}
                    error={!!errors.sessionPrice30Egp}
                    {...register("sessionPrice30Egp")}
                  />
                  {errors.sessionPrice30Egp ? (
                    <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice30Egp.message}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="sessionPrice30Usd">{t("profile.fields.sessionPrice30Usd.label")}</Label>
                  <Input
                    id="sessionPrice30Usd"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("profile.fields.sessionPrice30Usd.placeholder")}
                    error={!!errors.sessionPrice30Usd}
                    {...register("sessionPrice30Usd")}
                  />
                  {errors.sessionPrice30Usd ? (
                    <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice30Usd.message}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="sessionPrice60Egp">{t("profile.fields.sessionPrice60Egp.label")}</Label>
                  <Input
                    id="sessionPrice60Egp"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("profile.fields.sessionPrice60Egp.placeholder")}
                    error={!!errors.sessionPrice60Egp}
                    {...register("sessionPrice60Egp")}
                  />
                  {errors.sessionPrice60Egp ? (
                    <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice60Egp.message}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="sessionPrice60Usd">{t("profile.fields.sessionPrice60Usd.label")}</Label>
                  <Input
                    id="sessionPrice60Usd"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("profile.fields.sessionPrice60Usd.placeholder")}
                    error={!!errors.sessionPrice60Usd}
                    {...register("sessionPrice60Usd")}
                  />
                  {errors.sessionPrice60Usd ? (
                    <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice60Usd.message}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={SOFT_CARD}>
              <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.bio")}</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="bio">{t("profile.fields.bio.label")}</Label>
                  <textarea id="bio" placeholder={t("profile.fields.bio.placeholder")} className={textareaClasses} {...register("bio")} />
                  {errors.bio ? <p className="mt-1.5 text-xs text-error-500">{errors.bio.message}</p> : null}
                </div>
              </div>
            </section>

            <section className={payoutSectionClassName}>
              <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.payoutDestination")}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="payoutMethodType">{t("profile.fields.payoutMethodType.label")}</Label>
                  <select
                    id="payoutMethodType"
                    className={`${selectClasses} ${
                      payoutValidation.methodTypeError || !!errors.payoutMethodType
                        ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
                        : ""
                    }`}
                    {...register("payoutMethodType")}
                  >
                    <option value="">{t("profile.fields.payoutMethodType.placeholder")}</option>
                    {(["BANK_ACCOUNT", "IBAN", "WALLET", "OTHER"] as PractitionerPayoutMethodType[]).map((methodType) => (
                      <option key={methodType} value={methodType}>
                        {t(`profile.payoutMethodType.${methodType}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                  {(payoutValidation.methodTypeError || errors.payoutMethodType) && (
                    <p className="mt-1.5 text-xs text-error-500">{payoutValidationMessage}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="payoutAccountHolderName">{t("profile.fields.payoutAccountHolderName.label")}</Label>
                  <Input
                    id="payoutAccountHolderName"
                    type="text"
                    placeholder={t("profile.fields.payoutAccountHolderName.placeholder")}
                    error={Boolean(errors.payoutAccountHolderName || payoutValidation.accountHolderNameError)}
                    {...register("payoutAccountHolderName")}
                  />
                  {errors.payoutAccountHolderName || payoutValidation.accountHolderNameError ? (
                    <p className="mt-1.5 text-xs text-error-500">
                      {t("profile.validation.payoutDestinationRequired")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="payoutBankName">{t("profile.fields.payoutBankName.label")}</Label>
                  <Input
                    id="payoutBankName"
                    type="text"
                    placeholder={t("profile.fields.payoutBankName.placeholder")}
                    error={Boolean(errors.payoutBankName || payoutValidation.bankNameError)}
                    {...register("payoutBankName")}
                  />
                </div>

                <div>
                  <Label htmlFor="payoutBankAccountNumber">{t("profile.fields.payoutBankAccountNumber.label")}</Label>
                  <Input
                    id="payoutBankAccountNumber"
                    type="text"
                    placeholder={t("profile.fields.payoutBankAccountNumber.placeholder")}
                    error={Boolean(errors.payoutBankAccountNumber || payoutValidation.bankAccountNumberError)}
                    {...register("payoutBankAccountNumber")}
                  />
                </div>

                <div>
                  <Label htmlFor="payoutIban">{t("profile.fields.payoutIban.label")}</Label>
                  <Input
                    id="payoutIban"
                    type="text"
                    placeholder={t("profile.fields.payoutIban.placeholder")}
                    error={Boolean(errors.payoutIban || payoutValidation.ibanError)}
                    {...register("payoutIban")}
                  />
                </div>

                <div>
                  <Label htmlFor="payoutWalletProvider">{t("profile.fields.payoutWalletProvider.label")}</Label>
                  <Input
                    id="payoutWalletProvider"
                    type="text"
                    placeholder={t("profile.fields.payoutWalletProvider.placeholder")}
                    error={Boolean(errors.payoutWalletProvider || payoutValidation.walletProviderError)}
                    {...register("payoutWalletProvider")}
                  />
                </div>

                <div>
                  <Label htmlFor="payoutWalletIdentifier">{t("profile.fields.payoutWalletIdentifier.label")}</Label>
                  <Input
                    id="payoutWalletIdentifier"
                    type="text"
                    placeholder={t("profile.fields.payoutWalletIdentifier.placeholder")}
                    error={Boolean(errors.payoutWalletIdentifier || payoutValidation.walletIdentifierError)}
                    {...register("payoutWalletIdentifier")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="payoutOtherDetails">{t("profile.fields.payoutOtherDetails.label")}</Label>
                  <textarea
                    id="payoutOtherDetails"
                    placeholder={t("profile.fields.payoutOtherDetails.placeholder")}
                    className={`${textareaClasses} ${
                      errors.payoutOtherDetails || payoutValidation.otherDetailsError
                        ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
                        : ""
                    }`}
                    {...register("payoutOtherDetails")}
                  />
                </div>
              </div>
            </section>

            <section className={SOFT_CARD}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">{t("profile.sections.avatar")}</h3>
                <span className="text-xs text-text-muted">{t("profile.avatar.reviewOnly")}</span>
              </div>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 overflow-hidden rounded-full border border-border-light bg-surface-secondary">
                  {avatarDraft.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarDraft.previewUrl} alt={t("profile.avatar.alt")} className="h-full w-full object-cover" />
                  ) : profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={t("profile.avatar.alt")} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-text-muted">
                      {avatarInitials}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      handleAvatarFileSelected(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<Upload className="h-4 w-4" />}
                    >
                      {avatarDraft.mode === "replace" ? t("profile.avatar.replacePhoto") : t("profile.avatar.choosePhoto")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleKeepCurrentPhoto}
                      disabled={!profile.avatarUrl && avatarDraft.mode === "keep"}
                    >
                      {t("profile.avatar.keepCurrent")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleRemovePhoto} startIcon={<Trash2 className="h-4 w-4" />}>
                      {t("profile.avatar.removePhoto")}
                    </Button>
                  </div>

                  <p className="text-xs text-text-secondary">{t("profile.avatar.note")}</p>

                  {avatarDraft.file ? (
                    <p className="text-xs font-medium text-text-primary">
                      {t("profile.avatar.selectedFile", { fileName: avatarDraft.file.name })}
                    </p>
                  ) : null}

                  {avatarDraft.mode === "remove" ? (
                    <p className="text-xs font-medium text-error-600">{t("profile.avatar.removeSelected")}</p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>

        {submitApplication.isError ? (
          <div className="mt-4 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {t("profile.request.feedback.error")}
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}

function ProfileFieldCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-text-primary">{getReadableValue(value)}</p>
    </div>
  );
}
