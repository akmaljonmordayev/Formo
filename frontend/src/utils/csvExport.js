const escapeCell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Builds a CSV string (UTF-8 BOM + ";" delimiter so Excel opens it correctly) and
 * triggers a browser download. `rows` is an array of objects; `columns` maps each
 * CSV column to a [header, accessor] pair.
 */
export function downloadCsv(filename, columns, rows) {
  const header = columns.map(([label]) => escapeCell(label)).join(';');
  const lines = rows.map((row) => columns.map(([, get]) => escapeCell(get(row))).join(';'));
  const csv = '﻿' + [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
