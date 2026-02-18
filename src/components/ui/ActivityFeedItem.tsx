import { type HTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type ActivityType = "view" | "task" | "vault" | "proof";

interface ActivityFeedItemProps extends HTMLAttributes<HTMLDivElement> {
  /** The type of activity — determines dot color */
  type: ActivityType;
  /** Bold name in the activity text (e.g. "Jamie") */
  name: string;
  /** The action description after the name */
  action: string;
  /** Timestamp string shown in muted xs text */
  timestamp: string;
  /** Whether to hide the bottom border (e.g. last item) */
  hideBorder?: boolean;
}

const dotVariants = cva(
  "w-2 h-2 min-w-2 rounded-round mt-[6px] shrink-0",
  {
    variants: {
      type: {
        view: "bg-primary",
        task: "bg-secondary",
        vault: "bg-vault",
        proof: "bg-accent",
      },
    },
  },
);

function ActivityFeedItem({
  type,
  name,
  action,
  timestamp,
  hideBorder = false,
  className,
  ...props
}: ActivityFeedItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3",
        !hideBorder && "border-b border-border-default",
        className,
      )}
      {...props}
    >
      <span
        className={dotVariants({ type })}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-body text-sm leading-normal text-text-secondary m-0">
          <span className="font-semibold text-text-primary">{name}</span> {action}
        </p>
        <span className="font-body text-xs leading-normal text-text-muted">
          {timestamp}
        </span>
      </div>
    </div>
  );
}

export { ActivityFeedItem, type ActivityFeedItemProps, type ActivityType };
