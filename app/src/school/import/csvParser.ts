/**
 * CSV parser supporting comma and semicolon delimiters (Indonesian Excel exports)
 * and quoted multiline or comma-containing fields.
 */
export function parseCsv(content: string): Array<Record<string, string>> {
  if (!content || !content.trim()) return [];

  // Determine delimiter: inspect first line for ; vs ,
  const firstLine = content.split(/\r?\n/)[0] || "";
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Push remaining field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map((h) =>
    h.toLowerCase().trim().replace(/[\s_-]+/g, "")
  );

  const result: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < normalizedHeaders.length; c++) {
      const key = normalizedHeaders[c];
      obj[key] = row[c] !== undefined ? row[c].trim() : "";
    }
    result.push(obj);
  }

  return result;
}

/**
 * Value extractor with aliases
 */
export function extractValue(
  row: Record<string, string>,
  aliases: string[]
): string {
  for (const alias of aliases) {
    const norm = alias.toLowerCase().replace(/[\s_-]+/g, "");
    if (row[norm] !== undefined && row[norm] !== "") {
      return row[norm];
    }
  }
  return "";
}
