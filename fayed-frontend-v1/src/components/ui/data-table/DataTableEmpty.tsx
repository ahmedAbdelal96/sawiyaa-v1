/**
 * DataTable Empty State Component
 * 
 * Displays when table has no data to show.
 * Supports custom icon, title, description, and action button.
 * 
 * @author Senior Development Team
 */

'use client';

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface DataTableEmptyProps {
  /** Icon to display (defaults to Inbox) */
  icon?: ReactNode;
  
  /** Title text */
  title: string;
  
  /** Description text */
  description?: string;
  
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function DataTableEmpty({
  icon,
  title,
  description,
  action,
}: DataTableEmptyProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border-light bg-white shadow-[0_16px_34px_-28px_rgba(34,52,56,0.18)]">
      <div className="px-6 py-12 text-center sm:px-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary-light text-primary shadow-[0_12px_22px_-18px_rgba(68,161,148,0.22)]">
          {icon || <Inbox className="h-7 w-7 text-current" />}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          {title}
        </h3>

        {description && (
          <p className="mx-auto mb-6 max-w-md text-sm text-text-secondary">
            {description}
          </p>
        )}

        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-[0_12px_24px_-18px_rgba(68,161,148,0.38)] transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
