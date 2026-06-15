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
    <div className="overflow-hidden rounded-[24px] border border-border-light bg-surface-secondary shadow-[0_18px_36px_-30px_rgba(0,0,0,0.15)]">
      <div className="px-4 py-10 text-center sm:px-6">
        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary-light text-primary">
          {icon || <Inbox className="h-6 w-6 text-current" />}
        </div>

        <h3 className="text-base font-semibold text-text-primary">
          {title}
        </h3>

        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-secondary">
            {description}
          </p>
        )}

        {action && (
          <button
            onClick={action.onClick}
            className="mt-4 inline-flex h-8.5 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring-focus"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
