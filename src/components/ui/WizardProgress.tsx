"use client";

import { type HTMLAttributes } from "react";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { SETUP_STEPS } from "@/lib/setupSteps";

type StepStatus = "completed" | "active" | "upcoming";

interface WizardProgressProps extends HTMLAttributes<HTMLElement> {
  currentStep: number;
  completedSteps?: number[];
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 7.5L5.5 10.5L11.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const dotVariants = cva(
  "flex items-center justify-center w-8 h-8 rounded-round font-body text-sm font-semibold leading-none transition-[background-color,border-color,box-shadow,color] duration-150 ease-out",
  {
    variants: {
      status: {
        completed: "bg-secondary text-text-on-primary",
        active:
          "bg-primary text-text-on-primary shadow-[0_4px_14px_rgba(194,112,74,0.35)]",
        upcoming:
          "bg-transparent border-[1.5px] border-border-strong text-text-muted",
      },
    },
  },
);

const labelVariants = cva(
  "font-body text-xs leading-tight whitespace-nowrap transition-colors duration-150 ease-out",
  {
    variants: {
      status: {
        completed: "text-secondary font-medium",
        active: "text-primary font-semibold",
        upcoming: "text-text-muted font-medium",
      },
    },
  },
);

function getStepStatus(
  index: number,
  currentStep: number,
  completedSteps?: number[],
): StepStatus {
  if (completedSteps) {
    if (completedSteps.includes(index)) return "completed";
    if (index === currentStep) return "active";
    return "upcoming";
  }
  if (index < currentStep) return "completed";
  if (index === currentStep) return "active";
  return "upcoming";
}

function WizardProgress({
  currentStep,
  completedSteps,
  className,
  ...props
}: WizardProgressProps) {
  return (
    <nav
      className={cn(
        "w-full overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] pb-2",
        className,
      )}
      aria-label="Setup progress"
      {...props}
    >
      <ol className="flex items-start list-none m-0 p-0 min-w-max">
        {SETUP_STEPS.map((step, index) => {
          const status = getStepStatus(index, currentStep, completedSteps);
          const isLast = index === SETUP_STEPS.length - 1;

          return (
            <li key={step.label} className="flex items-start">
              <Link
                href={`/setup/${step.slug}`}
                className={cn(
                  "flex flex-col items-center gap-2 min-w-[72px] cursor-pointer no-underline",
                  status === "upcoming" && "hover:[&>span:first-child]:border-primary hover:[&>span:last-child]:text-primary",
                  status === "completed" && "hover:[&>span:first-child]:opacity-80",
                )}
                aria-current={status === "active" ? "step" : undefined}
              >
                <span className={dotVariants({ status })}>
                  {status === "completed" ? (
                    <CheckIcon />
                  ) : (
                    <span className="tabular-nums">{index + 1}</span>
                  )}
                </span>
                <span className={labelVariants({ status })}>{step.label}</span>
              </Link>

              {!isLast && (
                <span
                  className={cn(
                    "block w-10 h-0.5 bg-border-default rounded-[1px] mt-[15px] shrink-0 transition-colors duration-150 ease-out",
                    getStepStatus(index, currentStep, completedSteps) ===
                      "completed" && "bg-secondary",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export {
  WizardProgress,
  type WizardProgressProps,
  type StepStatus,
};
