import type { Metadata } from "next";
import { SectionsEditorPageClient } from "./SectionsEditorPageClient";

export const metadata: Metadata = {
  title: "Edit Sections | Vadem",
};

export default function SectionsEditorPage() {
  return <SectionsEditorPageClient />;
}
