"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn, getPopoverAlign } from "@/lib/utils";
import { fieldBase, fieldError as fieldErrorCls } from "@/components/ui/Input";
import { ClockIcon } from "@/components/ui/icons";

// ── Types ────────────────────────────────────────────────────────────────────

interface TimePickerProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string; // HH:mm 24h format or ""
  onChange: (value: string) => void; // emits HH:mm 24h format or ""
  minuteStep?: number; // default 5
  placeholder?: string;
  compact?: boolean; // chip-style trigger for inline toolbars
  disabled?: boolean;
  id?: string;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function to24(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function parse24(hhmm: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [h, m] = hhmm.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: m, period };
}

function generateMinutes(step: number): number[] {
  const mins: number[] = [];
  for (let i = 0; i < 60; i += step) mins.push(i);
  return mins;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PERIODS: ("AM" | "PM")[] = ["AM", "PM"];

// ── Scroll column ────────────────────────────────────────────────────────────

interface ColumnProps {
  items: { value: number | string; label: string }[];
  selected: number | string;
  onSelect: (value: number | string) => void;
}

function ScrollColumn({ items, selected, onSelect }: ColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-0.5 overflow-y-auto py-1 px-0.5"
      style={{
        maxHeight: "200px",
        scrollbarWidth: "none",
      }}
    >
      {items.map((item) => {
        const isSelected = item.value === selected;
        return (
          <button
            key={item.value}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "font-body text-sm rounded-md px-3 py-2 transition-colors duration-100 shrink-0 text-center",
              isSelected
                ? "bg-primary text-text-on-primary font-semibold"
                : "text-text-primary hover:bg-bg-sunken",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

function TimePicker({
  label,
  hint,
  error,
  value,
  onChange,
  minuteStep = 5,
  placeholder = "Set time",
  compact,
  disabled,
  id,
  className,
}: TimePickerProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const hasError = !!error;
  const popoverId = inputId ? `${inputId}-popover` : "timepicker-popover";

  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const parsed = useMemo(() => (value ? parse24(value) : null), [value]);
  const selHour = parsed?.hour12 ?? 12;
  const selMinute = parsed?.minute ?? 0;
  const selPeriod = parsed?.period ?? "AM";

  const minutes = generateMinutes(minuteStep);

  const emit = useCallback(
    (hour12: number, minute: number, period: "AM" | "PM") => {
      const h24 = to24(hour12, period);
      const hhmm = `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      onChange(hhmm);
    },
    [onChange],
  );

  function handleHourSelect(v: number | string) {
    emit(Number(v), selMinute, selPeriod);
  }

  function handleMinuteSelect(v: number | string) {
    emit(selHour, Number(v), selPeriod);
  }

  function handlePeriodSelect(v: number | string) {
    emit(selHour, selMinute, v as "AM" | "PM");
  }

  function handleClear() {
    onChange("");
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleToggle() {
    if (!open) setAlign(getPopoverAlign(wrapperRef.current, 212));
    setOpen((v) => !v);
  }

  // Shared popover content
  const popover = open ? (
    <div
      id={popoverId}
      role="dialog"
      className={cn(
        "absolute top-full mt-1 z-50 bg-bg-raised border border-border-default rounded-lg overflow-hidden",
        align === "right" ? "right-0" : "left-0",
      )}
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex divide-x divide-border-default">
        <div className="w-[72px]">
          <ScrollColumn
            items={HOURS.map((h) => ({ value: h, label: String(h) }))}
            selected={selHour}
            onSelect={handleHourSelect}
          />
        </div>
        <div className="w-[72px]">
          <ScrollColumn
            items={minutes.map((m) => ({
              value: m,
              label: String(m).padStart(2, "0"),
            }))}
            selected={selMinute}
            onSelect={handleMinuteSelect}
          />
        </div>
        <div className="w-[64px]">
          <ScrollColumn
            items={PERIODS.map((p) => ({ value: p, label: p }))}
            selected={selPeriod}
            onSelect={handlePeriodSelect}
          />
        </div>
      </div>
      {value && (
        <div className="border-t border-border-default px-2 py-1.5">
          <button
            type="button"
            onClick={handleClear}
            className="w-full font-body text-xs font-semibold text-text-muted hover:text-danger rounded-md py-1.5 transition-colors duration-100"
          >
            Clear time
          </button>
        </div>
      )}
    </div>
  ) : null;

  // Compact: chip-style trigger for inline toolbars
  if (compact) {
    return (
      <div ref={wrapperRef} className={cn("relative", className)}>
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "inline-flex items-center gap-1 font-body text-xs font-semibold px-2 py-1.5 rounded-md transition-colors duration-150",
            value
              ? "text-primary bg-primary-subtle"
              : "text-text-muted hover:text-primary hover:bg-primary-subtle",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <ClockIcon size={14} />
          <span>{value ? formatDisplay(value) : placeholder}</span>
        </button>
        {popover}
      </div>
    );
  }

  // Full: form-field trigger with label, hint, error
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={inputId} className="font-body text-sm font-semibold text-text-primary">
          {label}
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
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          disabled={disabled}
          onClick={handleToggle}
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
          <ClockIcon size={16} className="text-text-muted shrink-0" />
        </button>
        {popover}
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

export { TimePicker, type TimePickerProps };
