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
        <button type="button" className="flex min-h-11 items-center gap-2 rounded-[9px] px-1.5 pr-2 text-left text-md-on-surface transition-colors hover:bg-black/[.045] focus-visible:ring-2 focus-visible:ring-md-primary/50 lg:min-h-8" aria-label="Buka menu akun">
          <span className="flex size-8 items-center justify-center rounded-full bg-md-primary text-[12px] font-semibold text-md-on-primary lg:size-7" aria-hidden="true">{initial}</span>
          <span className="hidden max-w-36 flex-col sm:flex">
            <span className="truncate text-[12.5px] font-semibold">{name}</span>
            <span className="truncate text-[10.5px] text-md-on-surface-variant">{roleLabel(user)}</span>
          </span>
          <M3Icon name="expand_more" size={15} className="hidden text-md-on-surface-variant sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-[14px] border-md-outline-variant bg-md-surface/96 p-1.5 text-md-on-surface shadow-[0_18px_48px_rgba(0,0,0,.18)] backdrop-blur-xl">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-semibold">{name}</p>
          <p className="truncate text-[11px] text-md-on-surface-variant">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {user.isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px]">
                <M3Icon name="admin_panel_settings" size={17} />Dashboard Super Admin
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild><Link to="/account" className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px]"><M3Icon name="person" size={17} />Akun Saya</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-md-error focus:text-md-error"><M3Icon name="logout" size={17} />Keluar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
