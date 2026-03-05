"use client";

import type { ContactRole } from "@/components/ui/EmergencyContactBar";
import { formatPhone } from "@/lib/phone";

const roleCardBg: Record<ContactRole, string> = {
  owner: "bg-primary-light",
  vet: "bg-secondary-light",
  neighbor: "bg-accent-light",
  emergency: "bg-danger-light",
};

const roleCardText: Record<ContactRole, string> = {
  owner: "text-primary",
  vet: "text-secondary",
  neighbor: "text-accent",
  emergency: "text-danger",
};

/** Fuzzy role → color mapping for display purposes */
function getRoleForColor(role: string): ContactRole {
  const r = role.toLowerCase();
  if (r.includes("owner") || r.includes("partner")) return "owner";
  if (r.includes("vet")) return "vet";
  if (r.includes("neighbor")) return "neighbor";
  return "emergency";
}

interface ContactTabEntry {
  name: string;
  role: string;
  phone: string;
  notes?: string;
  isLocked: boolean;
}

function ContactsTab({ contacts }: { contacts: ContactTabEntry[] }) {
  const visible = contacts.filter((c) => c.name && c.phone);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-3xl" aria-hidden="true">📞</span>
        <p className="font-body text-sm font-semibold text-text-primary">No contacts yet</p>
        <p className="font-body text-xs text-text-muted max-w-[220px]">
          The owner hasn&rsquo;t added any emergency contacts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text-primary">Emergency Contacts</h2>
      <div className="flex flex-col gap-3">
        {visible.map((contact, i) => {
          const colorRole = getRoleForColor(contact.role);
          return (
            <div
              key={`${contact.name}-${i}`}
              className="bg-bg-raised rounded-lg border border-border-default shadow-xs p-4 flex flex-col gap-3"
            >
              {/* Header: avatar + name + role badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-round shrink-0 font-body text-sm font-bold ${roleCardBg[colorRole]} ${roleCardText[colorRole]}`}
                  aria-hidden="true"
                >
                  {contact.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-text-primary leading-tight">
                    {contact.name}
                  </p>
                  <span
                    className={`inline-block font-body text-xs font-medium rounded-pill px-2 py-0.5 mt-0.5 ${roleCardBg[colorRole]} ${roleCardText[colorRole]}`}
                  >
                    {contact.role}
                  </span>
                </div>
              </div>

              {/* Phone — tappable tel: link */}
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 font-body text-sm font-medium text-secondary no-underline"
                aria-label={`Call ${contact.name} at ${contact.phone}`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="-1 -1 26 26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.61 19.79 19.79 0 01.07 1a2 2 0 012-2H6a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                {formatPhone(contact.phone)}
              </a>

              {/* Notes (optional) */}
              {contact.notes && (
                <p className="font-body text-xs text-text-muted leading-relaxed border-t border-border-default pt-3">
                  {contact.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ContactsTab, type ContactTabEntry };
