export function toCsvContent(rows: string[][]): string {
  const csvBody = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  return `\uFEFF${csvBody}`;
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}
