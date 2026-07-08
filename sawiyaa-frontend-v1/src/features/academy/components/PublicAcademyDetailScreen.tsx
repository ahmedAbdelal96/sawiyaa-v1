"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Globe,
  Loader2,
  MessageSquareText,
  Sparkles,
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
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramPaymentStatusLabel,
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

function formatMoney(amount: string | null, currency: "EGP" | "USD", locale: string) {
  if (!amount) {
    return null;
  }

  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

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

function resolvePricePairs(program: AcademyProgramItem, locale: string) {
  return {
    egp: formatMoney(program.priceEgp, "EGP", locale),
    usd: formatMoney(program.priceUsd, "USD", locale),
  };
}

function EnrollmentResultCard({
  locale,
  t,
  enrollment,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  enrollment: AcademyProgramEnrollmentItem;
}) {
  const statusLabel = resolveAcademyProgramEnrollmentStatusLabel(enrollment.status, t);
  const paymentStatusLabel = resolveAcademyProgramPaymentStatusLabel(
    enrollment.paymentStatus,
    t,
  );

  return (
    <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {t("public.result.eyebrow")}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-bold text-text-primary">{t("public.result.title")}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {t("public.result.status", { status: statusLabel })}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border-light bg-white p-4 text-xs">
          <div className="text-[10px] uppercase font-bold text-text-muted">
            {t("public.result.reference")}
          </div>
          <div className="mt-1 break-all font-mono text-sm font-bold text-text-primary">
            {enrollment.publicAccessToken}
          </div>
        </div>

        <div className="rounded-xl border border-border-light bg-white p-4 text-xs">
          <div className="text-[10px] uppercase font-bold text-text-muted">
            {t("public.result.paymentStatus")}
          </div>
          <div className="mt-1 font-bold text-text-primary">{paymentStatusLabel}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border-light bg-white p-4 text-xs text-text-secondary">
        <div className="text-[10px] uppercase font-bold text-text-muted">
          {t("public.result.program")}
        </div>
        <div className="mt-1 text-sm font-bold text-text-primary">
          {enrollment.program.title}
        </div>
      </div>

      {enrollment.payment?.checkoutUrl ? (
        <a
          href={enrollment.payment.checkoutUrl}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover shadow-sm"
        >
          {t("public.result.continuePayment")}
        </a>
      ) : null}

    </div>
  );
}

function PublicAcademyEnrollmentForm({
  locale,
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
  locale: string;
  t: ReturnType<typeof useTranslations>;
  program: AcademyProgramItem;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  form: CreateAcademyProgramEnrollmentInput;
  setForm: React.Dispatch<React.SetStateAction<CreateAcademyProgramEnrollmentInput>>;
  pending: boolean;
  feedback: string | null;
  isRestrictedLearner: boolean;
  disableSubmit: boolean;
}) {
  const prices = resolvePricePairs(program, locale);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <MessageSquareText className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-text-primary">{t("public.form.title")}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{t("public.form.subtitle")}</p>
        </div>
      </div>

      {isRestrictedLearner ? (
        <div className="mt-4 rounded-[16px] border border-error/20 bg-error/5 px-4 py-3 text-xs leading-relaxed text-error-600">
          {t("public.form.restricted")}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
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

      <div className="mt-4 space-y-2 rounded-xl border border-border-light bg-surface-tertiary px-4 py-3.5 text-xs leading-normal">
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-text-secondary">{t("public.form.priceEgp")}</span>
          <span className="text-sm font-extrabold text-primary">
            {prices.egp ?? t("public.detail.free")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-text-secondary">{t("public.form.priceUsd")}</span>
          <span className="text-sm font-extrabold text-primary">
            {prices.usd ?? t("public.detail.free")}
          </span>
        </div>
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
        <p className="mt-3 text-xs font-semibold text-text-muted">{feedback}</p>
      ) : null}
    </form>
  );
}

function ProgramDetailsPanel({
  locale,
  t,
  program,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  program: AcademyProgramItem;
}) {
  const prices = resolvePricePairs(program, locale);
  const registrationState = resolveAcademyProgramRegistrationStateLabel(program.registrationOpen, t);
  const dateStart = formatDate(program.startAt, locale);
  const dateEnd = formatDate(program.endAt, locale);
  const sessions = program.sessions ?? [];
  const deliveryMethods = Array.from(
    new Set(sessions.map((session) => session.deliveryMethod)),
  );
  const deliveryMethodLabels =
    deliveryMethods.length > 0
      ? deliveryMethods.map((method) => resolveAcademyProgramDeliveryMethodLabel(method, t))
      : [];

  return (
    <div className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
      <div className="space-y-4">
        <div className="text-sm font-bold text-text-primary">{t("public.detail.summary.title")}</div>
        <p className="text-xs leading-relaxed text-text-secondary">
          {resolveProgramDescription(program, locale) ?? t("public.detail.noFullDescription")}
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.price")}
            </div>
            <div className="mt-0.5 space-y-1 font-bold text-text-primary">
              <div>{prices.egp ?? t("public.detail.free")}</div>
              <div>{prices.usd ?? t("public.detail.free")}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.status")}
            </div>
            <div className="mt-0.5 font-bold text-text-primary">
              {program.publishedAt
                ? t("public.detail.summary.published")
                : t("public.detail.summary.draft")}
            </div>
          </div>
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.registration")}
            </div>
            <div className="mt-0.5 font-bold text-text-primary">{registrationState}</div>
          </div>
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.deliveryMethod")}
            </div>
            <div className="mt-0.5 font-bold text-text-primary">
              {deliveryMethodLabels.length > 0
                ? deliveryMethodLabels.join(" · ")
                : t("public.detail.summary.notSet")}
            </div>
          </div>
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.startDate")}
            </div>
            <div className="mt-0.5 font-bold text-text-primary">
              {dateStart ?? t("public.detail.summary.notSet")}
            </div>
          </div>
          <div className="rounded-xl border border-border-light/50 bg-surface-tertiary px-3 py-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-text-muted">
              {t("public.detail.summary.endDate")}
            </div>
            <div className="mt-0.5 font-bold text-text-primary">
              {dateEnd ?? t("public.detail.summary.notSet")}
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const currentUserQuery = useCurrentUser(Boolean(user));
  const createEnrollment = useCreatePublicAcademyProgramEnrollment();
  const [feedback, setFeedback] = useState<string | null>(null);
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

    setForm((current) => ({
      ...current,
      fullName: current.fullName.trim() ? current.fullName : profileName ?? current.fullName,
      phoneNumber: current.phoneNumber.trim()
        ? current.phoneNumber
        : profilePhone ?? current.phoneNumber,
      email: current.email?.trim() ? current.email : profileEmail ?? current.email,
    }));
  }, [currentUserQuery.data, isRestrictedLearner, user]);

  const canEnroll = Boolean(program?.publishedAt && program.registrationOpen);
  const programTitle = program ? resolveProgramTitle(program, locale) : null;
  const programDescription = program ? resolveProgramDescription(program, locale) : null;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!program || !canEnroll) {
      setFeedback(t("public.form.closed"));
      return;
    }

    if (isRestrictedLearner) {
      setFeedback(t("public.form.restricted"));
      return;
    }

    if (!form.fullName.trim() || !form.phoneNumber.trim()) {
      setFeedback(t("public.form.validation.required"));
      return;
    }

    try {
      const created = await createEnrollment.mutateAsync({
        slug,
        input: {
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          whatsappNumber: form.whatsappNumber?.trim() || undefined,
          email: form.email?.trim() || undefined,
          sourceLabel: form.sourceLabel?.trim() || undefined,
        },
      });
      setEnrollment(created);
      setFeedback(t("public.form.success"));
    } catch (error) {
      setFeedback(t(getPublicAcademyProgramErrorKey(error)));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-6 sm:py-8">
        <div className="h-56 animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="h-[34rem] animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
          <div className="h-[34rem] animate-pulse rounded-[24px] border border-border-light bg-surface-tertiary" />
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
                className="inline-flex items-center gap-2 rounded-[14px] border border-border-light bg-white px-5 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
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

  const prices = resolvePricePairs(program, locale);
  const sessions = program.sessions ?? [];

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      <section className="overflow-hidden rounded-[24px] border border-border-light bg-surface-tertiary p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
          <div className="space-y-5">
            {program.coverImageUrl ? (
              <div className="overflow-hidden rounded-[24px] border border-border-light bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={program.coverImageUrl}
                  alt={programTitle ?? t("public.detail.badge")}
                  className="max-h-[28rem] w-full bg-surface-tertiary object-contain p-2"
                />
              </div>
            ) : null}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("public.detail.badge")}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {programTitle}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
                {programDescription ?? t("public.detail.noShortDescription")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {formatDate(program.startAt, locale) ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {formatDate(program.endAt, locale) ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <Globe className="h-3.5 w-3.5 text-primary" />
                {prices.egp ?? t("public.detail.free")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                {resolveAcademyProgramRegistrationStateLabel(program.registrationOpen, t)}
              </span>
            </div>
          </div>

          <ProgramDetailsPanel locale={locale} t={t} program={program} />
        </div>
      </section>

      <section className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
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
            className="mt-5"
            ariaLabel={t("public.detail.schedule.title")}
            caption={t("public.detail.schedule.title")}
          />
        ) : (
          <StateCard
            title={t("public.detail.schedule.empty.heading")}
            note={t("public.detail.schedule.empty.note")}
            className="mt-5 rounded-[16px]"
          />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {canEnroll ? (
          <PublicAcademyEnrollmentForm
            locale={locale}
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

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-text-primary">{t("public.detail.howItWorks.title")}</h2>
            <div className="mt-4 space-y-3.5 text-sm leading-relaxed text-text-secondary">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-xs font-bold text-primary">
                  1
                </span>
                <p>{t("public.detail.howItWorks.step1")}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-xs font-bold text-primary">
                  2
                </span>
                <p>{t("public.detail.howItWorks.step2")}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light font-mono text-xs font-bold text-primary">
                  3
                </span>
                <p>{t("public.detail.howItWorks.step3")}</p>
              </div>
            </div>
          </div>

          {enrollment ? (
            <EnrollmentResultCard locale={locale} t={t} enrollment={enrollment} />
          ) : (
            <div className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
              <h3 className="text-base font-bold text-text-primary">
                {t("public.result.preSubmitTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {t("public.result.preSubmitNote")}
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    {t("public.result.paymentStatus")}
                  </div>
                  <div className="mt-0.5 font-bold text-text-primary">
                    {t("public.result.pendingState")}
                  </div>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    {t("public.result.reference")}
                  </div>
                  <div className="mt-0.5 font-bold text-text-primary">
                    {t("public.result.automatic")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PublicAcademyProgramDetailScreen;
