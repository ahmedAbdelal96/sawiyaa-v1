"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useUpdateAdminTraining } from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import type {
  AdminTrainingItem,
  CourseType,
  CourseVisibility,
} from "../types/training.types";

type Props = {
  isOpen: boolean;
  training: AdminTrainingItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

type UpdateTrainingForm = {
  locale: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  courseType: CourseType;
  visibility: CourseVisibility;
};

const COURSE_TYPES: CourseType[] = ["LIVE_COURSE", "LIVE_WORKSHOP", "LIVE_SERIES"];
const COURSE_VISIBILITIES: CourseVisibility[] = ["PUBLIC", "PRIVATE"];

function createInitialForm(training: AdminTrainingItem, locale: string): UpdateTrainingForm {
  return {
    locale: training.locale ?? (locale.startsWith("ar") ? "ar" : "en"),
    title: training.title ?? "",
    slug: training.slug ?? "",
    shortDescription: training.shortDescription ?? "",
    fullDescription: training.fullDescription ?? "",
    courseType: training.courseType as CourseType,
    visibility: training.visibility as CourseVisibility,
  };
}

export default function AdminTrainingUpdateModal({
  isOpen,
  training,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const updateTraining = useUpdateAdminTraining();

  const [form, setForm] = useState<UpdateTrainingForm | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !training) return;
    queueMicrotask(() => {
      setFeedback(null);
      setForm(createInitialForm(training, locale));
    });
  }, [isOpen, training, locale]);

  const resetAndClose = () => {
    setForm(null);
    setFeedback(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!training || !form) return;

    setFeedback(null);

    if (!form.title.trim() || !form.slug.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.update.validation.required"),
      });
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.update.validation.slug"),
      });
      return;
    }

    try {
      await updateTraining.mutateAsync({
        trainingId: training.id,
        input: {
          locale: form.locale,
          title: form.title.trim(),
          slug: form.slug.trim(),
          shortDescription: form.shortDescription.trim(),
          fullDescription: form.fullDescription.trim(),
          courseType: form.courseType,
          visibility: form.visibility,
        },
      });
      onSuccess();
      resetAndClose();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.detail.sections.update")}
          title={training?.title ?? t("admin.detail.sections.update")}
          description={t("admin.detail.update.note")}
        />

        <ModalBody>
          {form ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("admin.detail.update.fields.locale")}
                </span>
                <select
                  value={form.locale}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, locale: event.target.value }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                >
                  <option value="ar">{t("admin.detail.update.locales.ar")}</option>
                  <option value="en">{t("admin.detail.update.locales.en")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("admin.detail.update.fields.courseType")}
                </span>
                <select
                  value={form.courseType}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, courseType: event.target.value as CourseType }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                >
                  {COURSE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`courseTypes.${type}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("admin.detail.update.fields.title")}
                </span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, title: event.target.value }
                        : current,
                    )
                  }
                  placeholder={t("admin.detail.update.placeholders.title")}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("admin.detail.update.fields.slug")}
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, slug: event.target.value } : current,
                    )
                  }
                  placeholder={t("admin.detail.update.placeholders.slug")}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("admin.detail.update.fields.visibility")}
                </span>
                <select
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, visibility: event.target.value as CourseVisibility }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
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
                      current
                        ? { ...current, shortDescription: event.target.value }
                        : current,
                    )
                  }
                  placeholder={t("admin.detail.update.placeholders.shortDescription")}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
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
                      current
                        ? { ...current, fullDescription: event.target.value }
                        : current,
                    )
                  }
                  placeholder={t("admin.detail.update.placeholders.fullDescription")}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />
              </label>
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
          <Button variant="outline" onClick={resetAndClose} disabled={updateTraining.isPending}>
            {t("admin.create.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={updateTraining.isPending}
            startIcon={<Pencil className="h-4 w-4" />}
          >
            {updateTraining.isPending
              ? t("admin.detail.update.submitting")
              : t("admin.detail.update.submit")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
