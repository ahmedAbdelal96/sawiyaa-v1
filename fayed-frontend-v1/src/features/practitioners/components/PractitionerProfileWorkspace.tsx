"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  Eye,
  FilePenLine,
  Loader2,
  Upload,
  Trash2,
  User,
  Briefcase,
  CreditCard,
  FileText,
  Calendar,
  Info,
  Clock,
  Layers,
  ArrowRightLeft,
  Mail,
  Phone,
  Globe,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { FormSkeleton } from "@/components/shared/LoadingStates";
import {
  PractitionerPageHeader,
  PractitionerStatsGrid,
  PractitionerStatCard,
  PractitionerSectionCard,
  PractitionerTabs,
  PractitionerInfoGrid,
  PractitionerInfoItem,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import Avatar from "@/components/ui/avatar/Avatar";
import { cn } from "@/lib/utils";
import {
  getLocalizedBankOptions,
  getLocalizedWalletProviderOptions,
  normalizeBankValue,
  normalizeWalletProviderValue,
} from "@/lib/catalogs/payout";
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
  const cleanKey = requirement
    .trim()
    .replace(/\s+/g, "")
    .replace(/^(.)/, (match) => match.toLowerCase());

  switch (cleanKey) {
    case "primarySpecialtyCategoryId":
      return t("profile.readiness.requirements.primarySpecialtyCategoryId");
    case "payoutAccountHolderName":
    case "accountHolderName":
      return t("profile.readiness.requirements.payoutAccountHolderName");
    case "payoutDestination":
    case "payoutDetails":
      return t("profile.readiness.requirements.payoutDestination");
    case "identityDocuments":
      return t("profile.readiness.requirements.identityDocuments" as any);
    case "academicCertificate":
      return t("profile.readiness.requirements.academicCertificate" as any);
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

function InfoRow({
  label,
  value,
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const isValueEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0);

  const displayValue = isValueEmpty ? (
    <span className="text-slate-400 italic">—</span>
  ) : (
    value
  );

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 dark:border-white/5">
      <div className="flex items-center gap-2 min-w-0">
        {icon && (
          <div className="text-teal-600 dark:text-teal-450 flex-shrink-0">
            {icon}
          </div>
        )}
        <span className="text-xs font-semibold text-slate-500 dark:text-white/60 truncate">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold text-slate-800 dark:text-white/95 text-end pl-4 leading-tight break-all">
        {displayValue}
      </span>
    </div>
  );
}

export default function PractitionerProfileWorkspace() {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
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
  const fallbackProfile = useMemo(() => ({
    displayName: "",
    avatarUrl: "",
    professionalTitle: "",
    practitionerType: "" as PractitionerType,
    specialties: [],
    payoutDestination: null,
    pricing: {
      session30: { egp: 0, usd: 0 },
      session60: { egp: 0, usd: 0 },
    },
    yearsOfExperience: 0,
    languages: [],
    applicationStatusSummary: null,
    credentialSummary: { totalCredentials: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
    primarySpecialtyCategoryId: "",
    bio: "",
    practitionerGender: "" as PractitionerGender,
    countryCode: "",
    timezone: "",
    locale: "" as "ar" | "en",
  } as unknown as PractitionerProfile), []);
  const profileOrFallback = profile ?? fallbackProfile;

  const readiness = readinessQuery.data?.readiness ?? null;
  const application = profile?.applicationStatusSummary ?? null;
  const snapshot = application?.submissionSnapshot as ApplicationSnapshot;
  const hasPrimarySpecialty =
    Boolean(profileOrFallback.primarySpecialtyCategoryId?.trim()) ||
    Boolean(profileOrFallback.specialties.some((specialty) => specialty.isPrimary));
  const hasPayoutAccountHolderName = Boolean(profileOrFallback.payoutDestination?.accountHolderName?.trim());

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
    control,
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

  const watchedPayoutMethodType = useWatch({ control, name: "payoutMethodType" });
  const watchedCountryCode = useWatch({ control, name: "countryCode" });
  const watchedPayoutAccountHolderName = useWatch({ control, name: "payoutAccountHolderName" });
  const watchedPayoutBankName = useWatch({ control, name: "payoutBankName" });
  const watchedPayoutBankAccountNumber = useWatch({ control, name: "payoutBankAccountNumber" });
  const watchedPayoutIban = useWatch({ control, name: "payoutIban" });
  const watchedPayoutWalletProvider = useWatch({ control, name: "payoutWalletProvider" });
  const watchedPayoutWalletIdentifier = useWatch({ control, name: "payoutWalletIdentifier" });
  const watchedPayoutOtherDetails = useWatch({ control, name: "payoutOtherDetails" });
  const payoutBankOptions = useMemo(
    () => getLocalizedBankOptions(locale, watchedCountryCode, watchedPayoutBankName),
    [locale, watchedCountryCode, watchedPayoutBankName],
  );
  const payoutWalletProviderOptions = useMemo(
    () => getLocalizedWalletProviderOptions(locale, watchedCountryCode, watchedPayoutWalletProvider),
    [locale, watchedCountryCode, watchedPayoutWalletProvider],
  );

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
      payoutBankName: normalizeBankValue(profile.payoutDestination?.bankName ?? ""),
      payoutBankAccountNumber: profile.payoutDestination?.bankAccountNumber ?? "",
      payoutIban: profile.payoutDestination?.iban ?? "",
      payoutWalletProvider: normalizeWalletProviderValue(profile.payoutDestination?.walletProvider ?? ""),
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
              bankName: normalizeBankValue(formData.payoutBankName ?? ""),
              bankAccountNumber: formData.payoutBankAccountNumber?.trim() || undefined,
              iban: formData.payoutIban?.trim() || undefined,
              walletProvider: normalizeWalletProviderValue(formData.payoutWalletProvider ?? ""),
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

  if (!isLoading && (isError || !profile)) {
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
  const hasAvatar = Boolean(profileOrFallback.avatarUrl);
  const avatarInitials = getInitials(profileOrFallback.displayName);
  const displaySpecialties = profileOrFallback.specialties.slice(0, 4);
  const payoutSummary = formatPayoutDestinationLabel(profileOrFallback.payoutDestination, t);
  const credentialSummary = profileOrFallback.credentialSummary;
  const formattedLanguages = useMemo(() => {
    const languageLabels: Record<string, string> = {
      ar: t("profile.locale.ar") || (locale === "ar" ? "العربية" : "Arabic"),
      en: t("profile.locale.en") || (locale === "ar" ? "الإنجليزية" : "English"),
      arabic: t("profile.locale.ar") || (locale === "ar" ? "العربية" : "Arabic"),
      english: t("profile.locale.en") || (locale === "ar" ? "الإنجليزية" : "English"),
    };
    if (!profileOrFallback.languages || profileOrFallback.languages.length === 0) return null;
    return profileOrFallback.languages
      .map((l) => languageLabels[l.toLowerCase()] || l)
      .join(locale === "ar" ? "، " : ", ");
  }, [profileOrFallback.languages, locale, t]);

  const tabLabels = {
    ar: {
      overview: "نظرة عامة",
      personal: t("profile.sections.personal"),
      professional: t("profile.sections.professional"),
      payout: t("profile.sections.payoutDestination"),
      credentials: `${t("profile.summary.credentials")} & ${t("profile.sections.specialties")}`,
      availability: "الجدولة والباقات",
    },
    en: {
      overview: "Overview",
      personal: "Personal Info",
      professional: "Professional & Pricing",
      payout: "Payout Details",
      credentials: "Credentials & Specialties",
      availability: "Availability & Packages",
    }
  };

  const activeLabels = tabLabels[locale === "ar" ? "ar" : "en"];

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

      <PractitionerPageHeader
        eyebrow={t("profile.page.eyebrow")}
        title={t("profile.page.title")}
        description={t("profile.page.subtitle")}
      />

      <PractitionerSectionCard className="p-0 overflow-hidden border-slate-200/80 shadow-sm">
        {/* Tabs row at the top inside the card */}
        <div className="px-5 pt-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
          <PractitionerTabs
            tabs={[
              { id: "overview", label: activeLabels.overview, icon: <Info className="h-4 w-4" /> },
              { id: "personal", label: activeLabels.personal, icon: <User className="h-4 w-4" /> },
              { id: "professional", label: activeLabels.professional, icon: <Briefcase className="h-4 w-4" /> },
              { id: "payout", label: activeLabels.payout, icon: <CreditCard className="h-4 w-4" /> },
              { id: "credentials", label: activeLabels.credentials, icon: <FileText className="h-4 w-4" /> },
              { id: "availability", label: activeLabels.availability, icon: <Calendar className="h-4 w-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
          />
        </div>

        {/* Content area below tabs */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* Left Column: Summary Card */}
          <aside className="space-y-4">
            <PractitionerSectionCard className="flex flex-col items-center text-center p-4">
            <div className="relative group">
              <Avatar
                src={profileOrFallback.avatarUrl}
                name={profileOrFallback.displayName ?? ""}
                size="custom"
                className="h-24 w-24 border-2 border-primary/20 bg-surface-secondary"
                fallbackInitials={avatarInitials}
              />
              {canRequestChanges ? (
                <button
                  type="button"
                  onClick={openRequestModal}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t("profile.actions.updateAvatar")}
                >
                  <Camera className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <h2 className="mt-3 text-lg font-bold text-text-primary dark:text-white/95 leading-tight">
              {isLoading ? (
                <div className="h-5 w-36 bg-slate-200/60 dark:bg-white/10 rounded animate-pulse mx-auto" />
              ) : (
                profileOrFallback.displayName || t("profile.page.fallbackTitle")
              )}
            </h2>

            {isLoading ? (
              <div className="h-3.5 w-24 bg-slate-100/60 dark:bg-white/5 rounded animate-pulse mt-2 mx-auto" />
            ) : profileOrFallback.professionalTitle ? (
              <p className="mt-1 text-xs font-medium text-text-secondary dark:text-white/60">
                {profileOrFallback.professionalTitle}
              </p>
            ) : null}

            {isLoading ? (
              <div className="h-4 w-20 bg-slate-100/60 dark:bg-white/5 rounded animate-pulse mt-2 mx-auto" />
            ) : profileOrFallback.practitionerType ? (
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary dark:bg-white/5">
                {t(`profile.practitionerType.${profileOrFallback.practitionerType}` as Parameters<typeof t>[0])}
              </span>
            ) : null}

            <div className="mt-3.5 w-full border-t border-slate-100 dark:border-white/5 pt-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">{t("profile.summary.reviewState")}</span>
                {isLoading ? (
                  <span className="h-4 w-16 bg-slate-100/60 dark:bg-white/5 rounded animate-pulse" />
                ) : (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold text-[10px]",
                      currentApplicationStatus === "APPROVED"
                        ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                        : currentApplicationStatus === "UNDER_REVIEW" || currentApplicationStatus === "SUBMITTED"
                          ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                          : "bg-surface-tertiary text-text-secondary"
                    )}
                  >
                    {applicationStatusLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">{t("profile.summary.readiness")}</span>
                {isLoading ? (
                  <span className="h-4 w-16 bg-slate-100/60 dark:bg-white/5 rounded animate-pulse" />
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1 font-semibold",
                      canSubmitApplication ? "text-success-700 dark:text-success-300" : "text-warning-700 dark:text-warning-300"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", canSubmitApplication ? "bg-success-600" : "bg-warning-600")} />
                    {readinessLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 w-full border-t border-slate-100 dark:border-white/5 pt-3 grid grid-cols-2 gap-1.5 text-center">
              <div className="rounded-lg bg-slate-50/50 p-1.5 dark:bg-white/5">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{t("profile.fields.yearsOfExperience.label")}</p>
                <p className="mt-1 text-sm font-bold text-text-primary dark:text-white/95">
                  {isLoading ? (
                    <span className="block h-4 w-6 bg-slate-100/65 dark:bg-white/5 rounded animate-pulse mx-auto" />
                  ) : (
                    profileOrFallback.yearsOfExperience != null ? profileOrFallback.yearsOfExperience : "-"
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50/50 p-1.5 dark:bg-white/5">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{t("profile.summary.credentials")}</p>
                <p className="mt-1 text-sm font-bold text-text-primary dark:text-white/95">
                  {isLoading ? (
                    <span className="block h-4 w-6 bg-slate-100/65 dark:bg-white/5 rounded animate-pulse mx-auto" />
                  ) : (
                    credentialSummary.totalCredentials
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 w-full space-y-2">
              <Button
                size="sm"
                className="w-full justify-center"
                onClick={openRequestModal}
                disabled={!canRequestChanges}
                startIcon={<FilePenLine className="h-4 w-4" />}
              >
                {currentApplicationStatus === "CHANGES_REQUESTED" || currentApplicationStatus === "REJECTED"
                  ? t("profile.actions.reviseRequest")
                  : t("profile.actions.requestChanges")}
              </Button>
            </div>
          </PractitionerSectionCard>
        </aside>

        {/* Right Column: Tabbed Content */}
        <main className="space-y-4 min-w-0">
          <div className="space-y-4">
            {isLoading ? (
              <PractitionerSectionCard className="p-6">
                <FormSkeleton />
              </PractitionerSectionCard>
            ) : (
              <>
                {/* Tab 1: Overview */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {profileOrFallback.bio && (
                      <PractitionerSectionCard>
                        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <User className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                            {t("profile.fields.bio.label")}
                          </h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-white/80 whitespace-pre-wrap">
                          {profileOrFallback.bio}
                        </p>
                      </PractitionerSectionCard>
                    )}

                    {/* Application Change Request Status Card */}
                    <PractitionerSectionCard className="space-y-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <Info className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                            {t("profile.sections.changeRequest")}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            currentApplicationStatus === "APPROVED"
                              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                              : currentApplicationStatus === "UNDER_REVIEW" || currentApplicationStatus === "SUBMITTED"
                                ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                                : "bg-surface-tertiary text-text-secondary"
                          )}
                        >
                          {applicationStatusLabel}
                        </span>
                      </div>

                      <div className="relative border-s border-slate-150 dark:border-white/10 ms-4 space-y-6 pt-2 pb-2">
                        {/* Submitted */}
                        <div className="relative ps-7">
                          <div className="absolute -start-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10">
                            <div className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">{t("profile.request.submittedAt")}</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white/90 mt-0.5">
                            {formatDateTime(application?.submittedAt ?? null, locale) || t("profile.request.emptyValue")}
                          </p>
                        </div>

                        {/* Reviewed */}
                        <div className="relative ps-7">
                          <div className={cn(
                            "absolute -start-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full border",
                            application?.reviewedAt
                              ? "border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10"
                              : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                          )}>
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              application?.reviewedAt ? "bg-teal-600 dark:bg-teal-400" : "bg-slate-400 dark:bg-white/20"
                            )} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">{t("profile.request.reviewedAt")}</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white/90 mt-0.5">
                            {formatDateTime(application?.reviewedAt ?? null, locale) || t("profile.request.emptyValue")}
                            {application?.reviewedByUserId ? ` (${t("profile.request.reviewedBy")}: ${application.reviewedByUserId})` : ""}
                          </p>
                        </div>

                        {/* Change Summary */}
                        <div className="relative ps-7">
                          <div className="absolute -start-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                            <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-white/20" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">{t("profile.request.changeSummary")}</p>
                          <div className="mt-1.5">
                            {currentRequestChanges.length > 0 ? (
                              <div className="flex flex-wrap gap-2 max-w-2xl">
                                {currentRequestChanges.map((item) => (
                                  <span
                                    key={`${item.label}-${item.value}`}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                                  >
                                    <span className="font-semibold">{item.label}:</span> {item.value}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted">{t("profile.request.noChanges")}</p>
                            )}
                          </div>
                        </div>

                        {/* Admin Note */}
                        {(application?.reviewDecisionReason || application?.reviewNotes) ? (
                          <div className="relative ps-7">
                            <div className="absolute -start-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
                              <div className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">{t("profile.request.adminNote")}</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-amber-900 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-500/5 p-3 rounded-lg border border-amber-200/50 dark:border-amber-500/10 max-w-2xl">
                              {application?.reviewDecisionReason ?? application?.reviewNotes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </PractitionerSectionCard>

                    {/* Readiness Requirements Details */}
                    {!canSubmitApplication && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-5 dark:border-amber-500/30 dark:bg-amber-500/5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-850 dark:bg-amber-500/20 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="space-y-3 flex-1 min-w-0">
                            <div>
                              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                                {t("profile.readiness.notReady")}
                              </h4>
                              <p className="mt-0.5 text-xs text-amber-700/90 dark:text-amber-400/95 leading-normal">
                                {t("profile.readiness.notReadyNote")}
                              </p>
                            </div>
                            {readinessMissingRequirements.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {readinessMissingRequirements.map((item) => (
                                  <span
                                    key={item}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/60 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
                                    {formatReadinessRequirement(item, t)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Personal Details */}
                {activeTab === "personal" && (
                  <PractitionerSectionCard className="space-y-4">
                    <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                        <User className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                        {t("profile.sections.personal")}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                      <InfoRow
                        label={t("profile.fields.displayName.label")}
                        value={profileOrFallback.displayName}
                        icon={<User className="h-3.5 w-3.5" />}
                      />
                      <InfoRow
                        label={t("profile.fields.practitionerGender.label")}
                        value={profileOrFallback.practitionerGender ? t(`profile.practitionerGender.${profileOrFallback.practitionerGender}` as Parameters<typeof t>[0]) : null}
                        icon={<User className="h-3.5 w-3.5" />}
                      />
                      <InfoRow
                        label={t("profile.fields.countryCode.label")}
                        value={profileOrFallback.countryCode}
                        icon={<Globe className="h-3.5 w-3.5" />}
                      />
                      <InfoRow
                        label={t("profile.fields.timezone.label")}
                        value={profileOrFallback.timezone}
                        icon={<Clock className="h-3.5 w-3.5" />}
                      />
                      <InfoRow
                        label={t("profile.fields.locale.label")}
                        value={profileOrFallback.locale ? t(`profile.locale.${profileOrFallback.locale}` as Parameters<typeof t>[0]) : null}
                        icon={<Globe className="h-3.5 w-3.5" />}
                      />
                    </div>
                  </PractitionerSectionCard>
                )}

                {/* Tab 3: Professional & Pricing */}
                {activeTab === "professional" && (
                  <div className="space-y-4">
                    <PractitionerSectionCard className="space-y-4">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                          {t("profile.sections.professional")}
                        </h3>
                      </div>
                      <div className="space-y-0.5">
                        <InfoRow
                          label={t("profile.fields.professionalTitle.label")}
                          value={profileOrFallback.professionalTitle}
                          icon={<Briefcase className="h-3.5 w-3.5" />}
                        />
                        <InfoRow
                          label={t("profile.fields.practitionerType.label") || t("profile.fields.practitionerType")}
                          value={profileOrFallback.practitionerType ? t(`profile.practitionerType.${profileOrFallback.practitionerType}` as Parameters<typeof t>[0]) : null}
                          icon={<User className="h-3.5 w-3.5" />}
                        />
                        <InfoRow
                          label={t("profile.fields.yearsOfExperience.label")}
                          value={profileOrFallback.yearsOfExperience != null ? String(profileOrFallback.yearsOfExperience) : null}
                          icon={<Clock className="h-3.5 w-3.5" />}
                        />
                        <InfoRow
                          label={t("profile.sections.languages") || "Languages"}
                          value={formattedLanguages}
                          icon={<Globe className="h-3.5 w-3.5" />}
                        />
                      </div>
                    </PractitionerSectionCard>

                    <PractitionerSectionCard className="space-y-4">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                          {t("profile.sections.sessionPricing")}
                        </h3>
                      </div>
                      <PractitionerInfoGrid columns={2}>
                        {/* EGP 30m */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 dark:border-white/8 dark:bg-surface-secondary flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                              {locale === "ar" ? "سعر 30 دقيقة (EGP)" : "30-Minute Price (EGP)"}
                            </span>
                            <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 leading-tight">
                              {formatMoneyValue(profileOrFallback.pricing.session30.egp, locale)}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100/50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                        </div>

                        {/* USD 30m */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 dark:border-white/8 dark:bg-surface-secondary flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                              {locale === "ar" ? "سعر 30 دقيقة (USD)" : "30-Minute Price (USD)"}
                            </span>
                            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
                              {formatMoneyValue(profileOrFallback.pricing.session30.usd, locale)}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                        </div>

                        {/* EGP 60m */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 dark:border-white/8 dark:bg-surface-secondary flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                              {locale === "ar" ? "سعر 60 دقيقة (EGP)" : "60-Minute Price (EGP)"}
                            </span>
                            <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 leading-tight">
                              {formatMoneyValue(profileOrFallback.pricing.session60.egp, locale)}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100/50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                        </div>

                        {/* USD 60m */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 dark:border-white/8 dark:bg-surface-secondary flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                              {locale === "ar" ? "سعر 60 دقيقة (USD)" : "60-Minute Price (USD)"}
                            </span>
                            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
                              {formatMoneyValue(profileOrFallback.pricing.session60.usd, locale)}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                        </div>
                      </PractitionerInfoGrid>
                    </PractitionerSectionCard>
                  </div>
                )}

                {/* Tab 4: Payout Details */}
                {activeTab === "payout" && (
                  <PractitionerSectionCard className="space-y-4">
                    <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                        {t("profile.sections.payoutDestination")}
                      </h3>
                    </div>

                    <div className={cn(
                      "p-5 rounded-xl border flex items-start gap-3.5 shadow-sm mb-4 transition-all duration-200",
                      hasPayoutAccountHolderName 
                        ? "bg-slate-50/30 border-slate-200 dark:bg-white/[0.02] dark:border-white/8" 
                        : "border-error-200 bg-error-50/20"
                    )}>
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        hasPayoutAccountHolderName 
                          ? "bg-teal-50 border-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20" 
                          : "bg-error-100 border-error-200 text-error-700"
                      )}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-white/60">
                          {t("profile.fields.payoutMethodType.label")}
                        </p>
                        <p className="text-base font-bold text-slate-900 dark:text-white/95 leading-tight">
                          {payoutSummary}
                        </p>
                        {!hasPayoutAccountHolderName && (
                          <p className="mt-1.5 text-xs text-error-600 font-medium">
                            {t("profile.request.payoutAccountHolderRequired")}
                          </p>
                        )}
                      </div>
                    </div>

                    {!profileOrFallback.payoutDestination?.methodType ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/20 p-4">
                        <p className="text-sm text-text-muted italic">
                          {locale === "ar" ? "لا توجد تفاصيل صرف مضافة بعد." : "No payout details added yet."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <InfoRow
                          label={t("profile.fields.payoutAccountHolderName.label")}
                          value={profileOrFallback.payoutDestination.accountHolderName}
                          icon={<User className="h-3.5 w-3.5" />}
                        />

                        {profileOrFallback.payoutDestination.methodType === "BANK_ACCOUNT" && (
                          <>
                            <InfoRow
                              label={t("profile.fields.payoutBankName.label")}
                              value={profileOrFallback.payoutDestination.bankName}
                              icon={<Briefcase className="h-3.5 w-3.5" />}
                            />
                            <InfoRow
                              label={t("profile.fields.payoutBankAccountNumber.label")}
                              value={profileOrFallback.payoutDestination.bankAccountNumber}
                              icon={<CreditCard className="h-3.5 w-3.5" />}
                            />
                          </>
                        )}

                        {profileOrFallback.payoutDestination.methodType === "IBAN" && (
                          <InfoRow
                            label={t("profile.fields.payoutIban.label")}
                            value={profileOrFallback.payoutDestination.iban}
                            icon={<CreditCard className="h-3.5 w-3.5" />}
                          />
                        )}

                        {profileOrFallback.payoutDestination.methodType === "WALLET" && (
                          <>
                            <InfoRow
                              label={t("profile.fields.payoutWalletProvider.label")}
                              value={profileOrFallback.payoutDestination.walletProvider}
                              icon={<Layers className="h-3.5 w-3.5" />}
                            />
                            <InfoRow
                              label={t("profile.fields.payoutWalletIdentifier.label")}
                              value={profileOrFallback.payoutDestination.walletIdentifier}
                              icon={<Phone className="h-3.5 w-3.5" />}
                            />
                          </>
                        )}

                        {profileOrFallback.payoutDestination.methodType === "OTHER" && (
                          <InfoRow
                            label={t("profile.fields.payoutOtherDetails.label")}
                            value={profileOrFallback.payoutDestination.otherDetails}
                            icon={<FileText className="h-3.5 w-3.5" />}
                          />
                        )}
                      </div>
                    )}
                  </PractitionerSectionCard>
                )}

                {/* Tab 5: Credentials & Specialties */}
                {activeTab === "credentials" && (
                  <div className="space-y-4">
                    <PractitionerSectionCard className="space-y-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <FileText className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                            {t("profile.summary.credentials")}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/${locale}/practitioner/credentials`)}
                        >
                          {t("dashboard.quickLinks.credentials.title")}
                        </Button>
                      </div>

                      <div className="space-y-0.5">
                        <InfoRow
                          label={locale === "ar" ? "إجمالي المؤهلات" : "Total credentials"}
                          value={credentialSummary.totalCredentials}
                          icon={<Layers className="h-3.5 w-3.5" />}
                        />
                        <InfoRow
                          label={locale === "ar" ? "المؤهلات المعتمدة" : "Approved credentials"}
                          value={
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {credentialSummary.approvedCount}
                            </span>
                          }
                          icon={<BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        />
                        <InfoRow
                          label={locale === "ar" ? "المؤهلات قيد المراجعة" : "Pending credentials"}
                          value={
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {credentialSummary.pendingCount}
                            </span>
                          }
                          icon={<Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                        />
                      </div>
                    </PractitionerSectionCard>

                    <PractitionerSectionCard className="space-y-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-150 pb-3 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <Layers className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white/90">
                            {t("profile.sections.specialties")}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(specialtiesHelpRoute)}
                        >
                          {t("profile.actions.openSpecialties")}
                        </Button>
                      </div>

                      <div className={cn(
                        "p-5 rounded-xl border transition-all duration-200", 
                        hasPrimarySpecialty 
                          ? "bg-slate-50/30 border-slate-200 dark:bg-white/[0.01] dark:border-white/8" 
                          : "border-error-200 bg-error-50/20"
                      )}>
                        <div className="flex flex-wrap gap-2">
                          {displaySpecialties.length > 0 ? (
                            displaySpecialties.map((specialty) => (
                              <span
                                key={specialty.specialtyId}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border transition-colors",
                                  specialty.isPrimary
                                    ? "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-500/10 dark:border-teal-500/20 dark:text-teal-300"
                                    : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                                )}
                              >
                                {specialty.isPrimary ? (
                                  <Sparkles className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
                                ) : null}
                                <span>{specialty.title ?? specialty.slug}</span>
                                {specialty.isPrimary ? (
                                  <span className="text-[10px] opacity-75 font-medium">({t("profile.specialties.primary")})</span>
                                ) : null}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-text-muted italic">{t("profile.specialties.empty")}</span>
                          )}
                        </div>

                        {!hasPrimarySpecialty && (
                          <p className="mt-2 text-xs text-error-600 font-medium">{t("profile.request.primarySpecialtyRequired")}</p>
                        )}
                      </div>
                    </PractitionerSectionCard>
                  </div>
                )}

                {/* Tab 6: Availability & Packages */}
                {activeTab === "availability" && (
                  <PractitionerSectionCard className="space-y-4 text-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 mx-auto mb-2">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary dark:text-white/95">
                      {locale === "ar" ? "إدارة مواعيد الجدولة والباقات" : "Manage Schedule & Packages"}
                    </h3>
                    <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                      {locale === "ar"
                        ? "يمكنك إعداد الأوقات المتاحة وحضورك وتفعيل باقات الجلسات من خلال لوحة الجدولة المخصصة."
                        : "You can manage your weekly schedule, presence, and session packages in the dedicated scheduling page."}
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => router.push(`/${locale}/practitioner/availability`)}
                        startIcon={<Calendar className="h-4 w-4" />}
                      >
                        {locale === "ar" ? "الذهاب إلى التوفر" : "Go to Availability"}
                      </Button>
                    </div>
                  </PractitionerSectionCard>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      </PractitionerSectionCard>

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
                  <select
                    id="payoutBankName"
                    className={`${selectClasses} ${
                      errors.payoutBankName || payoutValidation.bankNameError
                        ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
                        : ""
                    }`}
                    aria-invalid={Boolean(errors.payoutBankName || payoutValidation.bankNameError)}
                    {...register("payoutBankName")}
                  >
                    <option value="">{t("profile.fields.payoutBankName.placeholder")}</option>
                    {payoutBankOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="payoutWalletProvider"
                    className={`${selectClasses} ${
                      errors.payoutWalletProvider || payoutValidation.walletProviderError
                        ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
                        : ""
                    }`}
                    aria-invalid={Boolean(errors.payoutWalletProvider || payoutValidation.walletProviderError)}
                    {...register("payoutWalletProvider")}
                  >
                    <option value="">{t("profile.fields.payoutWalletProvider.placeholder")}</option>
                    {payoutWalletProviderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                  ) : profile?.avatarUrl ? (
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
                      disabled={!profile?.avatarUrl && avatarDraft.mode === "keep"}
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
