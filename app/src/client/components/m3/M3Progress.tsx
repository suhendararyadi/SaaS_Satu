import React from "react";

export interface M3LinearProgressProps {
  value?: number; // 0 to 100 or 0 to max, undefined for indeterminate
  max?: number;
  className?: string;
}

export function M3LinearProgress({
  value,
  max = 100,
  className = "",
}: M3LinearProgressProps) {
  const isIndeterminate = value === undefined;
  const percentage =
    value !== undefined
      ? max > 0
        ? Math.min(100, Math.max(0, (value / max) * 100))
        : Math.min(100, Math.max(0, value))
      : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`w-full h-1 bg-md-surface-container-highest rounded-full overflow-hidden relative ${className}`}
    >
      {isIndeterminate ? (
        <div className="h-full bg-md-primary rounded-full animate-pulse w-1/2" />
      ) : (
        <div
          className="h-full bg-md-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      )}
    </div>
  );
}

export interface M3CircularProgressProps {
  size?: number;
  indeterminate?: boolean;
  className?: string;
}

export function M3CircularProgress({
  size = 36,
  indeterminate = true,
  className = "",
}: M3CircularProgressProps) {
  return (
    <div
      role="progressbar"
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="animate-spin text-md-primary"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
      >
        <circle
          className="opacity-25 stroke-current"
          cx="12"
          cy="12"
          r="9"
          strokeWidth="3"
        />
        <path
          className="opacity-100 fill-current"
          d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3z"
        />
      </svg>
    </div>
  );
}
