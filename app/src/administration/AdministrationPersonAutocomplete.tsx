import React, { useMemo, useState } from "react";
import { searchAdministrationPeople, useQuery } from "wasp/client/operations";
import { useDebounce } from "../client/hooks/useDebounce";
import { M3Icon } from "../client/components/m3";

type PersonType = "STUDENT" | "STAFF";
type Person = any;

export function AdministrationPersonAutocomplete({
  type,
  label,
  placeholder,
  value,
  onChange,
}: {
  type: PersonType;
  label: string;
  placeholder: string;
  value: Person | null;
  onChange: (person: Person | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query.trim(), 220);
  const search = useQuery(searchAdministrationPeople, { query: debounced, type, limit: 15 }, { enabled: debounced.length >= 2, retry: false });
  const results = useMemo(() => (search.data as Person[] | undefined) || [], [search.data]);

  const subtitle = (person: Person) => {
    if (type === "STUDENT") {
      return [person.classRoom?.name, person.studentProfile?.nisn || person.studentProfile?.nis, person.classRoom?.department?.name].filter(Boolean).join(" · ");
    }
    const assignment = person.staffAssignments?.[0];
    return [person.teacherProfile?.nip ? `NIP ${person.teacherProfile.nip}` : null, assignment?.customTitle || person.teacherProfile?.jobTitle, assignment?.unitName].filter(Boolean).join(" · ");
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">{label}</label>
      {value ? (
        <div className="flex min-h-12 items-center gap-3 rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-md-primary"><M3Icon name={type === "STUDENT" ? "school" : "badge"} size={17} /></span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-[12.5px]">{value.name || value.username || "Tanpa nama"}</strong><span className="mt-0.5 block truncate text-[10.5px] text-md-on-surface-variant">{subtitle(value) || "Data sekolah"}</span></span>
          <button type="button" onClick={() => { onChange(null); setQuery(""); }} className="flex size-9 items-center justify-center rounded-[9px] text-md-on-surface-variant hover:bg-md-surface-container" aria-label={`Hapus ${label}`}><M3Icon name="close" size={17} /></button>
        </div>
      ) : (
        <>
          <div className="flex min-h-12 items-center rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 focus-within:border-md-primary focus-within:ring-2 focus-within:ring-md-primary/15">
            <M3Icon name="search" size={18} className="mr-2 text-md-on-surface-variant" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-md-on-surface-variant/70" />
            {search.isFetching && <span className="size-4 animate-spin rounded-full border-2 border-md-primary border-t-transparent" aria-hidden="true" />}
          </div>
          {open && debounced.length >= 2 && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-[12px] border border-md-outline-variant bg-md-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
              {results.length ? results.map((person) => (
                <button key={person.id} type="button" onClick={() => { onChange(person); setOpen(false); setQuery(""); }} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-md-surface-container">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-md-primary"><M3Icon name={type === "STUDENT" ? "school" : "badge"} size={16} /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-[12.5px]">{person.name || person.username || "Tanpa nama"}</strong><span className="mt-0.5 block truncate text-[10.5px] text-md-on-surface-variant">{subtitle(person) || "Data sekolah"}</span></span>
                </button>
              )) : !search.isFetching ? <p className="px-3 py-3 text-[11.5px] text-md-on-surface-variant">Tidak ada hasil untuk “{debounced}”.</p> : null}
            </div>
          )}
        </>
      )}
      <p className="mt-1 text-[10.5px] text-md-on-surface-variant">Ketik minimal 2 karakter. Pencarian langsung menggunakan database sekolah.</p>
    </div>
  );
}
