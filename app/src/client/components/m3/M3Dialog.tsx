import React, { type ReactNode, useEffect, useId, useRef } from "react";
import { M3Icon } from "./M3Icon";

export interface M3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode | string;
  children?: ReactNode;
  actions?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function M3Dialog({ isOpen, onClose, title, subtitle, description, icon, children, actions, maxWidth = "md" }: M3DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-describedby={(subtitle || description) ? descriptionId : undefined} className={`flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-[24px] border border-md-outline-variant/60 bg-md-surface p-5 text-md-on-surface shadow-[0_18px_50px_rgba(15,23,42,.24)] sm:p-6 ${widths[maxWidth]}`}>
        {(title || icon) && <div className="flex items-start gap-3.5">{icon && <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-md-primary-container text-md-on-primary-container">{typeof icon === "string" ? <M3Icon name={icon} size={22} /> : icon}</div>}<div className="min-w-0 flex-1">{title && <h2 id={titleId} className="text-xl font-extrabold leading-7 text-md-on-surface">{title}</h2>}{(subtitle || description) && <div id={descriptionId} className="mt-1 text-sm leading-6 text-md-on-surface-variant">{subtitle || description}</div>}</div></div>}
        {children && <div className="text-sm text-md-on-surface">{children}</div>}
        {actions && <div className="mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-md-outline-variant/50 pt-4">{actions}</div>}
      </div>
    </div>
  );
}
