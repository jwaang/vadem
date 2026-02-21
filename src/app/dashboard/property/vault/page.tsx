import type { Metadata } from "next";
import { VaultEditorPageClient } from "./VaultEditorPageClient";

export const metadata: Metadata = {
  title: "Vault | Vadem",
};

export default function VaultEditorPage() {
  return <VaultEditorPageClient />;
}
