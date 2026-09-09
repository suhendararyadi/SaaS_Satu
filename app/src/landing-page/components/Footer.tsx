import { M3Icon } from "../../client/components/m3";

export function Footer() {
  return (
    <footer className="border-t border-md-outline-variant bg-md-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-[8px] bg-md-primary-container text-md-on-primary-container"><M3Icon name="school" size={20} /></span><div><p className="text-[13px] font-semibold text-md-on-surface">SaaS Satu Smart School</p><p className="text-[11px] text-md-on-surface-variant">Portal sekolah digital</p></div></div>
        <p className="text-[11px] text-md-on-surface-variant">sekolah.suhendararyadi.com</p>
      </div>
    </footer>
  );
}
