/**
 * DataTable Export Button Component
 * 
 * Button to export table data to Excel.
 * Handles loading state and error handling.
 * 
 * @author Senior Development Team
 */

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef, ExportConfig } from './types';
import { exportToExcel } from './export-utils';
import { isRTL } from './utils';

interface DataTableExportProps<T = any> {
  /** Data to export */
  data: T[];
  
  /** Column definitions */
  columns: ColumnDef<T>[];
  
  /** Export configuration */
  config: ExportConfig;
  
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export function DataTableExport<T = any>({
  data,
  columns,
  config,
  variant = 'secondary',
  size = 'md',
}: DataTableExportProps<T>) {
  const [exporting, setExporting] = useState(false);
  const rtl = isRTL();
  
  // Don't render if export is disabled
  if (!config.enabled) return null;
  
  // Filter columns for export
  const exportColumns = config.columns
    ? columns.filter((col) => config.columns!.includes(col.id))
    : columns;
  
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Apply transformer if provided
      const exportData = config.transformer
        ? config.transformer(data)
        : data;
      
      // Export to Excel
      await exportToExcel(
        exportData,
        exportColumns,
        config.filename || 'export'
      );
      
      // Success toast
      toast.success(
        rtl ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully'
      );
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(
        rtl ? 'فشل تصدير البيانات' : 'Failed to export data'
      );
    } finally {
      setExporting(false);
    }
  };
  
  // Variant styles
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-theme-xs border border-transparent',
    secondary: 'border border-border-light bg-white text-text-primary hover:border-border-strong hover:bg-surface-tertiary shadow-theme-xs',
    ghost: 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
  };
  
  // Size styles
  const sizeClasses = {
    sm: 'px-2.5 h-8 text-[11px] gap-1 rounded-md font-semibold',
    md: 'px-3 h-9 text-xs gap-1.5 rounded-xl font-semibold',
    lg: 'px-4 h-10 text-sm gap-2 rounded-xl font-semibold',
  };
  
  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || data.length === 0}
      className={`
        transition-colors inline-flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
      `}
      aria-label={rtl ? 'تصدير إلى Excel' : 'Export to Excel'}
    >
      <Download className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>
        {exporting
          ? rtl
            ? 'جاري التصدير...'
            : 'Exporting...'
          : rtl
            ? 'تصدير Excel'
            : 'Export Excel'}
      </span>
    </button>
  );
}
