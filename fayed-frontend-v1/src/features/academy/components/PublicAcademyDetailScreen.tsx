"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { useAuthStore } from "@/stores/auth-store";
import { resolvePatientCurrencyCode } from "@/features/payments/lib/patient-currency";
import {
  createPublicAcademyEnrollment,
} from "../api/academy.api";
import {
  useCreatePublicAcademyEnrollment,
  usePublicAcademyCourse,
} from "../hooks/use-academy";
import type { CreateAcademyEnrollmentInput } from "../types/academy.types";

function formatCurrency(amount: string | null, currency: string | null, locale: string) {
  if (!amount || !currency) return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string | null, locale: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatPlanValue(value: number | null | undefined, locale: string, unit: string) {
  if (!value || value < 1) return null;
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
  return `${number} ${unit}`;
}

export default function PublicAcademyDetailScreen({
  locale,
  slug,
}: {
  locale: string;
  slug: string;
}) {
  const t = useTranslations("academy");
  const { user, isInitialized } = useAuthStore();
  const authScopeKey = useMemo(() => {
    if (!isInitialized) {
      return "bootstrapping";
    }
    if (!user) {
      return "guest";
    }
    return `auth:${user.id}:${user.role}`;
  }, [isInitialized, user]);
  const {
    data: course,
    isLoading,
    isError,
    refetch,
  } = usePublicAcademyCourse(slug, { cacheScopeKey: authScopeKey });
  const createEnrollment = useCreatePublicAcademyEnrollment();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAcademyEnrollmentInput>({
    fullName: "",
    phoneNumber: "",
    whatsappNumber: "",
    email: "",
    sourceLabel: "public-academy",
  });
  const [enrollment, setEnrollment] = useState<
    Awaited<ReturnType<typeof createPublicAcademyEnrollment>> | null
  >(null);

  const priceLabel = useMemo(
    () =>
      formatCurrency(
        course?.priceAmount ?? null,
        resolvePatientCurrencyCode({
          currencyCode: course?.currencyCode,
          regionalPricingMode: course?.regionalPricingMode,
          resolvedCountryIsoCode: course?.resolvedCountryIsoCode,
        }) ?? course?.currencyCode ?? null,
        locale,
      ),
    [
      course?.currencyCode,
      course?.priceAmount,
      course?.regionalPricingMode,
      course?.resolvedCountryIsoCode,
      locale,
    ],
  );

  const courseDateLabel = useMemo(
    () => formatDateLabel(course?.startsAt ?? null, locale),
    [course?.startsAt, locale],
  );
  const courseEndDateLabel = useMemo(
    () => formatDateLabel(course?.endsAt ?? null, locale),
    [course?.endsAt, locale],
  );
  const courseDurationLabel = useMemo(
    () =>
      formatPlanValue(
        course?.plannedDurationDays ?? null,
        locale,
        t("public.detail.summary.daysUnit"),
      ),
    [course?.plannedDurationDays, locale, t],
  );
  const lectureCountLabel = useMemo(
    () =>
      formatPlanValue(
        course?.plannedLectureCount ?? null,
        locale,
        t("public.detail.summary.lectureUnit"),
      ),
    [course?.plannedLectureCount, locale, t],
  );
  const lectures = course?.lectures ?? [];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

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
      setEnrollment(created as Awaited<ReturnType<typeof createPublicAcademyEnrollment>>);
      setFeedback(t("public.form.success"));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("errors.generic"));
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

  if (!course) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <StateCard
          title={t("public.detail.notFound.title")}
          note={t("public.detail.notFound.note")}
          action={{
            label: t("public.detail.notFound.back"),
            href: (
              <Link
                href={`/${locale}/academy`}
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

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      {/* Clinically warm, flat hero section */}
      <section className="overflow-hidden rounded-[24px] border border-border-light bg-surface-tertiary p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("public.detail.badge")}
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {course.title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
                {course.shortDescription ?? t("public.detail.noShortDescription")}
              </p>
            </div>

            {/* Chips block */}
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-primary border border-border-light/75 shadow-sm">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {courseDateLabel ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-primary border border-border-light/75 shadow-sm">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {courseEndDateLabel ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-primary border border-border-light/75 shadow-sm">
                <Globe className="h-3.5 w-3.5 text-primary" />
                {priceLabel ?? t("public.detail.free")}
              </span>
              {courseDurationLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-primary border border-border-light/75 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {courseDurationLabel}
                </span>
              ) : null}
              {lectureCountLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-primary border border-border-light/75 shadow-sm">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  {lectureCountLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Details side block */}
          <div className="rounded-[20px] border border-border-light bg-white p-5">
            <div className="space-y-4">
              <div className="text-sm font-bold text-text-primary">
                {t("public.detail.summary.title")}
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">
                {course.fullDescription ?? t("public.detail.noFullDescription")}
              </p>
              
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.price")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {priceLabel ?? t("public.detail.free")}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.status")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {course.publishedAt
                      ? t("public.detail.summary.published")
                      : t("public.detail.summary.draft")}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.visibility")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {t(`statuses.visibility.${course.visibility}` as Parameters<typeof t>[0])}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.type")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {t("public.detail.summary.publicAccess")}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.duration")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {courseDurationLabel ?? t("public.detail.summary.notSet")}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-tertiary border border-border-light/50 px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.detail.summary.lectures")}</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {lectureCountLabel ?? t("public.detail.summary.notSet")}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Lectures Schedule Section */}
      <section className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-light/60">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{t("public.detail.schedule.title")}</h2>
            <p className="mt-0.5 text-xs text-text-muted">{t("public.detail.schedule.subtitle")}</p>
          </div>
          <span className="app-chip rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {t("public.detail.schedule.count", { count: lectures.length })}
          </span>
        </div>

        {lectures.length > 0 ? (
          <DataTable
            data={lectures}
            columns={[
              {
                id: "order",
                header: t("public.detail.schedule.columns.order"),
                width: "80px",
                align: "center" as const,
                accessor: (row) => row.lectureOrder,
                cell: (row) => (
                  <span className="font-semibold text-text-secondary">
                    {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(row.lectureOrder)}
                  </span>
                ),
              },
              {
                id: "title",
                header: t("public.detail.schedule.columns.title"),
                accessor: (row) => row.lectureTitle,
                cell: (row) => (
                  <span className="font-bold text-text-primary">
                    {row.lectureTitle ?? t("public.detail.schedule.item.noTitle")}
                  </span>
                ),
              },
              {
                id: "date",
                header: t("public.detail.schedule.columns.date"),
                accessor: (row) => row.startsAt,
                cell: (row) => (
                  <span className="text-text-secondary font-medium">
                    {new Date(row.startsAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                ),
              },
              {
                id: "time",
                header: t("public.detail.schedule.columns.time"),
                accessor: (row) => row.startsAt,
                cell: (row) => {
                  const formatTime = (dateStr: string) => {
                    return new Date(dateStr).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                  };
                  return (
                    <span className="text-text-secondary font-medium" dir="ltr">
                      {formatTime(row.startsAt)} - {formatTime(row.endsAt)}
                    </span>
                  );
                },
              },
              {
                id: "duration",
                header: t("public.detail.schedule.columns.duration"),
                accessor: (row) => row.startsAt,
                cell: (row) => {
                  const durationMinutes = Math.round(
                    (new Date(row.endsAt).getTime() - new Date(row.startsAt).getTime()) / 60000
                  );
                  
                  const formatDuration = (minutes: number, loc: string) => {
                    const isAr = loc === "ar";
                    const finalMinutes = minutes <= 0 ? 60 : minutes;
                    
                    return isAr 
                      ? `${new Intl.NumberFormat("ar-EG").format(finalMinutes)} دقيقة` 
                      : `${finalMinutes} mins`;
                  };
                  
                  return (
                    <span className="text-text-secondary font-semibold">
                      {formatDuration(durationMinutes, locale)}
                    </span>
                  );
                },
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

      {/* Booking Form and Instructions */}
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Form container */}
        <form
          onSubmit={onSubmit}
          className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-text-primary">{t("public.form.title")}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t("public.form.subtitle")}</p>
            </div>
          </div>

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

          <div className="mt-4 rounded-xl border border-border-light bg-surface-tertiary px-4 py-3.5 text-xs leading-normal">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-secondary">
                {t("public.form.priceLabel")}
              </span>
              <span className="text-sm font-extrabold text-primary">
                {priceLabel ?? t("public.detail.free")}
              </span>
            </div>
          </div>

          <Button type="submit" className="mt-5 w-full rounded-[14px]" disabled={createEnrollment.isPending}>
            {createEnrollment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("public.form.submitting")}
              </>
            ) : (
              t("public.form.submit")
            )}
          </Button>

          {feedback ? (
            <p className="mt-3 text-xs font-semibold text-text-muted">{feedback}</p>
          ) : null}
        </form>

        {/* Instructions list */}
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border-light bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-text-primary">{t("public.detail.howItWorks.title")}</h2>
            <div className="mt-4 space-y-3.5 text-sm leading-relaxed text-text-secondary">
              <div className="flex gap-2.5 items-start">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary font-mono mt-0.5">1</span>
                <p>{t("public.detail.howItWorks.step1")}</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary font-mono mt-0.5">2</span>
                <p>{t("public.detail.howItWorks.step2")}</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary font-mono mt-0.5">3</span>
                <p>{t("public.detail.howItWorks.step3")}</p>
              </div>
            </div>
          </div>

          {enrollment ? (
            <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <h3 className="text-base font-bold text-text-primary">{t("public.result.title")}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-normal">
                {t("public.result.status", {
                  status: t(`statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<
                    typeof t
                  >[0]),
                })}
              </p>
              
              <div className="mt-4 rounded-xl bg-white p-4 text-xs border border-border-light">
                <div className="text-[10px] uppercase font-bold text-text-muted">{t("public.result.reference")}</div>
                <div className="font-mono font-bold text-sm text-text-primary mt-1">{enrollment.publicAccessToken}</div>
              </div>

              {enrollment.payment?.checkoutUrl ? (
                <a
                  href={enrollment.payment.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                >
                  {t("public.result.payNow")}
                </a>
              ) : (
                <div className="mt-4 rounded-xl border border-border-light bg-white px-4 py-3 text-xs text-text-secondary text-center">
                  {t("public.result.waiting")}
                </div>
              )}

              {(enrollment.joinAccess.meetingUrl || enrollment.joinAccess.whatsappGroupUrl) ? (
                <div className="mt-4 space-y-3 rounded-xl border border-border-light bg-white p-4 text-xs text-text-secondary">
                  <div className="font-bold text-text-primary">
                    {t("public.result.joinAccess.title")}
                  </div>
                  {enrollment.joinAccess.meetingUrl ? (
                    <a
                      href={enrollment.joinAccess.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-primary underline-offset-4 hover:underline font-mono"
                    >
                      {t("public.result.joinAccess.meeting")}
                    </a>
                  ) : null}
                  {enrollment.joinAccess.whatsappGroupUrl ? (
                    <a
                      href={enrollment.joinAccess.whatsappGroupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-primary underline-offset-4 hover:underline font-mono"
                    >
                      {t("public.result.joinAccess.whatsapp")}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
