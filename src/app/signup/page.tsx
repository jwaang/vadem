import Link from "next/link";
import type { Metadata } from "next";
import { SignupPageClient } from "./SignupPageClient";

export const metadata: Metadata = {
  title: "Create account – Handoff",
  description: "Sign up to start building your home care manual.",
};

export default function SignupPage() {
  return (
    <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-primary mb-1 italic">Handoff</p>
          <h1 className="font-display text-4xl text-text-primary mb-3">
            Create your account
          </h1>
          <p className="font-body text-base text-text-secondary">
            Start building your home care manual
          </p>
        </div>

        <SignupPageClient />

        <p className="text-center mt-6 font-body text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
