import React, { forwardRef } from "react";

export interface M3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  id?: string;
}

export const M3Switch = forwardRef<HTMLButtonElement, M3SwitchProps>(
  (
    {
      checked,
      onChange,
      disabled = false,
      label,
      className = "",
      id,
    },
    ref
  ) => {
    return (
      <label className={`inline-flex items-center gap-3 select-none cursor-pointer ${disabled ? "opacity-38 cursor-not-allowed" : ""} ${className}`}>
        <button
          ref={ref}
          type="button"
          role="switch"
          id={id}
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-8 w-13 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary ${
            checked
              ? "bg-md-primary"
              : "bg-md-surface-container-highest border-2 border-md-outline"
          }`}
        >
          <span
            className={`pointer-events-none inline-block transform rounded-full transition-all duration-200 ease-in-out ${
              checked
                ? "translate-x-6 h-6 w-6 bg-md-on-primary my-1"
                : "translate-x-1.5 h-4 w-4 bg-md-outline my-1.5"
            }`}
          />
        </button>
        {label && <span className="text-sm text-md-on-surface">{label}</span>}
      </label>
    );
  }
);

M3Switch.displayName = "M3Switch";
