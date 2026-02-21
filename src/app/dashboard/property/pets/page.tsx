import type { Metadata } from "next";
import { PetsEditorPageClient } from "./PetsEditorPageClient";

export const metadata: Metadata = {
  title: "Edit Pets | Vadem",
};

export default function PetsEditorPage() {
  return <PetsEditorPageClient />;
}
