"use client";

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer border-none transition-colors duration-150 ease-out disabled:opacity-30 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        /** Ghost: muted icon, darkens on hover. Use for toolbar/card actions. */
        default: "text-text-muted hover:text-text-primary",
        /** Ghost: muted icon, turns danger red on hover. Use for destructive actions. */
        danger: "text-text-muted hover:text-danger",
        /** Filled vault: dark slate bg with white icon. Use for vault copy/action buttons. */
        vault: "bg-vault text-text-on-vault hover:bg-vault-hover",
        /** Filled secondary: green bg, used for confirmed/copied states. */
        secondary: "bg-secondary text-text-on-primary",
      },
      size: {
        /** Compact toolbar button — pairs with 14px icons */
        sm: "p-1.5 rounded",
        /** Standard icon button — pairs with 16–18px icons */
        md: "p-2 rounded-md",
        /** Fixed square — pairs with 18–22px icons (e.g. vault copy button) */
        lg: "w-10 h-10 min-w-[40px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

type IconButtonVariant = NonNullable<VariantProps<typeof iconButtonVariants>["variant"]>;
type IconButtonSize = NonNullable<VariantProps<typeof iconButtonVariants>["size"]>;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to render — pass any SVG component or ReactNode */
  icon: ReactNode;
  /** Required for accessibility */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant, size, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
    </button>
  );
});

export { IconButton, iconButtonVariants, type IconButtonProps, type IconButtonVariant, type IconButtonSize };
