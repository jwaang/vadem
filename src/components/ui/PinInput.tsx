"use client";

import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useWebHaptics } from "web-haptics/react";

interface PinInputProps {
  value: string; // up to 6 digit characters
  onChange: (value: string) => void;
  /** Called when all 6 digits have been entered (auto-submit). */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

function PinInput({ value, onChange, onComplete, disabled, error, autoFocus }: PinInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const prevErrorRef = useRef(error);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const { trigger } = useWebHaptics();

  // Fire error haptic when error transitions to true
  useEffect(() => {
    if (error && !prevErrorRef.current) {
      trigger("error");
    }
    prevErrorRef.current = error;
  }, [error, trigger]);

  function handleChange(index: number, inputValue: string) {
    const allDigits = inputValue.replace(/\D/g, "");
    // Multi-char input (iOS SMS autofill or paste-like behavior)
    if (allDigits.length > 1) {
      const full = allDigits.slice(0, 6);
      trigger("selection");
      onChange(full);
      if (full.length === 6) onComplete?.(full);
      const focusIdx = Math.min(full.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    // Single char — normal typing
    const digit = allDigits.slice(-1);
    if (digit) {
      trigger("selection");
    }
    const next = [...digits];
    next[index] = digit;
    const joined = next.join("");
    onChange(joined);
    if (joined.length === 6) onComplete?.(joined);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current box is empty — go back and clear previous
        const next = [...digits];
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = "";
        onChange(next.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    if (text.length === 6) onComplete?.(text);
    // Focus the last filled box or the next empty one
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  function handleFocus(index: number) {
    // On focus, select any existing content so the next keystroke replaces it
    inputRefs.current[index]?.select();
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="6-digit verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : undefined}
          maxLength={i === 0 ? 6 : 2}
          value={digit}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          data-sensitive="true"
          className={cn(
            "w-11 h-14 text-center font-mono text-2xl font-bold rounded-md border-[1.5px] bg-bg-raised",
            "outline-none transition-[border-color,box-shadow] duration-150 ease-out",
            "focus:border-vault focus:shadow-[0_0_0_3px_var(--color-vault-light)]",
            error
              ? "border-danger text-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-light)]"
              : digit
                ? "border-vault text-text-primary"
                : "border-border-default text-text-primary",
            disabled && "opacity-40 cursor-not-allowed",
          )}
        />
      ))}
    </div>
  );
}

export { PinInput, type PinInputProps };
