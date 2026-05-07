"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useCreateAdminAcademyCourse } from "../hooks/use-academy";
import { getAcademyPlanFieldIssues, type AcademyPlanFieldIssue } from "../lib/academy-form-errors";
import { getAdminAcademyErrorKey } from "../lib/academy-errors";
import type { CourseVisibility } from "../types/academy.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type CreateCourseForm = {
  title: string;
  visibility: CourseVisibility;
  shortDescription: string;
  fullDescription: string;
  priceAmountEgp: string;
  priceAmountUsd: string;
  plannedDurationDays: string;
  plannedLectureCount: string;
  startsAt: string;
};

const COURSE_VISIBILITIES: CourseVisibility[] = ["PUBLIC", "PRIVATE"];

function createInitialForm(): CreateCourseForm {
  return {
    title: "",
    visibility: "PUBLIC" as CourseVisibility,
    shortDescription: "",
    fullDescription: "",
    priceAmountEgp: "",
    priceAmountUsd: "",
    plannedDurationDays: "",
    plannedLectureCount: "",
    startsAt: "",
  };
}

function localDateTimeToIso(value: string) {
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

export default function AdminAcademyCreateModal({ isOpen, onClose }: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const createMutation = useCreateAdminAcademyCourse();

  const [form, setForm] = useState<CreateCourseForm>(() => createInitialForm());
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateCourseForm, string>>>(
    {},
  );

  const resolvePlanFieldMessage = (
    field: keyof CreateCourseForm,
    issue: AcademyPlanFieldIssue,
  ) => {
    if (field === "plannedDurationDays") {
      return issue === "required"
        ? t("admin.create.validation.durationRequired")
        : t("admin.create.validation.invalidDuration");
    }

    if (field === "plannedLectureCount") {
      return issue === "required"
        ? t("admin.create.validation.lectureCountRequired")
        : t("admin.create.validation.invalidLectureCount");
    }

    if (field === "startsAt") {
      return t("admin.create.validation.startsAtRequired");
    }

    return t("admin.create.validation.required");
  };

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setFieldErrors({});
    setForm(createInitialForm());
  }, [isOpen, locale]);

  const resetAndClose = () => {
    setForm(createInitialForm());
    setFeedback(null);
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setFieldErrors({});

    const title = form.title.trim();
    const egpPrice = form.priceAmountEgp.trim();
    const usdPrice = form.priceAmountUsd.trim();
    const pricePattern = /^\d+(\.\d{1,2})?$/;
    const duration = Number.parseInt(form.plannedDurationDays.trim(), 10);
    const lectureCount = Number.parseInt(form.plannedLectureCount.trim(), 10);
    const startsAt = localDateTimeToIso(form.startsAt.trim());
    const nextFieldErrors: Partial<Record<keyof CreateCourseForm, string>> = {};

    if (!title) {
      nextFieldErrors.title = t("admin.create.validation.required");
    }

    if (egpPrice && !pricePattern.test(egpPrice)) {
      nextFieldErrors.priceAmountEgp = t("admin.create.validation.price");
    }

    if (usdPrice && !pricePattern.test(usdPrice)) {
      nextFieldErrors.priceAmountUsd = t("admin.create.validation.price");
    }

    if (!Number.isFinite(duration) || duration < 1) {
      nextFieldErrors.plannedDurationDays = t("admin.create.validation.durationRequired");
    }

    if (!Number.isFinite(lectureCount) || lectureCount < 1) {
      nextFieldErrors.plannedLectureCount = t("admin.create.validation.lectureCountRequired");
    }

    if (!startsAt) {
      nextFieldErrors.startsAt = t("admin.create.validation.startsAtRequired");
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
      const result = await createMutation.mutateAsync({
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
      });
      resetAndClose();
      router.push(`/admin/academy/${result.id}` as never);
    } catch (error) {
      const planFieldIssues = getAcademyPlanFieldIssues(error);
      if (Object.keys(planFieldIssues).length > 0) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(planFieldIssues).map(([field, issue]) => [
              field,
              resolvePlanFieldMessage(field as keyof CreateCourseForm, issue as AcademyPlanFieldIssue),
            ]),
          ) as Partial<Record<keyof CreateCourseForm, string>>,
        );
        return;
      }

      setFeedback({
        tone: "error",
        message: t(getAdminAcademyErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const controlClassName = (field: keyof CreateCourseForm) =>
    `w-full rounded-2xl border bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 ${
      fieldErrors[field] ? "border-rose-400" : "border-border-light"
    }`;

  const derivedEndsAt = useMemo(() => {
    const startsAt = localDateTimeToIso(form.startsAt.trim());
    const duration = Number.parseInt(form.plannedDurationDays.trim(), 10);
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
  }, [form.plannedDurationDays, form.startsAt, locale]);

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} size="xl">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.create.badge")}
          title={t("admin.create.title")}
          description={t("admin.create.note")}
        />

        <ModalBody>
          <div className="space-y-4">
            <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("admin.create.sections.basics")}
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.title")}
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder={t("admin.create.placeholders.title")}
                    className={controlClassName("title")}
                  />
                  {fieldErrors.title ? (
                    <p className="mt-2 text-xs text-rose-600">{fieldErrors.title}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.visibility")}
                  </span>
                  <select
                    value={form.visibility}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visibility: event.target.value as CourseVisibility,
                      }))
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
                    {t("admin.create.fields.shortDescription")}
                  </span>
                  <input
                    value={form.shortDescription}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, shortDescription: event.target.value }))
                    }
                    placeholder={t("admin.create.placeholders.shortDescription")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.fullDescription")}
                  </span>
                  <textarea
                    rows={4}
                    value={form.fullDescription}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fullDescription: event.target.value }))
                    }
                    placeholder={t("admin.create.placeholders.fullDescription")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("admin.create.sections.planning")}
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.plannedDurationDays")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.plannedDurationDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        plannedDurationDays: event.target.value,
                      }))
                    }
                    placeholder={t("admin.create.placeholders.plannedDurationDays")}
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
                    {t("admin.create.fields.plannedLectureCount")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.plannedLectureCount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        plannedLectureCount: event.target.value,
                      }))
                    }
                    placeholder={t("admin.create.placeholders.plannedLectureCount")}
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
                    {t("admin.create.fields.startsAt")}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startsAt: event.target.value }))
                    }
                    className={controlClassName("startsAt")}
                  />
                  {fieldErrors.startsAt ? (
                    <p className="mt-2 text-xs text-rose-600">{fieldErrors.startsAt}</p>
                  ) : null}
                </label>

                <div className="block rounded-2xl border border-dashed border-border-light bg-white px-4 py-3">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.endsAtPreview")}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {derivedEndsAt || t("admin.create.placeholders.endsAtPreview")}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t("admin.create.endsAtPreviewHelper")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border-light bg-surface-secondary/55 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("admin.create.sections.pricing")}
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.priceAmountEgp")}
                  </span>
                  <input
                    value={form.priceAmountEgp}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priceAmountEgp: event.target.value }))
                    }
                    placeholder={t("admin.create.placeholders.priceAmountEgp")}
                    className={controlClassName("priceAmountEgp")}
                  />
                  {fieldErrors.priceAmountEgp ? (
                    <p className="mt-2 text-xs text-rose-600">{fieldErrors.priceAmountEgp}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.create.fields.priceAmountUsd")}
                  </span>
                  <input
                    value={form.priceAmountUsd}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priceAmountUsd: event.target.value }))
                    }
                    placeholder={t("admin.create.placeholders.priceAmountUsd")}
                    className={controlClassName("priceAmountUsd")}
                  />
                  {fieldErrors.priceAmountUsd ? (
                    <p className="mt-2 text-xs text-rose-600">{fieldErrors.priceAmountUsd}</p>
                  ) : null}
                </label>
              </div>
            </section>
          </div>

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
          <Button variant="outline" onClick={resetAndClose} disabled={createMutation.isPending}>
            {t("admin.create.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            startIcon={<Plus className="h-4 w-4" />}
          >
            {createMutation.isPending ? t("admin.create.saving") : t("admin.create.submit")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
