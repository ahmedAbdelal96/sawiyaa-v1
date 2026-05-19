"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useCreateAdminAcademyCourseLecture } from "../hooks/use-academy";
import { getAdminAcademyErrorKey } from "../lib/academy-errors";
import { getAcademyLectureFieldIssues, type AcademyLectureFieldKey } from "../lib/academy-lecture-form-errors";
import type { AcademyCourseItem } from "../types/academy.types";

type Props = {
  isOpen: boolean;
  course: AcademyCourseItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

type LectureForm = {
  lectureOrder: string;
  lectureTitle: string;
  startsAt: string;
  durationMinutes: string;
};

const DURATION_OPTIONS = [30, 60, 90, 120] as const;
type AcademyTranslator = (key: string, values?: Record<string, string | number>) => string;

function localIsoToInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function inputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createInitialForm(course: AcademyCourseItem | null): LectureForm {
  return {
    lectureOrder: String((course?.lectures?.length ?? 0) + 1),
    lectureTitle: "",
    startsAt: "",
    durationMinutes: "60",
  };
}

function fieldClassName(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-text-primary outline-none transition",
    hasError ? "border-rose-300 bg-rose-50/50 focus:border-rose-400" : "border-border-light focus:border-primary/35",
  ].join(" ");
}

function getFieldIssueMessage(
  t: AcademyTranslator,
  field: AcademyLectureFieldKey,
  issue: string | undefined,
) {
  if (!issue) return null;
  if (field === "lectureOrder" && issue === "required") return t("admin.detail.lectures.validation.orderRequired");
  if (field === "lectureOrder" && issue === "orderTaken") return t("admin.detail.lectures.validation.orderTaken");
  if (field === "lectureOrder" && issue === "limitReached") return t("admin.detail.lectures.validation.limitReached");
  if ((field === "startsAt" || field === "endsAt") && issue === "required")
    return t("admin.detail.lectures.validation.windowRequired");
  if ((field === "startsAt" || field === "endsAt") && issue === "invalidWindow")
    return t("admin.detail.lectures.validation.invalidWindow");
  if (field === "lectureTitle" && issue === "required") return t("admin.detail.lectures.validation.titleRequired");
  return null;
}

function AdminAcademyLectureCreateForm({ course, onClose, onSuccess }: Omit<Props, "isOpen">) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const createLecture = useCreateAdminAcademyCourseLecture();
  const [form, setForm] = useState<LectureForm>(() => createInitialForm(course));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AcademyLectureFieldKey, string>>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const startPreview = useMemo(() => inputToIso(form.startsAt), [form.startsAt]);
  const endPreview = useMemo(() => {
    if (!startPreview) return null;
    const duration = Number.parseInt(form.durationMinutes, 10);
    if (!Number.isFinite(duration) || duration < 1) return null;
    return new Date(new Date(startPreview).getTime() + duration * 60 * 1000).toISOString();
  }, [form.durationMinutes, startPreview]);

  const canAddMoreLectures =
    typeof course?.plannedLectureCount === "number"
      ? (course.lectures?.length ?? 0) < course.plannedLectureCount
      : false;
  const lectureCountNote =
    course?.plannedLectureCount && course?.lectures
      ? t("admin.detail.lectures.capacityNote", {
          created: course.lectures.length,
          expected: course.plannedLectureCount,
        })
      : null;

  const resetAndClose = () => {
    setFieldErrors({});
    setFeedback(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    setFeedback(null);
    setFieldErrors({});

    if (!canAddMoreLectures) {
      setFeedback(t("admin.detail.lectures.validation.limitReached"));
      return;
    }

    const order = Number.parseInt(form.lectureOrder.trim(), 10);
    if (!Number.isInteger(order) || order < 1) {
      setFieldErrors({ lectureOrder: "required" });
      return;
    }

    if (!form.startsAt.trim()) {
      setFieldErrors({ startsAt: "required" });
      return;
    }

    const startsAt = inputToIso(form.startsAt);
    if (!startsAt || !endPreview) {
      setFieldErrors({ startsAt: "invalidWindow" });
      return;
    }

    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endPreview);
    if (!(startsAtDate < endsAtDate)) {
      setFieldErrors({ startsAt: "invalidWindow", endsAt: "invalidWindow" });
      return;
    }

    if (course.startsAt && startsAtDate < new Date(course.startsAt)) {
      setFieldErrors({ startsAt: "invalidWindow" });
      return;
    }

    if (course.endsAt && endsAtDate > new Date(course.endsAt)) {
      setFieldErrors({ endsAt: "invalidWindow" });
      return;
    }

    try {
      await createLecture.mutateAsync({
        courseId: course.id,
        input: {
          lectureOrder: order,
          lectureTitle: form.lectureTitle.trim() || undefined,
          startsAt,
          endsAt: endPreview,
        },
      });
      onSuccess();
      resetAndClose();
    } catch (error) {
      const issueFields = getAcademyLectureFieldIssues(error);
      if (Object.keys(issueFields).length > 0) {
        const nextFieldErrors: Partial<Record<AcademyLectureFieldKey, string>> = {};
        for (const [field, issue] of Object.entries(issueFields) as Array<
          [AcademyLectureFieldKey, string]
        >) {
          const message = getFieldIssueMessage(t, field, issue);
          if (message) {
            nextFieldErrors[field] = message;
          }
        }
        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length > 0) return;
      }
      setFeedback(t(getAdminAcademyErrorKey(error) as Parameters<typeof t>[0]));
    }
  };

  return (
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.detail.lectures.create.eyebrow")}
          title={course ? t("admin.detail.lectures.create.title", { title: course.title }) : t("admin.detail.lectures.create.titleFallback")}
          description={t("admin.detail.lectures.create.note")}
        />

        <ModalBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.lectures.create.fields.lectureOrder")}
              </span>
              <input
                type="number"
                min={1}
                value={form.lectureOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lectureOrder: event.target.value }))
                }
                className={fieldClassName(Boolean(fieldErrors.lectureOrder))}
              />
              {fieldErrors.lectureOrder ? (
                <p className="mt-2 text-xs text-rose-600">{fieldErrors.lectureOrder}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.lectures.create.fields.lectureTitle")}
              </span>
              <input
                value={form.lectureTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lectureTitle: event.target.value }))
                }
                placeholder={t("admin.detail.lectures.create.placeholders.lectureTitle")}
                className={fieldClassName(Boolean(fieldErrors.lectureTitle))}
              />
              {fieldErrors.lectureTitle ? (
                <p className="mt-2 text-xs text-rose-600">{fieldErrors.lectureTitle}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.lectures.create.fields.startsAt")}
              </span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startsAt: event.target.value }))
                }
                min={localIsoToInput(course?.startsAt ?? null)}
                max={localIsoToInput(course?.endsAt ?? null)}
                className={fieldClassName(Boolean(fieldErrors.startsAt))}
              />
              {fieldErrors.startsAt ? (
                <p className="mt-2 text-xs text-rose-600">{fieldErrors.startsAt}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.lectures.create.fields.durationMinutes")}
              </span>
              <select
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, durationMinutes: event.target.value }))
                }
                className={fieldClassName(false)}
              >
                {DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {t("admin.detail.lectures.create.durationOption", { duration })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.lectures.create.fields.endsAt")}
            </div>
            <div className="mt-2 font-semibold text-text-primary">
              {endPreview
                ? new Date(endPreview).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: !locale.startsWith("ar"),
                  })
                : t("admin.detail.lectures.create.endsAtPreview")}
            </div>
            <p className="mt-2 text-xs leading-6 text-text-muted">
              {t("admin.detail.lectures.create.endsAtHelper")}
            </p>
            {fieldErrors.endsAt ? (
              <p className="mt-2 text-xs text-rose-600">{fieldErrors.endsAt}</p>
            ) : null}
          </div>

          {lectureCountNote ? (
            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-text-secondary">
              {lectureCountNote}
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {feedback}
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {t("admin.detail.lectures.create.cancel")}
            </Button>
            <Button type="submit" disabled={createLecture.isPending || !canAddMoreLectures}>
              {createLecture.isPending
                ? t("admin.detail.lectures.create.submitting")
                : t("admin.detail.lectures.create.submit")}
            </Button>
          </div>
        </ModalFooter>
      </form>
  );
}

export default function AdminAcademyLectureCreateModal({
  isOpen,
  course,
  onClose,
  onSuccess,
}: Props) {
  const locale = useLocale();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {isOpen ? (
        <AdminAcademyLectureCreateForm
          key={`${locale}:${course?.id ?? "none"}`}
          course={course}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Modal>
  );
}
