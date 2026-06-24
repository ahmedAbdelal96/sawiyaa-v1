/**
 * Data Export Utilities (CSV)
 *
 * Utilities for exporting table data from the browser.
 *
 * Security note:
 * - We intentionally avoid SheetJS (xlsx) here because `npm audit` reports high-severity
 *   vulnerabilities with no upstream fix available at the time of Phase 9A triage.
 * - This utility exports CSV (which Excel can open) to keep the feature while removing
 *   the vulnerable runtime dependency.
 *
 * @author Senior Development Team
 */

import type { ColumnDef } from './types';

/**
 * Export data to a CSV file (Excel-compatible).
 *
 * Backwards compatibility:
 * - This function name is kept as `exportToExcel` to avoid broad refactors in call sites.
 * - The `sheetName` parameter is ignored for CSV export.
 */
export async function exportToExcel<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  sheetName: string = 'Data',
): Promise<void> {
  try {
    void sheetName;

    const transformedData = data.map((row) => {
      const transformedRow: Record<string, any> = {};

      columns.forEach((column) => {
        const header =
          typeof column.header === 'string' ? column.header : column.id;

        let value: any;
        if (column.accessor) {
          value = column.accessor(row);
        } else {
          value = (row as any)[column.id];
        }

        transformedRow[header] = formatValueForExcel(value);
      });

      return transformedRow;
    });

    const csv = buildCsv(transformedData, columns);

    const timestamp = new Date().toISOString().slice(0, 10);
    const fullFilename = `${filename}_${timestamp}.csv`;

    downloadTextFile(fullFilename, csv);

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Exported ${data.length} rows to ${fullFilename}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Export failed:', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw new Error('Failed to export data');
  }
}

/**
 * Export selected rows only.
 */
export async function exportSelectedRows<T = any>(
  data: T[],
  selectedIds: string[],
  getRowId: (row: T, index: number) => string,
  columns: ColumnDef<T>[],
  filename: string = 'export_selected',
): Promise<void> {
  const selectedData = data.filter((row, index) => {
    const id = getRowId(row, index);
    return selectedIds.includes(id);
  });

  await exportToExcel(selectedData, columns, filename);
}

/**
 * Export with a custom transformer.
 */
export async function exportWithTransformer<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  transformer: (data: T[]) => any[],
  filename: string = 'export',
): Promise<void> {
  const transformedData = transformer(data);
  await exportToExcel(transformedData, columns, filename);
}

function buildCsv<T = any>(
  rows: Array<Record<string, any>>,
  columns: ColumnDef<T>[],
): string {
  const headers = columns.map((column) =>
    typeof column.header === 'string' ? column.header : column.id,
  );

  const lines: string[] = [];
  // UTF-8 BOM for Excel compatibility with Arabic text.
  lines.push('\uFEFF' + headers.map(escapeCsvCell).join(','));

  for (const row of rows) {
    const values = headers.map((h) => escapeCsvCell(row[h]));
    lines.push(values.join(','));
  }

  return lines.join('\r\n');
}

function escapeCsvCell(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function downloadTextFile(filename: string, content: string): void {
  if (typeof window === 'undefined') {
    throw new Error('CSV export is only supported in the browser.');
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatValueForExcel(value: any): any {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');

  // Return as-is for primitives
  if (typeof value !== 'object') return value;

  // Handle React elements (extract text)
  if ((value as any)?.props) {
    return extractTextFromReactElement(value);
  }

  return JSON.stringify(value);
}

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
