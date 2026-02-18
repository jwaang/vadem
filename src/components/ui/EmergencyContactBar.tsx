"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContactRole = "owner" | "vet" | "neighbor" | "emergency";

interface EmergencyContact {
  name: string;
  role: ContactRole;
  phone: string;
  icon?: ReactNode;
}

interface EmergencyContactBarProps extends HTMLAttributes<HTMLDivElement> {
  contacts: EmergencyContact[];
}

const roleLabels: Record<ContactRole, string> = {
  owner: "Owner",
  vet: "Vet",
  neighbor: "Neighbor",
  emergency: "Emergency",
};

const roleIconBg: Record<ContactRole, string> = {
  owner: "bg-primary-light",
  vet: "bg-secondary-light",
  neighbor: "bg-accent-light",
  emergency: "bg-danger-light",
};

const roleTextColor: Record<ContactRole, string> = {
  owner: "text-primary",
  vet: "text-secondary",
  neighbor: "text-accent",
  emergency: "text-danger",
};

function DefaultIcon({ role }: { role: ContactRole }) {
  const initials: Record<ContactRole, string> = {
    owner: "O",
    vet: "V",
    neighbor: "N",
    emergency: "E",
  };
  return (
    <span className={cn("font-body text-sm font-bold", roleTextColor[role])}>
      {initials[role]}
    </span>
  );
}

function EmergencyContactBar({
  contacts,
  className,
  ...props
}: EmergencyContactBarProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex gap-3 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-2 [scrollbar-width:thin]">
        {contacts.map((contact) => (
          <div
            key={`${contact.name}-${contact.phone}`}
            className="flex items-center gap-3 min-w-max py-3 px-4 bg-bg-raised border border-border-default rounded-lg shadow-xs transition-[border-color,background-color,box-shadow] duration-150 ease-out hover:border-secondary hover:bg-secondary-subtle hover:shadow-sm"
          >
            <span
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-round shrink-0",
                roleIconBg[contact.role],
              )}
            >
              {contact.icon ?? <DefaultIcon role={contact.role} />}
            </span>
            <span className="flex flex-col gap-px">
              <span className="font-body text-sm font-semibold text-text-primary leading-tight whitespace-nowrap">
                {contact.name}
              </span>
              <span className="font-body text-xs text-text-muted leading-tight whitespace-nowrap">
                {roleLabels[contact.role]}
              </span>
            </span>
            <a
              href={`tel:${contact.phone}`}
              className="font-body text-sm font-semibold text-secondary no-underline py-1 px-3 rounded-sm ml-2 whitespace-nowrap transition-[background-color,color] duration-150 ease-out hover:bg-secondary-subtle hover:text-secondary-hover"
              onClick={(e) => e.stopPropagation()}
            >
              Call
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  EmergencyContactBar,
  type EmergencyContactBarProps,
  type EmergencyContact,
  type ContactRole,
};
