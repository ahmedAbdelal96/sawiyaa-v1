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

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { DataTableProps } from './types';
import { DataTableLoading } from './DataTableLoading';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTablePagination } from './DataTablePagination';
import { DataTableExport } from './DataTableExport';
import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  isRTL,
  getColumnAlignment,
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
  const rtl = isRTL();
  
  // Get size classes
  const sizeClasses = getSizeClasses(size);
  const sortableColumns = useMemo(() => columns.filter((column) => column.sortable), [columns]);
  const defaultSortColumn = useMemo(() => resolveDefaultSortColumn(columns), [columns]);
  
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
  if (loading) {
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
        title={emptyState?.title || (rtl ? 'لا توجد بيانات' : 'No data')}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    );
  }
  
  return (
    <div className={`${className}`}>
      {/* Table Container */}
      <div className="app-panel overflow-hidden rounded-[24px]">
        {(exportConfig?.enabled || (pagination && onPageSizeChange)) && (
          <div className="border-b border-border-light px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {pagination && onPageSizeChange ? (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
                  <span>{rtl ? "عدد الصفوف" : "Rows"}</span>
                  <select
                    value={pagination.limit}
                    onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    disabled={loading}
                    className="app-control h-9 min-w-[90px] px-2 py-1 text-sm"
                    aria-label={rtl ? "عدد الصفوف في الصفحة" : "Rows per page"}
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
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
                      <span>{rtl ? "ترتيب حسب" : "Sort by"}</span>
                      <select
                        value={activeSort?.column ?? defaultSortColumn ?? sortableColumns[0].id}
                        onChange={(event) =>
                          applySort({
                            column: event.target.value,
                            direction: activeSort?.direction ?? "desc",
                          })
                        }
                        className="app-control h-9 min-w-[140px] px-2 py-1 text-sm"
                        aria-label={rtl ? "اختيار عمود الترتيب" : "Sort column"}
                      >
                        {sortableColumns.map((column) => (
                          <option key={column.id} value={column.id}>
                            {typeof column.header === "string" ? column.header : column.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
                      <span>{rtl ? "الاتجاه" : "Direction"}</span>
                      <select
                        value={activeSort?.direction ?? "desc"}
                        onChange={(event) =>
                          applySort({
                            column: activeSort?.column ?? defaultSortColumn ?? sortableColumns[0].id,
                            direction: event.target.value as "asc" | "desc",
                          })
                        }
                        className="app-control h-9 min-w-[110px] px-2 py-1 text-sm"
                        aria-label={rtl ? "اتجاه الترتيب" : "Sort direction"}
                      >
                        <option value="desc">{rtl ? "الأحدث أولًا" : "Newest first"}</option>
                        <option value="asc">{rtl ? "الأقدم أولًا" : "Oldest first"}</option>
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
              className={`border-b border-border-light bg-surface-secondary/95 backdrop-blur-sm ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              <tr role="row">
                {/* Selection checkbox column */}
                {selectable && (
                  <th className={`${sizeClasses.header} w-12`} role="columnheader">
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
                      className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                      aria-label={rtl ? 'تحديد الكل' : 'Select all'}
                    />
                  </th>
                )}
                
                {/* Data columns */}
                {columns.map((column) => {
                  const alignment = getColumnAlignment(column, rtl);
                  const isSorted = activeSort?.column === column.id;
                  const sortDirection = activeSort?.direction;
                  
                  return (
                    <th
                      key={column.id}
                      role="columnheader"
                      className={`
                        ${sizeClasses.header}
                        whitespace-normal break-words font-semibold text-text-secondary
                        ${column.headerClassName || ''}
                        ${alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'}
                      ${
                        column.sortable ? 'cursor-pointer select-none transition-colors hover:bg-primary-light/30' : ''
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
                      <div className="flex items-center gap-2">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="inline-flex flex-col">
                            {isSorted && sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : isSorted && sortDirection === 'desc' ? (
                              <ArrowDown className="w-3 h-3" />
                            ) : (
                              <span className="w-3 h-3 opacity-30">
                                <ArrowUp className="w-3 h-3" />
                              </span>
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
                    className={`${sizeClasses.header} ${rtl ? 'text-right' : 'text-left'} whitespace-nowrap`}
                    role="columnheader"
                  >
                    {rowActionsHeader || 'Actions'}
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-border-light">
              {processedData.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = selectedRows.includes(rowId);
                
                return (
                  <tr
                    key={rowId}
                    role="row"
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors
                      ${hoverable ? 'hover:bg-surface-tertiary/70' : ''}
                      ${striped && index % 2 === 1 ? 'bg-surface-tertiary/60' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-primary-light/50 ring-1 ring-inset ring-primary/10' : ''}
                      ${getRowClassName?.(row, index) ?? ''}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={sizeClasses.cell} role="cell">
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
                          className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                          aria-label={`${rtl ? 'تحديد' : 'Select'} ${rowId}`}
                        />
                      </td>
                    )}
                    
                    {/* Data cells */}
                    {columns.map((column) => {
                      const alignment = getColumnAlignment(column, rtl);
                      
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
                      
                      return (
                        <td
                          key={column.id}
                        role="cell"
                        className={`
                          ${sizeClasses.cell}
                          align-top whitespace-normal break-words leading-6
                          ${column.className || ''}
                          ${alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'}
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
                        className={`${sizeClasses.cell} ${rtl ? 'text-right' : 'text-left'}`}
                        role="cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
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
