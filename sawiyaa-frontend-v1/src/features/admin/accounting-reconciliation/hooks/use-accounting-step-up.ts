"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toAppError } from "@/lib/api/errors";
import { verifyAdminStepUp } from "@/features/admin/users/api/admin-users.api";

type PendingAction = () => Promise<void>;

export function useAccountingStepUp() {
  const t = useTranslations("admin-accounting");
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);

  const verifyMutation = useMutation({
    mutationFn: verifyAdminStepUp,
  });

  const close = useCallback(() => {
    setIsOpen(false);
    setPassword("");
    setError(null);
    setExpiresAt(null);
    pendingActionRef.current = null;
  }, []);

  const requestStepUp = useCallback((action: PendingAction) => {
    pendingActionRef.current = action;
    setPassword("");
    setError(null);
    setExpiresAt(null);
    setIsOpen(true);
  }, []);

  const submit = useCallback(async () => {
    const secret = password.trim();
    if (!secret) {
      setError(t("stepUp.errors.passwordRequired"));
      return;
    }

    setError(null);

    try {
      const result = await verifyMutation.mutateAsync({ password: secret });
      setExpiresAt(result.expiresAt);

      const action = pendingActionRef.current;
      close();

      if (action) {
        await action();
      }
    } catch (cause) {
      const appError = toAppError(cause);
      setPassword("");
      setError(
        appError.code === "INVALID_CREDENTIALS"
          ? t("stepUp.errors.invalidPassword")
          : t("stepUp.errors.generic"),
      );
    }
  }, [close, password, t, verifyMutation]);

  return {
    isOpen,
    password,
    setPassword,
    error,
    expiresAt,
    isPending: verifyMutation.isPending,
    requestStepUp,
    close,
    submit,
  };
}

export type AccountingStepUpController = ReturnType<typeof useAccountingStepUp>;
