/** Parse one CSV line with optional quoted fields (RFC 4180). */
export function parseCsvDataLine(line) {
  const cells = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  cells.push(cur.trim());
  return cells;
}

/** Strip BOM; split into records (newlines inside quoted fields preserved). */
export function splitCsvRecords(text) {
  const raw = (text ?? "").replace(/^\uFEFF/, "");
  const records = [];
  let row = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        row += '""';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      row += ch;
      continue;
    }
    if (!inQuotes && ch === "\r" && raw[i + 1] === "\n") {
      i += 1;
      if (row.trim() !== "") records.push(row);
      row = "";
      continue;
    }
    if (!inQuotes && ch === "\n") {
      if (row.trim() !== "") records.push(row);
      row = "";
      continue;
    }
    row += ch;
  }
  if (row.trim() !== "") records.push(row);
  return records;
}

/** Normalize header keys (lowercase, underscores). */
export function parseStudentImportCsv(text) {
  const records = splitCsvRecords(text);
  if (records.length < 2) {
    return {
      rows: [],
      error: "Need a header row and at least one data row.",
    };
  }
  const headerCells = parseCsvDataLine(records[0]);
  const headers = headerCells.map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );
  const rows = [];
  for (let i = 1; i < records.length; i++) {
    const parts = parseCsvDataLine(records[i]);
    if (parts.length === 1 && parts[0] === "") continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = parts[j] ?? "";
    });
    rows.push(obj);
  }
  if (!rows.length) {
    return { rows: [], error: "No data rows after the header." };
  }
  return { rows, error: null };
}
