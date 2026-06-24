/**
 * DataTable Types & Interfaces
 * 
 * Comprehensive type definitions for the reusable DataTable component.
 * Supports generic data types, customizable columns, and advanced features.
 * 
 * @author Senior Development Team
 * @version 1.0.0
 */

import { ReactNode } from 'react';

export type ResponsiveBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';


/**
 * Column Definition
 * Defines how each column should be rendered and behave
 * 
 * @template T - The data type for the row
 */
export interface ColumnDef<T = any> {
  /** Unique identifier for the column */
  id: string;
  
  /** Column header label (supports i18n keys) */
  header: string | ReactNode;
  
  /** Accessor function to get cell value from row data */
  accessor?: (row: T) => any;
  
  /** Custom cell renderer for advanced formatting */
  cell?: (row: T, value: any) => ReactNode;
  
  /** Column width (CSS value: '100px', '20%', 'auto', etc.) */
  width?: string;
  
  /** Text alignment (auto-detects RTL/LTR if not specified) */
  align?: 'left' | 'right' | 'center' | 'start' | 'end';
  
  /** Enable/disable sorting for this column */
  sortable?: boolean;
  
  /** Enable/disable filtering for this column */
  filterable?: boolean;
  
  /** Hide column on mobile devices */
  hideOnMobile?: boolean;

  /** Hide column below a specific breakpoint (e.g. hideBelow: 'lg' => hidden on < lg) */
  hideBelow?: ResponsiveBreakpoint;
  
  /** CSS classes for the column cells */
  className?: string;
  
  /** CSS classes for the header cell */
  headerClassName?: string;
}

/**
 * Pagination Configuration
 */
export interface PaginationConfig {
  /** Current page number (1-based) */
  page: number;
  
  /** Items per page */
  limit: number;
  
  /** Total number of items (optional because some backend pagination uses `totalItems`) */
  total?: number;

  /** Total number of items (backend alias) */
  totalItems?: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Whether there's a next page */
  hasNextPage?: boolean;
  
  /** Whether there's a previous page */
  hasPrevPage?: boolean;
}

/**
 * Empty State Configuration
 */
export interface EmptyState {
  /** Icon to display (React component) */
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

/**
 * Export Configuration
 */
export interface ExportConfig {
  /** Enable Excel export */
  enabled: boolean;
  
  /** Filename for export (without extension) */
  filename?: string;
  
  /** Columns to include in export (default: all) */
  columns?: string[];
  
  /** Custom export transformer */
  transformer?: (data: any[]) => any[];
}

/**
 * Sort Configuration
 */
export interface SortConfig {
  /** Column ID to sort by */
  column: string;
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Filter Configuration
 */
export interface FilterConfig {
  /** Column ID to filter */
  column: string;
  
  /** Filter value */
  value: any;
  
  /** Filter operator */
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt';
}

/**
 * Main DataTable Props
 * 
 * @template T - The data type for each row
 */
export interface DataTableProps<T = any> {
  // ==================== Data ====================
  
  /** Array of data to display */
  data: T[];
  
  /** Column definitions */
  columns: ColumnDef<T>[];
  
  /** Unique key extractor for each row */
  getRowId: (row: T, index: number) => string;
  
  // ==================== States ====================
  
  /** Loading state */
  loading?: boolean;
  
  /** Error state */
  error?: Error | string | null;

  /** Error state configuration */
  errorState?: {
    title?: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  
  /** Empty state configuration */
  emptyState?: EmptyState;
  
  // ==================== Pagination ====================
  
  /** Pagination configuration */
  pagination?: PaginationConfig;
  
  /** Page change handler */
  onPageChange?: (page: number) => void;

  /** Page size change handler */
  onPageSizeChange?: (pageSize: number) => void;

  /** Allowed page size options */
  pageSizeOptions?: number[];
  
  // ==================== Sorting ====================
  
  /** Current sort configuration */
  sortConfig?: SortConfig;
  
  /** Sort change handler */
  onSortChange?: (sort: SortConfig) => void;
  
  // ==================== Filtering ====================
  
  /** Current filters */
  filters?: FilterConfig[];
  
  /** Filter change handler */
  onFilterChange?: (filters: FilterConfig[]) => void;
  
  // ==================== Selection ====================
  
  /** Enable row selection */
  selectable?: boolean;
  
  /** Selected row IDs */
  selectedRows?: string[];
  
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // ==================== Actions ====================
  
  /** Row click handler */
  onRowClick?: (row: T) => void;

  /** Custom row classes */
  getRowClassName?: (row: T, index: number) => string;
  
  /** Row actions renderer */
  rowActions?: (row: T) => ReactNode;

  /** Custom row actions header label */
  rowActionsHeader?: ReactNode;
  
  // ==================== Export ====================
  
  /** Export configuration */
  exportConfig?: ExportConfig;
  
  // ==================== Styling ====================
  
  /** Custom CSS classes for the table wrapper */
  className?: string;
  
  /** Enable striped rows */
  striped?: boolean;
  
  /** Enable hover effect on rows */
  hoverable?: boolean;
  
  /** Table size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Sticky header */
  stickyHeader?: boolean;
  
  /** Max height for scrollable table */
  maxHeight?: string;
  
  // ==================== Accessibility ====================
  
  /** ARIA label for the table */
  ariaLabel?: string;
  
  /** Table caption for screen readers */
  caption?: string;

  /** Loading skeleton rows count */
  loadingRows?: number;

  /** Loading message text */
  loadingMessage?: string;
}

/**
 * Internal Table State
 * Manages component's internal state
 */
export interface TableState {
  /** Currently hovered row ID */
  hoveredRow: string | null;
  
  /** Locally selected rows (if not controlled) */
  internalSelection: string[];
  
  /** Current page (if not controlled) */
  internalPage: number;
  
  /** Current sort (if not controlled) */
  internalSort: SortConfig | null;
  
  /** Current filters (if not controlled) */
  internalFilters: FilterConfig[];
}
