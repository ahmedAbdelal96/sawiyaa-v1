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
    <div className="rounded-2xl border border-border-light bg-white shadow-[0_12px_32px_-24px_rgba(34,52,56,0.12)]">
      <div className="p-12 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary ring-1 ring-inset ring-primary/10">
          {icon || <Inbox className="w-8 h-8 text-current" />}
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-medium text-text-primary mb-2">
          {title}
        </h3>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            {description}
          </p>
        )}
        
        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="rounded-2xl bg-primary px-4 py-2 text-white shadow-[0_12px_24px_-14px_rgba(68,161,148,0.42)] transition hover:bg-primary-hover"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
