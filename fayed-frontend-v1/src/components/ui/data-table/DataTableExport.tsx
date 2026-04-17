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
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'border border-border-light text-text-primary hover:bg-surface-tertiary',
    ghost: 'text-text-primary hover:bg-surface-tertiary',
  };
  
  // Size styles
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  
  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || data.length === 0}
      className={`
        rounded-lg transition-colors inline-flex items-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
      `}
      aria-label={rtl ? 'تصدير إلى Excel' : 'Export to Excel'}
    >
      <Download className="w-4 h-4" />
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
