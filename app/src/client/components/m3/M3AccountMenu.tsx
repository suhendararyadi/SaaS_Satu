import React from "react";
import { logout } from "wasp/client/auth";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { M3Icon } from "./M3Icon";

export function M3AccountMenu({ user }: { user: AuthUser }) {
  const name = user.name || user.username || user.email || "Akun";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-md-on-surface transition-colors hover:bg-black/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/50 lg:size-8 dark:hover:bg-white/[.06]"
          aria-label={`Buka menu akun ${name}`}
          title={name}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-md-primary text-[12px] font-semibold text-md-on-primary shadow-[0_1px_2px_rgba(0,0,0,.12)] lg:size-7" aria-hidden="true">
            {initial}
          </span>
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
        <DropdownMenuItem asChild>
          <Link to="/account" className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px]">
            <M3Icon name="person" size={17} />Akun Saya
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-md-error focus:text-md-error">
          <M3Icon name="logout" size={17} />Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
