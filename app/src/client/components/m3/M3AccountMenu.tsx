import React from "react";
import { logout } from "wasp/client/auth";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { M3Icon } from "./M3Icon";

function roleLabel(user: AuthUser) {
  if (user.isAdmin || user.role === "SUPERADMIN") return "Super Admin";
  if (user.role === "SCHOOL_ADMIN") return "Admin Sekolah";
  if (user.role === "TEACHER") return "Guru";
  if (user.role === "STUDENT") return "Siswa";
  if (user.role === "DUDI_MENTOR") return "Pembimbing DUDI";
  return "Pengguna";
}

export function M3AccountMenu({ user }: { user: AuthUser }) {
  const name = user.name || user.username || user.email || "Akun";
  const initial = name.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex min-h-11 items-center gap-2 rounded-[14px] px-1.5 pr-2 text-left text-md-on-surface transition-colors hover:bg-md-surface-container-low focus-visible:ring-2 focus-visible:ring-md-primary" aria-label="Buka menu akun">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-md-primary text-sm font-bold text-md-on-primary" aria-hidden="true">{initial}</span>
          <span className="hidden max-w-36 flex-col sm:flex">
            <span className="truncate text-xs font-bold">{name}</span>
            <span className="truncate text-[11px] text-md-on-surface-variant">{roleLabel(user)}</span>
          </span>
          <M3Icon name="expand_more" size={18} className="hidden text-md-on-surface-variant sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-[16px] border-md-outline-variant bg-md-surface p-1.5 text-md-on-surface shadow-[0_12px_32px_rgba(15,23,42,.16)]">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs text-md-on-surface-variant">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/account" className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3"><M3Icon name="person" size={19} />Akun Saya</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-md-error focus:text-md-error"><M3Icon name="logout" size={19} />Keluar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
