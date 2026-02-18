import { type HTMLAttributes } from "react";

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

function ActivityFeedItem({
  type,
  name,
  action,
  timestamp,
  hideBorder = false,
  className = "",
  ...props
}: ActivityFeedItemProps) {
  return (
    <div
      className={[
        "activity-feed-item",
        !hideBorder && "activity-feed-item-bordered",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span
        className={`activity-feed-dot activity-feed-dot-${type}`}
        aria-hidden="true"
      />
      <div className="activity-feed-content">
        <p className="activity-feed-text">
          <span className="activity-feed-name">{name}</span> {action}
        </p>
        <span className="activity-feed-timestamp">{timestamp}</span>
      </div>
    </div>
  );
}

export { ActivityFeedItem, type ActivityFeedItemProps, type ActivityType };
