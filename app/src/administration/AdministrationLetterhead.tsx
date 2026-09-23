import React from "react";

type SchoolIdentity = {
  name?: string | null;
  npsn?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function AdministrationLetterhead({ school }: { school?: SchoolIdentity | null }) {
  const contact = [school?.address, school?.city, school?.province].filter(Boolean).join(", ");
  const communication = [school?.phone ? `Telp. ${school.phone}` : null, school?.email].filter(Boolean).join(" · ");
  return (
    <header className="mb-5 border-b-[3px] border-black pb-2 text-black">
      <div className="grid grid-cols-[82px_minmax(0,1fr)_96px] items-center gap-3">
        <div className="flex justify-center">
          <img src="/administration/jawa-barat-emblem.png" alt="Lambang Provinsi Jawa Barat" className="max-h-[76px] max-w-[72px] object-contain" />
        </div>
        <div className="text-center leading-tight">
          <p className="text-[13px] font-bold uppercase tracking-[.01em] sm:text-[15px]">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
          <p className="mt-0.5 text-[15px] font-bold uppercase sm:text-[17px]">DINAS PENDIDIKAN</p>
          <p className="mt-1 text-[14px] font-bold uppercase sm:text-[16px]">{school?.name || "SEKOLAH"}</p>
          {contact && <p className="mt-1 text-[9.5px] leading-4 sm:text-[10.5px]">{contact}</p>}
          {communication && <p className="text-[9.5px] leading-4 sm:text-[10.5px]">{communication}</p>}
          {school?.npsn && <p className="text-[9.5px] leading-4 sm:text-[10.5px]">NPSN {school.npsn}</p>}
        </div>
        <div className="flex justify-center">
          <img src="/administration/disdik-jabar.png" alt="Logo Dinas Pendidikan Jawa Barat" className="max-h-[62px] max-w-[92px] object-contain" />
        </div>
      </div>
      <div className="mt-2 border-t border-black" />
    </header>
  );
}
