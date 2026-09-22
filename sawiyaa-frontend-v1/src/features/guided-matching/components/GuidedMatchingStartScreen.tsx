"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";
import { getLocalizedLanguageOptions } from "@/constants/reference-data";
import { useCreateMatchingSession } from "../hooks/use-guided-matching";
import type {
  CreateMatchingSessionRequest,
  MatchingPractitionerType,
  MatchingSessionMode,
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from "../types/guided-matching.types";
import {
  AlertCircle,
  Apple,
  ArrowRight,
  Baby,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  CircleHelp,
  Clock3,
  Flame,
  HandHeart,
  HeartHandshake,
  Languages,
  Leaf,
  Loader2,
  Lock,
  Mars,
  Minus,
  MonitorPlay,
  MoonStar,
  PhoneCall,
  Rocket,
  Search,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  Venus,
  Video,
  Wallet,
  Zap,
} from "lucide-react";

type GuidedMatchingStartScreenProps = {
  specialties: Specialty[];
};

type FormValues = {
  preferredSpecialtyCategorySlug: string;
  preferredSpecialtySlug: string;
  preferredProviderType: MatchingPractitionerType | "ANY" | "";
  preferredPractitionerGender: PractitionerGenderPreference | "";
  preferredLanguage: string;
  sessionMode: MatchingSessionMode | "ANY" | "";
  urgency: MatchingUrgencyPreference | "";
  budgetMin: string;
  budgetMax: string;
  primaryConcern: string;
  firstTimeInTherapy: "yes" | "no" | "";
  preferInstantBooking: boolean;
};

type StepKey =
  | "specialtyCategory"
  | "specialty"
  | "providerType"
  | "gender"
  | "language"
  | "sessionMode"
  | "urgency"
  | "details";

const stepOrder: StepKey[] = [
  "specialtyCategory",
  "specialty",
  "providerType",
  "gender",
  "language",
  "sessionMode",
  "urgency",
  "details",
];

const budgetQuickValues = [200, 350, 500, 800, 1200];

const commonConcernChips = [
  "قلق وتوتر",
  "ضغوط العمل والحياة",
  "صعوبة في النوم والأرق",
  "استشارة أسرية وزوجية",
  "حزن وتقلبات مزاجية",
  "تطوير الذات والثقة",
  "تغذية صحية وإنقاص الوزن",
  "مشاكل العلاقات والتواصل",
];

function ChoiceCard({
  title,
  subtitle,
  selected,
  onClick,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "blue" | "cyan" | "teal" | "violet" | "amber" | "rose" | "emerald" | "slate" | "indigo";
}) {
  const toneClasses: Record<
    NonNullable<typeof tone>,
    {
      selected: string;
      unselectedIcon: string;
      selectedIcon: string;
      badgeText: string;
    }
  > = {
    blue: {
      selected: "border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent ring-2 ring-primary/25",
      unselectedIcon: "bg-blue-50 text-primary dark:bg-blue-950/40 dark:text-blue-300",
      selectedIcon: "bg-primary text-white shadow-xs",
      badgeText: "text-primary",
    },
    cyan: {
      selected: "border-cyan-500 bg-linear-to-br from-cyan-500/10 via-cyan-500/5 to-transparent ring-2 ring-cyan-500/25",
      unselectedIcon: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300",
      selectedIcon: "bg-cyan-500 text-white shadow-xs",
      badgeText: "text-cyan-600 dark:text-cyan-300",
    },
    teal: {
      selected: "border-teal-500 bg-linear-to-br from-teal-500/10 via-teal-500/5 to-transparent ring-2 ring-teal-500/25",
      unselectedIcon: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300",
      selectedIcon: "bg-teal-500 text-white shadow-xs",
      badgeText: "text-teal-600 dark:text-teal-300",
    },
    violet: {
      selected: "border-violet-500 bg-linear-to-br from-violet-500/10 via-violet-500/5 to-transparent ring-2 ring-violet-500/25",
      unselectedIcon: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
      selectedIcon: "bg-violet-500 text-white shadow-xs",
      badgeText: "text-violet-600 dark:text-violet-300",
    },
    amber: {
      selected: "border-amber-500 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent ring-2 ring-amber-500/25",
      unselectedIcon: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
      selectedIcon: "bg-amber-500 text-white shadow-xs",
      badgeText: "text-amber-600 dark:text-amber-300",
    },
    rose: {
      selected: "border-rose-500 bg-linear-to-br from-rose-500/10 via-rose-500/5 to-transparent ring-2 ring-rose-500/25",
      unselectedIcon: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
      selectedIcon: "bg-rose-500 text-white shadow-xs",
      badgeText: "text-rose-600 dark:text-rose-300",
    },
    emerald: {
      selected: "border-emerald-500 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent ring-2 ring-emerald-500/25",
      unselectedIcon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
      selectedIcon: "bg-emerald-500 text-white shadow-xs",
      badgeText: "text-emerald-600 dark:text-emerald-300",
    },
    slate: {
      selected: "border-slate-500 bg-linear-to-br from-slate-500/10 via-slate-500/5 to-transparent ring-2 ring-slate-500/25",
      unselectedIcon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      selectedIcon: "bg-slate-700 text-white shadow-xs",
      badgeText: "text-slate-600 dark:text-slate-300",
    },
    indigo: {
      selected: "border-indigo-500 bg-linear-to-br from-indigo-500/10 via-indigo-500/5 to-transparent ring-2 ring-indigo-500/25",
      unselectedIcon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
      selectedIcon: "bg-indigo-500 text-white shadow-xs",
      badgeText: "text-indigo-600 dark:text-indigo-300",
    },
  };

  const palette = toneClasses[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center justify-between gap-3.5 rounded-2xl border p-4 text-start transition-all duration-200 cursor-pointer ${
        selected
          ? `${palette.selected} shadow-sm`
          : "border-border-light/80 bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-tertiary/50 hover:shadow-xs dark:bg-surface-secondary dark:border-border-dark"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon ? (
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
              selected ? palette.selectedIcon : palette.unselectedIcon
            }`}
          >
            <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          </span>
        ) : null}

        <div className="min-w-0">
          <p
            className={`text-sm font-bold transition-colors ${
              selected
                ? "text-text-primary dark:text-white"
                : "text-text-primary group-hover:text-primary dark:text-white/90"
            }`}
          >
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-text-secondary dark:text-text-muted line-clamp-1">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Radio Circle Indicator */}
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          selected
            ? "border-primary bg-primary text-white scale-110 shadow-xs"
            : "border-border-strong/70 text-transparent group-hover:border-primary/50"
        }`}
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
    </button>
  );
}

function hashToken(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const dynamicTones: Array<"blue" | "cyan" | "teal" | "violet" | "amber" | "rose" | "emerald" | "indigo"> = [
  "violet",
  "teal",
  "amber",
  "rose",
  "cyan",
  "emerald",
  "indigo",
  "blue",
];

const dynamicIcons = [
  Brain,
  HeartHandshake,
  MoonStar,
  Flame,
  UsersRound,
  Baby,
  Leaf,
  UtensilsCrossed,
  ShieldCheck,
  BriefcaseBusiness,
  SearchCheck,
  Sparkles,
  HandHeart,
];

export default function GuidedMatchingStartScreen({ specialties }: GuidedMatchingStartScreenProps) {
  const t = useTranslations("guided-matching");
  const locale = useLocale();
  const router = useRouter();
  const createSession = useCreateMatchingSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          preferredSpecialtyCategorySlug: z.string(),
          preferredSpecialtySlug: z.string(),
          preferredProviderType: z.string(),
          preferredPractitionerGender: z.string(),
          preferredLanguage: z.string(),
          sessionMode: z.string(),
          urgency: z.string(),
          budgetMin: z.string(),
          budgetMax: z.string(),
          primaryConcern: z.string().max(200, t("validation.primaryConcernMax")),
          firstTimeInTherapy: z.enum(["", "yes", "no"]),
          preferInstantBooking: z.boolean(),
        })
        .superRefine((values, ctx) => {
          const min = values.budgetMin.trim() === "" ? null : Number(values.budgetMin.trim());
          const max = values.budgetMax.trim() === "" ? null : Number(values.budgetMax.trim());

          if (min !== null && (!Number.isInteger(min) || min < 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["budgetMin"],
              message: t("validation.budgetMin"),
            });
          }

          if (max !== null && (!Number.isInteger(max) || max < 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["budgetMax"],
              message: t("validation.budgetMax"),
            });
          }

          if (min !== null && max !== null && max < min) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["budgetMax"],
              message: t("validation.budgetOrder"),
            });
          }
        }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      preferredSpecialtyCategorySlug: "",
      preferredSpecialtySlug: "",
      preferredProviderType: "",
      preferredPractitionerGender: "",
      preferredLanguage: "",
      sessionMode: "",
      urgency: "",
      budgetMin: "",
      budgetMax: "",
      primaryConcern: "",
      firstTimeInTherapy: "",
      preferInstantBooking: false,
    },
  });

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          specialties
            .filter((item) => item.isActive && item.category)
            .map((item) => [
              item.category!.slug,
              {
                slug: item.category!.slug,
                title: getLocalizedSpecialtyCategoryName(item.category!, locale),
              },
            ]),
        ).values(),
      ),
    [locale, specialties],
  );

  const specialtyOptions = useMemo(
    () =>
      specialties
        .filter((item) => item.isActive)
        .map((item) => ({
          slug: item.slug,
          title: getLocalizedSpecialtyName(item, locale),
          categorySlug: item.category?.slug ?? "",
          categoryTitle: item.category
            ? getLocalizedSpecialtyCategoryName(item.category, locale)
            : "",
        })),
    [locale, specialties],
  );

  const selectedCategory = useWatch({
    control: form.control,
    name: "preferredSpecialtyCategorySlug",
  });
  const selectedSpecialty = useWatch({
    control: form.control,
    name: "preferredSpecialtySlug",
  });
  const selectedProviderType = useWatch({
    control: form.control,
    name: "preferredProviderType",
  });
  const selectedGender = useWatch({
    control: form.control,
    name: "preferredPractitionerGender",
  });
  const selectedLanguage = useWatch({
    control: form.control,
    name: "preferredLanguage",
  });
  const selectedMode = useWatch({
    control: form.control,
    name: "sessionMode",
  });
  const selectedUrgency = useWatch({
    control: form.control,
    name: "urgency",
  });
  const selectedFirstTime = useWatch({
    control: form.control,
    name: "firstTimeInTherapy",
  });
  const currentConcernText = useWatch({
    control: form.control,
    name: "primaryConcern",
  });

  const selectedSpecialtyLabel =
    specialtyOptions.find((item) => item.slug === selectedSpecialty)?.title ?? undefined;

  const filteredSpecialties = useMemo(() => {
    let list = specialtyOptions.filter((item) =>
      selectedCategory ? item.categorySlug === selectedCategory : true,
    );
    if (specialtySearch.trim()) {
      const q = specialtySearch.trim().toLowerCase();
      list = list.filter((item) => item.title.toLowerCase().includes(q));
    }
    return list;
  }, [specialtyOptions, selectedCategory, specialtySearch]);

  const currentStep = stepOrder[stepIndex];
  const progressPercent = Math.round(((stepIndex + 1) / stepOrder.length) * 100);

  const stepMeta: Record<
    StepKey,
    {
      icon: React.ComponentType<{ className?: string }>;
      colorClass: string;
      glowClass: string;
    }
  > = {
    specialtyCategory: {
      icon: Brain,
      colorClass: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
      glowClass: "from-violet-500/10 to-indigo-500/5",
    },
    specialty: {
      icon: CircleHelp,
      colorClass: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
      glowClass: "from-teal-500/10 to-emerald-500/5",
    },
    providerType: {
      icon: Stethoscope,
      colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      glowClass: "from-blue-500/10 to-cyan-500/5",
    },
    gender: {
      icon: UserRound,
      colorClass: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      glowClass: "from-rose-500/10 to-pink-500/5",
    },
    language: {
      icon: Languages,
      colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      glowClass: "from-amber-500/10 to-orange-500/5",
    },
    sessionMode: {
      icon: Video,
      colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      glowClass: "from-emerald-500/10 to-teal-500/5",
    },
    urgency: {
      icon: Clock3,
      colorClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
      glowClass: "from-indigo-500/10 to-violet-500/5",
    },
    details: {
      icon: Sparkles,
      colorClass: "bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light",
      glowClass: "from-primary/10 to-teal-500/5",
    },
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || currentStep !== "details") {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      event.preventDefault();
    }
  };

  const requiredFieldByStep: Record<Exclude<StepKey, "details">, keyof FormValues> = {
    specialtyCategory: "preferredSpecialtyCategorySlug",
    specialty: "preferredSpecialtySlug",
    providerType: "preferredProviderType",
    gender: "preferredPractitionerGender",
    language: "preferredLanguage",
    sessionMode: "sessionMode",
    urgency: "urgency",
  };

  const nextStep = async () => {
    setStepError(null);
    setSubmitError(null);
    if (currentStep !== "details") {
      const field = requiredFieldByStep[currentStep];
      const value = form.getValues(field);
      if (!value || String(value).trim().length === 0) {
        setStepError(t("validation.stepRequired"));
        return;
      }
    }
    const valid = await form.trigger();
    if (!valid) return;
    setStepIndex((value) => Math.min(value + 1, stepOrder.length - 1));
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const payload: CreateMatchingSessionRequest = {
      primaryConcern: values.primaryConcern.trim() || selectedSpecialtyLabel,
      preferredSpecialtySlug: values.preferredSpecialtySlug || undefined,
      preferredLanguage: values.preferredLanguage === "ANY" ? undefined : values.preferredLanguage,
      preferredPractitionerGender: (values.preferredPractitionerGender || "ANY") as PractitionerGenderPreference,
      sessionMode: values.sessionMode === "ANY" ? undefined : (values.sessionMode as MatchingSessionMode),
      urgency: values.urgency as MatchingUrgencyPreference,
      budgetRange:
        values.budgetMin.trim() || values.budgetMax.trim()
          ? {
              min: values.budgetMin.trim() ? Number(values.budgetMin.trim()) : undefined,
              max: values.budgetMax.trim() ? Number(values.budgetMax.trim()) : undefined,
            }
          : undefined,
      firstTimeInTherapy: values.firstTimeInTherapy === "" ? undefined : values.firstTimeInTherapy === "yes",
      preferredProviderType:
        values.preferredProviderType && values.preferredProviderType !== "ANY"
          ? (values.preferredProviderType as MatchingPractitionerType)
          : undefined,
      preferInstantBooking: values.preferInstantBooking || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
    };

    try {
      const session = await createSession.mutateAsync(payload);
      router.push(`/patient/matching/${session.sessionId}`);
      router.refresh();
    } catch {
      setSubmitError(t("states.submitError"));
    }
  };

  const handleFinalize = form.handleSubmit(onSubmit);
  const CurrentIcon = stepMeta[currentStep].icon;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-4 sm:py-6">
      {/* Top Header & Progress */}
      <section className="rounded-3xl border border-border-light/80 bg-white p-4 sm:p-5 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("journey.title")}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <span className="rounded-md bg-surface-tertiary px-2 py-0.5 dark:bg-surface-tertiary">
              {t("journey.stepCounter", { current: stepIndex + 1, total: stepOrder.length })}
            </span>
            <span className="text-primary font-mono">{progressPercent}%</span>
          </div>
        </div>

        {/* Dynamic Gradient Progress Bar */}
        <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary via-teal-500 to-emerald-400 transition-all duration-500 shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Main Interactive Wizard Step Box */}
      <form onKeyDown={handleFormKeyDown} className="space-y-4">
        <section
          className={`relative overflow-hidden rounded-3xl border border-border-light/80 bg-white p-5 sm:p-8 shadow-xs transition-all dark:bg-surface-secondary dark:border-border-dark bg-linear-to-b ${stepMeta[currentStep].glowClass}`}
        >
          {/* Central Question Hero */}
          <div className="mx-auto mb-7 max-w-2xl text-center space-y-3">
            <div className="inline-flex">
              <span
                className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 hover:scale-105 ${stepMeta[currentStep].colorClass}`}
              >
                <CurrentIcon className="h-8 w-8" />
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
              {t(`flow.${currentStep}.title`)}
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted">
              {t(`flow.${currentStep}.subtitle`)}
            </p>
          </div>

          {/* STEP 1: Specialty Category */}
          {currentStep === "specialtyCategory" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((item) => {
                const seed = hashToken(item.slug);
                const DynamicIcon = dynamicIcons[seed % dynamicIcons.length];
                const tone = dynamicTones[seed % dynamicTones.length];
                return (
                  <ChoiceCard
                    key={item.slug}
                    title={item.title}
                    subtitle={t("flow.specialtyCategory.optionSubtitle")}
                    selected={selectedCategory === item.slug}
                    onClick={() => {
                      form.setValue("preferredSpecialtyCategorySlug", item.slug);
                      form.setValue("preferredSpecialtySlug", "");
                      setStepError(null);
                    }}
                    icon={DynamicIcon}
                    tone={tone}
                  />
                );
              })}
            </div>
          )}

          {/* STEP 2: Specialty Sub-Category */}
          {currentStep === "specialty" && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary-light/40 px-3.5 py-2.5 text-xs text-primary dark:bg-primary/10">
                <span className="font-semibold">
                  {selectedCategory
                    ? t("flow.specialty.selectedCategoryReady")
                    : t("flow.specialty.selectCategoryFirst")}
                </span>

                {specialtyOptions.length > 6 ? (
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                    <input
                      type="text"
                      value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      placeholder="تصفية التخصصات..."
                      className="w-full rounded-lg border border-border-light bg-white py-1 ps-8 pe-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-hidden dark:bg-surface-secondary dark:border-border-dark"
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredSpecialties.map((item) => {
                  const seed = hashToken(item.slug);
                  const DynamicIcon = dynamicIcons[seed % dynamicIcons.length];
                  const tone = dynamicTones[seed % dynamicTones.length];
                  return (
                    <ChoiceCard
                      key={item.slug}
                      title={item.title}
                      subtitle={item.categoryTitle}
                      selected={selectedSpecialty === item.slug}
                      onClick={() => {
                        form.setValue("preferredSpecialtySlug", item.slug);
                        setStepError(null);
                      }}
                      icon={DynamicIcon}
                      tone={tone}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Provider Type */}
          {currentStep === "providerType" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "PSYCHOLOGIST", icon: Brain, tone: "violet" as const, subtitle: "جلسات علاج نفسي وتعديل سلوك" },
                { value: "PSYCHIATRIST", icon: Stethoscope, tone: "blue" as const, subtitle: "تقييم طبي وتشخيص وعلاج دوائي" },
                { value: "COUNSELOR", icon: UserRoundCheck, tone: "teal" as const, subtitle: "استشارات أسرية ونفسية وتوجيه" },
                { value: "NUTRITIONIST", icon: Apple, tone: "emerald" as const, subtitle: "تغذية علاجية ونمط حياة صحي" },
                { value: "OTHER", icon: Sparkles, tone: "amber" as const, subtitle: "تخصصات دعم وتأهيل أخرى" },
                { value: "ANY", icon: CircleDashed, tone: "slate" as const, subtitle: "أفضل مختص متاح يطابق احتياجي" },
              ].map(({ value, icon, tone, subtitle }) => (
                <ChoiceCard
                  key={value}
                  title={t(`choices.provider.${value}`)}
                  subtitle={subtitle}
                  selected={selectedProviderType === value}
                  onClick={() => {
                    form.setValue("preferredProviderType", value as FormValues["preferredProviderType"]);
                    setStepError(null);
                  }}
                  icon={icon}
                  tone={tone}
                />
              ))}
            </div>
          )}

          {/* STEP 4: Gender Preference */}
          {currentStep === "gender" && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "MALE", icon: Mars, tone: "blue" as const, subtitle: "أخصائي / معالج" },
                { value: "FEMALE", icon: Venus, tone: "rose" as const, subtitle: "أخصائية / معالجة" },
                { value: "ANY", icon: Minus, tone: "slate" as const, subtitle: "لا يوجد تفضيل محدد" },
              ].map(({ value, icon, tone, subtitle }) => (
                <ChoiceCard
                  key={value}
                  title={t(`choices.gender.${value}`)}
                  subtitle={subtitle}
                  selected={selectedGender === value}
                  onClick={() => {
                    form.setValue("preferredPractitionerGender", value as FormValues["preferredPractitionerGender"]);
                    setStepError(null);
                  }}
                  icon={icon}
                  tone={tone}
                />
              ))}
            </div>
          )}

          {/* STEP 5: Language */}
          {currentStep === "language" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ...getLocalizedLanguageOptions(locale).map((option, index) => ({
                  value: option.value,
                  title: option.text,
                  tone: (["emerald", "blue", "violet", "amber", "rose", "teal", "cyan"] as const)[index],
                })),
                { value: "ANY", title: locale === "ar" ? "أي لغة" : "Any language", tone: "slate" as const },
              ].map(({ value, title, tone }) => (
                <ChoiceCard
                  key={value}
                  title={title}
                  selected={selectedLanguage === value}
                  onClick={() => {
                    form.setValue("preferredLanguage", value);
                    setStepError(null);
                  }}
                  icon={Languages}
                  tone={tone}
                />
              ))}
            </div>
          )}

          {/* STEP 6: Session Mode */}
          {currentStep === "sessionMode" && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "VIDEO", icon: MonitorPlay, tone: "cyan" as const, subtitle: "محادثة مرئية مباشرة عبر المنصة" },
                { value: "AUDIO", icon: PhoneCall, tone: "teal" as const, subtitle: "مكالمة صوتية خاصة عبر المنصة" },
                { value: "ANY", icon: CircleDashed, tone: "slate" as const, subtitle: "مرن بحسب المتاح" },
              ].map(({ value, icon, tone, subtitle }) => (
                <ChoiceCard
                  key={value}
                  title={t(`choices.mode.${value}`)}
                  subtitle={subtitle}
                  selected={selectedMode === value}
                  onClick={() => {
                    form.setValue("sessionMode", value as FormValues["sessionMode"]);
                    setStepError(null);
                  }}
                  icon={icon}
                  tone={tone}
                />
              ))}
            </div>
          )}

          {/* STEP 7: Urgency */}
          {currentStep === "urgency" && (
            <div className="space-y-3">
              {[
                { value: "FLEXIBLE", icon: CalendarClock, tone: "blue" as const },
                { value: "EARLIEST_AVAILABLE", icon: Clock3, tone: "amber" as const },
                { value: "AVAILABLE_NOW", icon: Zap, tone: "rose" as const },
              ].map(({ value, icon, tone }) => (
                <ChoiceCard
                  key={value}
                  title={t(`choices.urgency.${value}.title`)}
                  subtitle={t(`choices.urgency.${value}.note`)}
                  selected={selectedUrgency === value}
                  onClick={() => {
                    form.setValue("urgency", value as FormValues["urgency"]);
                    setStepError(null);
                  }}
                  icon={icon}
                  tone={tone}
                />
              ))}
            </div>
          )}

          {/* STEP 8: Details & Budget */}
          {currentStep === "details" && (
            <div className="space-y-5">
              {/* Quick Concern Tags */}
              <div className="space-y-2">
                <Label>ما أكثر ما يشغلك حالياً؟ (اضغط لإضافة السبب سريعاً)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {commonConcernChips.map((chip) => {
                    const isIncluded = currentConcernText.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const current = form.getValues("primaryConcern") || "";
                          if (!current.includes(chip)) {
                            const updated = current.trim() ? `${current}، ${chip}` : chip;
                            form.setValue("primaryConcern", updated.slice(0, 190));
                          }
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          isIncluded
                            ? "border-primary bg-primary text-white shadow-xs"
                            : "border-border-light bg-surface-tertiary text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
                        }`}
                      >
                        + {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Textarea */}
              <Controller
                control={form.control}
                name="primaryConcern"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label>{t("flow.details.noteLabel")}</Label>
                    <TextArea
                      rows={3}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("flow.details.notePlaceholder")}
                    />
                  </div>
                )}
              />

              {/* Budget Controls */}
              <div className="space-y-2.5 rounded-2xl border border-border-light/80 bg-surface-tertiary/40 p-4 dark:bg-surface-secondary/40 dark:border-border-dark">
                <div className="flex items-center justify-between">
                  <Label>نطاق ميزانية الجلسة (ج.م)</Label>
                  <span className="text-[11px] text-text-muted">اختياري</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      inputMode="numeric"
                      placeholder={t("flow.details.budgetMinPlaceholder")}
                      {...form.register("budgetMin")}
                      error={Boolean(form.formState.errors.budgetMin)}
                    />
                    {form.formState.errors.budgetMin?.message ? (
                      <p className="mt-1 text-xs text-error-500">
                        {form.formState.errors.budgetMin.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      inputMode="numeric"
                      placeholder={t("flow.details.budgetMaxPlaceholder")}
                      {...form.register("budgetMax")}
                      error={Boolean(form.formState.errors.budgetMax)}
                    />
                    {form.formState.errors.budgetMax?.message ? (
                      <p className="mt-1 text-xs text-error-500">
                        {form.formState.errors.budgetMax.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Quick Budget Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-text-muted">خيارات سريعة:</span>
                  {budgetQuickValues.map((value) => (
                    <button
                      key={`budget-max-${value}`}
                      type="button"
                      onClick={() => {
                        form.setValue("budgetMax", String(value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      className="rounded-lg border border-border-light bg-white px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary transition cursor-pointer dark:bg-surface-secondary dark:border-border-dark"
                    >
                      حتى {value} ج.م
                    </button>
                  ))}
                </div>
              </div>

              {/* Therapy Experience Question */}
              <div className="space-y-2">
                <Label>هل خضت تجربة استشارية من قبل؟</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    title={t("flow.details.firstTimeYes")}
                    subtitle="سنقترح عليك مختصين لديهم أسلوب تمهيدي سلس"
                    selected={selectedFirstTime === "yes"}
                    onClick={() => form.setValue("firstTimeInTherapy", "yes")}
                    icon={Sparkles}
                    tone="emerald"
                  />
                  <ChoiceCard
                    title={t("flow.details.firstTimeNo")}
                    subtitle="لديك دراية بطبيعة الجلسات وأهدافك"
                    selected={selectedFirstTime === "no"}
                    onClick={() => form.setValue("firstTimeInTherapy", "no")}
                    icon={CircleHelp}
                    tone="slate"
                  />
                </div>
              </div>

              {/* Instant Booking Toggle */}
              <div className="rounded-2xl border border-primary/20 bg-primary-light/30 p-4 dark:bg-primary/10 dark:border-primary/25">
                <Controller
                  control={form.control}
                  name="preferInstantBooking"
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Checkbox
                          checked={field.value}
                          onChange={field.onChange}
                          label=""
                        />
                      </div>
                      <div
                        className="cursor-pointer select-none"
                        onClick={() => field.onChange(!field.value)}
                      >
                        <div className="flex items-center gap-1.5">
                          <Rocket className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-text-primary dark:text-white">
                            {t("flow.details.instantBooking")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-text-secondary dark:text-text-muted">
                          {t("flow.details.instantBookingHint")}
                        </p>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step Validation Error */}
          {stepError ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{stepError}</span>
            </div>
          ) : null}
        </section>

        {submitError ? (
          <div className="flex items-center gap-2 rounded-2xl border border-error-200 bg-error-50 p-4 text-xs font-semibold text-error-600 dark:bg-error-950/40 dark:border-error-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}

        {/* Sticky Floating Footer Bar */}
        <section className="sticky bottom-4 sm:bottom-6 z-20 rounded-2xl border border-border-light/80 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:bg-surface-secondary/90 dark:border-border-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>إجاباتك سرية ومحمية 100% لتوصيلك بالمختص الأنسب.</span>
            </div>

            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-4 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>{t("actions.back")}</span>
                </button>
              ) : null}

              {stepIndex < stepOrder.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98] cursor-pointer"
                >
                  <span>{t("actions.next")}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={createSession.isPending}
                  onClick={() => {
                    void handleFinalize();
                  }}
                  className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-teal-600 px-6 text-xs font-bold text-white shadow-md transition hover:from-primary-hover hover:to-teal-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {createSession.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("actions.submitting")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>عرض أفضل المختصين لك</span>
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

