"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import AuthPasswordField from "./AuthPasswordField";
import Label from "@/components/form/Label";
import { usePatientChangePassword, usePractitionerChangePassword } from "@/features/auth/hooks/use-auth";

type Props = { role: "patient" | "practitioner" };
type FormValues = { currentPassword: string; newPassword: string; confirmPassword: string };

const schema = z.object({
  currentPassword: z.string().min(1, "currentRequired"),
  newPassword: z.string().min(8, "passwordTooShort"),
  confirmPassword: z.string().min(1, "confirmRequired"),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "passwordsMismatch" });

function errorCode(error: unknown): string | undefined {
  const source = error as { response?: { data?: { error?: string; data?: { error?: string } } } };
  return source?.response?.data?.error ?? source?.response?.data?.data?.error;
}

export default function ChangePasswordForm({ role }: Props) {
  const t = useTranslations("auth.security");
  const tv = useTranslations("auth.forgotPassword.validation");
  const locale = useLocale();
  const router = useRouter();
  const patientMutation = usePatientChangePassword();
  const practitionerMutation = usePractitionerChangePassword();
  const mutation = role === "patient" ? patientMutation : practitionerMutation;
  const [feedback, setFeedback] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  const submit = async (values: FormValues) => {
    setFeedback(null);
    try {
      await mutation.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      form.reset();
      setFeedback(t("success"));
      window.setTimeout(() => router.replace(role === "patient" ? "/login/patient" : "/login/practitioner"), 900);
    } catch (error) {
      const code = errorCode(error);
      setFeedback(code === "CURRENT_PASSWORD_INVALID" ? t("currentPasswordInvalid") : code === "NEW_PASSWORD_MUST_DIFFER" ? t("newPasswordMustDiffer") : t("genericError"));
    }
  };

  const fieldError = (key: keyof FormValues) => {
    const message = form.formState.errors[key]?.message;
    if (!message) return null;
    if (message === "passwordTooShort") return tv("passwordTooShort");
    if (message === "passwordsMismatch") return tv("passwordsMismatch");
    return t(message);
  };

  return <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-theme-xs dark:border-white/10 dark:bg-surface-secondary">
    <h2 className="text-lg font-semibold text-text-primary">{t("title")}</h2>
    <p className="mt-1 text-sm text-text-secondary">{t("description")}</p>
    <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(submit)}>
      <div><Label>{t("currentPassword")}</Label><AuthPasswordField autoComplete="current-password" {...form.register("currentPassword")} error={!!form.formState.errors.currentPassword} />{fieldError("currentPassword") && <p className="mt-1 text-xs text-error-500">{fieldError("currentPassword")}</p>}</div>
      <div><Label>{t("newPassword")}</Label><AuthPasswordField autoComplete="new-password" {...form.register("newPassword")} error={!!form.formState.errors.newPassword} />{fieldError("newPassword") && <p className="mt-1 text-xs text-error-500">{fieldError("newPassword")}</p>}</div>
      <div><Label>{t("confirmPassword")}</Label><AuthPasswordField autoComplete="new-password" {...form.register("confirmPassword")} error={!!form.formState.errors.confirmPassword} />{fieldError("confirmPassword") && <p className="mt-1 text-xs text-error-500">{fieldError("confirmPassword")}</p>}</div>
      <p className="text-xs text-text-secondary">{t("requirements")}</p>
      {feedback && <p role="status" className="rounded-xl bg-primary-light p-3 text-sm text-text-primary">{feedback}</p>}
      <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending ? t("saving") : t("submit")}</button>
    </form>
  </section>;
}
