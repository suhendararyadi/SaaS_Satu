import React from "react";

type DepartmentIdentity = { code?: string | null; name?: string | null };
type SchoolIdentity = {
  name?: string | null;
  npsn?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  departments?: DepartmentIdentity[] | null;
};

export const ADMINISTRATION_PAPER = {
  widthPx: 816,
  heightPx: 1248,
  bodyLeftPx: 151.18,
  bodyRightPx: 113.39,
} as const;

function joinPrograms(school?: SchoolIdentity | null) {
  return (school?.departments || []).map((item) => item.name?.trim()).filter(Boolean).join(", ");
}

export function AdministrationLetterhead({ school }: { school?: SchoolIdentity | null }) {
  const programs = joinPrograms(school);
  const address = [school?.address, school?.city, school?.province].filter(Boolean).join(" ");
  const addressLine = [address ? `alamat : ${address}` : "", school?.phone ? `Telp. ${school.phone}` : ""].filter(Boolean).join(" ");
  const communicationLine = school?.email ? `Email : ${school.email}` : "";
  const cityLine = school?.city || "";
  const programSize = programs.length > 165 ? "4.5pt" : programs.length > 130 ? "5pt" : "6pt";

  return (
    <header
      aria-label="Kop surat sekolah"
      className="relative w-full shrink-0 overflow-visible text-black"
      style={{ height: 203, fontFamily: "'Times New Roman', Times, serif" }}
    >
      <img
        src="/administration/jawa-barat-emblem.png"
        alt="Lambang Provinsi Jawa Barat"
        className="absolute object-contain"
        style={{ left: 56.87, top: 56.13, width: 95.96, height: 106 }}
      />

      <div
        className="absolute text-center font-normal text-black"
        style={{ left: 163.3, top: 48, width: 531.8, lineHeight: 1 }}
      >
        <p style={{ margin: 0, height: 21.47, fontSize: "14pt", lineHeight: "16.1pt", whiteSpace: "nowrap" }}>PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
        <p style={{ margin: 0, height: 21.47, fontSize: "14pt", lineHeight: "16.1pt", whiteSpace: "nowrap" }}>DINAS PENDIDIKAN</p>
        <p style={{ margin: 0, height: 21.47, fontSize: "14pt", lineHeight: "16.1pt", whiteSpace: "nowrap" }}>CABANG DINAS PENDIDIKAN WILAYAH VI</p>
        <p className="font-bold uppercase" style={{ margin: 0, marginTop: 0.8, height: 27.2, fontSize: "18pt", lineHeight: "20.4pt", whiteSpace: "nowrap" }}>{school?.name || "NAMA SEKOLAH"}</p>
        <p className="italic" style={{ margin: 0, marginTop: 1.3, height: 10.93, fontSize: programSize, lineHeight: "8.2pt", whiteSpace: "nowrap" }}>{programs ? `Program Keahlian: ${programs}` : "Program Keahlian: -"}</p>
        <p className="italic" style={{ margin: 0, height: 12.27, fontSize: "7pt", lineHeight: "9.2pt", whiteSpace: "nowrap" }}>{addressLine || "alamat : -"}</p>
        <p className="italic" style={{ margin: 0, height: 12.27, fontSize: "7pt", lineHeight: "9.2pt", whiteSpace: "nowrap" }}>{communicationLine || "Email : -"}</p>
        <p className="italic" style={{ margin: 0, height: 12.4, fontSize: "7pt", lineHeight: "9.3pt", whiteSpace: "nowrap" }}>{cityLine}</p>
      </div>

      <div className="absolute bg-black" style={{ left: 70, top: 199.07, width: 662, height: 1.33 }} />
      <div className="absolute bg-black" style={{ left: 70, top: 201.73, width: 662, height: 1.33 }} />
    </header>
  );
}

export function AdministrationPaper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={`relative mx-auto shrink-0 bg-white text-black shadow-sm ${className}`}
      style={{ width: ADMINISTRATION_PAPER.widthPx, minHeight: ADMINISTRATION_PAPER.heightPx, fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "14.6pt" }}
    >
      {children}
    </article>
  );
}

export function AdministrationPaperBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ paddingLeft: ADMINISTRATION_PAPER.bodyLeftPx, paddingRight: ADMINISTRATION_PAPER.bodyRightPx }}>
      {children}
    </div>
  );
}
