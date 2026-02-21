import { CallbackPageClient } from "../../CallbackPageClient";

export const metadata = { title: "Signing in – Vadem" };

export default function AppleCallbackCompletePage() {
  return <CallbackPageClient provider="apple" />;
}
