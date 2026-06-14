"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CUSTOM_VALUE = "__custom__";

export interface EscapeHatchSelectProps {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
  id?: string;
}

export function EscapeHatchSelect({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  disabled,
  hint,
  className,
  id,
}: EscapeHatchSelectProps) {
  const fieldId = id ?? React.useId();
  const isCustom = value !== "" && !options.includes(value);
  const [mode, setMode] = React.useState<"select" | "custom">(
    isCustom ? "custom" : "select",
  );

  React.useEffect(() => {
    if (isCustom) setMode("custom");
  }, [isCustom]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      {mode === "select" ? (
        <select
          id={fieldId}
          value={options.includes(value) ? value : ""}
          onChange={(e) => {
            if (e.target.value === CUSTOM_VALUE) {
              setMode("custom");
              onChange("");
            } else {
              onChange(e.target.value);
            }
          }}
          disabled={disabled}
          className="seekho-input"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>+ Other (Type Custom)</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type a custom ${label.toLowerCase()}...`}
            disabled={disabled}
            autoFocus
            className="seekho-input"
          />
          <button
            type="button"
            onClick={() => {
              setMode("select");
              onChange("");
            }}
            className="rounded-lg border border-brown/30 bg-cream px-3 text-xs text-ink hover:bg-olive/15"
          >
            Back
          </button>
        </div>
      )}
      {hint ? <p className="text-xs text-ink/60">{hint}</p> : null}
    </div>
  );
}
