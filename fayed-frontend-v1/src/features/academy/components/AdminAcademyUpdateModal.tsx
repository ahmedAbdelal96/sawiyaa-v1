"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useUpdateAdminAcademyCourse } from "../hooks/use-academy";
import { getAcademyPlanFieldIssues, type AcademyPlanFieldIssue } from "../lib/academy-form-errors";
import { getAdminAcademyErrorKey } from "../lib/academy-errors";
import type { AcademyCourseItem, CourseVisibility } from "../types/academy.types";

type Props = {
  isOpen: boolean;
  course: AcademyCourseItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

type UpdateCourseForm = {
  title: string;
  visibility: CourseVisibility;
  shortDescription: string;
  fullDescription: string;
  priceAmountEgp: string;
  priceAmountUsd: string;
  plannedDurationDays: string;
  plannedLectureCount: string;
  startsAt: string;
  coverImageUrl: string;
  thumbnailUrl: string;
  meetingUrl: string;
  whatsappGroupUrl: string;
};

const COURSE_VISIBILITIES: CourseVisibility[] = ["PUBLIC", "PRIVATE"];

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return undefined;
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function createInitialForm(course: AcademyCourseItem): UpdateCourseForm {
  return {
    title: course.title ?? "",
    visibility: (course.visibility ?? "PUBLIC") as CourseVisibility,
    shortDescription: course.shortDescription ?? "",
    fullDescription: course.fullDescription ?? "",
    priceAmountEgp: course.priceAmountEgp ?? "",
    priceAmountUsd: course.priceAmountUsd ?? "",
    plannedDurationDays: course.plannedDurationDays ? String(course.plannedDurationDays) : "",
    plannedLectureCount: course.plannedLectureCount ? String(course.plannedLectureCount) : "",
    startsAt: toDateTimeLocal(course.startsAt),
    coverImageUrl: course.coverImageUrl ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    meetingUrl: course.meetingUrl ?? "",
    whatsappGroupUrl: course.whatsappGroupUrl ?? "",
  };
}

export default function AdminAcademyUpdateModal({
  isOpen,
  course,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const updateMutation = useUpdateAdminAcademyCourse();

  const [form, setForm] = useState<UpdateCourseForm | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UpdateCourseForm, string>>
  >({});

  const resolvePlanFieldMessage = (
    field: keyof UpdateCourseForm,
    issue: AcademyPlanFieldIssue,
  ) => {
    if (field === "plannedDurationDays") {
      return issue === "required"
        ? t("admin.detail.update.validation.durationRequired")
        : t("admin.detail.update.validation.invalidDuration");
    }

    if (field === "plannedLectureCount") {
      return issue === "required"
        ? t("admin.detail.update.validation.lectureCountRequired")
        : t("admin.detail.update.validation.invalidLectureCount");
    }

    if (field === "startsAt") {
      return t("admin.detail.update.validation.startsAtRequired");
    }

    return t("admin.detail.update.validation.required");
  };

  useEffect(() => {
    if (!isOpen || !course) return;
    setFeedback(null);
    setFieldErrors({});
    setForm(createInitialForm(course));
  }, [course, isOpen, locale]);

  const resetAndClose = () => {
    setForm(null);
    setFeedback(null);
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course || !form) return;

    setFeedback(null);
    setFieldErrors({});

    const title = form.title.trim();
    const egpPrice = form.priceAmountEgp.trim();
    const usdPrice = form.priceAmountUsd.trim();
    const pricePattern = /^\d+(\.\d{1,2})?$/;
    const duration = Number.parseInt(form.plannedDurationDays.trim(), 10);
    const lectureCount = Number.parseInt(form.plannedLectureCount.trim(), 10);
    const startsAt = fromDateTimeLocal(form.startsAt.trim());
    const nextFieldErrors: Partial<Record<keyof UpdateCourseForm, string>> = {};

    if (!title) {
      nextFieldErrors.title = t("admin.detail.update.validation.required");
    }

    if (egpPrice && !pricePattern.test(egpPrice)) {
      nextFieldErrors.priceAmountEgp = t("admin.detail.update.validation.price");
    }

    if (usdPrice && !pricePattern.test(usdPrice)) {
      nextFieldErrors.priceAmountUsd = t("admin.detail.update.validation.price");
    }

    if (!Number.isFinite(duration) || duration < 1) {
      nextFieldErrors.plannedDurationDays = t("admin.detail.update.validation.durationRequired");
    }

    if (!Number.isFinite(lectureCount) || lectureCount < 1) {
      nextFieldErrors.plannedLectureCount = t("admin.detail.update.validation.lectureCountRequired");
    }

    if (!startsAt) {
      nextFieldErrors.startsAt = t("admin.detail.update.validation.startsAtRequired");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const endsAt =
      startsAt && Number.isFinite(duration) && duration > 0
        ? new Date(new Date(startsAt).getTime() + duration * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    try {
      await updateMutation.mutateAsync({
        courseId: course.id,
        input: {
          title,
          visibility: form.visibility,
          shortDescription: form.shortDescription.trim() || undefined,
          fullDescription: form.fullDescription.trim() || undefined,
          priceAmountEgp: egpPrice || undefined,
          priceAmountUsd: usdPrice || undefined,
          plannedDurationDays: duration,
          plannedLectureCount: lectureCount,
          startsAt,
          endsAt,
          coverImageUrl: form.coverImageUrl.trim() || undefined,
          thumbnailUrl: form.thumbnailUrl.trim() || undefined,
          meetingUrl: form.meetingUrl.trim() || undefined,
          whatsappGroupUrl: form.whatsappGroupUrl.trim() || undefined,
        },
      });
      onSuccess();
      resetAndClose();
    } catch (error) {
      const planFieldIssues = getAcademyPlanFieldIssues(error);
      if (Object.keys(planFieldIssues).length > 0) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(planFieldIssues).map(([field, issue]) => [
              field,
              resolvePlanFieldMessage(field as keyof UpdateCourseForm, issue as AcademyPlanFieldIssue),
            ]),
          ) as Partial<Record<keyof UpdateCourseForm, string>>,
        );
        return;
      }

      setFeedback({
        tone: "error",
        message: t(getAdminAcademyErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const controlClassName = (field: keyof UpdateCourseForm) =>
    `w-full rounded-2xl border bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 ${
      fieldErrors[field] ? "border-rose-400" : "border-border-light"
    }`;

  const derivedEndsAt = useMemo(() => {
    const startsAt = fromDateTimeLocal(form?.startsAt?.trim() ?? "");
    const duration = Number.parseInt(form?.plannedDurationDays?.trim() ?? "", 10);
    if (!startsAt || !Number.isFinite(duration) || duration < 1) {
      return "";
    }

    const date = new Date(startsAt);
    date.setDate(date.getDate() + duration);
    return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: !locale.startsWith("ar"),
    });
  }, [form?.plannedDurationDays, form?.startsAt, locale]);

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} size="xl">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.detail.sections.course")}
          title={course?.title ?? t("admin.detail.update.open")}
          description={t("admin.detail.update.note")}
        />

        <ModalBody>
          {form ? (
            <div className="space-y-4">
              <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("admin.detail.update.sections.basics")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.title")}
                    </span>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, title: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.title")}
                      className={controlClassName("title")}
                    />
                    {fieldErrors.title ? (
                      <p className="mt-2 text-xs text-rose-600">{fieldErrors.title}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.visibility")}
                    </span>
                    <select
                      value={form.visibility}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, visibility: event.target.value as CourseVisibility } : current,
                        )
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
                    >
                      {COURSE_VISIBILITIES.map((value) => (
                        <option key={value} value={value}>
                          {t(`statuses.visibility.${value}` as Parameters<typeof t>[0])}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.shortDescription")}
                    </span>
                    <input
                      value={form.shortDescription}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, shortDescription: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.shortDescription")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.fullDescription")}
                    </span>
                    <textarea
                      rows={4}
                      value={form.fullDescription}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, fullDescription: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.fullDescription")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("admin.detail.update.sections.planning")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.plannedDurationDays")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={form.plannedDurationDays}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, plannedDurationDays: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.plannedDurationDays")}
                      className={controlClassName("plannedDurationDays")}
                    />
                    {fieldErrors.plannedDurationDays ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {fieldErrors.plannedDurationDays}
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.plannedLectureCount")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={form.plannedLectureCount}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, plannedLectureCount: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.plannedLectureCount")}
                      className={controlClassName("plannedLectureCount")}
                    />
                    {fieldErrors.plannedLectureCount ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {fieldErrors.plannedLectureCount}
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.startsAt")}
                    </span>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, startsAt: event.target.value } : current,
                        )
                      }
                      className={controlClassName("startsAt")}
                    />
                    {fieldErrors.startsAt ? (
                      <p className="mt-2 text-xs text-rose-600">{fieldErrors.startsAt}</p>
                    ) : null}
                  </label>

                  <div className="block rounded-2xl border border-dashed border-border-light bg-white px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.endsAtPreview")}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {derivedEndsAt || t("admin.detail.update.placeholders.endsAtPreview")}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {t("admin.detail.update.endsAtPreviewHelper")}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("admin.detail.update.sections.links")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.coverImageUrl")}
                    </span>
                    <input
                      value={form.coverImageUrl}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, coverImageUrl: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.coverImageUrl")}
                      className={controlClassName("coverImageUrl")}
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.thumbnailUrl")}
                    </span>
                    <input
                      value={form.thumbnailUrl}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, thumbnailUrl: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.thumbnailUrl")}
                      className={controlClassName("thumbnailUrl")}
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.meetingUrl")}
                    </span>
                    <input
                      value={form.meetingUrl}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, meetingUrl: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.meetingUrl")}
                      className={controlClassName("meetingUrl")}
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.update.fields.whatsappGroupUrl")}
                    </span>
                    <input
                      value={form.whatsappGroupUrl}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, whatsappGroupUrl: event.target.value } : current,
                        )
                      }
                      placeholder={t("admin.detail.update.placeholders.whatsappGroupUrl")}
                      className={controlClassName("whatsappGroupUrl")}
                    />
                  </label>
                </div>
              </section>
            </div>
          ) : null}

          {feedback ? (
            <p
              className={`mt-4 text-sm ${
                feedback.tone === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={updateMutation.isPending}>
            {t("admin.detail.update.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            startIcon={<Pencil className="h-4 w-4" />}
          >
            {updateMutation.isPending ? t("admin.detail.update.submitting") : t("admin.detail.update.submit")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
