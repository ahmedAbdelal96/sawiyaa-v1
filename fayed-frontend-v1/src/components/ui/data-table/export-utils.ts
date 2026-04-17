/**
 * Excel Export Utilities
 * 
 * Utilities for exporting table data to Excel format.
 * Supports customizable columns, formatting, and RTL content.
 * 
 * Uses SheetJS (xlsx) library for Excel generation.
 * Install: npm install xlsx
 * 
 * @author Senior Development Team
 */

import type { ColumnDef } from './types';

/**
 * Export data to Excel file
 * 
 * @param data - Array of data objects to export
 * @param columns - Column definitions for headers and formatting
 * @param filename - Output filename (without extension)
 * @param sheetName - Excel sheet name (default: 'Data')
 */
export async function exportToExcel<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  sheetName: string = 'Data'
): Promise<void> {
  try {
    // Dynamically import xlsx to reduce bundle size
    const XLSX = await import('xlsx');
    
    // Transform data based on column definitions
    const transformedData = data.map((row) => {
      const transformedRow: Record<string, any> = {};
      
      columns.forEach((column) => {
        // Get header text
        const header = typeof column.header === 'string' 
          ? column.header 
          : column.id;
        
        // Get cell value using accessor or direct property
        let value: any;
        if (column.accessor) {
          value = column.accessor(row);
        } else {
          value = (row as any)[column.id];
        }
        
        // Format value for Excel
        transformedRow[header] = formatValueForExcel(value);
      });
      
      return transformedRow;
    });
    
    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    
    // Set column widths based on content
    const columnWidths = columns.map((column) => {
      const header = typeof column.header === 'string' ? column.header : column.id;
      return { wch: Math.max(header.length, 15) };
    });
    worksheet['!cols'] = columnWidths;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Set workbook properties for RTL support
    if (!workbook.Workbook) workbook.Workbook = {};
    if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
    workbook.Workbook.Views[0] = { RTL: isRTL() };
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const fullFilename = `${filename}_${timestamp}.xlsx`;
    
    // Write file
    XLSX.writeFile(workbook, fullFilename);
    
    console.log(`✅ Exported ${data.length} rows to ${fullFilename}`);
  } catch (error) {
    console.error('❌ Export to Excel failed:', error);
    throw new Error('Failed to export data to Excel');
  }
}

/**
 * Format value for Excel cell
 * Handles different data types appropriately
 */
function formatValueForExcel(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle dates
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  // Handle objects (stringify)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Handle React elements (extract text)
  if (typeof value === 'object' && value?.props) {
    return extractTextFromReactElement(value);
  }
  
  // Return as-is for primitives
  return value;
}

/**
 * Extract text content from React element
 */
function extractTextFromReactElement(element: any): string {
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  
  if (element?.props?.children) {
    const children = element.props.children;
    if (Array.isArray(children)) {
      return children.map(extractTextFromReactElement).join(' ');
    }
    return extractTextFromReactElement(children);
  }
  
  return '';
}

/**
 * Detect if current locale is RTL
 */
function isRTL(): boolean {
  if (typeof window === 'undefined') return false;
  
  const html = document.documentElement;
  const dir = html.getAttribute('dir');
  const lang = html.getAttribute('lang');
  
  return dir === 'rtl' || lang === 'ar' || lang === 'he' || lang === 'fa';
}

/**
 * Export selected rows only
 */
export async function exportSelectedRows<T = any>(
  data: T[],
  selectedIds: string[],
  getRowId: (row: T, index: number) => string,
  columns: ColumnDef<T>[],
  filename: string = 'export_selected'
): Promise<void> {
  const selectedData = data.filter((row, index) => {
    const id = getRowId(row, index);
    return selectedIds.includes(id);
  });
  
  await exportToExcel(selectedData, columns, filename);
}

/**
 * Export with custom transformer
 */
export async function exportWithTransformer<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  transformer: (data: T[]) => any[],
  filename: string = 'export'
): Promise<void> {
  const transformedData = transformer(data);
  await exportToExcel(transformedData, columns, filename);
}
