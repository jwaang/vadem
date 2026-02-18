"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ className, ...props }, ref) {
    return (
      <div className="group relative flex items-center">
        <svg
          className="absolute left-3 text-text-muted pointer-events-none transition-colors duration-150 ease-out group-focus-within:text-primary"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="5.5" />
          <line x1="12.5" y1="12.5" x2="16" y2="16" />
        </svg>
        <input
          ref={ref}
          type="search"
          className={cn(
            "w-full font-body text-base leading-normal text-text-primary bg-bg-sunken border-[1.5px] border-transparent rounded-md p-3 pl-[calc(var(--spacing-3)+18px+var(--spacing-2))] outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted focus:bg-bg-raised focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

export { SearchBar, type SearchBarProps };
