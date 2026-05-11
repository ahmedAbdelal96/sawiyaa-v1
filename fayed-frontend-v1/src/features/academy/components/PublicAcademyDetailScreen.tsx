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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-56 animate-pulse rounded-[32px] border border-border-light bg-white/80" />
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="h-[34rem] animate-pulse rounded-[32px] border border-border-light bg-white/80" />
          <div className="h-[34rem] animate-pulse rounded-[32px] border border-border-light bg-white/80" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <StateCard
        title={t("errors.loadFailed")}
        note={t("errors.generic")}
        action={{
          label: t("errors.retry"),
          onClick: () => refetch(),
        }}
        className="rounded-[32px]"
      />
    );
  }

  if (!course) {
    return (
      <StateCard
        title={t("public.detail.notFound.title")}
        note={t("public.detail.notFound.note")}
        action={{
          label: t("public.detail.notFound.back"),
          href: (
            <Link
              href={`/${locale}/academy`}
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("public.detail.notFound.back")}
            </Link>
          ),
        }}
        className="rounded-[32px]"
      />
    );
  }

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

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border-light bg-[linear-gradient(135deg,rgba(68,161,148,0.12),rgba(255,255,255,0.96))] p-6 shadow-[0_22px_50px_-36px_rgba(34,52,56,0.25)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {t("public.detail.badge")}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
                {course.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary md:text-base">
                {course.shortDescription ?? t("public.detail.noShortDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                <CalendarClock className="h-4 w-4 text-primary" />
                {courseDateLabel ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                <CalendarClock className="h-4 w-4 text-primary" />
                {courseEndDateLabel ?? t("public.detail.noDate")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                <BadgeCheck className="h-4 w-4 text-primary" />
                {t("public.detail.stats.enrollments", {
                  count: course.stats?.totalEnrollments ?? 0,
                })}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                <Globe className="h-4 w-4 text-primary" />
                {priceLabel ?? t("public.detail.free")}
              </span>
              {courseDurationLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {courseDurationLabel}
                </span>
              ) : null}
              {lectureCountLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  {lectureCountLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-border-light bg-white/95 p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)]">
            <div className="space-y-3">
              <div className="text-base font-semibold text-text-primary">
                {t("public.detail.summary.title")}
              </div>
              <p className="text-sm leading-6 text-text-secondary">
                {course.fullDescription ?? t("public.detail.noFullDescription")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.price")}</div>
                  <div className="font-semibold text-text-primary">
                    {priceLabel ?? t("public.detail.free")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.status")}</div>
                  <div className="font-semibold text-text-primary">
                    {course.publishedAt
                      ? t("public.detail.summary.published")
                      : t("public.detail.summary.draft")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.visibility")}</div>
                  <div className="font-semibold text-text-primary">
                    {t(`statuses.visibility.${course.visibility}` as Parameters<typeof t>[0])}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.type")}</div>
                  <div className="font-semibold text-text-primary">
                    {t("public.detail.summary.publicAccess")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.duration")}</div>
                  <div className="font-semibold text-text-primary">
                    {courseDurationLabel ?? t("public.detail.summary.notSet")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
                  <div className="text-xs text-text-muted">{t("public.detail.summary.lectures")}</div>
                  <div className="font-semibold text-text-primary">
                    {lectureCountLabel ?? t("public.detail.summary.notSet")}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{t("public.detail.summary.marketNote")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{t("public.detail.schedule.title")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("public.detail.schedule.subtitle")}</p>
          </div>
          <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-text-brand">
            {t("public.detail.schedule.count", { count: lectures.length })}
          </span>
        </div>

        {lectures.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="rounded-[24px] border border-border-light bg-surface-secondary/45 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("public.detail.schedule.item.order", { order: lecture.lectureOrder })}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-text-primary">
                      {lecture.lectureTitle ?? t("public.detail.schedule.item.noTitle")}
                    </h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-text-secondary">
                  <div>
                    <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      {t("public.detail.schedule.item.startsAt")}
                    </span>
                    <div className="font-semibold text-text-primary">
                      {new Date(lecture.startsAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: !locale.startsWith("ar"),
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      {t("public.detail.schedule.item.endsAt")}
                    </span>
                    <div className="font-semibold text-text-primary">
                      {new Date(lecture.endsAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: !locale.startsWith("ar"),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StateCard
            title={t("public.detail.schedule.empty.heading")}
            note={t("public.detail.schedule.empty.note")}
            className="mt-5 rounded-[24px]"
          />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.28)]"
        >
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">{t("public.form.title")}</h2>
              <p className="text-sm text-text-muted">{t("public.form.subtitle")}</p>
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
            />
            <Input
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, phoneNumber: event.target.value }))
              }
              placeholder={t("public.form.phoneNumber")}
              error={Boolean(feedback && !form.phoneNumber.trim())}
            />
            <Input
              value={form.whatsappNumber ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, whatsappNumber: event.target.value }))
              }
              placeholder={t("public.form.whatsappNumber")}
            />
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t("public.form.email")}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border-light bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <Globe className="h-4 w-4 text-primary" />
              {t("public.form.noteTitle")}
            </div>
            <p className="mt-1 leading-6">{t("public.form.noteBody")}</p>
          </div>

          <Button type="submit" className="mt-5 w-full" disabled={createEnrollment.isPending}>
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
            <p className="mt-3 text-sm text-text-muted">{feedback}</p>
          ) : null}
        </form>

        <div className="space-y-4">
          <div className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.28)]">
            <h2 className="text-lg font-bold text-text-primary">{t("public.detail.howItWorks.title")}</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
              <p>{t("public.detail.howItWorks.step1")}</p>
              <p>{t("public.detail.howItWorks.step2")}</p>
              <p>{t("public.detail.howItWorks.step3")}</p>
            </div>
          </div>

          {enrollment ? (
            <div className="rounded-[32px] border border-primary/20 bg-primary/5 p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)]">
              <h3 className="text-lg font-bold text-text-primary">{t("public.result.title")}</h3>
              <p className="mt-2 text-sm text-text-secondary">
                {t("public.result.status", {
                  status: t(`statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<
                    typeof t
                  >[0]),
                })}
              </p>
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
                <div className="text-xs text-text-muted">{t("public.result.reference")}</div>
                <div className="font-semibold text-text-primary">{enrollment.publicAccessToken}</div>
              </div>

              {enrollment.payment?.checkoutUrl ? (
                <a
                  href={enrollment.payment.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white"
                >
                  {t("public.result.payNow")}
                </a>
              ) : (
                <div className="mt-4 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-secondary">
                  {t("public.result.waiting")}
                </div>
              )}

              {(enrollment.joinAccess.meetingUrl || enrollment.joinAccess.whatsappGroupUrl) ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-border-light bg-white px-4 py-4 text-sm text-text-secondary">
                  <div className="font-semibold text-text-primary">
                    {t("public.result.joinAccess.title")}
                  </div>
                  {enrollment.joinAccess.meetingUrl ? (
                    <a
                      href={enrollment.joinAccess.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-primary underline-offset-4 hover:underline"
                    >
                      {t("public.result.joinAccess.meeting")}
                    </a>
                  ) : null}
                  {enrollment.joinAccess.whatsappGroupUrl ? (
                    <a
                      href={enrollment.joinAccess.whatsappGroupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-primary underline-offset-4 hover:underline"
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
