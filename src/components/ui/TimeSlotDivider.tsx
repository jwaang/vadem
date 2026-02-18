import { type HTMLAttributes } from "react";

type TimeSlot = "morning" | "afternoon" | "evening";

interface TimeSlotDividerProps extends HTMLAttributes<HTMLDivElement> {
  slot: TimeSlot;
}

const slotConfig: Record<TimeSlot, { emoji: string; label: string }> = {
  morning: { emoji: "☀️", label: "MORNING" },
  afternoon: { emoji: "⛅", label: "AFTERNOON" },
  evening: { emoji: "🌙", label: "EVENING" },
};

function TimeSlotDivider({
  slot,
  className = "",
  ...props
}: TimeSlotDividerProps) {
  const { emoji, label } = slotConfig[slot];

  return (
    <div
      className={[
        "time-slot-divider",
        `time-slot-divider-${slot}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="separator"
      aria-label={`${label.charAt(0)}${label.slice(1).toLowerCase()} tasks`}
      {...props}
    >
      <span className="time-slot-divider-icon" aria-hidden="true">
        {emoji}
      </span>
      <span className="time-slot-divider-label">{label}</span>
      <span className="time-slot-divider-line" aria-hidden="true" />
    </div>
  );
}

export { TimeSlotDivider, type TimeSlotDividerProps, type TimeSlot };
