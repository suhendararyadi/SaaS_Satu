import React, { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { M3Icon } from "./M3Icon";

export interface M3SelectOption { label: string; value: string | number }
export interface M3SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  options?: M3SelectOption[];
  supportingText?: string;
  error?: string;
  size?: "sm" | "md";
}

export const M3Select = forwardRef<HTMLSelectElement, M3SelectProps>(
  ({ label, options, supportingText, error, size = "md", className = "", id, children, disabled, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || `m3-select-${autoId}`;
    const helpId = `${selectId}-help`;
    const sizeClass = size === "sm" ? "min-h-11 text-[13px] px-3.5" : "min-h-12 text-sm px-4";
    const hasError = !!error;
    return (
      <div className="flex w-full flex-col gap-1.5 text-left">
        {label && <label htmlFor={selectId} className={`text-[13px] font-semibold ${hasError ? "text-md-error" : "text-md-on-surface"}`}>{label}</label>}
        <div className="relative flex w-full items-center">
          <select ref={ref} id={selectId} disabled={disabled} aria-invalid={hasError || undefined} aria-describedby={(error || supportingText) ? helpId : undefined} className={`w-full appearance-none rounded-[12px] border bg-md-surface pr-10 text-md-on-surface outline-none transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${hasError ? "border-md-error focus:border-md-error focus:ring-2 focus:ring-md-error/20" : "border-md-outline-variant hover:border-md-outline focus:border-md-primary focus:ring-2 focus:ring-md-primary/20"} ${sizeClass} ${className}`} {...props}>
            {options ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : children}
          </select>
          <div className="pointer-events-none absolute right-3.5 flex items-center text-md-on-surface-variant"><M3Icon name="expand_more" size={20} /></div>
        </div>
        {(error || supportingText) && <p id={helpId} className={`px-0.5 text-[12px] leading-5 ${hasError ? "font-medium text-md-error" : "text-md-on-surface-variant"}`}>{error || supportingText}</p>}
      </div>
    );
  }
);
M3Select.displayName = "M3Select";
