"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import { ConfirmModal, FormModal } from "@/components/ui/modal";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { useAdminStepUp } from "../hooks/use-admin-step-up";
import { useAdminUser } from "../hooks/use-admin-users";
import {
  invalidateAdminUserTokenVersion,
  revokeAdminUserSessions,
  updateAdminUserProfile,
  updateAdminUserRoles,
  updateAdminUserStatus,
} from "../api/admin-users.api";
import {
  ADMIN_USER_INTERNAL_ROLES,
  ADMIN_USER_STATUS_VALUES,
  type AdminUserRole,
} from "../types/admin-users.types";
import { ADMIN_USER_ROLE_LABEL_KEYS } from "../utils/admin-users-format";

export type AdminUsersActionType = "profile" | "status" | "roles" | "sessions" | "token-version";

export type AdminUsersListAction =
  | { type: AdminUsersActionType; userId: string }
  | null;

type Props = {
  action: AdminUsersListAction;
  onClose: () => void;
  onCompleted: () => void;
};

type MutationWithVariables<TVariables> = {
  mutateAsync: (variables: TVariables) => Promise<unknown>;
  isPending: boolean;
};

type MutationWithoutVariables = {
  mutateAsync: () => Promise<unknown>;
  isPending: boolean;
};

function roleLabel(t: ReturnType<typeof useTranslations>, role: AdminUserRole) {
  return t(ADMIN_USER_ROLE_LABEL_KEYS[role]);
}

function isSuperAdminRole(role: AdminUserRole) {
  return role === "SUPER_ADMIN";
}

export default function AdminUsersActionDialogs({ action, onClose, onCompleted }: Props) {
  const t = useTranslations("admin-users");
  const { data: currentUser } = useCurrentUser(Boolean(action));
  const stepUp = useAdminStepUp();
  const userQuery = useAdminUser(action?.userId ?? "", Boolean(action));
  const detail = userQuery.data?.item;
  const currentUserId = currentUser?.userId ?? null;
  const currentUserIsSuperAdmin = currentUser?.roles.roles?.includes("SUPER_ADMIN") ?? false;
  const canAssignSuperAdmin = currentUserIsSuperAdmin;
  const showSelfWarning = Boolean(action?.userId && currentUserId && action.userId === currentUserId);

  const profileMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserProfile>[1]) =>
      updateAdminUserProfile(action?.userId ?? "", input),
  });
  const statusMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserStatus>[1]) =>
      updateAdminUserStatus(action?.userId ?? "", input),
  });
  const rolesMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminUserRoles>[1]) =>
      updateAdminUserRoles(action?.userId ?? "", input),
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeAdminUserSessions(action?.userId ?? ""),
  });
  const invalidateMutation = useMutation({
    mutationFn: () => invalidateAdminUserTokenVersion(action?.userId ?? ""),
  });

  const roleOptions = useMemo(
    () => ADMIN_USER_INTERNAL_ROLES.filter((role) => canAssignSuperAdmin || !isSuperAdminRole(role)),
    [canAssignSuperAdmin]
  );

  if (!action) return null;

  if (userQuery.isError) {
    const appError = toAppError(userQuery.error);
    return (
      <ConfirmModal
        isOpen={Boolean(action)}
        onClose={onClose}
        title={appError.statusCode === 404 ? t("errors.notFoundTitle") : t("errors.title")}
        description={appError.statusCode === 404 ? t("errors.notFound") : appError.message || t("errors.loadFailed")}
        confirmLabel={t("actions.back")}
        cancelLabel={t("actions.back")}
        onConfirm={onClose}
        size="md"
      />
    );
  }

  if (!detail) {
    return (
      <ConfirmModal
        isOpen={Boolean(action)}
        onClose={onClose}
        title={t("dialogs.loadingTitle")}
        description={t("dialogs.loadingDescription")}
        confirmLabel={t("actions.back")}
        cancelLabel={t("actions.back")}
        onConfirm={onClose}
        onCancel={onClose}
        loading
      />
    );
  }

  if (action.type === "profile") {
    return (
      <ProfileDialog
        key={`profile-${detail.id}`}
        isOpen
        title={t("edit.title")}
        description={t("edit.description")}
        submitLabel={t("edit.submit")}
        cancelLabel={t("edit.cancel")}
        initialDisplayName={detail.displayName ?? ""}
        initialDefaultLocale={detail.defaultLocale ?? ""}
        initialTimezone={detail.timezone ?? ""}
        stepUp={stepUp}
        onClose={onClose}
        onCompleted={onCompleted}
        mutation={profileMutation}
      />
    );
  }

  if (action.type === "status") {
    return (
      <StatusDialog
        key={`status-${detail.id}`}
        isOpen
        title={t("statusModal.title")}
        description={t("statusModal.description")}
        submitLabel={t("statusModal.submit")}
        cancelLabel={t("statusModal.cancel")}
        initialStatus={detail.status}
        stepUp={stepUp}
        onClose={onClose}
        onCompleted={onCompleted}
        mutation={statusMutation}
      />
    );
  }

  if (action.type === "roles") {
    return (
      <RolesDialog
        key={`roles-${detail.id}`}
        isOpen
        title={t("rolesModal.title")}
        description={t("rolesModal.description")}
        submitLabel={t("rolesModal.submit")}
        cancelLabel={t("rolesModal.cancel")}
        showSelfWarning={showSelfWarning}
        canAssignSuperAdmin={canAssignSuperAdmin}
        roleOptions={roleOptions}
        initialRoles={detail.roles.filter((role): role is AdminUserRole => role in ADMIN_USER_ROLE_LABEL_KEYS)}
        stepUp={stepUp}
        onClose={onClose}
        onCompleted={onCompleted}
        mutation={rolesMutation}
      />
    );
  }

  if (action.type === "sessions") {
    return (
      <ConfirmActionDialog
        key={`sessions-${detail.id}`}
        isOpen
        title={t("sessions.title")}
        description={t("sessions.description")}
        confirmLabel={t("sessions.confirm")}
        cancelLabel={t("sessions.cancel")}
        onClose={onClose}
        onCompleted={onCompleted}
        stepUp={stepUp}
        mutation={revokeMutation}
      />
    );
  }

  return (
    <ConfirmActionDialog
      key={`token-${detail.id}`}
      isOpen
      title={t("tokenVersion.title")}
      description={t("tokenVersion.description")}
      confirmLabel={t("tokenVersion.confirm")}
      cancelLabel={t("tokenVersion.cancel")}
      onClose={onClose}
      onCompleted={onCompleted}
      stepUp={stepUp}
      mutation={invalidateMutation}
      confirmVariant="danger"
    />
  );
}

function ProfileDialog({
  isOpen,
  title,
  description,
  submitLabel,
  cancelLabel,
  initialDisplayName,
  initialDefaultLocale,
  initialTimezone,
  stepUp,
  onClose,
  onCompleted,
  mutation,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  initialDisplayName: string;
  initialDefaultLocale: string;
  initialTimezone: string;
  stepUp: ReturnType<typeof useAdminStepUp>;
  onClose: () => void;
  onCompleted: () => void;
  mutation: MutationWithVariables<Parameters<typeof updateAdminUserProfile>[1]>;
}) {
  const t = useTranslations("admin-users");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [defaultLocale, setDefaultLocale] = useState(initialDefaultLocale);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setDisplayName(initialDisplayName);
    setDefaultLocale(initialDefaultLocale);
    setTimezone(initialTimezone);
    setError(null);
    stepUp.close();
    onClose();
  };

  const runUpdate = async () => {
    try {
      await mutation.mutateAsync({
        displayName: displayName.trim(),
        defaultLocale: defaultLocale.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      onCompleted();
      handleClose();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const submit = async () => {
    if (displayName.trim().length < 2) {
      setError(t("edit.validation.displayName"));
      return;
    }

    setError(null);
    try {
      await runUpdate();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runUpdate();
        });
        return;
      }
      setError(appError.message || t("errors.generic"));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onSubmit={submit}
      onCancel={handleClose}
      loading={mutation.isPending}
      submitDisabled={mutation.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("edit.fields.displayName")}</Label>
          <InputField
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            error={Boolean(error)}
            hint={error ?? t("edit.fields.displayNameHint")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("edit.fields.defaultLocale")}</Label>
          <InputField
            value={defaultLocale}
            onChange={(event) => setDefaultLocale(event.target.value)}
            placeholder={t("edit.fields.defaultLocalePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("edit.fields.timezone")}</Label>
          <InputField
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder={t("edit.fields.timezonePlaceholder")}
          />
        </div>
      </div>
    </FormModal>
  );
}

function StatusDialog({
  isOpen,
  title,
  description,
  submitLabel,
  cancelLabel,
  initialStatus,
  stepUp,
  onClose,
  onCompleted,
  mutation,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  initialStatus: (typeof ADMIN_USER_STATUS_VALUES)[number];
  stepUp: ReturnType<typeof useAdminStepUp>;
  onClose: () => void;
  onCompleted: () => void;
  mutation: MutationWithVariables<Parameters<typeof updateAdminUserStatus>[1]>;
}) {
  const t = useTranslations("admin-users");
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStatus(initialStatus);
    setError(null);
    stepUp.close();
    onClose();
  };

  const runUpdate = async () => {
    try {
      await mutation.mutateAsync({ status });
      onCompleted();
      handleClose();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await runUpdate();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runUpdate();
        });
        return;
      }
      setError(appError.message || t("errors.generic"));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onSubmit={submit}
      onCancel={handleClose}
      loading={mutation.isPending}
      submitDisabled={mutation.isPending}
    >
      <div className="space-y-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-text-primary">{t("statusModal.fields.status")}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof ADMIN_USER_STATUS_VALUES)[number])}
            className="app-control h-11 w-full rounded-2xl px-4"
          >
            {ADMIN_USER_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}`)}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-error-600">{error}</p> : null}
      </div>
    </FormModal>
  );
}

function RolesDialog({
  isOpen,
  title,
  description,
  submitLabel,
  cancelLabel,
  showSelfWarning,
  canAssignSuperAdmin,
  roleOptions,
  initialRoles,
  stepUp,
  onClose,
  onCompleted,
  mutation,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  showSelfWarning: boolean;
  canAssignSuperAdmin: boolean;
  roleOptions: AdminUserRole[];
  initialRoles: AdminUserRole[];
  stepUp: ReturnType<typeof useAdminStepUp>;
  onClose: () => void;
  onCompleted: () => void;
  mutation: MutationWithVariables<Parameters<typeof updateAdminUserRoles>[1]>;
}) {
  const t = useTranslations("admin-users");
  const [selectedRoles, setSelectedRoles] = useState<AdminUserRole[]>(initialRoles);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedRoles(initialRoles);
    setError(null);
    stepUp.close();
    onClose();
  };

  const toggleRole = (role: AdminUserRole) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const runUpdate = async () => {
    const uniqueRoles = Array.from(new Set(selectedRoles)).filter(Boolean) as AdminUserRole[];

    if (uniqueRoles.length === 0) {
      setError(t("rolesModal.validation.roles"));
      return false;
    }

    if (!canAssignSuperAdmin && uniqueRoles.includes("SUPER_ADMIN")) {
      setError(t("rolesModal.validation.superAdmin"));
      return false;
    }

    try {
      await mutation.mutateAsync({ roles: uniqueRoles });
      onCompleted();
      handleClose();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await runUpdate();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runUpdate();
        });
        return;
      }
      setError(appError.message || t("errors.generic"));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onSubmit={submit}
      onCancel={handleClose}
      loading={mutation.isPending}
      submitDisabled={mutation.isPending}
      size="xl"
    >
      <div className="space-y-4">
        {showSelfWarning ? (
          <p className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            {t("rolesModal.selfWarning")}
          </p>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          {roleOptions.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 text-sm text-text-primary"
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              <span>{roleLabel(t, role)}</span>
            </label>
          ))}
        </div>
        {error ? <p className="text-sm text-error-600">{error}</p> : null}
      </div>
    </FormModal>
  );
}

function ConfirmActionDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onClose,
  onCompleted,
  stepUp,
  mutation,
  confirmVariant = "primary",
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onClose: () => void;
  onCompleted: () => void;
  stepUp: ReturnType<typeof useAdminStepUp>;
  mutation: MutationWithoutVariables;
  confirmVariant?: "primary" | "outline" | "danger";
}) {
  const t = useTranslations("admin-users");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    stepUp.close();
    onClose();
  };

  const runAction = async () => {
    try {
      await mutation.mutateAsync();
      onCompleted();
      handleClose();
      return true;
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) throw appError;
      setError(appError.message || t("errors.generic"));
      return false;
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await runAction();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runAction();
        });
        return;
      }
      setError(appError.message || t("errors.generic"));
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmVariant={confirmVariant}
      onConfirm={submit}
      onCancel={handleClose}
      loading={mutation.isPending}
    >
      {error ? <p className="text-sm text-error-600">{error}</p> : null}
    </ConfirmModal>
  );
}
