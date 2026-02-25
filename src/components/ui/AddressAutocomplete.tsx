"use client";

import { cn } from "@/lib/utils";
import { fieldBase, fieldError } from "@/components/ui/Input";

// ── Types ────────────────────────────────────────────────────────────────────

interface AddressAutocompleteProps {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

function AddressAutocomplete({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  id,
  disabled,
  autoFocus,
}: AddressAutocompleteProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="font-body text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        aria-invalid={hasError || undefined}
        aria-describedby={
          error
            ? `${inputId}-error`
            : hint
              ? `${inputId}-hint`
              : undefined
        }
        className={cn(fieldBase, "w-full", hasError && fieldError)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="street-address"
      />
      {error && (
        <p id={`${inputId}-error`} className="font-body text-xs leading-normal text-danger m-0">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="font-body text-xs leading-normal text-text-muted m-0">
          {hint}
        </p>
      )}
    </div>
  );
}

export { AddressAutocomplete, type AddressAutocompleteProps };
