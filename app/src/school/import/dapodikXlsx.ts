import { strFromU8, unzipSync } from "fflate";
import {
  mapDapodikSheetRows,
  type DapodikStudentRow,
} from "./dapodikFormat";

const MAX_DAPODIK_FILE_BYTES = 10 * 1024 * 1024;

function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Struktur XML pada file Excel tidak dapat dibaca.");
  }
  return document;
}

function columnIndexFromReference(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let index = 0;
  for (const character of letters) {
    index = index * 26 + character.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
}

function readSharedStrings(files: Record<string, Uint8Array>): string[] {
  const content = files["xl/sharedStrings.xml"];
  if (!content) return [];

  const document = parseXml(strFromU8(content));
  return Array.from(document.getElementsByTagName("si")).map((node) =>
    Array.from(node.getElementsByTagName("t"))
      .map((text) => text.textContent ?? "")
      .join(""),
  );
}

function resolveFirstWorksheet(files: Record<string, Uint8Array>): Uint8Array {
  const workbook = files["xl/workbook.xml"];
  const relationships = files["xl/_rels/workbook.xml.rels"];

  if (workbook && relationships) {
    const workbookDoc = parseXml(strFromU8(workbook));
    const relationshipDoc = parseXml(strFromU8(relationships));
    const firstSheet = workbookDoc.getElementsByTagName("sheet")[0];

    const relationshipId =
      firstSheet?.getAttribute("r:id") ||
      firstSheet?.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      );

    if (relationshipId) {
      const relationship = Array.from(
        relationshipDoc.getElementsByTagName("Relationship"),
      ).find((node) => node.getAttribute("Id") === relationshipId);

      const target = relationship?.getAttribute("Target");
      if (target) {
        const normalized = target.startsWith("/")
          ? target.slice(1)
          : target.startsWith("xl/")
            ? target
            : `xl/${target.replace(/^\.\//, "")}`;
        if (files[normalized]) return files[normalized];
      }
    }
  }

  const fallback = files["xl/worksheets/sheet1.xml"];
  if (!fallback) {
    throw new Error(
      "Worksheet pertama tidak ditemukan. Gunakan file .xlsx Daftar Peserta Didik dari Dapodik.",
    );
  }
  return fallback;
}

function sheetXmlToRows(
  sheetXml: Uint8Array,
  sharedStrings: string[],
): string[][] {
  const document = parseXml(strFromU8(sheetXml));
  const output: string[][] = [];

  for (const rowNode of Array.from(document.getElementsByTagName("row"))) {
    const rowIndex = Number(rowNode.getAttribute("r") || output.length + 1) - 1;
    const row: string[] = [];

    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const reference = cell.getAttribute("r") || "A1";
      const column = columnIndexFromReference(reference);
      const type = cell.getAttribute("t");
      let value = "";

      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t"))
          .map((text) => text.textContent ?? "")
          .join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
        if (type === "s") {
          value = sharedStrings[Number(raw)] ?? "";
        } else if (type === "b") {
          value = raw === "1" ? "TRUE" : "FALSE";
        } else {
          value = raw;
        }
      }

      row[column] = value;
    }

    output[rowIndex] = row;
  }

  return Array.from({ length: output.length }, (_, index) => output[index] ?? []);
}

function excelSerialToIsoDate(value: string): string {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return value;
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return value;

  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.floor(serial) * 86400000);
  return date.toISOString().slice(0, 10);
}

function padNumericIdentifier(value: string, length: number): string {
  const clean = value.trim().replace(/\.0$/, "");
  return /^\d+$/.test(clean) && clean.length < length
    ? clean.padStart(length, "0")
    : clean;
}

function normalizeKnownExcelValues(row: DapodikStudentRow): DapodikStudentRow {
  return {
    ...row,
    birthDate: excelSerialToIsoDate(row.birthDate),
    nisn: padNumericIdentifier(row.nisn, 10),
    nik: padNumericIdentifier(row.nik, 16),
    fatherNik: padNumericIdentifier(row.fatherNik, 16),
    motherNik: padNumericIdentifier(row.motherNik, 16),
    guardianNik: padNumericIdentifier(row.guardianNik, 16),
    familyCardNumber: padNumericIdentifier(row.familyCardNumber, 16),
    postalCode: padNumericIdentifier(row.postalCode, 5),
  };
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error("Berkas tidak menghasilkan data biner."));
        return;
      }
      resolve(new Uint8Array(result));
    };
    reader.onerror = () => reject(reader.error || new Error("Berkas gagal dibaca."));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseDapodikXlsx(file: File): Promise<{
  rows: DapodikStudentRow[];
  recognizedColumns: number;
  headerRowNumber: number;
}> {
  if (!file.name.toLocaleLowerCase("id-ID").endsWith(".xlsx")) {
    throw new Error("Gunakan file Excel .xlsx hasil unduhan Daftar Peserta Didik Dapodik.");
  }
  if (file.size > MAX_DAPODIK_FILE_BYTES) {
    throw new Error("Ukuran file Dapodik maksimal 10 MB.");
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(await fileToUint8Array(file));
  } catch {
    throw new Error(
      "File Excel tidak dapat dibuka. Pastikan file .xlsx tidak rusak dan berasal dari ekspor Dapodik.",
    );
  }

  const worksheet = resolveFirstWorksheet(files);
  const sharedStrings = readSharedStrings(files);
  const rawRows = sheetXmlToRows(worksheet, sharedStrings);
  const mapped = mapDapodikSheetRows(rawRows);

  return {
    rows: mapped.students.map(normalizeKnownExcelValues),
    recognizedColumns: mapped.recognizedColumns,
    headerRowNumber: mapped.headerRowIndex + 1,
  };
}
