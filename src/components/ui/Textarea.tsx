"use client";

import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const fieldBase =
  "font-body text-base leading-normal text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md p-3 outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]";

const fieldError =
  "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-light)]";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, id, className, ...props }, ref) {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={textareaId} className="font-body text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(fieldBase, "min-h-[100px] resize-y", hasError && fieldError, className)}
          aria-invalid={hasError || undefined}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : hint
                ? `${textareaId}-hint`
                : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="font-body text-xs leading-normal text-danger m-0"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${textareaId}-hint`} className="font-body text-xs leading-normal text-text-muted m-0">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

export { Textarea, type TextareaProps };
