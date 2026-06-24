"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
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
    queueMicrotask(() => {
      setFeedback(null);
      setForm((current) => ({
        ...current,
        locale: locale.startsWith("ar") ? "ar" : "en",
      }));
    });
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

  const localeOptions = useMemo(
    () => [
      { value: "ar", label: t("admin.create.locales.ar") },
      { value: "en", label: t("admin.create.locales.en") },
    ],
    [t],
  );

  const courseTypeOptions = useMemo(
    () =>
      COURSE_TYPES.map((type) => ({
        value: type,
        label: t(`courseTypes.${type}` as Parameters<typeof t>[0]),
      })),
    [t],
  );

  const visibilityOptions = useMemo(
    () =>
      COURSE_VISIBILITIES.map((value) => ({
        value,
        label: t(`statuses.visibility.${value}` as Parameters<typeof t>[0]),
      })),
    [t],
  );

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
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.locale")}
              </span>
              <Select
                key={`locale-${form.locale}`}
                defaultValue={form.locale}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    locale: value,
                  }))
                }
                options={localeOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.courseType")}
              </span>
              <Select
                key={`courseType-${form.courseType}`}
                defaultValue={form.courseType}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    courseType: value as CourseType,
                  }))
                }
                options={courseTypeOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.title")}
              </span>
              <InputField
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.title")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.visibility")}
              </span>
              <Select
                key={`visibility-${form.visibility}`}
                defaultValue={form.visibility}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    visibility: value as CourseVisibility,
                  }))
                }
                options={visibilityOptions}
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.shortDescription")}
              </span>
              <InputField
                value={form.shortDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shortDescription: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.shortDescription")}
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.create.fields.fullDescription")}
              </span>
              <TextArea
                rows={4}
                value={form.fullDescription}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    fullDescription: value,
                  }))
                }
                placeholder={t("admin.create.placeholders.fullDescription")}
              />
            </label>
          </div>

          {feedback ? (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                feedback.tone === "success"
                  ? "border-status-success-border bg-status-success-soft text-status-success"
                  : "border-status-danger-border bg-status-danger-soft text-status-danger"
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
