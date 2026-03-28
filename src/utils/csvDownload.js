/**
 * RFC 4180–style CSV cell encoding: quote when needed; escape internal quotes.
 */
export function encodeCsvField(value) {
  const s = value == null ? "" : String(value);
  const mustQuote =
    /[",\r\n]/.test(s) || s.startsWith(" ") || s.endsWith(" ");
  const escaped = s.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

export function downloadCsv(filename, rows, headers) {
  const line = (cells) => cells.map(encodeCsvField).join(",");
  const body = [
    line(headers.map((h) => h.label)),
    ...rows.map((row) => line(headers.map((h) => row[h.key]))),
  ].join("\r\n");
  const blob = new Blob(["\ufeff", body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
