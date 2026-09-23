import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseDapodikXlsx } from "./dapodikXlsx";

function cell(ref: string, value: string, numeric = false) {
  if (numeric) return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

describe("Dapodik XLSX reader", () => {
  it("reads the first worksheet and converts Excel birth-date serials", async () => {
    const headers = [
      "No",
      "Nama",
      "NIPD",
      "JK",
      "NISN",
      "Tempat Lahir",
      "Tanggal Lahir",
      "NIK",
      "Agama",
      "Alamat",
      "RT",
      "RW",
      "Dusun",
      "Kelurahan",
      "Kecamatan",
      "Kode Pos",
      "Jenis Tinggal",
      "Alat Transportasi",
      "Telepon",
      "HP",
      "E-Mail",
      "SKHUN",
      "Penerima KPS",
      "No. KPS",
    ];

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWX".split("");
    const headerCells = headers
      .map((value, index) => cell(`${letters[index]}5`, value))
      .join("");
    const dataCells = [
      cell("A7", "1"),
      cell("B7", "Siswa Uji"),
      cell("C7", "10001"),
      cell("D7", "L"),
      cell("E7", "0012345678"),
      cell("F7", "Bandung"),
      cell("G7", "40180", true),
      cell("H7", "3200000000000001"),
      cell("I7", "Islam"),
      cell("J7", "Alamat Uji"),
      cell("K7", "1"),
      cell("L7", "2"),
      cell("M7", "Dusun"),
      cell("N7", "Desa"),
      cell("O7", "Kecamatan"),
      cell("P7", "40565"),
      cell("Q7", "Bersama orang tua"),
      cell("R7", "Jalan kaki"),
      cell("S7", ""),
      cell("T7", "0800000000"),
      cell("U7", "siswa@example.test"),
      cell("V7", ""),
      cell("W7", "Tidak"),
      cell("X7", ""),
    ].join("");

    const workbookXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Daftar Peserta Didik" sheetId="1" r:id="rId1"/></sheets></workbook>';

    const relsXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>';

    const sheetXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      '<row r="1">' + cell("A1", "Daftar Peserta Didik") + '</row>' +
      '<row r="5">' + headerCells + '</row>' +
      '<row r="6"></row>' +
      '<row r="7">' + dataCells + '</row>' +
      '</sheetData></worksheet>';

    const archive = zipSync({
      "xl/workbook.xml": strToU8(workbookXml),
      "xl/_rels/workbook.xml.rels": strToU8(relsXml),
      "xl/worksheets/sheet1.xml": strToU8(sheetXml),
    });

    const file = new File([archive], "daftar_pd.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const parsed = await parseDapodikXlsx(file);
    expect(parsed.headerRowNumber).toBe(5);
    expect(parsed.recognizedColumns).toBeGreaterThanOrEqual(20);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      name: "Siswa Uji",
      nis: "10001",
      nisn: "0012345678",
      birthDate: "2010-01-02",
    });
  });
});
