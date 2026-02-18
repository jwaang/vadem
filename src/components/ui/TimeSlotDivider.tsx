import { type HTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type TimeSlot = "morning" | "afternoon" | "evening";

interface TimeSlotDividerProps extends HTMLAttributes<HTMLDivElement> {
  slot: TimeSlot;
}

const slotConfig: Record<TimeSlot, { emoji: string; label: string }> = {
  morning: { emoji: "☀️", label: "MORNING" },
  afternoon: { emoji: "⛅", label: "AFTERNOON" },
  evening: { emoji: "🌙", label: "EVENING" },
};

const iconVariants = cva(
  "flex items-center justify-center w-8 h-8 rounded-round text-base leading-none shrink-0",
  {
    variants: {
      slot: {
        morning: "bg-accent-light",
        afternoon: "bg-primary-light",
        evening: "bg-vault-light",
      },
    },
  },
);

function TimeSlotDivider({
  slot,
  className,
  ...props
}: TimeSlotDividerProps) {
  const { emoji, label } = slotConfig[slot];

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="separator"
      aria-label={`${label.charAt(0)}${label.slice(1).toLowerCase()} tasks`}
      {...props}
    >
      <span className={iconVariants({ slot })} aria-hidden="true">
        {emoji}
      </span>
      <span className="font-body text-sm font-bold tracking-[0.05em] leading-none text-text-primary shrink-0">
        {label}
      </span>
      <span className="flex-1 h-px bg-border-default min-w-5" aria-hidden="true" />
    </div>
  );
}

export { TimeSlotDivider, type TimeSlotDividerProps, type TimeSlot };
