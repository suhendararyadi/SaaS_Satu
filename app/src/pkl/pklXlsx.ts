import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let out = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

export function createPklXlsxTemplate(headers: string[], sheetName = "PKL"): Uint8Array {
  const cells = headers.map((header, index) =>
    `<c r="${columnName(index)}1" t="inlineStr"><is><t>${escapeXml(header)}</t></is></c>`,
  ).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row></sheetData></worksheet>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml),
  }, { level: 6 });
}

function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Struktur XML Excel tidak dapat dibaca.");
  return doc;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, index - 1);
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

export async function pklXlsxToCsv(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Gunakan file .xlsx.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10 MB.");
  const buffer = typeof (file as any).arrayBuffer === "function"
    ? await (file as any).arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error || new Error("File Excel tidak dapat dibaca."));
        reader.readAsArrayBuffer(file);
      });
  const bytes = new Uint8Array(buffer);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("File Excel tidak dapat dibuka.");
  }
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet) throw new Error("Worksheet pertama tidak ditemukan.");
  const shared: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    const doc = parseXml(strFromU8(files["xl/sharedStrings.xml"]));
    for (const item of Array.from(doc.getElementsByTagName("si"))) {
      shared.push(Array.from(item.getElementsByTagName("t")).map((node) => node.textContent || "").join(""));
    }
  }
  const doc = parseXml(strFromU8(sheet));
  const rows: string[][] = [];
  for (const rowNode of Array.from(doc.getElementsByTagName("row"))) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const ref = cell.getAttribute("r") || "A1";
      const idx = columnIndex(ref);
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t")).map((node) => node.textContent || "").join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
        value = type === "s" ? (shared[Number(raw)] || "") : raw;
      }
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows.map((row) => row.map((value) => csvEscape(value || "")).join(",")).join("\r\n");
}

export function downloadPklXlsxTemplate(headers: string[], filename: string, sheetName: string) {
  const bytes = Uint8Array.from(createPklXlsxTemplate(headers, sheetName));
  const blob = new Blob([bytes.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
