"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  emoji: string;
  label: string;
}

interface SectionNavProps extends HTMLAttributes<HTMLElement> {
  sections: Section[];
  activeId?: string;
  onSectionChange?: (id: string) => void;
}

function SectionNav({
  sections,
  activeId,
  onSectionChange,
  className,
  ...props
}: SectionNavProps) {
  const [internalActive, setInternalActive] = useState(
    activeId ?? sections[0]?.id ?? "",
  );

  const currentId = activeId ?? internalActive;

  function handleClick(id: string) {
    if (!activeId) setInternalActive(id);
    onSectionChange?.(id);
  }

  return (
    <nav
      className={cn(
        "w-full overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] scroll-smooth",
        className,
      )}
      aria-label="Manual sections"
      {...props}
    >
      <div className="flex gap-2 min-w-max pb-2" role="tablist">
        {sections.map((section) => {
          const isActive = section.id === currentId;

          return (
            <button
              key={section.id}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "inline-flex items-center gap-2 py-2 px-4 rounded-pill border font-body text-sm font-medium leading-normal whitespace-nowrap cursor-pointer select-none transition-[background-color,color,border-color,box-shadow] duration-150 ease-out",
                isActive
                  ? "bg-primary text-text-on-primary border-primary font-semibold shadow-[0_2px_8px_rgba(194,112,74,0.25)]"
                  : "bg-bg-raised text-text-secondary border-border-default hover:bg-bg-sunken",
              )}
              onClick={() => handleClick(section.id)}
              type="button"
            >
              <span className="text-base leading-none" aria-hidden="true">
                {section.emoji}
              </span>
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { SectionNav, type SectionNavProps, type Section };
