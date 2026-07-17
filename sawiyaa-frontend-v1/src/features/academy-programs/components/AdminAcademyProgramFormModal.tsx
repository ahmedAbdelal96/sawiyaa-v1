"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageUp, Loader2, Save, Sparkles } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import FieldErrorMessage from "@/components/form/error/FieldErrorMessage";
import {
  useCreateAdminAcademyProgram,
  useUpdateAdminAcademyProgram,
  useUploadAdminAcademyProgramCover,
} from "../hooks/use-academy-programs";
import {
  getAcademyProgramCourseFieldErrorKeys,
  getAcademyProgramCoverUploadErrorKey,
  getAcademyProgramErrorKey,
} from "../lib/academy-program-errors";
import type {
  AcademyProgramItem,
  CreateAcademyProgramInput,
} from "../types/academy-programs.types";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  program?: AcademyProgramItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type FormState = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  priceEgp: string;
  priceUsd: string;
  coverImageUrl: string;
  registrationOpen: boolean;
  maxSeats: string;
  startAt: string;
  endAt: string;
};

const EMPTY_FORM: FormState = {
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  priceEgp: "",
  priceUsd: "",
  coverImageUrl: "",
  registrationOpen: true,
  maxSeats: "",
  startAt: "",
  endAt: "",
};

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function toFormState(program: AcademyProgramItem): FormState {
  return {
    titleAr: program.titleAr ?? "",
    titleEn: program.titleEn ?? "",
    descriptionAr: program.descriptionAr ?? "",
    descriptionEn: program.descriptionEn ?? "",
    priceEgp: program.priceEgp ?? "",
    priceUsd: program.priceUsd ?? "",
    coverImageUrl: program.coverImageUrl ?? "",
    registrationOpen: program.registrationOpen,
    maxSeats: program.maxSeats?.toString() ?? "",
    startAt: toDatetimeLocalValue(program.startAt),
    endAt: toDatetimeLocalValue(program.endAt),
  };
}

export default function AdminAcademyProgramFormModal({
  isOpen,
  mode,
  program,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("academy");
  const createMutation = useCreateAdminAcademyProgram();
  const updateMutation = useUpdateAdminAcademyProgram();
  const uploadCoverMutation = useUploadAdminAcademyProgramCover();
  const [form, setForm] = useState<FormState>(() =>
    mode === "edit" && program ? toFormState(program) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const translateFieldErrorKeys = (nextFieldErrorKeys: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(nextFieldErrorKeys).map(([field, key]) => [
        field,
        t(key as Parameters<typeof t>[0]),
      ]),
    ) as Partial<Record<keyof FormState, string>>;

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedMimeTypes.has(file.type)) {
      const message = t("programs.errors.coverInvalidType");
      setFieldErrors((current) => ({ ...current, coverImageUrl: message }));
      setError(message);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const message = t("programs.errors.coverFileTooLarge");
      setFieldErrors((current) => ({ ...current, coverImageUrl: message }));
      setError(message);
      return;
    }

    try {
      setError(null);
      setFieldErrors((current) => ({ ...current, coverImageUrl: undefined }));
      const result = await uploadCoverMutation.mutateAsync(file);
      setForm((current) => ({ ...current, coverImageUrl: result.url }));
    } catch (error) {
      const errorKey = getAcademyProgramCoverUploadErrorKey(error);
      const message = t(errorKey as Parameters<typeof t>[0]);
      setFieldErrors((current) => ({ ...current, coverImageUrl: message }));
      setError(message);
    }
  };

  const handleSubmit = async () => {
    const titleAr = form.titleAr.trim();
    const titleEn = form.titleEn.trim();
    const descriptionAr = form.descriptionAr.trim();
    const descriptionEn = form.descriptionEn.trim();
    const startAt = form.startAt.trim();
    const endAt = form.endAt.trim();
    const priceEgp = form.priceEgp.trim();
    const priceUsd = form.priceUsd.trim();
    const maxSeats = form.maxSeats.trim();

    const nextFieldErrors: Partial<Record<keyof FormState, string>> = {};
    if (!titleAr) nextFieldErrors.titleAr = t("programs.form.validation.titleArRequired");
    if (!titleEn) nextFieldErrors.titleEn = t("programs.form.validation.titleEnRequired");
    if (!descriptionAr) nextFieldErrors.descriptionAr = t("programs.form.validation.descriptionArRequired");
    if (!descriptionEn) nextFieldErrors.descriptionEn = t("programs.form.validation.descriptionEnRequired");
    if (!priceEgp) nextFieldErrors.priceEgp = t("programs.form.validation.priceEgpRequired");
    if (!priceUsd) nextFieldErrors.priceUsd = t("programs.form.validation.priceUsdRequired");
    if (!startAt) nextFieldErrors.startAt = t("programs.form.validation.startAtRequired");
    if (!endAt) nextFieldErrors.endAt = t("programs.form.validation.endAtRequired");
    const startAtDate = startAt ? new Date(startAt) : null;
    const endAtDate = endAt ? new Date(endAt) : null;
    if (startAt && startAtDate && Number.isNaN(startAtDate.getTime())) {
      nextFieldErrors.startAt = t("programs.form.validation.invalidDate");
    }
    if (endAt && endAtDate && Number.isNaN(endAtDate.getTime())) {
      nextFieldErrors.endAt = t("programs.form.validation.invalidDate");
    }
    if (
      startAtDate &&
      endAtDate &&
      !Number.isNaN(startAtDate.getTime()) &&
      !Number.isNaN(endAtDate.getTime()) &&
      endAtDate.getTime() <= startAtDate.getTime()
    ) {
      nextFieldErrors.endAt = t("programs.form.validation.invalidWindow");
    }

    if (priceEgp) {
      const parsedPriceEgp = Number(priceEgp);
      if (!Number.isFinite(parsedPriceEgp)) {
        nextFieldErrors.priceEgp = t("programs.form.validation.invalidPrice");
      } else if (parsedPriceEgp < 0) {
        nextFieldErrors.priceEgp = t("programs.form.validation.negativePrice");
      }
    }

    if (priceUsd) {
      const parsedPriceUsd = Number(priceUsd);
      if (!Number.isFinite(parsedPriceUsd)) {
        nextFieldErrors.priceUsd = t("programs.form.validation.invalidPrice");
      } else if (parsedPriceUsd < 0) {
        nextFieldErrors.priceUsd = t("programs.form.validation.negativePrice");
      }
    }

    if (maxSeats) {
      const parsedMaxSeats = Number(maxSeats);
      if (!Number.isInteger(parsedMaxSeats)) {
        nextFieldErrors.maxSeats = t("programs.form.validation.invalidTargetLearners");
      } else if (parsedMaxSeats <= 0) {
        nextFieldErrors.maxSeats = t("programs.form.validation.targetLearnersPositive");
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(null);
      return;
    }

    const maxSeatsValue = maxSeats ? Number(maxSeats) : undefined;

    const payload: CreateAcademyProgramInput = {
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      categoryId: mode === "edit" ? program?.categoryId ?? undefined : undefined,
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      priceEgp,
      priceUsd,
      registrationOpen: form.registrationOpen,
      maxSeats: Number.isFinite(maxSeatsValue ?? Number.NaN) ? maxSeatsValue : undefined,
      startAt: fromDatetimeLocalValue(startAt),
      endAt: fromDatetimeLocalValue(endAt),
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        onSuccess(t("programs.form.createSuccess"));
      } else if (program) {
        await updateMutation.mutateAsync({
          programId: program.id,
          input: payload,
        });
        onSuccess(t("programs.form.updateSuccess"));
      }
      onClose();
    } catch (error) {
      const fieldErrorKeys = getAcademyProgramCourseFieldErrorKeys(error);
      if (Object.keys(fieldErrorKeys).length > 0) {
        setFieldErrors((current) => ({ ...current, ...translateFieldErrorKeys(fieldErrorKeys) }));
        setError(null);
        return;
      }

      const errorKey = getAcademyProgramErrorKey(error);
      setError(t(errorKey as Parameters<typeof t>[0]));
    }
  };

  const submitLabel = isSubmitting ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {mode === "create" ? t("programs.form.creating") : t("programs.form.saving")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2">
      <Save className="h-4 w-4" />
      {mode === "create" ? t("programs.form.create") : t("programs.form.save")}
    </span>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={mode === "create" ? t("programs.form.createTitle") : t("programs.form.editTitle")}
      description={mode === "create" ? t("programs.form.createNote") : t("programs.form.editNote")}
      eyebrow={t("programs.badge")}
      loading={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      cancelLabel={t("programs.form.cancel")}
    >
      <div className="space-y-4">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("programs.form.sections.basic")}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.titleAr")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                value={form.titleAr}
                error={Boolean(fieldErrors.titleAr)}
                hint={fieldErrors.titleAr}
                onChange={(event) => updateField("titleAr", event.target.value)}
                placeholder={t("programs.form.placeholders.titleAr")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.titleEn")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                value={form.titleEn}
                error={Boolean(fieldErrors.titleEn)}
                hint={fieldErrors.titleEn}
                onChange={(event) => updateField("titleEn", event.target.value)}
                placeholder={t("programs.form.placeholders.titleEn")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.descriptionAr")} <span className="text-status-danger">*</span>
              </Label>
              <TextArea
                value={form.descriptionAr}
                error={Boolean(fieldErrors.descriptionAr)}
                hint={fieldErrors.descriptionAr}
                onChange={(value) => updateField("descriptionAr", value)}
                rows={2}
                placeholder={t("programs.form.placeholders.descriptionAr")}
                className="min-h-[72px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.descriptionEn")} <span className="text-status-danger">*</span>
              </Label>
              <TextArea
                value={form.descriptionEn}
                error={Boolean(fieldErrors.descriptionEn)}
                hint={fieldErrors.descriptionEn}
                onChange={(value) => updateField("descriptionEn", value)}
                rows={2}
                placeholder={t("programs.form.placeholders.descriptionEn")}
                className="min-h-[72px]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.coverImage")}
              </Label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-light px-4 py-3 text-sm text-text-secondary transition hover:bg-surface-secondary">
                  <ImageUp className="h-4 w-4" />
                  <span>
                    {uploadCoverMutation.isPending
                      ? t("programs.form.coverUpload.uploading")
                      : form.coverImageUrl
                        ? t("programs.form.coverUpload.change")
                        : t("programs.form.coverUpload.choose")}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadCoverMutation.isPending}
                    onChange={(event) => {
                      void handleCoverUpload(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-text-muted">{t("programs.form.coverUpload.hint")}</p>
                {form.coverImageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-border-light bg-surface-tertiary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.coverImageUrl}
                      alt={t("programs.form.fields.coverImage")}
                      className="max-h-56 w-full object-contain bg-white p-2"
                    />
                  </div>
                ) : null}
                <FieldErrorMessage message={fieldErrors.coverImageUrl} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold text-text-primary">
            {t("programs.form.sections.pricing")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.priceEgp")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                type="number"
                step="0.01"
                value={form.priceEgp}
                error={Boolean(fieldErrors.priceEgp)}
                hint={fieldErrors.priceEgp}
                onChange={(event) => updateField("priceEgp", event.target.value)}
                placeholder={t("programs.form.placeholders.priceEgp")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.priceUsd")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                type="number"
                step="0.01"
                value={form.priceUsd}
                error={Boolean(fieldErrors.priceUsd)}
                hint={fieldErrors.priceUsd}
                onChange={(event) => updateField("priceUsd", event.target.value)}
                placeholder={t("programs.form.placeholders.priceUsd")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold text-text-primary">
            {t("programs.form.sections.schedule")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.startAt")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                type="datetime-local"
                value={form.startAt}
                error={Boolean(fieldErrors.startAt)}
                hint={fieldErrors.startAt}
                onChange={(event) => updateField("startAt", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.endAt")} <span className="text-status-danger">*</span>
              </Label>
              <InputField
                type="datetime-local"
                value={form.endAt}
                error={Boolean(fieldErrors.endAt)}
                hint={fieldErrors.endAt}
                onChange={(event) => updateField("endAt", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.form.fields.targetLearners")}
              </Label>
              <InputField
                type="number"
                min={1}
                value={form.maxSeats}
                error={Boolean(fieldErrors.maxSeats)}
                hint={fieldErrors.maxSeats}
                onChange={(event) => updateField("maxSeats", event.target.value)}
                placeholder={t("programs.form.placeholders.targetLearners")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary opacity-0 select-none">
                {t("programs.form.sections.registration")}
              </Label>
              <label className="flex h-[42px] items-center gap-3 rounded-xl border border-border-light bg-surface-tertiary px-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.registrationOpen}
                  onChange={(event) => updateField("registrationOpen", event.target.checked)}
                  className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
                />
                <span>{t("programs.form.fields.registrationOpenHint")}</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-status-danger-border bg-status-danger-soft px-4 py-3 text-sm text-status-danger">
          {error}
        </p>
      ) : null}
    </FormModal>
  );
}
