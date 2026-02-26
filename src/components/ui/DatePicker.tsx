"use client";

import { useState, useEffect, useRef } from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { cn, getPopoverAlign } from "@/lib/utils";
import { fieldBase, fieldError as fieldErrorCls } from "@/components/ui/Input";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

// ── Types ────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void; // emits YYYY-MM-DD
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(str: string): string {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

function DatePicker({
  label,
  hint,
  error,
  value,
  onChange,
  min,
  max,
  placeholder = "Select a date",
  disabled,
  required,
  id,
}: DatePickerProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const hasError = !!error;

  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = inputId ? `${inputId}-popover` : "datepicker-popover";

  // Click outside to close
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selected = value ? parseDate(value) : undefined;

  // Build disabled matcher for DayPicker
  const disabledMatcher: Matcher[] = [];
  if (min) disabledMatcher.push({ before: parseDate(min) });
  if (max) disabledMatcher.push({ after: parseDate(max) });

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange(formatISO(date));
    }
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  // Default month to show: selected date, or min, or today
  const defaultMonth = selected ?? (min ? parseDate(min) : undefined);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="font-body text-sm font-semibold text-text-primary">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        <button
          ref={buttonRef}
          id={inputId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-haspopup="dialog"
          aria-invalid={hasError || undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
                ? `${inputId}-hint`
                : undefined
          }
          disabled={disabled}
          onClick={() => {
            if (!open) setAlign(getPopoverAlign(wrapperRef.current, 300));
            setOpen((v) => !v);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            fieldBase,
            "w-full flex items-center justify-between gap-2 text-left",
            hasError && fieldErrorCls,
            !value && "text-text-muted",
          )}
        >
          <span className={value ? undefined : "text-text-muted"}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <CalendarIcon size={16} className="text-text-muted shrink-0" />
        </button>

        {open && (
          <div
            id={popoverId}
            role="dialog"
            className={cn(
              "absolute top-full mt-1 z-50 bg-bg-raised border border-border-default rounded-lg p-3",
              align === "right" ? "right-0" : "left-0",
            )}
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={defaultMonth}
              disabled={disabledMatcher.length > 0 ? disabledMatcher : undefined}
              classNames={{
                root: "rdp-root font-body",
                day: "rdp-day w-9 h-9 rounded-md text-sm",
                today: "font-semibold text-primary",
                selected: "bg-primary text-text-on-primary rounded-md",
                disabled: "text-text-muted opacity-30",
                chevron: "rdp-chevron",
              }}
              components={{
                PreviousMonthButton: (props) => (
                  <button
                    {...props}
                    className="w-7 h-7 rounded-md hover:bg-bg-sunken flex items-center justify-center transition-colors duration-100"
                  >
                    <ChevronLeftIcon size={14} />
                  </button>
                ),
                NextMonthButton: (props) => (
                  <button
                    {...props}
                    className="w-7 h-7 rounded-md hover:bg-bg-sunken flex items-center justify-center transition-colors duration-100"
                  >
                    <ChevronRightIcon size={14} />
                  </button>
                ),
              }}
            />
          </div>
        )}
      </div>
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

export { DatePicker, type DatePickerProps };
