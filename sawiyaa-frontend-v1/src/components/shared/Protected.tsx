"use client";

/**
 * Protected / ProtectedRoute components.
 *
 * These are legacy client-side role guards. Active route protection is handled
 * by src/proxy.ts (middleware) and SSR layout guards in src/lib/auth/access.ts.
 * These components are retained for incremental migration — do not add new usages.
 *
 * TODO: remove once all callers are confirmed gone.
 */

import { ReactNode, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthState } from "@/stores";
import type { UserRole } from "@/stores/auth-store";

interface ProtectedProps {
  children: ReactNode;
  role?: UserRole | UserRole[];
  fallback?: ReactNode;
}

export function Protected({ children, role, fallback = null }: ProtectedProps) {
  const { user } = useAuthState();

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!user || !roles.includes(user.role as UserRole)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

interface ProtectedRouteProps {
  children: ReactNode;
  role?: UserRole | UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  role,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, isInitialized } = useAuthState();

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    if (redirectTo) {
      return <RedirectOnMount to={redirectTo} />;
    }
    return <>{fallback || <UnauthorizedPage />}</>;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role as UserRole)) {
      if (redirectTo) {
        return <RedirectOnMount to={redirectTo} />;
      }
      return <>{fallback || <UnauthorizedPage />}</>;
    }
  }

  return <>{children}</>;
}

function RedirectOnMount({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return null;
}

function UnauthorizedPage() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/12">
            <svg
              className="h-8 w-8 text-warning-600 dark:text-warning-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>
        <h2 className="mb-3 text-2xl font-bold text-text-primary dark:text-text-primary">
          غير مصرح لك بالدخول
        </h2>
        <p className="mb-8 text-text-secondary dark:text-text-secondary">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          العودة للخلف
        </button>
      </div>
    </div>
  );
}
