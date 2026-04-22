"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import { useCreateMatchingSession } from "../hooks/use-guided-matching";
import type {
  CreateMatchingSessionRequest,
  MatchingPractitionerType,
  MatchingSessionMode,
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from "../types/guided-matching.types";
import {
  Apple,
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
  Mars,
  Minus,
  MonitorPlay,
  MoonStar,
  PhoneCall,
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
  tone?: "blue" | "cyan" | "teal" | "violet" | "amber" | "rose" | "emerald" | "slate";
}) {
  const toneClasses: Record<
    NonNullable<typeof tone>,
    { selected: string; icon: string; iconText: string }
  > = {
    blue: {
      selected: "border-primary/35 bg-primary-light",
      icon: "bg-primary-light",
      iconText: "text-text-brand",
    },
    cyan: {
      selected: "border-primary/30 bg-primary-light/85",
      icon: "bg-accent",
      iconText: "text-text-brand",
    },
    teal: {
      selected: "border-teal-300 bg-teal-50/70",
      icon: "bg-teal-100",
      iconText: "text-teal-600",
    },
    violet: {
      selected: "border-violet-300 bg-violet-50/70",
      icon: "bg-violet-100",
      iconText: "text-violet-600",
    },
    amber: {
      selected: "border-amber-300 bg-amber-50/70",
      icon: "bg-amber-100",
      iconText: "text-amber-600",
    },
    rose: {
      selected: "border-rose-300 bg-rose-50/70",
      icon: "bg-rose-100",
      iconText: "text-rose-600",
    },
    emerald: {
      selected: "border-emerald-300 bg-emerald-50/70",
      icon: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    slate: {
      selected: "border-slate-300 bg-slate-50/70",
      icon: "bg-slate-100",
      iconText: "text-slate-600",
    },
  };
  const palette = toneClasses[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected
          ? palette.selected
          : "border-border-light bg-white hover:border-primary/35 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${palette.icon} ${palette.iconText}`}
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
            {subtitle ? <p className="mt-1 text-xs text-text-secondary">{subtitle}</p> : null}
          </div>
        </div>
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-primary bg-primary text-white" : "border-border-strong text-transparent"
          }`}
        >
          <Check className="h-3 w-3" />
        </span>
      </div>
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

const dynamicTones: Array<"blue" | "cyan" | "teal" | "violet" | "amber" | "rose" | "emerald"> = [
  "blue",
  "cyan",
  "teal",
  "violet",
  "amber",
  "rose",
  "emerald",
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
  const router = useRouter();
  const createSession = useCreateMatchingSession();
  const [stepIndex, setStepIndex] = useState(0);
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
            .map((item) => [item.category!.slug, { slug: item.category!.slug, title: item.category!.name }]),
        ).values(),
      ),
    [specialties],
  );

  const specialtyOptions = useMemo(
    () =>
      specialties
        .filter((item) => item.isActive)
        .map((item) => ({
          slug: item.slug,
          title: item.name ?? item.slug,
          categorySlug: item.category?.slug ?? "",
          categoryTitle: item.category?.name ?? "",
        })),
    [specialties],
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
  const selectedSpecialtyLabel =
    specialtyOptions.find((item) => item.slug === selectedSpecialty)?.title ?? undefined;

  const specialtyByCategory = specialtyOptions.filter((item) =>
    selectedCategory ? item.categorySlug === selectedCategory : true,
  );

  const currentStep = stepOrder[stepIndex];
  const progress = Math.round(((stepIndex + 1) / stepOrder.length) * 100);
  const currentStepIconTone: Record<StepKey, "blue" | "cyan" | "teal" | "violet" | "amber" | "rose" | "emerald" | "slate"> =
    {
      specialtyCategory: "cyan",
      specialty: "blue",
      providerType: "teal",
      gender: "rose",
      language: "violet",
      sessionMode: "emerald",
      urgency: "amber",
      details: "slate",
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

  return (
    <div className="app-max-content mx-auto space-y-4">
      <section className="app-panel rounded-[28px] p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">{t("journey.title")}</p>
          <span className="text-xs text-text-secondary">
            {t("journey.stepCounter", { current: stepIndex + 1, total: stepOrder.length })}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <form onKeyDown={handleFormKeyDown} className="space-y-4">
        <section className="app-panel rounded-[28px] p-4 sm:p-7">
          <div className="mx-auto mb-5 max-w-3xl text-center">
            <span
              className={`mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full ${
                currentStepIconTone[currentStep] === "cyan"
                  ? "bg-accent text-text-brand"
                  : currentStepIconTone[currentStep] === "blue"
                    ? "bg-primary-light text-text-brand"
                    : currentStepIconTone[currentStep] === "teal"
                      ? "bg-teal-100 text-teal-600"
                      : currentStepIconTone[currentStep] === "rose"
                        ? "bg-rose-100 text-rose-600"
                        : currentStepIconTone[currentStep] === "violet"
                          ? "bg-violet-100 text-violet-600"
                          : currentStepIconTone[currentStep] === "emerald"
                            ? "bg-emerald-100 text-emerald-600"
                            : currentStepIconTone[currentStep] === "amber"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-slate-100 text-slate-600"
              }`}
            >
              {currentStep === "specialtyCategory" && <Brain className="h-10 w-10" />}
              {currentStep === "specialty" && <CircleHelp className="h-10 w-10" />}
              {currentStep === "providerType" && <UserRound className="h-10 w-10" />}
              {currentStep === "gender" && <Mars className="h-10 w-10" />}
              {currentStep === "language" && <Languages className="h-10 w-10" />}
              {currentStep === "sessionMode" && <Video className="h-10 w-10" />}
              {currentStep === "urgency" && <Clock3 className="h-10 w-10" />}
              {currentStep === "details" && <Wallet className="h-10 w-10" />}
            </span>
            <h1 className="mt-4 text-2xl font-semibold text-text-primary">{t(`flow.${currentStep}.title`)}</h1>
            <p className="mt-2 text-sm text-text-secondary">{t(`flow.${currentStep}.subtitle`)}</p>
          </div>

          {currentStep === "specialtyCategory" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((item) => (
                (() => {
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
                })()
              ))}
            </div>
          )}

          {currentStep === "specialty" && (
            <div className="space-y-3">
              <p className="rounded-xl border border-border-light bg-primary/5 px-3 py-2 text-xs text-text-secondary">
                {selectedCategory ? t("flow.specialty.selectedCategoryReady") : t("flow.specialty.selectCategoryFirst")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {specialtyByCategory.map((item) => (
                  (() => {
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
                  })()
                ))}
              </div>
            </div>
          )}

          {currentStep === "providerType" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "PSYCHOLOGIST", icon: Brain, tone: "violet" as const },
                { value: "PSYCHIATRIST", icon: Stethoscope, tone: "blue" as const },
                { value: "COUNSELOR", icon: UserRoundCheck, tone: "teal" as const },
                { value: "NUTRITIONIST", icon: Apple, tone: "emerald" as const },
                { value: "OTHER", icon: Sparkles, tone: "amber" as const },
                { value: "ANY", icon: CircleDashed, tone: "slate" as const },
              ].map(({ value, icon, tone }) => (
                  <ChoiceCard
                    key={value}
                    title={t(`choices.provider.${value}`)}
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

          {currentStep === "gender" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "MALE", icon: Mars, tone: "blue" as const },
                { value: "FEMALE", icon: Venus, tone: "rose" as const },
                { value: "ANY", icon: Minus, tone: "slate" as const },
              ].map(({ value, icon, tone }) => (
                  <ChoiceCard
                    key={value}
                    title={t(`choices.gender.${value}`)}
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

          {currentStep === "language" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "ar", tone: "emerald" as const },
                { value: "en", tone: "blue" as const },
                { value: "fr", tone: "violet" as const },
                { value: "ANY", tone: "slate" as const },
              ].map(({ value, tone }) => (
                  <ChoiceCard
                    key={value}
                    title={t(`choices.language.${value}`)}
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

          {currentStep === "sessionMode" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "VIDEO", icon: MonitorPlay, tone: "cyan" as const },
                { value: "AUDIO", icon: PhoneCall, tone: "teal" as const },
                { value: "ANY", icon: CircleDashed, tone: "slate" as const },
              ].map(({ value, icon, tone }) => (
                  <ChoiceCard
                    key={value}
                    title={t(`choices.mode.${value}`)}
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

          {currentStep === "details" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("flow.details.budgetMin")}</Label>
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
                  <Label>{t("flow.details.budgetMax")}</Label>
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
              <div className="flex flex-wrap gap-2">
                {budgetQuickValues.map((value) => (
                  <button
                    key={`budget-min-${value}`}
                    type="button"
                    onClick={() => {
                      form.setValue("budgetMin", String(value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className="app-chip rounded-full px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                  >
                    {t("flow.details.budgetMin")}: {value}
                  </button>
                ))}
              </div>
              <Controller
                control={form.control}
                name="primaryConcern"
                render={({ field }) => (
                  <div>
                    <Label>{t("flow.details.noteLabel")}</Label>
                    <TextArea rows={3} value={field.value} onChange={field.onChange} placeholder={t("flow.details.notePlaceholder")} />
                  </div>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  title={t("flow.details.firstTimeYes")}
                  selected={selectedFirstTime === "yes"}
                  onClick={() => form.setValue("firstTimeInTherapy", "yes")}
                  icon={Sparkles}
                  tone="emerald"
                />
                <ChoiceCard
                  title={t("flow.details.firstTimeNo")}
                  selected={selectedFirstTime === "no"}
                  onClick={() => form.setValue("firstTimeInTherapy", "no")}
                  icon={CircleHelp}
                  tone="slate"
                />
              </div>
              <Controller
                control={form.control}
                name="preferInstantBooking"
                render={({ field }) => (
                  <Checkbox checked={field.value} onChange={field.onChange} label={t("flow.details.instantBooking")} />
                )}
              />
            </div>
          )}

          {stepError ? <p className="mt-4 text-sm text-error-500">{stepError}</p> : null}
        </section>

        {submitError ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
            {submitError}
          </div>
        ) : null}

        <section className="app-panel sticky bottom-20 rounded-[24px] p-4 sm:bottom-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">{t("journey.footer")}</p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {stepIndex > 0 ? (
                <Button type="button" variant="outline" size="sm" startIcon={<ChevronLeft className="h-4 w-4 rtl:rotate-180" />} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
                  {t("actions.back")}
                </Button>
              ) : null}
              {stepIndex < stepOrder.length - 1 ? (
                <Button type="button" size="sm" endIcon={<ChevronRight className="h-4 w-4 rtl:rotate-180" />} onClick={nextStep}>
                  {t("actions.next")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={createSession.isPending}
                  endIcon={createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                  onClick={() => {
                    void handleFinalize();
                  }}
                >
                  {createSession.isPending ? t("actions.submitting") : t("actions.submit")}
                </Button>
              )}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
