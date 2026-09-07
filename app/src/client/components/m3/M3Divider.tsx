import React, { type HTMLAttributes } from "react";

export interface M3DividerProps extends HTMLAttributes<HTMLHRElement> {
  vertical?: boolean;
}

export function M3Divider({
  vertical = false,
  className = "",
  ...props
}: M3DividerProps) {
  if (vertical) {
    return (
      <div
        className={`w-px h-auto self-stretch bg-md-outline-variant/40 ${className}`}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  return (
    <hr
      className={`border-0 h-px w-full bg-md-outline-variant/40 ${className}`}
      {...props}
    />
  );
}
