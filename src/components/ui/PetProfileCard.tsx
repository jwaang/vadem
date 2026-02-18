"use client";

import { type HTMLAttributes } from "react";
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
}

function PetProfileCard({
  src,
  alt = "",
  name,
  breed,
  age,
  details = [],
  personalityNote,
  className,
  ...props
}: PetProfileCardProps) {
  return (
    <div
      className={cn(
        "max-w-[360px] bg-bg-raised rounded-xl shadow-md overflow-hidden border border-border-default transition-[box-shadow,translate] duration-250 ease-out hover:shadow-lg hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {/* Hero photo — 1:1 aspect ratio, full bleed */}
      <div className="relative w-full aspect-square overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={alt || name}
            className="w-full h-full object-cover block"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[linear-gradient(135deg,var(--color-primary-light)_0%,var(--color-accent-light)_50%,var(--color-secondary-light)_100%)]" />
        )}
      </div>

      {/* Content below photo */}
      <div className="flex flex-col gap-3 pt-5 px-5 pb-6">
        <h2 className="font-display text-3xl leading-tight tracking-tight text-text-primary m-0">
          {name}
        </h2>
        <p className="font-body text-sm leading-normal text-text-muted m-0">
          {breed} · {age}
        </p>

        {details.length > 0 && (
          <div className="flex flex-col mt-1 divide-y divide-border-default">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center gap-2 font-body text-sm leading-normal py-3"
              >
                <span
                  className="shrink-0 w-6 text-center text-base"
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
                    className="text-secondary font-semibold no-underline ml-auto text-right transition-colors duration-150 ease-out hover:text-secondary-hover"
                  >
                    {detail.value}
                  </a>
                ) : (
                  <span className="text-text-secondary ml-auto text-right">
                    {detail.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {personalityNote && (
          <p className="font-handwritten text-lg leading-relaxed text-text-secondary bg-accent-subtle rounded-md py-3 px-4 mt-1 m-0">
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
