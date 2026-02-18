"use client";

import { useState, type HTMLAttributes } from "react";

type TabId = "today" | "manual" | "vault" | "contacts";

interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  /** Currently active tab */
  activeTab?: TabId;
  /** Called when a tab is tapped */
  onTabChange?: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "manual",
    label: "Manual",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "vault",
    label: "Vault",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

function BottomNav({
  activeTab,
  onTabChange,
  className = "",
  ...props
}: BottomNavProps) {
  const [internalActive, setInternalActive] = useState<TabId>(
    activeTab ?? "today",
  );

  const currentTab = activeTab ?? internalActive;

  function handleTap(tab: TabId) {
    if (!activeTab) setInternalActive(tab);
    onTabChange?.(tab);
  }

  return (
    <nav
      className={["bottom-nav", className].filter(Boolean).join(" ")}
      aria-label="Main navigation"
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === currentTab;

        return (
          <button
            key={tab.id}
            type="button"
            className={[
              "bottom-nav-tab",
              isActive ? "text-primary" : "text-text-muted",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
            onClick={() => handleTap(tab.id)}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export { BottomNav, type BottomNavProps, type TabId };
