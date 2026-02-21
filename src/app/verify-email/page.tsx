import { Suspense } from "react";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata = { title: "Verify your email – Vadem" };

export default function VerifyEmailPage() {
  return (
    <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-2xl text-primary italic mb-6">Vadem</p>
        <Suspense
          fallback={
            <p className="font-body text-sm text-text-muted">Loading…</p>
          }
        >
          <VerifyEmailClient />
        </Suspense>
      </div>
    </main>
  );
}
