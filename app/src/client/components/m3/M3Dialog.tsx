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

export function M3Dialog({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon,
  children,
  actions,
  maxWidth = "md",
}: M3DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const frame = requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previous?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle || description ? descriptionId : undefined}
        className={`flex max-h-[88vh] w-full flex-col gap-4 overflow-y-auto rounded-t-[20px] border border-md-outline-variant bg-md-surface p-4 text-md-on-surface shadow-[0_20px_60px_rgba(0,0,0,.28)] sm:rounded-[16px] sm:p-[18px] ${widths[maxWidth]}`}
      >
        {(title || icon) && (
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-md-primary-container text-md-primary">
                {typeof icon === "string" ? <M3Icon name={icon} size={19} /> : icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h2
                  id={titleId}
                  className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-md-on-surface"
                >
                  {title}
                </h2>
              )}
              {(subtitle || description) && (
                <div id={descriptionId} className="mt-1 text-[13px] leading-5 text-md-on-surface-variant">
                  {subtitle || description}
                </div>
              )}
            </div>
          </div>
        )}
        {children && <div className="text-[13px] text-md-on-surface">{children}</div>}
        {actions && (
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-md-outline-variant pt-3.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
