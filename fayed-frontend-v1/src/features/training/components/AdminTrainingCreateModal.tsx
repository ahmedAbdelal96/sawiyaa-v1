"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useCreateAdminTraining } from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import type { CourseType, CourseVisibility } from "../types/training.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type CreateTrainingForm = {
  locale: string;
  title: string;
  courseType: CourseType;
  visibility: CourseVisibility;
  shortDescription: string;
  fullDescription: string;
};

const COURSE_TYPES: CourseType[] = ["LIVE_COURSE", "LIVE_WORKSHOP", "LIVE_SERIES"];
const COURSE_VISIBILITIES: CourseVisibility[] = ["PUBLIC", "PRIVATE"];

function createInitialForm(locale: string): CreateTrainingForm {
  return {
    locale: locale.startsWith("ar") ? "ar" : "en",
    title: "",
    courseType: "LIVE_COURSE" as CourseType,
    visibility: "PUBLIC" as CourseVisibility,
    shortDescription: "",
    fullDescription: "",
  };
}

export default function AdminTrainingCreateModal({ isOpen, onClose }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const router = useRouter();
  const createMutation = useCreateAdminTraining();

  const [form, setForm] = useState<CreateTrainingForm>(() => createInitialForm(locale));
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setForm((current) => ({
      ...current,
      locale: locale.startsWith("ar") ? "ar" : "en",
    }));
  }, [isOpen, locale]);

  const resetForm = () => {
    setForm(createInitialForm(locale));
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!form.title.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.create.validation.required"),
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        locale: form.locale,
        title: form.title.trim(),
        courseType: form.courseType,
        visibility: form.visibility,
        shortDescription: form.shortDescription.trim() || undefined,
        fullDescription: form.fullDescription.trim() || undefined,
      });
      resetForm();
      onClose();
      router.push(`/admin/training/${result.id}` as never);
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
      onClose={() => {
        resetForm();
        onClose();
      }}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.create.label")}
          title={t("admin.create.heading")}
          description={t("admin.create.note")}
        />

        <ModalBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.locale")}
              </span>
              <select
                value={form.locale}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    locale: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                <option value="ar">{t("admin.create.locales.ar")}</option>
                <option value="en">{t("admin.create.locales.en")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.courseType")}
              </span>
              <select
                value={form.courseType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseType: event.target.value as CourseType,
                  }))
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

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.title")}
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.title")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
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
                {t("admin.create.fields.shortDescription")}
              </span>
              <input
                value={form.shortDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shortDescription: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.shortDescription")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
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
                  setForm((current) => ({
                    ...current,
                    fullDescription: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.fullDescription")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>
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
          <Button variant="outline" onClick={() => {
            resetForm();
            onClose();
          }} disabled={createMutation.isPending}>
            {t("admin.create.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            startIcon={<Plus className="h-4 w-4" />}
          >
            {createMutation.isPending ? t("admin.create.submitting") : t("admin.create.submit")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
