"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquareText,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { StateCard } from "@/components/shared/ContentStates";
import { DataTable } from "@/components/ui/data-table";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { useAuthStore } from "@/stores/auth-store";
import {
  getPublicAcademyProgramErrorKey,
} from "@/features/academy-programs/lib/academy-program-errors";
import {
  resolveAcademyProgramDeliveryMethodLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramRegistrationStateLabel,
  resolveAcademyProgramSessionTitle,
} from "@/features/academy-programs/lib/academy-program-localization";
import {
  useCreatePublicAcademyProgramEnrollment,
  usePublicAcademyProgram,
} from "@/features/academy-programs/hooks/use-academy-programs";
import type {
  AcademyProgramEnrollmentItem,
  AcademyProgramItem,
  CreateAcademyProgramEnrollmentInput,
} from "@/features/academy-programs/types/academy-programs.types";
import { PriceDisplay } from "@/components/money/PriceDisplay";
import { tokenManager } from "@/lib/api/http-client";
import { mapAcademyPublicPrice } from "../lib/academy-public-price";

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDurationMinutes(startAt: string, endAt: string, locale: string) {
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
  );

  if (locale === "ar") {
    return `${new Intl.NumberFormat("ar-EG").format(durationMinutes || 60)} دقيقة`;
  }

  return `${durationMinutes || 60} mins`;
}

function resolveProgramTitle(program: AcademyProgramItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: program.titleAr,
      secondary: program.titleEn,
      fallback: program.title ?? program.slug,
    }) || program.slug
  );
}

function resolveProgramDescription(program: AcademyProgramItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: program.descriptionAr,
      secondary: program.descriptionEn,
      fallback: program.description ?? null,
    }) || null
  );
}

function resolvePublicPrice(program: AcademyProgramItem) {
  return mapAcademyPublicPrice({
    priceStatus: program.priceStatus,
    priceAmount: program.priceAmount,
    currencyCode: program.currencyCode,
  });
}

type EnrollmentFeedback = {
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

function buildEnrollmentPaymentHref({
  locale,
  enrollment,
  backHref,
}: {
  locale: string;
  enrollment: AcademyProgramEnrollmentItem;
  backHref?: string;
}) {
  const isPatientSurface = Boolean(backHref && backHref.includes("/patient/academy"));
  const basePath = isPatientSurface
    ? `/${locale}/patient/academy/program-enrollments/${enrollment.id}/pay`
    : `/${locale}/academy/program-enrollments/${enrollment.id}/pay`;
  const tokenQuery = enrollment.publicAccessToken
    ? `?token=${encodeURIComponent(enrollment.publicAccessToken)}`
    : "";
  return `${basePath}${tokenQuery}`;
}

function EnrollmentSavedCard({
  locale,
  t,
  enrollment,
  program,
  backHref,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  enrollment: AcademyProgramEnrollmentItem;
  program: AcademyProgramItem;
  backHref?: string;
}) {
  const price = resolvePublicPrice(program);
  const paymentHref = buildEnrollmentPaymentHref({
    locale,
    enrollment,
    backHref,
  });

  return (
    <div className="rounded-[24px] border border-primary/25 bg-white p-5 shadow-xs sm:p-6 dark:bg-surface-secondary">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>{t("public.result.eyebrow")}</span>
      </div>

      <h2 className="mt-3 text-lg font-bold text-text-primary">
        {t("public.result.title")}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
        {t("public.form.success")}
      </p>

      <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-text-secondary">
            {t("public.detail.summary.price")}
          </span>
          <span className="text-base font-extrabold text-primary">
            <PriceDisplay price={price} />
          </span>
        </div>
      </div>

      <Link
        href={paymentHref}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
      >
        <span>{t("public.result.continuePayment")}</span>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}

function PublicAcademyEnrollmentForm({
  t,
  program,
  onSubmit,
  form,
  setForm,
  pending,
  feedback,
  isRestrictedLearner,
  disableSubmit,
}: {
  t: ReturnType<typeof useTranslations>;
  program: AcademyProgramItem;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  form: CreateAcademyProgramEnrollmentInput;
  setForm: React.Dispatch<React.SetStateAction<CreateAcademyProgramEnrollmentInput>>;
  pending: boolean;
  feedback: EnrollmentFeedback | null;
  isRestrictedLearner: boolean;
  disableSubmit: boolean;
}) {
  const price = resolvePublicPrice(program);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[24px] border border-border-light bg-white p-5 shadow-xs sm:p-6 dark:bg-surface-secondary"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border-light/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("public.form.title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("public.form.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
        <span className="text-xs font-bold text-text-secondary">
          {t("public.detail.summary.price")}
        </span>
        <span className="text-base font-extrabold text-primary">
          <PriceDisplay price={price} />
        </span>
      </div>

      {isRestrictedLearner ? (
        <div className="mt-4 rounded-[16px] border border-error/20 bg-error/5 px-4 py-3 text-xs leading-relaxed text-error-600">
          {t("public.form.restricted")}
        </div>
      ) : null}

      <div className="mt-4 space-y-3.5">
        <Input
          value={form.fullName}
          onChange={(event) =>
            setForm((current) => ({ ...current, fullName: event.target.value }))
          }
          placeholder={t("public.form.fullName")}
          error={Boolean(feedback && !form.fullName.trim())}
          className="w-full"
        />
        <Input
          value={form.phoneNumber}
          onChange={(event) =>
            setForm((current) => ({ ...current, phoneNumber: event.target.value }))
          }
          placeholder={t("public.form.phoneNumber")}
          error={Boolean(feedback && !form.phoneNumber.trim())}
          className="w-full"
        />
        <Input
          value={form.whatsappNumber ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, whatsappNumber: event.target.value }))
          }
          placeholder={t("public.form.whatsappNumber")}
          className="w-full"
        />
        <Input
          type="email"
          value={form.email ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder={t("public.form.email")}
          className="w-full"
        />
      </div>

      {program.registrationOpen ? (
        <Button
          type="submit"
          className="mt-5 w-full rounded-[14px]"
          disabled={pending || disableSubmit}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("public.form.submitting")}
            </>
          ) : (
            t("public.form.submit")
          )}
        </Button>
      ) : (
        <div className="mt-5 rounded-[14px] border border-border-light bg-surface-tertiary px-4 py-3 text-sm font-semibold text-text-secondary">
          {t("public.form.closed")}
        </div>
      )}

      {feedback ? (
        <div className="mt-3 space-y-2 text-xs font-semibold text-error-600">
          <p>{feedback.message}</p>
          {feedback.actionHref && feedback.actionLabel ? (
            <Link
              href={feedback.actionHref}
              className="inline-flex items-center rounded-lg text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              {feedback.actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-border-light/70 pt-4">
        <div className="text-xs font-bold text-text-primary">
          {t("public.detail.howItWorks.title")}
        </div>
        <ol className="mt-2.5 space-y-2 text-xs leading-relaxed text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-[10px] font-bold text-primary">
              1
            </span>
            <span>{t("public.detail.howItWorks.step1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-[10px] font-bold text-primary">
              2
            </span>
            <span>{t("public.detail.howItWorks.step2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-[10px] font-bold text-primary">
              3
            </span>
            <span>{t("public.detail.howItWorks.step3")}</span>
          </li>
        </ol>
      </div>
    </form>
  );
}

function PublicAcademyProgramDetailScreen({
  locale,
  slug,
  backHref,
}: {
  locale: string;
  slug: string;
  backHref?: string;
}) {
  const t = useTranslations("academy");
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const academyBackHref = backHref ?? `/${locale}/academy`;
  const authScopeKey = useMemo(() => {
    if (!isInitialized) {
      return "bootstrapping";
    }

    if (!user) {
      return "guest";
    }

    return `auth:${user.id}:${user.role}`;
  }, [isInitialized, user]);
  const { data: program, isLoading, isError, refetch } = usePublicAcademyProgram(slug, {
    cacheScopeKey: authScopeKey,
  });
  // Public Academy detail remains available to guests. A Zustand snapshot can
  // outlive the browser authentication cookie (and is also rendered on the
  // server), so only ask the protected /users/me endpoint when the browser has
  // a real access-token session. Otherwise its 401 interceptor would redirect
  // a guest away before the public program request can render.
  const hasAuthenticatedBrowserSession =
    typeof window !== "undefined" && tokenManager.isAuthenticated();
  const currentUserQuery = useCurrentUser(Boolean(user && hasAuthenticatedBrowserSession));
  const createEnrollment = useCreatePublicAcademyProgramEnrollment();
  const enrollmentIdempotencyKey = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<EnrollmentFeedback | null>(null);
  const [form, setForm] = useState<CreateAcademyProgramEnrollmentInput>({
    fullName: "",
    phoneNumber: "",
    whatsappNumber: "",
    email: "",
    sourceLabel: "public-academy-program",
  });
  const [enrollment, setEnrollment] = useState<AcademyProgramEnrollmentItem | null>(null);
  const isRestrictedLearner = Boolean(
    currentUserQuery.data?.roles.hasAdminRole ||
      currentUserQuery.data?.roles.hasSupportAgentRole ||
      currentUserQuery.data?.roles.hasContentReviewerRole,
  );

  useEffect(() => {
    if (!user || isRestrictedLearner) {
      return;
    }

    const profileName =
      currentUserQuery.data?.displayName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      null;
    const profilePhone = currentUserQuery.data?.identitySummary.primaryPhone?.trim() || null;
    const profileEmail =
      currentUserQuery.data?.identitySummary.primaryEmail?.trim() ||
      user.email?.trim() ||
      null;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      fullName: current.fullName.trim() ? current.fullName : profileName ?? current.fullName,
      phoneNumber: current.phoneNumber.trim()
        ? current.phoneNumber
        : profilePhone ?? current.phoneNumber,
      email: current.email?.trim() ? current.email : profileEmail ?? current.email,
    }));
  }, [currentUserQuery.data, isRestrictedLearner, user]);

  // The public presenter is the sole authority for whether a program has a
  // payable price. A published program with unavailable regional pricing is
  // still a valid detail page, but it must not expose an enrollment action.
  const canEnroll = Boolean(
    program?.publishedAt && program.registrationOpen && program.priceStatus === "PAID",
  );

  const programTitle = program ? resolveProgramTitle(program, locale) : null;
  const programDescription = program ? resolveProgramDescription(program, locale) : null;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!program || !canEnroll) {
      setFeedback({ message: t("public.form.closed") });
      return;
    }

    if (isRestrictedLearner) {
      setFeedback({ message: t("public.form.restricted") });
      return;
    }

    if (!form.fullName.trim() || !form.phoneNumber.trim()) {
      setFeedback({ message: t("public.form.validation.required") });
      return;
    }

    try {
      const created = await createEnrollment.mutateAsync({
        slug,
        input: {
          idempotencyKey:
            enrollmentIdempotencyKey.current ??
            (enrollmentIdempotencyKey.current = crypto.randomUUID()),
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          whatsappNumber: form.whatsappNumber?.trim() || undefined,
          email: form.email?.trim() || undefined,
          sourceLabel: form.sourceLabel?.trim() || undefined,
        },
      });
      setEnrollment(created);
      router.push(
        buildEnrollmentPaymentHref({
          locale,
          enrollment: created,
          backHref,
        }),
      );
    } catch (error) {
      const errorKey = getPublicAcademyProgramErrorKey(error);
      const requiresLogin = errorKey === "public.errors.learnerEmailAlreadyExists";
      const callbackUrl = `/${locale}/academy/${slug}`;

      setFeedback({
        message: t(errorKey),
        ...(requiresLogin
          ? {
              actionHref: `/${locale}/signin/patient?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              actionLabel: t("public.errors.loginToContinue"),
            }
          : {}),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-6 sm:py-8">
        <div className="h-56 animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[28rem] animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
          <div className="h-[28rem] animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <StateCard
          title={t("errors.loadFailed")}
          note={t("errors.generic")}
          action={{
            label: t("errors.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-[24px]"
        />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <StateCard
          title={t("public.detail.notFound.title")}
          note={t("public.detail.notFound.note")}
          action={{
            label: t("public.detail.notFound.back"),
            href: (
              <Link
                href={academyBackHref}
                className="inline-flex items-center gap-2 rounded-[14px] border border-border-light bg-white px-5 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-surface-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("public.detail.notFound.back")}
              </Link>
            ),
          }}
          className="rounded-[24px]"
        />
      </div>
    );
  }

  const price = resolvePublicPrice(program);
  const sessions = program.sessions ?? [];
  const dateStart = formatDate(program.startAt, locale);
  const dateEnd = formatDate(program.endAt, locale);
  const deliveryMethods = Array.from(
    new Set(sessions.map((session) => session.deliveryMethod)),
  );
  const deliveryMethodLabels =
    deliveryMethods.length > 0
      ? deliveryMethods.map((method) => resolveAcademyProgramDeliveryMethodLabel(method, t))
      : [];
  const seatCount = program.targetLearnerCount ?? program.maxSeats ?? null;

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <section className="space-y-6 rounded-[24px] border border-border-light bg-white p-6 shadow-xs sm:p-8 dark:bg-surface-secondary">
          {program.coverImageUrl ? (
            <div className="overflow-hidden rounded-[20px] border border-border-light bg-surface-tertiary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={program.coverImageUrl}
                alt={programTitle ?? t("public.detail.badge")}
                className="max-h-[24rem] w-full object-contain p-2"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("public.detail.badge")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface-tertiary px-3 py-1.5 text-xs font-semibold text-text-primary">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              {resolveAcademyProgramRegistrationStateLabel(program.registrationOpen, t)}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              {programTitle}
            </h1>
            <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
              {programDescription ?? t("public.detail.noFullDescription")}
            </p>
          </div>

          <div className="grid gap-3 border-t border-border-light/70 pt-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-light/80 bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>{t("public.detail.summary.price")}</span>
              </div>
              <div className="mt-1 text-sm font-extrabold text-primary">
                <PriceDisplay price={price} />
              </div>
            </div>

            <div className="rounded-2xl border border-border-light/80 bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                <Video className="h-3.5 w-3.5 text-primary" />
                <span>{t("public.detail.summary.deliveryMethod")}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-text-primary">
                {deliveryMethodLabels.length > 0
                  ? deliveryMethodLabels.join(" · ")
                  : t("public.detail.summary.notSet")}
              </div>
            </div>

            <div className="rounded-2xl border border-border-light/80 bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                <span>{t("public.detail.summary.startDate")}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-text-primary">
                {dateStart ?? t("public.detail.summary.notSet")}
                {dateEnd ? ` — ${dateEnd}` : ""}
              </div>
            </div>

            <div className="rounded-2xl border border-border-light/80 bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>{t("public.detail.schedule.title")}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-text-primary">
                {t("public.detail.schedule.count", { count: sessions.length })}
                {seatCount
                  ? ` · ${t("public.detail.summary.targetLearners", { count: seatCount })}`
                  : ""}
              </div>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-6">
          {enrollment ? (
            <EnrollmentSavedCard
              locale={locale}
              t={t}
              enrollment={enrollment}
              program={program}
              backHref={backHref}
            />
          ) : canEnroll ? (
            <PublicAcademyEnrollmentForm
              t={t}
              program={program}
              onSubmit={onSubmit}
              form={form}
              setForm={setForm}
              pending={createEnrollment.isPending}
              feedback={feedback}
              isRestrictedLearner={isRestrictedLearner}
              disableSubmit={!programTitle}
            />
          ) : (
            <StateCard
              title={t("public.form.closedTitle")}
              note={t("public.form.closedNote")}
              className="rounded-[24px]"
            />
          )}
        </aside>
      </div>

      <section className="rounded-[24px] border border-border-light bg-white p-5 shadow-xs sm:p-6 dark:bg-surface-secondary">
        <div className="flex items-start justify-between gap-4 border-b border-border-light/60 pb-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {t("public.detail.schedule.title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("public.detail.schedule.subtitle")}
            </p>
          </div>
          <span className="app-chip rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {t("public.detail.schedule.count", { count: sessions.length })}
          </span>
        </div>

        {sessions.length > 0 ? (
          <>
            <div className="mt-5 grid gap-3 md:hidden">
              {sessions.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-border-light bg-surface-secondary p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-text-muted">
                      {t("public.detail.schedule.columns.title")}
                    </span>
                    <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
                      {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                        row.sortOrder,
                      )}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold leading-relaxed text-text-primary">
                    {resolveAcademyProgramSessionTitle(row, locale)}
                  </h3>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-text-muted">
                        {t("public.detail.schedule.columns.date")}
                      </dt>
                      <dd className="mt-1 font-medium text-text-secondary">
                        {formatDate(row.startsAt, locale) ?? t("public.detail.noDate")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-text-muted">
                        {t("public.detail.schedule.columns.time")}
                      </dt>
                      <dd className="mt-1 font-medium text-text-secondary" dir="ltr">
                        {formatTime(row.startsAt, locale)} - {formatTime(row.endsAt, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-text-muted">
                        {t("public.detail.schedule.columns.deliveryMethod")}
                      </dt>
                      <dd className="mt-1 font-semibold text-text-primary">
                        {resolveAcademyProgramDeliveryMethodLabel(row.deliveryMethod, t)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-text-muted">
                        {t("public.detail.schedule.columns.duration")}
                      </dt>
                      <dd className="mt-1 font-semibold text-text-secondary">
                        {formatDurationMinutes(row.startsAt, row.endsAt, locale)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="mt-5 hidden md:block">
              <DataTable
                data={sessions}
                columns={[
                  {
                    id: "order",
                    header: t("public.detail.schedule.columns.order"),
                    width: "80px",
                    align: "center" as const,
                    accessor: (row) => row.sortOrder,
                    cell: (row) => (
                      <span className="font-semibold text-text-secondary">
                        {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                          row.sortOrder,
                        )}
                      </span>
                    ),
                  },
                  {
                    id: "title",
                    header: t("public.detail.schedule.columns.title"),
                    accessor: (row) => row.titleAr,
                    cell: (row) => (
                      <span className="font-bold text-text-primary">
                        {resolveAcademyProgramSessionTitle(row, locale)}
                      </span>
                    ),
                  },
                  {
                    id: "deliveryMethod",
                    header: t("public.detail.schedule.columns.deliveryMethod"),
                    accessor: (row) => row.deliveryMethod,
                    cell: (row) => (
                      <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-primary">
                        {resolveAcademyProgramDeliveryMethodLabel(row.deliveryMethod, t)}
                      </span>
                    ),
                  },
                  {
                    id: "date",
                    header: t("public.detail.schedule.columns.date"),
                    accessor: (row) => row.startsAt,
                    cell: (row) => (
                      <span className="font-medium text-text-secondary">
                        {formatDate(row.startsAt, locale) ?? t("public.detail.noDate")}
                      </span>
                    ),
                  },
                  {
                    id: "time",
                    header: t("public.detail.schedule.columns.time"),
                    accessor: (row) => row.startsAt,
                    cell: (row) => (
                      <span className="font-medium text-text-secondary" dir="ltr">
                        {formatTime(row.startsAt, locale)} - {formatTime(row.endsAt, locale)}
                      </span>
                    ),
                  },
                  {
                    id: "duration",
                    header: t("public.detail.schedule.columns.duration"),
                    accessor: (row) => row.startsAt,
                    cell: (row) => (
                      <span className="font-semibold text-text-secondary">
                        {formatDurationMinutes(row.startsAt, row.endsAt, locale)}
                      </span>
                    ),
                  },
                ]}
                getRowId={(row) => row.id}
                striped
                hoverable
                ariaLabel={t("public.detail.schedule.title")}
                caption={t("public.detail.schedule.title")}
              />
            </div>
          </>
        ) : (
          <StateCard
            title={t("public.detail.schedule.empty.heading")}
            note={t("public.detail.schedule.empty.note")}
            className="mt-5 rounded-[16px]"
          />
        )}
      </section>
    </div>
  );
}

export default PublicAcademyProgramDetailScreen;
