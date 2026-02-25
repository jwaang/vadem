import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { LocationCard } from "./LocationCard";

type VaultItemState = "revealed" | "locked" | "hidden";

interface VaultItemLocationCard {
  caption: string;
  roomTag?: string;
  photoUrl?: string;
  videoUrl?: string;
}

interface VaultItemProps extends HTMLAttributes<HTMLDivElement> {
  state?: VaultItemState;
  icon: ReactNode;
  label: string;
  hint?: string;
  networkName?: string;
  value?: string;
  onVerify?: () => void;
  onCopy?: () => void;
  copied?: boolean;
  locationCard?: VaultItemLocationCard;
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

function ClipboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function VaultItem({
  state = "locked",
  icon,
  label,
  hint,
  networkName,
  value,
  onVerify,
  onCopy,
  copied = false,
  locationCard,
  className,
  ...props
}: VaultItemProps) {
  // Revealed state — card layout to accommodate code, copy button, instructions, and location card
  if (state === "revealed") {
    return (
      <div
        className={cn(
          "flex flex-col rounded-lg border border-secondary-light bg-secondary-subtle",
          className,
        )}
        {...props}
      >
        {/* Header row: icon + label */}
        <div className="flex items-center gap-4 py-4 px-5">
          <div className="flex items-center justify-center w-11 h-11 min-w-[44px] rounded-md bg-vault text-text-on-vault">
            {icon}
          </div>
          <span className="font-body text-sm font-semibold leading-snug text-text-primary">
            {label}
          </span>
        </div>

        {/* Code + copy, instructions, location card */}
        <div className="px-5 pb-4 flex flex-col gap-3">
          {/* Network name (WiFi items) */}
          {networkName && (
            <p className="font-body text-xs text-text-secondary m-0">
              Network: <span className="font-semibold text-text-primary">{networkName}</span>
            </p>
          )}
          {/* Code block + copy button */}
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-lg font-semibold tracking-[0.15em] text-vault bg-vault-light py-2 px-3 rounded-sm overflow-x-auto whitespace-nowrap">
              {value}
            </code>
            {onCopy && (
              <IconButton
                icon={copied ? <CheckIcon /> : <ClipboardIcon />}
                aria-label={copied ? "Copied!" : "Copy to clipboard"}
                onClick={onCopy}
                variant={copied ? "secondary" : "default"}
                size="lg"
              />
            )}
          </div>

          {/* Instructions text */}
          {hint && (
            <p className="font-body text-sm text-text-secondary leading-normal m-0">{hint}</p>
          )}

          {/* Location card */}
          {locationCard && (
            <div className="pt-1">
              <LocationCard
                caption={locationCard.caption}
                src={locationCard.photoUrl}
                alt={locationCard.caption}
                room={locationCard.roomTag}
                videoSrc={locationCard.videoUrl}
                tilt="neutral"
                className="w-full max-w-[320px]"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Locked / hidden states — horizontal layout (unchanged)
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-4 px-5 rounded-lg border border-vault-light bg-vault-subtle",
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
          <div className="shrink-0">
            <Button variant="vault" size="sm" onClick={onVerify}>
              Verify
            </Button>
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
  type VaultItemLocationCard,
};
