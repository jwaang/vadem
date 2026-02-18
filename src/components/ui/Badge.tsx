import { type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-body text-xs font-semibold leading-[1.4] py-[3px] px-[10px] rounded-pill whitespace-nowrap",
  {
    variants: {
      variant: {
        overlay:
          "bg-accent-light text-overlay-badge-text border border-[rgba(234,180,64,0.3)]",
        room: "bg-bg-sunken text-text-secondary border border-border-default font-medium",
        vault:
          "bg-vault-light text-vault border border-[rgba(61,79,95,0.15)]",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-[#8b6420]",
        danger: "bg-danger-light text-danger",
        time: "bg-primary-light text-primary font-medium",
      },
    },
    defaultVariants: {
      variant: "room",
    },
  },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const prefixes: Partial<Record<BadgeVariant, string>> = {
  overlay: "✦",
  vault: "🔒",
};

function Badge({
  variant = "room",
  className,
  children,
  ...props
}: BadgeProps) {
  const prefix = prefixes[variant];

  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {children}
    </span>
  );
}

export { Badge, badgeVariants, type BadgeProps, type BadgeVariant };
