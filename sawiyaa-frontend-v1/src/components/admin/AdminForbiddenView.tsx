/**
 * AdminForbiddenView — Phase 5: Permission-Aware Admin UX
 *
 * Shown when an authenticated admin-class user lacks the required permission
 * to access a specific admin page.
 *
 * Design rules:
 * - Does NOT log out the user.
 * - Does NOT reveal which permission is missing.
 * - Provides a safe "go to dashboard" escape hatch.
 * - Safe to render server-side.
 */

import React from "react";
import { Link } from "@/i18n/navigation";

export default function AdminForbiddenView() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
        <svg
          className="h-8 w-8 text-error-600 dark:text-error-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold text-text-primary dark:text-white">
          Access Denied
        </h1>
        <p className="text-sm text-text-secondary dark:text-white/60">
          You do not have permission to view this page. Contact your administrator
          if you believe this is a mistake.
        </p>
      </div>

      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
