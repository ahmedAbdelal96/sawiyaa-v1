/**
 * DataTable Component
 * 
 * Reusable, feature-rich data table component.
 * 
 * Features:
 * - Generic type support
 * - Customizable columns
 * - Loading, empty, and error states
 * - Pagination
 * - Sorting & filtering
 * - Export to Excel
 * - RTL/LTR support
 * - Dark mode support
 * - Responsive design
 * - Accessibility compliant
 * 
 * @author Senior Development Team
 * @version 1.0.0
 */

"use client";

import { useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { DataTableProps } from './types';
import { DataTableLoading } from './DataTableLoading';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTablePagination } from './DataTablePagination';
import { DataTableExport } from './DataTableExport';
import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  isRTL,
  getColumnAlignment,
  resolveColumnAlignment,
  getColumnVisibilityClass,
  sortData,
  filterData,
  getSizeClasses,
} from './utils';

const DEFAULT_LATEST_FIRST_COLUMNS = [
  "createdAt",
  "submittedAt",
  "updatedAt",
  "occurredAt",
  "publishedAt",
  "generatedAt",
  "lastMessageAt",
  "scheduledStartAt",
  "scheduledAt",
];

function resolveDefaultSortColumn<T = any>(columns: DataTableProps<T>["columns"]) {
  const sortableColumns = columns.filter((column) => column.sortable);
  if (sortableColumns.length === 0) return null;

  const preferred = DEFAULT_LATEST_FIRST_COLUMNS.find((id) =>
    sortableColumns.some((column) => column.id === id),
  );

  return preferred ?? sortableColumns[0].id;
}

/**
 * Main DataTable Component
 * 
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { id: 'name', header: 'Name', accessor: (row) => row.name },
 *     { id: 'email', header: 'Email', accessor: (row) => row.email },
 *   ]}
 *   getRowId={(row) => row.id}
 *   pagination={paginationConfig}
 *   onPageChange={handlePageChange}
 * />
 * ```
 */
export function DataTable<T = any>({
  // Data
  data,
  columns,
  getRowId,
  
  // States
  loading = false,
  error = null,
  errorState,
  emptyState,
  
  // Pagination
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  
  // Sorting
  sortConfig,
  onSortChange,
  
  // Filtering
  filters,
  onFilterChange,
  
  // Selection
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  
  // Actions
  onRowClick,
  getRowClassName,
  rowActions,
  rowActionsHeader,
  
  // Export
  exportConfig,
  
  // Styling
  className = '',
  striped = false,
  hoverable = true,
  size = 'md',
  stickyHeader = false,
  maxHeight,
  
  // Accessibility
  ariaLabel,
  caption,
  loadingRows = 6,
  loadingMessage,
}: DataTableProps<T>) {
  // Detect RTL
  const locale = useLocale();
  const rtl = locale === 'ar';
  const t = useTranslations("common");
  
  // Get size classes
  const sizeClasses = getSizeClasses(size);
  const sortableColumns = useMemo(() => columns.filter((column) => column.sortable), [columns]);
  const defaultSortColumn = useMemo(() => resolveDefaultSortColumn(columns), [columns]);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  
  // Local state for uncontrolled features
  const [localSort, setLocalSort] = useState(
    sortConfig ||
      (defaultSortColumn
        ? {
            column: defaultSortColumn,
            direction: "desc" as const,
          }
        : null),
  );
  const [localFilters, setLocalFilters] = useState(filters || []);
  
  // Use controlled or uncontrolled sort
  const activeSort = sortConfig !== undefined ? sortConfig : localSort;
  const activeFilters = filters !== undefined ? filters : localFilters;

  // Process data: filter -> sort
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply filters
    if (activeFilters.length > 0) {
      result = filterData(result, activeFilters, columns);
    }
    
    // Apply sort
    if (activeSort) {
      result = sortData(result, activeSort, columns);
    }
    
    return result;
  }, [data, activeFilters, activeSort, columns]);
  
  // Handle sort column click
  const applySort = (newSort: { column: string; direction: "asc" | "desc" }) => {
    if (onSortChange) {
      onSortChange(newSort);
    } else {
      setLocalSort(newSort);
    }
  };

  const handleSortClick = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column?.sortable) return;
    
    const newSort = {
      column: columnId,
      direction:
        activeSort?.column === columnId && activeSort.direction === 'asc'
          ? ('desc' as const)
          : ('asc' as const),
    };

    applySort(newSort);
  };
  
  // Loading state
  if (loading || !isHydrated) {
    return (
      <DataTableLoading
        rows={loadingRows}
        columns={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
        size={size}
        message={loadingMessage}
      />
    );
  }
  
  // Error state
  if (error) {
    const resolvedErrorMessage =
      typeof error === 'string'
        ? error
        : error.message || 'Please try again';

    return (
      <DataTableEmpty
        title={errorState?.title || 'An error occurred'}
        description={errorState?.description || resolvedErrorMessage}
        action={errorState?.action}
      />
    );
  }
  
  // Empty state
  if (processedData.length === 0) {
    return (
      <DataTableEmpty
        icon={emptyState?.icon}
        title={emptyState?.title || t("dataTable.noData")}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    );
  }
  
  // Explicit mapping of alignments to Tailwind classes to prevent purge issues
  const textAlignMap = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    start: "text-start",
    end: "text-end",
  };

  return (
    <div className={`${className}`}>
      {/* Table Container */}
      <div className="overflow-hidden rounded-[24px] border border-border-light bg-surface-secondary shadow-[0_18px_36px_-30px_rgba(0,0,0,0.15)]">
        {(exportConfig?.enabled || (pagination && onPageSizeChange)) && (
          <div className="border-b border-border-light px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {pagination && onPageSizeChange ? (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <span>{t("dataTable.rows")}</span>
                  <select
                    value={pagination.limit}
                    onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    disabled={loading}
                    className="app-control h-9 min-w-[85px] px-2 py-1 text-xs rounded-xl focus:border-border-focus focus:ring-2"
                    aria-label={t("dataTable.rowsPerPage")}
                  >
                    {(pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS).map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {sortableColumns.length > 0 ? (
                  <>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
                      <span>{t("dataTable.sortBy")}</span>
                      <select
                        value={activeSort?.column ?? defaultSortColumn ?? sortableColumns[0].id}
                        onChange={(event) =>
                          applySort({
                            column: event.target.value,
                            direction: activeSort?.direction ?? "desc",
                          })
                        }
                        className="app-control h-9 min-w-[130px] px-2 py-1 text-xs rounded-xl focus:border-border-focus focus:ring-2"
                        aria-label={t("dataTable.sortBy")}
                      >
                        {sortableColumns.map((column) => (
                          <option key={column.id} value={column.id}>
                            {typeof column.header === "string" ? column.header : column.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
                      <span>{t("dataTable.direction")}</span>
                      <select
                        value={activeSort?.direction ?? "desc"}
                        onChange={(event) =>
                          applySort({
                            column: activeSort?.column ?? defaultSortColumn ?? sortableColumns[0].id,
                            direction: event.target.value as "asc" | "desc",
                          })
                        }
                        className="app-control h-9 min-w-[105px] px-2 py-1 text-xs rounded-xl focus:border-border-focus focus:ring-2"
                        aria-label={t("dataTable.direction")}
                      >
                        <option value="desc">{t("dataTable.newestFirst")}</option>
                        <option value="asc">{t("dataTable.oldestFirst")}</option>
                      </select>
                    </label>
                  </>
                ) : null}

                {exportConfig?.enabled ? (
                  <DataTableExport data={processedData} columns={columns} config={exportConfig} />
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div
          className="overflow-x-auto"
          style={{ maxHeight: maxHeight }}
        >
          <table
            className="w-full table-fixed md:table-auto"
            role="table"
            aria-label={ariaLabel}
          >
            {/* Caption for accessibility */}
            {caption && <caption className="sr-only">{caption}</caption>}
            
            {/* Table Header */}
            <thead
              className={`border-b border-border-light bg-surface-tertiary backdrop-blur-xs ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              <tr role="row">
                {/* Selection checkbox column */}
                {selectable && (
                  <th className={`${sizeClasses.header} w-12 text-center font-semibold text-text-secondary`} role="columnheader">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.length > 0 &&
                          selectedRows.length === processedData.length
                        }
                        onChange={(e) => {
                          if (onSelectionChange) {
                            if (e.target.checked) {
                              onSelectionChange(
                                processedData.map((row, index) =>
                                  getRowId(row, index)
                                )
                              );
                            } else {
                              onSelectionChange([]);
                            }
                          }
                        }}
                        className="w-4 h-4 text-primary border-border-light rounded focus:ring-ring-focus focus:ring-2 transition-colors cursor-pointer"
                        aria-label={t("dataTable.selectAll")}
                      />
                    </div>
                  </th>
                )}
                
                {/* Data columns */}
                {columns.map((column) => {
                  const { textClass, justifyClass } = resolveColumnAlignment(column, rtl);
                  const isSorted = activeSort?.column === column.id;
                  const sortDirection = activeSort?.direction;
                  
                  const hasHeaderTextAlignClass = column.headerClassName && /(^|\s)text-(left|right|center|start|end)(\s|$)/.test(column.headerClassName);
                  const headerTextAlignClass = hasHeaderTextAlignClass ? '' : textClass;
                  const sortIconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
                  
                  return (
                    <th
                      key={column.id}
                      role="columnheader"
                      className={`
                        ${sizeClasses.header}
                        group
                        whitespace-normal break-words font-semibold text-text-secondary
                        ${column.headerClassName || ''}
                        ${headerTextAlignClass}
                      ${
                        column.sortable ? 'cursor-pointer select-none transition-colors hover:bg-surface-tertiary/75' : ''
                      }
                        ${isSorted ? 'text-text-primary' : ''}
                        ${getColumnVisibilityClass(column)}
                      `}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSortClick(column.id)}
                      aria-sort={
                        isSorted
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <div className={`flex items-center gap-1.5 ${justifyClass}`}>
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="inline-flex shrink-0 items-center text-text-muted transition-opacity duration-200">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className={`${sortIconSizeClass} text-primary`} />
                              ) : (
                                <ArrowDown className={`${sortIconSizeClass} text-primary`} />
                              )
                            ) : (
                              <ArrowUp className={`${sortIconSizeClass} opacity-25 group-hover:opacity-60 transition-opacity`} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                
                {/* Actions column */}
                {rowActions && (
                  <th
                    className={`${sizeClasses.header} text-center font-semibold text-text-secondary whitespace-nowrap`}
                    role="columnheader"
                  >
                    <div className="flex items-center justify-center">
                      {rowActionsHeader || t('dataTable.actions')}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-border-light/80">
              {processedData.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = selectedRows.includes(rowId);
                
                return (
                  <tr
                    key={rowId}
                    role="row"
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors duration-150
                      ${hoverable ? 'hover:bg-surface-tertiary' : ''}
                      ${striped && index % 2 === 1 ? 'bg-surface-tertiary/40' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-primary-light/20 ring-1 ring-inset ring-primary/5' : ''}
                      ${getRowClassName?.(row, index) ?? ''}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={`${sizeClasses.cell} text-center align-middle`} role="cell">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (onSelectionChange) {
                                if (e.target.checked) {
                                  onSelectionChange([...selectedRows, rowId]);
                                } else {
                                  onSelectionChange(
                                    selectedRows.filter((id) => id !== rowId)
                                  );
                                }
                              }
                            }}
                            className="w-4 h-4 text-primary border-border-light rounded focus:ring-ring-focus focus:ring-2 transition-colors cursor-pointer"
                            aria-label={`${t("dataTable.selectRow")} ${rowId}`}
                          />
                        </div>
                      </td>
                    )}
                    
                    {/* Data cells */}
                    {columns.map((column) => {
                      const { textClass } = resolveColumnAlignment(column, rtl);
                      const hasAlignClass = column.className && /(^|\s)align-(top|middle|bottom|baseline)(\s|$)/.test(column.className);
                      const hasLeadingClass = column.className && /leading-/.test(column.className);
                      const hasTextAlignClass = column.className && /(^|\s)text-(left|right|center|start|end)(\s|$)/.test(column.className);
                      
                      // Get cell value
                      let value: any;
                      if (column.accessor) {
                        value = column.accessor(row);
                      } else {
                        value = (row as any)[column.id];
                      }
                      
                      // Render cell content
                      const cellContent = column.cell
                        ? column.cell(row, value)
                        : value;
                      
                      const cellTextAlignClass = hasTextAlignClass ? '' : textClass;
                      const cellVerticalAlignClass = hasAlignClass ? '' : 'align-middle';
                      const cellLeadingClass = hasLeadingClass ? '' : 'leading-5';
                      
                      return (
                        <td
                          key={column.id}
                          role="cell"
                          className={`
                            ${sizeClasses.cell}
                            ${cellVerticalAlignClass}
                            ${cellLeadingClass}
                            whitespace-normal break-words text-text-primary
                            ${column.className || ''}
                            ${cellTextAlignClass}
                            ${getColumnVisibilityClass(column)}
                          `}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    
                    {/* Actions cell */}
                    {rowActions && (
                      <td
                        className={`${sizeClasses.cell} text-center align-middle`}
                        role="cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {rowActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && onPageChange && (
          <DataTablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
