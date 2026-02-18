"use client";

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "vault"
  | "ghost"
  | "soft"
  | "danger";
type ButtonSize = "lg" | "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "btn-primary bg-primary text-text-on-primary hover:bg-primary-hover",
  secondary:
    "bg-secondary text-text-on-primary hover:bg-secondary-hover",
  vault:
    "bg-vault text-text-on-vault hover:bg-vault-hover",
  ghost:
    "bg-transparent text-text-secondary border border-border-default hover:bg-bg-sunken hover:border-border-strong",
  soft:
    "bg-primary-light text-primary hover:bg-primary-subtle",
  danger:
    "btn-danger bg-danger text-text-on-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: "btn-lg rounded-lg",
  default: "btn-default rounded-md",
  sm: "btn-sm rounded-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    icon,
    className = "",
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
      className={[
        "btn",
        sizeClasses[size],
        variantClasses[variant],
        disabled && "btn-disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
});

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
