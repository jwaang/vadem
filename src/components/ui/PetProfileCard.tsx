"use client";

import { type HTMLAttributes } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PetDetail {
  emoji: string;
  label: string;
  value: string;
  /** If provided, renders as a tel: link in sage/secondary color */
  phone?: string;
}

interface PetProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Pet photo URL — renders placeholder gradient when absent */
  src?: string;
  /** Alt text for the photo */
  alt?: string;
  /** Pet name */
  name: string;
  /** Breed description */
  breed: string;
  /** Age description (e.g. "3 years old") */
  age: string;
  /** Detail rows with emoji icons */
  details?: PetDetail[];
  /** Personality note displayed in handwritten font */
  personalityNote?: string;
  /** Optional action buttons rendered in the name row (top-right) */
  actions?: React.ReactNode;
}

function PetProfileCard({
  src,
  alt = "",
  name,
  breed,
  age,
  details = [],
  personalityNote,
  actions,
  className,
  ...props
}: PetProfileCardProps) {
  const subtitle = [breed, age].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "max-w-[360px] bg-bg-raised rounded-xl shadow-sm overflow-hidden border border-border-default",
        className,
      )}
      {...props}
    >
      {/* Hero photo — 1:1 aspect ratio, full bleed */}
      <div className="relative w-full aspect-square overflow-hidden">
        {src ? (
          <Image
            src={src}
            alt={alt || name}
            fill
            className="object-cover"
            sizes="360px"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-primary-light" />
        )}
      </div>

      {/* Content below photo */}
      <div className="flex flex-col gap-2 pt-5 px-5 pb-6">
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h2 className="font-display text-3xl leading-tight text-text-primary text-balance">
              {name}
            </h2>
            {subtitle && (
              <p className="font-body text-sm leading-normal text-text-muted text-pretty">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-0.5 shrink-0 pt-1">
              {actions}
            </div>
          )}
        </div>

        {details.length > 0 && (
          <div className="flex flex-col mt-1 divide-y divide-border-default">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-start gap-2.5 font-body text-sm leading-normal py-2.5"
              >
                <span
                  className="shrink-0 size-5 text-center text-sm leading-5 mt-px"
                  aria-hidden="true"
                >
                  {detail.emoji}
                </span>
                <span className="text-text-primary font-semibold shrink-0">
                  {detail.label}
                </span>
                {detail.phone ? (
                  <a
                    href={`tel:${detail.phone}`}
                    className="text-secondary font-semibold no-underline ml-auto text-right transition-colors duration-150 ease-out hover:text-secondary-hover tabular-nums"
                  >
                    {detail.value}
                  </a>
                ) : (
                  <span className="text-text-secondary ml-auto text-right line-clamp-2">
                    {detail.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {personalityNote && (
          <p className="font-handwritten text-lg leading-relaxed text-text-secondary bg-accent-subtle rounded-md py-3 px-4 mt-1 text-pretty">
            {personalityNote}
          </p>
        )}
      </div>
    </div>
  );
}

export {
  PetProfileCard,
  type PetProfileCardProps,
  type PetDetail,
};
