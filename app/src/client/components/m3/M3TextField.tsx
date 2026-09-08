import React, { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from "react";
import { M3Icon } from "./M3Icon";

export interface M3TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  supportingText?: string;
  error?: string;
  leadingIcon?: ReactNode | string;
  trailingIcon?: ReactNode | string;
  size?: "sm" | "md";
}

export const M3TextField = forwardRef<HTMLInputElement, M3TextFieldProps>(
  ({ label, supportingText, error, leadingIcon, trailingIcon, size = "md", className = "", id, disabled, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || `m3-field-${autoId}`;
    const helpId = `${inputId}-help`;
    const sizeClass = size === "sm" ? "min-h-11 text-[13px] px-3.5" : "min-h-12 text-sm px-4";
    const hasError = !!error;
    return (
      <div className="flex w-full flex-col gap-1.5 text-left">
        {label && <label htmlFor={inputId} className={`text-[13px] font-semibold ${hasError ? "text-md-error" : "text-md-on-surface"}`}>{label}</label>}
        <div className="relative flex w-full items-center">
          {leadingIcon && <div className="absolute left-3.5 flex items-center justify-center text-md-on-surface-variant pointer-events-none">{typeof leadingIcon === "string" ? <M3Icon name={leadingIcon} size={18} /> : leadingIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={(error || supportingText) ? helpId : undefined}
            className={`w-full rounded-[12px] border bg-md-surface text-md-on-surface placeholder:text-md-on-surface-variant/65 outline-none transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${hasError ? "border-md-error focus:border-md-error focus:ring-2 focus:ring-md-error/20" : "border-md-outline-variant hover:border-md-outline focus:border-md-primary focus:ring-2 focus:ring-md-primary/20"} ${leadingIcon ? "pl-10" : ""} ${trailingIcon ? "pr-10" : ""} ${sizeClass} ${className}`}
            {...props}
          />
          {trailingIcon && <div className="absolute right-3.5 flex items-center justify-center text-md-on-surface-variant">{typeof trailingIcon === "string" ? <M3Icon name={trailingIcon} size={18} /> : trailingIcon}</div>}
        </div>
        {(error || supportingText) && <p id={helpId} className={`px-0.5 text-[12px] leading-5 ${hasError ? "font-medium text-md-error" : "text-md-on-surface-variant"}`}>{error || supportingText}</p>}
      </div>
    );
  }
);
M3TextField.displayName = "M3TextField";
