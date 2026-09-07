import React, {
  type ReactNode,
  useEffect,
  useRef,
} from "react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidthStyles[maxWidth]} rounded-[28px] bg-md-surface-container-high text-md-on-surface p-6 shadow-elevation-3 border border-md-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}
      >
        {(title || icon) && (
          <div className="flex flex-col gap-2">
            {icon && (
              <div className="text-md-secondary mb-1">
                {typeof icon === "string" ? (
                  <M3Icon name={icon} size={28} />
                ) : (
                  icon
                )}
              </div>
            )}
            {title && (
              <h2 className="text-[22px] font-medium leading-7 text-md-on-surface">
                {title}
              </h2>
            )}
            {(subtitle || description) && (
              <div className="text-sm text-md-on-surface-variant">
                {subtitle || description}
              </div>
            )}
          </div>
        )}

        {children && <div className="text-sm text-md-on-surface">{children}</div>}

        {actions && (
          <div className="flex items-center justify-end gap-2 pt-2 mt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
