import Link from "next/link";
import type { Metadata } from "next";
import { LoginFormWrapper } from "./LoginFormWrapper";

export const metadata: Metadata = {
  title: "Sign in – Vadem",
  description: "Sign in to your Vadem account.",
};

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-primary mb-1 italic">Vadem</p>
          <h1 className="font-display text-4xl text-text-primary mb-3">
            Welcome back
          </h1>
          <p className="font-body text-base text-text-secondary">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-raised rounded-xl shadow-md p-8">
          <LoginFormWrapper />

          {/* Forgot password */}
          <div className="text-center mt-5">
            <Link
              href="/forgot-password"
              className="font-body text-sm text-text-secondary hover:text-primary transition-colors duration-150"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-6 font-body text-sm text-text-muted">
          {"Don't have an account? "}
          <Link
            href="/signup"
            className="text-primary hover:text-primary-hover underline underline-offset-2"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
