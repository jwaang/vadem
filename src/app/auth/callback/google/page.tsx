import { CallbackPageClient } from "../CallbackPageClient";

export const metadata = { title: "Signing in – Vadem" };

export default function GoogleCallbackPage() {
  return <CallbackPageClient provider="google" />;
}
