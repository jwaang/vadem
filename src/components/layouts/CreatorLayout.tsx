"use client";

import { useState, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { BottomNav, type TabId } from "@/components/ui/BottomNav";

type CreatorNavId = "property" | "trips" | "settings";

interface CreatorLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Main page content */
  children: ReactNode;
  /** Currently active sidebar nav item */
  activeNav?: CreatorNavId;
  /** Called when sidebar nav item changes */
  onNavChange?: (nav: CreatorNavId) => void;
  /** Active bottom nav tab (mobile) */
  activeTab?: TabId;
  /** Called when bottom nav tab changes (mobile) */
  onTabChange?: (tab: TabId) => void;
}

const sidebarItems: { id: CreatorNavId; label: string; icon: ReactNode }[] = [
  {
    id: "property",
    label: "My Property",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "trips",
    label: "Trips",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function CreatorLayout({
  children,
  activeNav,
  onNavChange,
  activeTab,
  onTabChange,
  className,
  ...props
}: CreatorLayoutProps) {
  const [internalNav, setInternalNav] = useState<CreatorNavId>(
    activeNav ?? "property",
  );

  const currentNav = activeNav ?? internalNav;

  function handleNavChange(nav: CreatorNavId) {
    if (!activeNav) setInternalNav(nav);
    onNavChange?.(nav);
  }

  return (
    <div
      className={cn(
        "flex flex-col min-h-dvh lg:flex-row",
        className,
      )}
      {...props}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[240px] lg:shrink-0 lg:bg-bg-raised lg:border-r lg:border-border-default lg:py-6 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto"
        aria-label="Creator navigation"
      >
        <div className="px-6 pb-6 border-b border-border-default mb-4">
          <span className="font-display text-2xl text-primary italic">Vadem</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = item.id === currentNav;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex items-center gap-3 p-3 border-none bg-transparent rounded-md cursor-pointer font-body text-sm font-medium text-text-secondary transition-[background-color,color] duration-150 ease-out w-full text-left [-webkit-tap-highlight-color:transparent] hover:bg-bg-sunken hover:text-text-primary",
                  isActive && "bg-primary-subtle text-primary font-semibold hover:bg-primary-light",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNavChange(item.id)}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0 lg:min-w-0">
        <div className="max-w-[768px] mx-auto p-4 md:max-w-[720px] md:p-6 lg:max-w-[960px] lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="block lg:hidden">
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} variant="sticky" />
      </div>
    </div>
  );
}

export { CreatorLayout, type CreatorLayoutProps, type CreatorNavId };
