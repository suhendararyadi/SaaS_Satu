import { describe, expect, it } from "vitest";
import { createPklXlsxTemplate, pklXlsxToCsv } from "./pklXlsx";

describe("PKL XLSX helper", () => {
  it("creates and reads a valid header-only xlsx template", async () => {
    const bytes = createPklXlsxTemplate(["kode_dudi", "nama", "alamat"], "DUDI");
    expect(bytes.byteLength).toBeGreaterThan(500);
    const fileBytes = Uint8Array.from(bytes);
    const file = new File([fileBytes.buffer], "template.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const csv = await pklXlsxToCsv(file);
    expect(csv).toContain("kode_dudi,nama,alamat");
  });
});
