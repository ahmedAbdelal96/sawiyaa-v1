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

export type PdfExportOptions = {
  title?: string;
  subtitle?: string;
  countLabel?: string;
  direction?: "rtl" | "ltr";
};

/**
 * Opens a print-ready, paginated PDF view in the browser. The browser's
 * native print dialog provides the PDF writer and preserves Arabic fonts/RTL.
 */
export async function exportToPdf<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = "export",
  options: PdfExportOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only supported in the browser.");
  }

  if (data.length === 0) {
    throw new Error("EMPTY_EXPORT");
  }

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    throw new Error("PDF_PRINT_WINDOW_BLOCKED");
  }
  printWindow.opener = null;

  const direction = options.direction ?? "rtl";
  const title = options.title ?? "Export";
  const subtitle = options.subtitle ?? "";
  const headers = columns.map((column) =>
    typeof column.header === "string" ? column.header : column.id,
  );
  const rows = data
    .map((row, index) => {
      const values = columns.map((column) => {
        const value = column.accessor ? column.accessor(row) : (row as any)[column.id];
        return escapeHtml(formatValueForExcel(value));
      });
      return `<tr><td>${index + 1}</td>${values.map((value) => `<td>${value}</td>`).join("")}</tr>`;
    })
    .join("");

  const exportDate = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const headerHtml = `<header><div class="brand">Sawiyaa</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}<div class="meta">${escapeHtml(exportDate)} · ${escapeHtml(options.countLabel ?? "Rows")}: ${data.length}</div></header>`;
  const tableHtml = `<table><thead><tr><th>#</th>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="ar" dir="${direction}"><head><meta charset="utf-8"><title>${escapeHtml(safeFilename)}</title><style>
    @page { size: A4 landscape; margin: 12mm; }
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17202a; background: #fff; font-family: Cairo, "Segoe UI", Tahoma, sans-serif; font-size: 10px; direction: ${direction}; }
    header { margin-bottom: 14px; border-bottom: 2px solid #176b87; padding-bottom: 8px; }
    .brand { color: #176b87; font-size: 13px; font-weight: 800; letter-spacing: .04em; }
    h1 { margin: 3px 0; font-size: 18px; }
    p { margin: 2px 0; color: #59636e; font-size: 11px; }
    .meta { margin-top: 6px; color: #59636e; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { border: 1px solid #d7dee4; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; text-align: start; }
    th { background: #edf5f7; color: #16475a; font-weight: 800; }
    tr:nth-child(even) td { background: #fafcfd; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>${headerHtml}${tableHtml}<script>window.onload=function(){window.focus();setTimeout(function(){window.print();},50);};</script></body></html>`);
  printWindow.document.close();
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

function escapeHtml(value: any): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
