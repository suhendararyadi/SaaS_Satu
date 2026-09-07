import React, {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";
import { M3Icon } from "./M3Icon";

export interface M3TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  supportingText?: string;
  error?: string;
  leadingIcon?: ReactNode | string;
  trailingIcon?: ReactNode | string;
  size?: "sm" | "md";
}

export const M3TextField = forwardRef<HTMLInputElement, M3TextFieldProps>(
  (
    {
      label,
      supportingText,
      error,
      leadingIcon,
      trailingIcon,
      size = "md",
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const sizeClass = size === "sm" ? "h-9 text-xs px-3" : "h-11 text-sm px-3.5";

    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className={`text-xs font-medium ${
              hasError
                ? "text-md-error"
                : "text-md-on-surface-variant"
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leadingIcon && (
            <div className="absolute left-3 text-md-on-surface-variant pointer-events-none flex items-center justify-center">
              {typeof leadingIcon === "string" ? (
                <M3Icon name={leadingIcon} size={18} />
              ) : (
                leadingIcon
              )}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full rounded-[8px] border bg-transparent text-md-on-surface placeholder:text-md-outline/70 focus:outline-none transition-all duration-150 disabled:opacity-38 disabled:cursor-not-allowed ${
              hasError
                ? "border-md-error focus:border-md-error focus:ring-1 focus:ring-md-error"
                : "border-md-outline hover:border-md-on-surface focus:border-md-primary focus:ring-2 focus:ring-md-primary/20"
            } ${leadingIcon ? "pl-9" : ""} ${
              trailingIcon ? "pr-9" : ""
            } ${sizeClass} ${className}`}
            {...props}
          />

          {trailingIcon && (
            <div className="absolute right-3 text-md-on-surface-variant flex items-center justify-center">
              {typeof trailingIcon === "string" ? (
                <M3Icon name={trailingIcon} size={18} />
              ) : (
                trailingIcon
              )}
            </div>
          )}
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

M3TextField.displayName = "M3TextField";
