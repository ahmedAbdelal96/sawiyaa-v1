/**
 * DataTable Loading State Component
 * 
 * Displays a skeleton loading state for the table.
 * Maintains table structure for smooth transitions.
 * 
 * @author Senior Development Team
 */

'use client';

import { getSizeClasses } from './utils';

interface DataTableLoadingProps {
  /** Number of rows to show in skeleton */
  rows?: number;
  
  /** Number of columns */
  columns?: number;
  
  /** Table size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Loading message */
  message?: string;
}

export function DataTableLoading({
  rows = 5,
  columns = 5,
  size = 'md',
  message = 'Loading...',
}: DataTableLoadingProps) {
  const sizeClasses = getSizeClasses(size);
  
  // Predefined widths to avoid hydration mismatch with Math.random()
  const getSkeletonWidth = (rowIndex: number, colIndex: number) => {
    // Use a deterministic pattern based on row and column indices
    const patterns = [75, 85, 65, 80, 70, 90, 60, 88, 72, 95];
    const index = (rowIndex * columns + colIndex) % patterns.length;
    return patterns[index];
  };
  
  const skeletonHeightClass = size === 'sm' ? 'h-3' : size === 'lg' ? 'h-4' : 'h-3.5';

  return (
    <div className="overflow-hidden rounded-[24px] border border-border-light bg-surface-secondary shadow-[0_18px_36px_-30px_rgba(0,0,0,0.15)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border-light bg-surface-tertiary text-text-secondary">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={i}
                  className={`${sizeClasses.header} text-start`}
                >
                  <div className={`${skeletonHeightClass} w-20 animate-pulse rounded-full bg-surface-tertiary/80`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/80">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className={`${sizeClasses.cell} align-middle`}>
                    <div
                      className={`${skeletonHeightClass} animate-pulse rounded-full bg-surface-tertiary/80`}
                      style={{
                        width: `${getSkeletonWidth(rowIndex, colIndex)}%`,
                        animationDelay: `${rowIndex * 100 + colIndex * 50}ms`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {message && (
        <div className="border-t border-border-light bg-surface-secondary/60 px-4 py-2.5 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary shadow-theme-xs">
            <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <span>{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
