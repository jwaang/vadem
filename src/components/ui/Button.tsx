"use client";

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn relative inline-flex items-center justify-center gap-2 font-body font-semibold leading-none whitespace-nowrap cursor-pointer select-none border-none transition-[transform,box-shadow,background-color,border-color] duration-150 ease-spring shadow-xs",
  {
    variants: {
      variant: {
        primary:
          "btn-primary bg-primary text-text-on-primary hover:bg-primary-hover",
        secondary:
          "bg-secondary text-text-on-primary hover:bg-secondary-hover",
        vault: "bg-vault text-text-on-vault hover:bg-vault-hover",
        ghost:
          "btn-no-shadow bg-transparent text-text-secondary border border-border-default hover:bg-bg-sunken hover:border-border-strong",
        soft: "btn-no-shadow bg-primary-light text-primary hover:bg-[#EEDBD0]",
        danger: "btn-danger bg-danger text-text-on-primary",
      },
      size: {
        lg: "text-base px-8 py-4 rounded-lg",
        default: "text-sm px-5 py-3 rounded-md",
        sm: "text-xs px-3 py-2 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    icon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className,
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
});

export { Button, buttonVariants, type ButtonProps, type ButtonVariant, type ButtonSize };
