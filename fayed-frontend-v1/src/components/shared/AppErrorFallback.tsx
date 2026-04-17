"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AlertTriangle, ChevronLeft, Home, LifeBuoy, RotateCcw } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError, type AppErrorType } from "@/lib/api/errors";
import { shouldShowDetailedErrors } from "@/lib/env/app-env";

type AppErrorFallbackProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  homeHref?: string;
};

function resolveSupportHref(pathname: string | null): string | null {
  if (!pathname) return null;

  if (pathname.includes("/patient/")) return "/patient/support";
  if (pathname.endsWith("/patient")) return "/patient/support";
  if (pathname.includes("/practitioner/")) return "/practitioner/support";
  if (pathname.endsWith("/practitioner")) return "/practitioner/support";
  if (pathname.includes("/admin/")) return "/admin/support";
  if (pathname.endsWith("/admin")) return "/admin/support";

  return null;
}

const ERROR_TYPE_STYLES: Record<AppErrorType, string> = {
  SERVICE_UNAVAILABLE: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  NETWORK_ERROR: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  TIMEOUT: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  UNAUTHORIZED: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/75",
  FORBIDDEN: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300",
  NOT_FOUND: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/75",
  UNKNOWN_SERVER_ERROR: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/75",
};

export default function AppErrorFallback({
  error,
  reset,
  homeHref = "/",
}: AppErrorFallbackProps) {
  const t = useTranslations("errors.fallback");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const appError = useMemo(() => toAppError(error), [error]);
  const showDetails = shouldShowDetailedErrors();
  const supportHref = resolveSupportHref(pathname);
  const referenceId = appError.referenceId || error.digest || null;
  const statusLabel =
    typeof appError.statusCode === "number" ? String(appError.statusCode) : t("unknownValue");

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-10 sm:px-6">
      <SurfaceCard variant="page" className="w-full max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-warning-50 text-warning-600 dark:bg-warning-500/12 dark:text-warning-300">
            <AlertTriangle className="h-7 w-7" />
          </span>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
            {t("description")}
          </p>

          {referenceId && (
            <p className="mt-4 text-xs font-medium text-text-muted">
              {t("reference", { id: referenceId })}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {reset ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={reset}
                startIcon={<RotateCcw className="h-4 w-4" />}
              >
                {t("retry")}
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              startIcon={<ChevronLeft className={`h-4 w-4 ${locale === "ar" ? "rotate-180" : ""}`} />}
            >
              {t("back")}
            </Button>

            <SurfaceActionLink href={homeHref} variant="secondary">
              <span className="inline-flex items-center gap-2">
                <Home className="h-4 w-4" />
                {t("home")}
              </span>
            </SurfaceActionLink>

            {supportHref ? (
              <SurfaceActionLink href={supportHref} variant="secondary">
                <span className="inline-flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4" />
                  {t("support")}
                </span>
              </SurfaceActionLink>
            ) : null}
          </div>
        </div>

        {showDetails ? (
          <SurfaceCard variant="subtle" className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("diagnostics.title")}
              </p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  ERROR_TYPE_STYLES[appError.errorType]
                }`}
              >
                {appError.errorType}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.type")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {appError.errorType}
                </dd>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.status")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {statusLabel}
                </dd>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.message")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {appError.message || t("unknownValue")}
                </dd>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.path")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {appError.requestPath || pathname || t("unknownValue")}
                </dd>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.code")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {appError.code || t("unknownValue")}
                </dd>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-light dark:bg-surface-secondary">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("diagnostics.fields.reference")}
                </dt>
                <dd className="mt-2 break-all text-text-primary dark:text-white/90">
                  {referenceId || t("unknownValue")}
                </dd>
              </div>
            </div>

            {appError.diagnostics && Object.keys(appError.diagnostics).length > 0 ? (
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-border-light bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-white/10">
                {JSON.stringify(appError.diagnostics, null, 2)}
              </pre>
            ) : null}
          </SurfaceCard>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
