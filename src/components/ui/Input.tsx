"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const fieldBase =
  "font-body text-base leading-normal text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md p-3 outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]";

const fieldError =
  "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-light)]";

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...props },
  ref,
) {
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
        ref={ref}
        id={inputId}
        className={cn(fieldBase, hasError && fieldError, className)}
        aria-invalid={hasError || undefined}
        aria-describedby={
          error
            ? `${inputId}-error`
            : hint
              ? `${inputId}-hint`
              : undefined
        }
        {...props}
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
});

export { Input, type InputProps };
