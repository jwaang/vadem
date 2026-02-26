import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determine whether a popover should anchor left or right relative to its
 * trigger wrapper. If left-anchoring would cause the popover to overflow
 * the viewport, returns "right" so the popover aligns to the wrapper's
 * right edge instead.
 *
 * Call this synchronously when the popover is about to render (the wrapper
 * ref must already be attached to the DOM).
 */
export function getPopoverAlign(
  wrapperEl: HTMLElement | null,
  popoverWidth = 280,
): "left" | "right" {
  if (!wrapperEl || typeof window === "undefined") return "left";
  const rect = wrapperEl.getBoundingClientRect();
  // Would a left-anchored popover overflow the viewport?
  if (rect.left + popoverWidth > window.innerWidth - 8) return "right";
  return "left";
}
