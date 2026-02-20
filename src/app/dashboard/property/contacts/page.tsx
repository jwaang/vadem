import type { Metadata } from "next";
import { ContactsEditorPageClient } from "./ContactsEditorPageClient";

export const metadata: Metadata = {
  title: "Emergency Contacts | Handoff",
};

export default function ContactsEditorPage() {
  return <ContactsEditorPageClient />;
}
