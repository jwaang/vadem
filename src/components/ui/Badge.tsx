import { type HTMLAttributes, type ReactNode } from "react";

type BadgeVariant =
  | "overlay"
  | "room"
  | "vault"
  | "success"
  | "warning"
  | "danger"
  | "time";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  overlay: "badge-overlay",
  room: "badge-room",
  vault: "badge-vault",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  time: "badge-time",
};

const prefixes: Partial<Record<BadgeVariant, string>> = {
  overlay: "✦ ",
  vault: "🔒 ",
};

function Badge({
  variant = "room",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const prefix = prefixes[variant];

  return (
    <span
      className={["badge", variantClasses[variant], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {prefix}
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
