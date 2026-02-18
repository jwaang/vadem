"use client";

import { type HTMLAttributes, useState, useEffect, useCallback, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "flex items-start gap-3 max-w-[380px] w-full py-4 px-5 bg-bg-raised rounded-lg border border-border-default border-l-[3px] shadow-lg animate-toast-slide-in",
  {
    variants: {
      variant: {
        success: "border-l-secondary",
        vault: "border-l-vault",
        warning: "border-l-warning",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  },
);

type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>;

interface NotificationToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: ToastVariant;
  title: string;
  message: string;
  timestamp?: string;
  autoDismissMs?: number;
  onDismiss?: () => void;
  visible?: boolean;
}

function SuccessIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="var(--color-secondary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="8" />
      <polyline points="6.5 10 9 12.5 13.5 7.5" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="var(--color-vault)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="14" height="10" rx="2" />
      <path d="M6 8V5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="var(--color-warning)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3 L18 17 H2 Z" />
      <line x1="10" y1="8" x2="10" y2="12" />
      <circle cx="10" cy="14.5" r="0.5" fill="var(--color-warning)" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

const variantIcons: Record<ToastVariant, () => React.JSX.Element> = {
  success: SuccessIcon,
  vault: VaultIcon,
  warning: WarningIcon,
};

function NotificationToast({
  variant = "success",
  title,
  message,
  timestamp,
  autoDismissMs = 5000,
  onDismiss,
  visible: controlledVisible,
  className,
  ...props
}: NotificationToastProps) {
  const [internalVisible, setInternalVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = controlledVisible !== undefined;
  const visible = isControlled ? controlledVisible : internalVisible;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      if (!isControlled) {
        setInternalVisible(false);
      }
      onDismiss?.();
    }, 300);
  }, [isControlled, onDismiss]);

  useEffect(() => {
    if (!visible || autoDismissMs === 0) return;

    timerRef.current = setTimeout(dismiss, autoDismissMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, autoDismissMs, dismiss]);

  if (!visible && !exiting) return null;

  const Icon = variantIcons[variant];

  return (
    <div
      className={cn(
        toastVariants({ variant }),
        exiting && "animate-toast-slide-out",
        className,
      )}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <div className="flex items-center justify-center shrink-0 w-6 h-6 mt-px">
        <Icon />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="font-body text-sm font-semibold leading-snug text-text-primary m-0">
          {title}
        </p>
        <p className="font-body text-xs leading-normal text-text-secondary m-0">
          {message}
        </p>
        {timestamp && (
          <span className="font-body text-xs text-text-muted mt-1">
            {timestamp}
          </span>
        )}
      </div>

      <button
        type="button"
        className="flex items-center justify-center shrink-0 w-7 h-7 border-none rounded-sm bg-transparent text-text-muted cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-bg-sunken hover:text-text-primary"
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export { NotificationToast, type NotificationToastProps, type ToastVariant };
