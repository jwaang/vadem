"use client";

import { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { BottomNav, type TabId } from "@/components/ui/BottomNav";

interface SitterLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Main page content */
  children: ReactNode;
  /** Currently active bottom nav tab */
  activeTab?: TabId;
  /** Called when bottom nav tab changes */
  onTabChange?: (tab: TabId) => void;
}

function SitterLayout({
  children,
  activeTab,
  onTabChange,
  className,
  ...props
}: SitterLayoutProps) {
  return (
    <div
      className={cn("flex flex-col min-h-dvh", className)}
      {...props}
    >
      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
        <div className="max-w-[600px] mx-auto p-4 md:max-w-[640px] md:p-6 lg:p-8 lg:px-6">
          {children}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} variant="sticky" />
    </div>
  );
}

export { SitterLayout, type SitterLayoutProps };
