"use client";

import dynamic from "next/dynamic";

const ContactsEditor = dynamic(() => import("./ContactsEditor"), { ssr: false });

export function ContactsEditorPageClient() {
  return <ContactsEditor />;
}
