"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { FormModal } from "@/components/ui/modal";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { createAdminUser } from "../api/admin-users.api";
import AdminUserStepUpDialog from "./AdminUserStepUpDialog";
import { useAdminStepUp } from "../hooks/use-admin-step-up";
import {
  ADMIN_USER_INTERNAL_ROLES,
  ADMIN_USER_STATUS_VALUES,
  type AdminUserRole,
} from "../types/admin-users.types";
import { ADMIN_USER_ROLE_LABEL_KEYS } from "../utils/admin-users-format";

type AdminUserCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function roleIsSuperAdmin(role: AdminUserRole) {
  return role === "SUPER_ADMIN";
}

export default function AdminUserCreateModal({
  isOpen,
  onClose,
  onCreated,
}: AdminUserCreateModalProps) {
  const t = useTranslations("admin-users");
  const { data: currentUser } = useCurrentUser(isOpen);
  const stepUp = useAdminStepUp();
  const createMutation = useMutation({
    mutationFn: createAdminUser,
  });

  const canAssignSuperAdmin = Boolean(
    currentUser?.roles.roles?.includes("SUPER_ADMIN")
  );

  const roleOptions = useMemo(
    () =>
      ADMIN_USER_INTERNAL_ROLES.filter((role) => canAssignSuperAdmin || !roleIsSuperAdmin(role)),
    [canAssignSuperAdmin]
  );

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<(typeof ADMIN_USER_STATUS_VALUES)[number]>("ACTIVE");
  const [selectedRoles, setSelectedRoles] = useState<AdminUserRole[]>(["ADMIN"]);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDisplayName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setStatus("ACTIVE");
    setSelectedRoles(["ADMIN"]);
    setError(null);
    stepUp.close();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const normalizedDisplayName = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (normalizedDisplayName.length < 2) {
      return t("create.validation.displayName");
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return t("create.validation.email");
    }

    if (selectedRoles.length === 0) {
      return t("create.validation.roles");
    }

    if (!password.trim() || password.trim().length < 8) {
      return t("create.validation.password");
    }

    if (!canAssignSuperAdmin && selectedRoles.includes("SUPER_ADMIN")) {
      return t("create.validation.superAdmin");
    }

    if (normalizedPhone.length > 30) {
      return t("create.validation.phone");
    }

    return null;
  };

  const submitCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      roles: selectedRoles,
      status,
      password: password.trim(),
    };

    const runCreate = async () => {
      try {
        await createMutation.mutateAsync(payload);
        onCreated();
        handleClose();
        return true;
      } catch (cause) {
        const appError = toAppError(cause);

        if (isStepUpRequiredError(appError)) {
          throw appError;
        }

        setError(appError.message || t("errors.generic"));
        return false;
      }
    };

    try {
      setError(null);
      await runCreate();
    } catch (cause) {
      const appError = toAppError(cause);

      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runCreate();
        });
        return;
      }

      setError(appError.message || t("errors.generic"));
    }
  };

  const toggleRole = (role: AdminUserRole) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  };

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={handleClose}
        title={t("create.title")}
        description={t("create.description")}
        submitLabel={t("create.submit")}
        cancelLabel={t("create.cancel")}
        onSubmit={submitCreate}
        onCancel={handleClose}
        loading={createMutation.isPending}
        submitDisabled={createMutation.isPending}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("create.fields.displayName")}</Label>
              <InputField
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("create.fields.displayNamePlaceholder")}
                autoComplete="off"
                error={Boolean(error)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("create.fields.email")}</Label>
              <InputField
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("create.fields.emailPlaceholder")}
                autoComplete="email"
                error={Boolean(error)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("create.fields.phone")}</Label>
              <InputField
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t("create.fields.phonePlaceholder")}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                {t("create.fields.status")}
              </label>
              <select
                className="app-control h-11 w-full px-4 py-2.5"
                value={status}
                onChange={(event) => setStatus(event.target.value as (typeof ADMIN_USER_STATUS_VALUES)[number])}
              >
                {ADMIN_USER_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              {t("create.fields.roles")}
            </label>
            <div className="grid gap-2 rounded-2xl border border-border-light bg-surface-secondary/60 p-3 sm:grid-cols-2">
              {roleOptions.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-xl border border-border-light bg-white px-3 py-2 text-sm text-text-primary"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span>{t(ADMIN_USER_ROLE_LABEL_KEYS[role])}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("create.fields.password")}</Label>
            <InputField
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("create.fields.passwordPlaceholder")}
              autoComplete="new-password"
              error={Boolean(error)}
              hint={error ?? t("create.passwordHint")}
            />
          </div>
        </div>
      </FormModal>

      <AdminUserStepUpDialog controller={stepUp} />
    </>
  );
}
