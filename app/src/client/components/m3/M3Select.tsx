import React, {
  type SelectHTMLAttributes,
  forwardRef,
} from "react";
import { M3Icon } from "./M3Icon";

export interface M3SelectOption {
  label: string;
  value: string | number;
}

export interface M3SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  options?: M3SelectOption[];
  supportingText?: string;
  error?: string;
  size?: "sm" | "md";
}

export const M3Select = forwardRef<HTMLSelectElement, M3SelectProps>(
  (
    {
      label,
      options,
      supportingText,
      error,
      size = "md",
      className = "",
      id,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const sizeClass = size === "sm" ? "h-9 text-xs px-3" : "h-11 text-sm px-3.5";

    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={selectId}
            className={`text-xs font-medium ${
              hasError ? "text-md-error" : "text-md-on-surface-variant"
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full rounded-[8px] border bg-md-surface text-md-on-surface appearance-none pr-10 focus:outline-none transition-all duration-150 disabled:opacity-38 disabled:cursor-not-allowed ${
              hasError
                ? "border-md-error focus:border-md-error focus:ring-1 focus:ring-md-error"
                : "border-md-outline hover:border-md-on-surface focus:border-md-primary focus:ring-2 focus:ring-md-primary/20"
            } ${sizeClass} ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 pointer-events-none text-md-on-surface-variant flex items-center">
            <M3Icon name="arrow_drop_down" size={20} />
          </div>
        </div>

        {(error || supportingText) && (
          <p
            className={`text-[11px] px-1 ${
              hasError ? "text-md-error font-medium" : "text-md-on-surface-variant"
            }`}
          >
            {error || supportingText}
          </p>
        )}
      </div>
    );
  }
);

M3Select.displayName = "M3Select";
