/**
 * DataTable Utilities
 * 
 * Helper functions for the DataTable component.
 * Handles RTL/LTR detection, sorting, filtering, and more.
 * 
 * @author Senior Development Team
 */

import type { ColumnDef, SortConfig, FilterConfig, ResponsiveBreakpoint } from './types';

/**
 * Detect if current direction is RTL
 * Checks document direction and language
 */
export function isRTL(): boolean {
  if (typeof window === 'undefined') return false;
  
  const html = document.documentElement;
  const dir = html.getAttribute('dir');
  const lang = html.getAttribute('lang');
  
  // Check explicit direction
  if (dir === 'rtl') return true;
  if (dir === 'ltr') return false;
  
  // Check language
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
  return rtlLanguages.includes(lang || '');
}

/**
 * Resolve logical/physical column alignment to Tailwind CSS text and justify classes
 */
export function resolveColumnAlignment(
  column: ColumnDef | null | undefined,
  rtl: boolean
): {
  textClass: string;
  justifyClass: string;
  effectiveAlign: 'left' | 'right' | 'center' | 'start' | 'end';
} {
  // Default to "start" logical alignment
  let align: 'left' | 'right' | 'center' | 'start' | 'end' = 'start';
  
  if (column) {
    if (column.align) {
      align = column.align;
    } else if (column.id === 'actions') {
      align = 'center';
    }
  }

  switch (align) {
    case 'start':
      return {
        textClass: 'text-start',
        justifyClass: 'justify-start',
        effectiveAlign: 'start',
      };
    case 'end':
      return {
        textClass: 'text-end',
        justifyClass: 'justify-end',
        effectiveAlign: 'end',
      };
    case 'center':
      return {
        textClass: 'text-center',
        justifyClass: 'justify-center',
        effectiveAlign: 'center',
      };
    case 'left':
      return {
        textClass: 'text-left',
        justifyClass: rtl ? 'justify-end' : 'justify-start',
        effectiveAlign: 'left',
      };
    case 'right':
      return {
        textClass: 'text-right',
        justifyClass: rtl ? 'justify-start' : 'justify-end',
        effectiveAlign: 'right',
      };
    default:
      return {
        textClass: 'text-start',
        justifyClass: 'justify-start',
        effectiveAlign: 'start',
      };
  }
}

/**
 * Get text alignment based on column config and RTL (for backward compatibility)
 */
export function getColumnAlignment(
  column: ColumnDef,
  rtl: boolean
): 'left' | 'right' | 'center' {
  const { effectiveAlign } = resolveColumnAlignment(column, rtl);
  if (effectiveAlign === 'start') {
    return rtl ? 'right' : 'left';
  }
  if (effectiveAlign === 'end') {
    return rtl ? 'left' : 'right';
  }
  return effectiveAlign;
}

/**
 * Sort data array based on sort configuration
 * Supports ascending and descending order
 */
export function sortData<T = any>(
  data: T[],
  sortConfig: SortConfig | null,
  columns: ColumnDef<T>[]
): T[] {
  if (!sortConfig) return data;
  
  const column = columns.find((col) => col.id === sortConfig.column);
  if (!column) return data;
  
  const sorted = [...data].sort((a, b) => {
    // Get values using accessor or direct property
    let aValue: any;
    let bValue: any;
    
    if (column.accessor) {
      aValue = column.accessor(a);
      bValue = column.accessor(b);
    } else {
      aValue = (a as any)[column.id];
      bValue = (b as any)[column.id];
    }
    
    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    // Compare based on type
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    }
    
    if (aValue instanceof Date && bValue instanceof Date) {
      return aValue.getTime() - bValue.getTime();
    }
    
    // Default: convert to string and compare
    return String(aValue).localeCompare(String(bValue));
  });
  
  // Reverse for descending
  return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Filter data array based on filter configurations
 * Supports multiple filters with AND logic
 */
export function filterData<T = any>(
  data: T[],
  filters: FilterConfig[],
  columns: ColumnDef<T>[]
): T[] {
  if (!filters || filters.length === 0) return data;
  
  return data.filter((row) => {
    // Check if row matches all filters (AND logic)
    return filters.every((filter) => {
      const column = columns.find((col) => col.id === filter.column);
      if (!column) return true;
      
      // Get row value
      let value: any;
      if (column.accessor) {
        value = column.accessor(row);
      } else {
        value = (row as any)[column.id];
      }
      
      // Apply filter operator
      return applyFilterOperator(value, filter.value, filter.operator || 'contains');
    });
  });
}

/**
 * Apply filter operator to value
 */
function applyFilterOperator(
  value: any,
  filterValue: any,
  operator: FilterConfig['operator']
): boolean {
  // Handle null/undefined
  if (value == null) return false;
  
  const stringValue = String(value).toLowerCase();
  const stringFilter = String(filterValue).toLowerCase();
  
  switch (operator) {
    case 'equals':
      return stringValue === stringFilter;
    
    case 'contains':
      return stringValue.includes(stringFilter);
    
    case 'startsWith':
      return stringValue.startsWith(stringFilter);
    
    case 'endsWith':
      return stringValue.endsWith(stringFilter);
    
    case 'gt':
      return Number(value) > Number(filterValue);
    
    case 'lt':
      return Number(value) < Number(filterValue);
    
    default:
      return stringValue.includes(stringFilter);
  }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Generate pagination pages array
 * Returns array of page numbers to display
 */
export function getPaginationPages(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | '...')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const pages: (number | '...')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  // Always show first page
  pages.push(1);
  
  // Calculate range
  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);
  
  // Adjust if at edges
  if (currentPage <= halfVisible) {
    end = maxVisible - 1;
  }
  if (currentPage >= totalPages - halfVisible) {
    start = totalPages - maxVisible + 2;
  }
  
  // Add ellipsis at start if needed
  if (start > 2) {
    pages.push('...');
  }
  
  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  // Add ellipsis at end if needed
  if (end < totalPages - 1) {
    pages.push('...');
  }
  
  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }
  
  return pages;
}

/**
 * Get CSS class names based on size variant
 */
export function getSizeClasses(size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeMap = {
    sm: {
      cell: 'px-3 py-2 text-[13px]',
      header: 'px-3 py-2 text-[11px]',
    },
    md: {
      cell: 'px-4 py-2.5 text-sm',
      header: 'px-4 py-2.5 text-xs',
    },
    lg: {
      cell: 'px-6 py-3.5 text-base',
      header: 'px-6 py-3 text-sm',
    },
  };
  
  return sizeMap[size];
}

/**
 * Get responsive visibility class for table columns.
 * - hideBelow: 'lg' => hidden below lg, visible on lg+
 * - hideOnMobile: true => hidden below md, visible on md+ (legacy shortcut)
 */
export function getColumnVisibilityClass(column: ColumnDef): string {
  if (column.hideBelow) {
    const breakpoint = column.hideBelow as ResponsiveBreakpoint;
    return `hidden ${breakpoint}:table-cell`;
  }

  if (column.hideOnMobile) {
    return 'hidden md:table-cell';
  }

  return '';
}

/**
 * Debounce function for search/filter inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format number with locale
 */
export function formatNumber(value: number, locale?: string): string {
  if (typeof window === 'undefined') return String(value);
  
  const detectedLocale = locale || document.documentElement.lang || 'en';
  
  return new Intl.NumberFormat(detectedLocale).format(value);
}
