import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

type VaultItemState = "revealed" | "locked" | "hidden";

interface VaultItemProps extends HTMLAttributes<HTMLDivElement> {
  state?: VaultItemState;
  icon: ReactNode;
  label: string;
  hint?: string;
  value?: string;
  onVerify?: () => void;
}

function LockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function VaultItem({
  state = "locked",
  icon,
  label,
  hint,
  value,
  onVerify,
  className,
  ...props
}: VaultItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-4 px-5 rounded-lg border border-vault-light bg-vault-subtle",
        state === "revealed" && "bg-secondary-subtle border-secondary-light",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center w-11 h-11 min-w-[44px] rounded-md bg-vault text-text-on-vault">
        {icon}
      </div>

      {state === "hidden" ? (
        <>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <p className="font-body text-sm leading-normal text-text-secondary m-0">
              Verify your phone number to view secure info
            </p>
          </div>
          <div className="shrink-0">
            <Button variant="vault" size="sm" onClick={onVerify}>
              Verify
            </Button>
          </div>
        </>
      ) : state === "locked" ? (
        <>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="font-body text-sm font-semibold leading-snug text-text-primary">
              {label}
            </span>
            {hint && (
              <span className="font-body text-xs leading-normal text-text-muted">
                {hint}
              </span>
            )}
          </div>
          <div className="shrink-0">
            <Button variant="vault" size="sm" onClick={onVerify}>
              Verify
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="font-body text-sm font-semibold leading-snug text-text-primary">
              {label}
            </span>
            {hint && (
              <span className="font-body text-xs leading-normal text-text-muted">
                {hint}
              </span>
            )}
          </div>
          <div className="font-mono text-lg font-semibold tracking-[0.15em] text-vault whitespace-nowrap bg-vault-light py-2 px-3 rounded-sm">
            {value}
          </div>
        </>
      )}
    </div>
  );
}

export {
  VaultItem,
  LockIcon,
  type VaultItemProps,
  type VaultItemState,
};
