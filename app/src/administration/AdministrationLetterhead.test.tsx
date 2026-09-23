import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ADMINISTRATION_PAPER, AdministrationLetterhead } from "./AdministrationLetterhead";

describe("official TU letterhead baseline", () => {
  const html = renderToStaticMarkup(<AdministrationLetterhead school={{
    name: "SMK NEGERI 1 RONGGA",
    address: "Jl. Raya Rongga",
    city: "Bandung Barat",
    province: "Jawa Barat",
    phone: "022-6950350",
    email: "mail@smkn1rongga.sch.id",
    departments: [
      { code: "TSM", name: "Teknik dan Bisnis Sepeda Motor" },
      { code: "RPL", name: "Rekayasa Perangkat Lunak" },
      { code: "ATPH", name: "Agribisnis Tanaman dan Hortikultura" },
    ],
  }} />);

  it("keeps the F4 8.5 x 13 inch canvas at 96 dpi", () => {
    expect(ADMINISTRATION_PAPER.widthPx).toBe(816);
    expect(ADMINISTRATION_PAPER.heightPx).toBe(1248);
  });

  it("matches the reference hierarchy and uses one emblem only", () => {
    expect(html).toContain("PEMERINTAH DAERAH PROVINSI JAWA BARAT");
    expect(html).toContain("DINAS PENDIDIKAN");
    expect(html).toContain("CABANG DINAS PENDIDIKAN WILAYAH VI");
    expect(html).toContain("SMK NEGERI 1 RONGGA");
    expect((html.match(/<img/g) || [])).toHaveLength(1);
    expect(html).not.toContain("disdik-jabar.png");
  });

  it("renders dynamic program and contact master data", () => {
    expect(html).toContain("Program Keahlian: Teknik dan Bisnis Sepeda Motor, Rekayasa Perangkat Lunak, Agribisnis Tanaman dan Hortikultura");
    expect(html).toContain("alamat : Jl. Raya Rongga Bandung Barat Jawa Barat Telp. 022-6950350");
    expect(html).toContain("Email : mail@smkn1rongga.sch.id");
  });

  it("locks measured Times New Roman sizes from the PDF baseline", () => {
    expect(html).toContain("font-size:14pt");
    expect(html).toContain("font-size:18pt");
    expect(html).toContain("font-size:6pt");
    expect(html).toContain("font-size:7pt");
    expect(html).toContain("Times New Roman");
  });
});
