"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import {
  useCreateAdminAcademyProgramSession,
  useUpdateAdminAcademyProgramSession,
} from "../hooks/use-academy-programs";
import {
  getAcademyProgramErrorKey,
  getAcademyProgramLectureFieldErrorKeys,
} from "../lib/academy-program-errors";
import { resolveAcademyProgramTitle } from "../lib/academy-program-localization";
import type {
  AcademyProgramDeliveryMethod,
  AcademyProgramItem,
  AcademyProgramSessionItem,
  CreateAcademyProgramSessionInput,
} from "../types/academy-programs.types";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  program: AcademyProgramItem;
  session?: AcademyProgramSessionItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type FormState = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  startsAt: string;
  endsAt: string;
  deliveryMethod: AcademyProgramDeliveryMethod | "";
  internalDeliveryNote: string;
  sortOrder: string;
  isPublished: boolean;
};

const EMPTY_FORM: FormState = {
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  startsAt: "",
  endsAt: "",
  deliveryMethod: "",
  internalDeliveryNote: "",
  sortOrder: "0",
  isPublished: false,
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

function fromDatetimeLocalValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toFormState(session: AcademyProgramSessionItem): FormState {
  return {
    titleAr: session.titleAr ?? "",
    titleEn: session.titleEn ?? "",
    descriptionAr: session.descriptionAr ?? "",
    descriptionEn: session.descriptionEn ?? "",
    startsAt: toDatetimeLocalValue(session.startsAt),
    endsAt: toDatetimeLocalValue(session.endsAt),
    deliveryMethod: session.deliveryMethod ?? "",
    internalDeliveryNote: session.internalDeliveryNote ?? "",
    sortOrder: session.sortOrder?.toString() ?? "0",
    isPublished: session.isPublished,
  };
}

export default function AdminAcademyProgramSessionModal({
  isOpen,
  mode,
  program,
  session,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const createMutation = useCreateAdminAcademyProgramSession();
  const updateMutation = useUpdateAdminAcademyProgramSession();
  const [form, setForm] = useState<FormState>(() => (mode === "edit" && session ? toFormState(session) : EMPTY_FORM));
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

  const handleSubmit = async () => {
    const titleAr = form.titleAr.trim();
    const titleEn = form.titleEn.trim();
    const startsAtValue = form.startsAt.trim();
    const endsAtValue = form.endsAt.trim();
    const startsAt = fromDatetimeLocalValue(startsAtValue);
    const endsAt = fromDatetimeLocalValue(endsAtValue);
    const deliveryMethod = form.deliveryMethod || "";

    const nextFieldErrors: Partial<Record<keyof FormState, string>> = {};
    if (!titleAr) nextFieldErrors.titleAr = t("programs.sessionForm.validation.titleArRequired");
    if (!titleEn) nextFieldErrors.titleEn = t("programs.sessionForm.validation.titleEnRequired");
    if (!startsAt) nextFieldErrors.startsAt = t("programs.sessionForm.validation.startsAtRequired");
    if (!endsAt) nextFieldErrors.endsAt = t("programs.sessionForm.validation.endsAtRequired");
    if (!deliveryMethod) {
      nextFieldErrors.deliveryMethod = t("programs.sessionForm.validation.deliveryMethodRequired");
    }
    if (
      startsAt &&
      endsAt &&
      new Date(startsAt).getTime() >= new Date(endsAt).getTime()
    ) {
      nextFieldErrors.endsAt = t("programs.sessionForm.validation.invalidWindow");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(null);
      return;
    }

    const sortOrderValue = form.sortOrder.trim() ? Number(form.sortOrder) : undefined;

    const payload: CreateAcademyProgramSessionInput = {
      titleAr,
      titleEn,
      descriptionAr: form.descriptionAr.trim() || undefined,
      descriptionEn: form.descriptionEn.trim() || undefined,
      startsAt: startsAt ?? "",
      endsAt: endsAt ?? "",
      deliveryMethod: deliveryMethod as AcademyProgramDeliveryMethod,
      internalDeliveryNote: form.internalDeliveryNote.trim() || undefined,
      sortOrder: Number.isFinite(sortOrderValue ?? Number.NaN) ? sortOrderValue : undefined,
      isPublished: form.isPublished,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          programId: program.id,
          input: payload,
        });
        onSuccess(t("programs.sessionForm.createSuccess"));
      } else if (session) {
        await updateMutation.mutateAsync({
          programId: program.id,
          sessionId: session.id,
          input: payload,
        });
        onSuccess(t("programs.sessionForm.updateSuccess"));
      }
      onClose();
    } catch (error) {
      const fieldErrorKeys = getAcademyProgramLectureFieldErrorKeys(error);
      if (Object.keys(fieldErrorKeys).length > 0) {
        setFieldErrors((current) => ({ ...current, ...translateFieldErrorKeys(fieldErrorKeys) }));
        setError(null);
        return;
      }

      const errorKey = getAcademyProgramErrorKey(error);
      setError(t(errorKey as Parameters<typeof t>[0]));
    }
  };

  const deliveryMethodOptions = [
    { value: "ZOOM", label: t("programs.deliveryMethods.ZOOM") },
    { value: "WHATSAPP", label: t("programs.deliveryMethods.WHATSAPP") },
    { value: "GOOGLE_MEET", label: t("programs.deliveryMethods.GOOGLE_MEET") },
    { value: "OFFLINE", label: t("programs.deliveryMethods.OFFLINE") },
    { value: "OTHER", label: t("programs.deliveryMethods.OTHER") },
  ];

  const submitLabel = isSubmitting ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {mode === "create" ? t("programs.sessionForm.creating") : t("programs.sessionForm.saving")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2">
      <Save className="h-4 w-4" />
      {mode === "create" ? t("programs.sessionForm.create") : t("programs.sessionForm.save")}
    </span>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        mode === "create"
          ? t("programs.sessionForm.createTitle", { title: resolveAcademyProgramTitle(program, locale) })
          : t("programs.sessionForm.editTitle", { title: resolveAcademyProgramTitle(program, locale) })
      }
      description={mode === "create" ? t("programs.sessionForm.createNote") : t("programs.sessionForm.editNote")}
      eyebrow={t("programs.badge")}
      loading={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      cancelLabel={t("programs.sessionForm.cancel")}
    >
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.titleAr")} <span className="text-status-danger">*</span>
            </Label>
            <InputField
              value={form.titleAr}
              error={Boolean(fieldErrors.titleAr)}
              hint={fieldErrors.titleAr}
              onChange={(event) => updateField("titleAr", event.target.value)}
              placeholder={t("programs.sessionForm.placeholders.titleAr")}
              className="px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.titleEn")} <span className="text-status-danger">*</span>
            </Label>
            <InputField
              value={form.titleEn}
              error={Boolean(fieldErrors.titleEn)}
              hint={fieldErrors.titleEn}
              onChange={(event) => updateField("titleEn", event.target.value)}
              placeholder={t("programs.sessionForm.placeholders.titleEn")}
              className="px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.startsAt")} <span className="text-status-danger">*</span>
            </Label>
            <InputField
              type="datetime-local"
              value={form.startsAt}
              error={Boolean(fieldErrors.startsAt)}
              hint={fieldErrors.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
              className="px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.endsAt")} <span className="text-status-danger">*</span>
            </Label>
            <InputField
              type="datetime-local"
              value={form.endsAt}
              error={Boolean(fieldErrors.endsAt)}
              hint={fieldErrors.endsAt}
              onChange={(event) => updateField("endsAt", event.target.value)}
              className="px-4 py-3"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.deliveryMethod")} <span className="text-status-danger">*</span>
            </Label>
            <Select
              options={deliveryMethodOptions}
              placeholder={t("programs.sessionForm.placeholders.deliveryMethod")}
              defaultValue={form.deliveryMethod}
              error={Boolean(fieldErrors.deliveryMethod)}
              hint={fieldErrors.deliveryMethod}
              onChange={(value) => updateField("deliveryMethod", value as FormState["deliveryMethod"])}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-medium text-text-primary">
            {t("programs.sessionForm.sections.content")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-text-secondary">
                {t("programs.sessionForm.fields.descriptionAr")}
              </Label>
              <TextArea
                value={form.descriptionAr}
                onChange={(value) => updateField("descriptionAr", value)}
                rows={4}
                placeholder={t("programs.sessionForm.placeholders.descriptionAr")}
                className="min-h-[120px] px-4 py-3"
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-text-secondary">
                {t("programs.sessionForm.fields.descriptionEn")}
              </Label>
              <TextArea
                value={form.descriptionEn}
                onChange={(value) => updateField("descriptionEn", value)}
                rows={4}
                placeholder={t("programs.sessionForm.placeholders.descriptionEn")}
                className="min-h-[120px] px-4 py-3"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="block text-sm font-medium text-text-secondary">
              {t("programs.sessionForm.fields.internalDeliveryNote")}
            </Label>
            <TextArea
              value={form.internalDeliveryNote}
              onChange={(value) => updateField("internalDeliveryNote", value)}
              rows={3}
              placeholder={t("programs.sessionForm.placeholders.internalDeliveryNote")}
              className="min-h-[100px] px-4 py-3"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-text-secondary">
                {t("programs.sessionForm.fields.sortOrder")}
              </Label>
              <InputField
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) => updateField("sortOrder", event.target.value)}
                placeholder={t("programs.sessionForm.placeholders.sortOrder")}
                className="px-4 py-3"
              />
            </div>

            <label className="flex h-11 items-center gap-3 rounded-xl border border-border-light bg-surface-tertiary px-4 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => updateField("isPublished", event.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
              />
              <span>{t("programs.sessionForm.fields.isPublished")}</span>
            </label>
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
