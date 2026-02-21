"use client";

import { type ReactNode, type HTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HomeIcon, CalendarIcon, SettingsIcon } from "@/components/ui/icons";

type CreatorNavId = "property" | "trips" | "settings";

interface CreatorLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Main page content */
  children: ReactNode;
  /** Optional override for active nav item; pathname detection is the primary source */
  activeNav?: CreatorNavId;
}

function getActiveNav(pathname: string, activeProp?: CreatorNavId): CreatorNavId {
  if (activeProp) return activeProp;
  if (pathname.startsWith("/dashboard/trips")) return "trips";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  return "property"; // /dashboard, /dashboard/property/*, etc.
}

const navItems: { id: CreatorNavId; label: string; href: string; icon: ReactNode }[] = [
  {
    id: "property",
    label: "Home",
    href: "/dashboard",
    icon: <HomeIcon />,
  },
  {
    id: "trips",
    label: "Trips",
    href: "/dashboard/trips",
    icon: <CalendarIcon />,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: <SettingsIcon />,
  },
];

function CreatorLayout({ children, activeNav, className, ...props }: CreatorLayoutProps) {
  const pathname = usePathname();
  const currentNav = getActiveNav(pathname, activeNav);

  return (
    <div
      className={cn("flex flex-col min-h-dvh lg:flex-row", className)}
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
          {navItems.map((item) => {
            const isActive = item.id === currentNav;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md font-body text-sm font-medium text-text-secondary transition-[background-color,color] duration-150 ease-out [-webkit-tap-highlight-color:transparent] hover:bg-bg-sunken hover:text-text-primary",
                  isActive && "bg-primary-subtle text-primary font-semibold hover:bg-primary-light",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0 lg:min-w-0">
        <div className="max-w-[768px] mx-auto p-4 md:max-w-[720px] md:p-6 lg:max-w-[960px] lg:p-8">
          {children}
        </div>
      </main>

      {/* Creator mobile nav */}
      <nav
        className="block lg:hidden sticky bottom-0 shrink-0 bg-bg-raised border-t border-border-default z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Creator navigation"
      >
        <div className="flex items-stretch h-14">
          {navItems.map((item) => {
            const isActive = item.id === currentNav;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 font-body text-[10px] font-semibold transition-colors duration-150 [-webkit-tap-highlight-color:transparent]",
                  isActive ? "text-primary" : "text-text-muted hover:text-text-primary",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export { CreatorLayout, type CreatorLayoutProps, type CreatorNavId };
