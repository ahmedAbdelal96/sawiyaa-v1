"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePatientGoogleAuth } from "@/features/auth/hooks/use-auth";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";

declare global {
  interface Window {
    __fayedGoogleInitializedClientId?: string;
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type GoogleCredentialResponse = {
  credential: string;
};

type Props = {
  callbackUrl?: string | null;
  defaultRedirect: string;
};

const GOOGLE_SCRIPT_ID = "fayed-google-identity-script";

export default function PatientGoogleAuthButton({
  callbackUrl,
  defaultRedirect,
}: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const googleAuthMutation = usePatientGoogleAuth();

  const redirectTarget = useMemo(() => {
    return normalizeCallbackPath(callbackUrl) ?? defaultRedirect;
  }, [callbackUrl, defaultRedirect]);
  const localizedRedirectTarget = useMemo(() => {
    if (redirectTarget.startsWith("/")) {
      return `/${locale}${redirectTarget}`;
    }

    return redirectTarget;
  }, [locale, redirectTarget]);

  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      queueMicrotask(() => setScriptReady(true));
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      const onLoad = () => setScriptReady(true);
      existingScript.addEventListener("load", onLoad);
      return () => existingScript.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError(t("googleScriptError"));
    document.head.appendChild(script);
  }, [googleClientId, t]);

  useEffect(() => {
    if (!googleClientId || !scriptReady || !buttonContainerRef.current) {
      return;
    }

    if (!window.google?.accounts?.id) {
      return;
    }

    const container = buttonContainerRef.current;
    container.innerHTML = "";

    if (window.__fayedGoogleInitializedClientId !== googleClientId) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setError(t("googleMissingCredential"));
            return;
          }

          setError(null);

          try {
            await googleAuthMutation.mutateAsync({
              idToken: response.credential,
            });
            window.location.replace(localizedRedirectTarget);
          } catch {
            setError(t("googleLoginError"));
          }
        },
      });

      window.__fayedGoogleInitializedClientId = googleClientId;
    }

    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: Math.min(container.clientWidth || 380, 380),
    });

    return () => {
      window.google?.accounts?.id.cancel();
    };
  }, [
    googleAuthMutation,
    googleClientId,
    localizedRedirectTarget,
    scriptReady,
    t,
  ]);

  if (!googleClientId) {
    return (
      <div className="rounded-lg border border-dashed border-border-light p-3 text-xs text-text-muted">
        {t("googleUnavailable")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border-light" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.16em] text-text-muted">
          <span className="bg-white px-3 dark:bg-surface-secondary">
            {t("orContinueWith")}
          </span>
        </div>
      </div>

      <div
        ref={buttonContainerRef}
        className="flex min-h-11 items-center justify-center"
      />

      {googleAuthMutation.isPending && (
        <p className="text-center text-xs text-text-muted">{t("googleLoading")}</p>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
          {error}
        </div>
      )}
    </div>
  );
}
