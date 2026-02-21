"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons, hasOAuthProviders } from "@/components/ui/OAuthButtons";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}

// Inner component: only rendered when ConvexProvider is in the tree
function SignupFormInner({ originTripId }: { originTripId?: string | null }) {
  const router = useRouter();
  const signupAction = useAction(api.authActions.signUp);
  const { setUser } = useAuth();

  // Fetch owner's first name for context messaging when coming from a sitter link
  const ownerName = useQuery(
    api.trips.getPropertyOwnerName,
    originTripId ? { tripId: originTripId } : "skip",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    if (!newErrors.password && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const { token, email: userEmail } = await signupAction({
        email,
        password,
        ...(originTripId ? { originTripId } : {}),
      });
      setUser({ token, email: userEmail });
      router.push("/wizard");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        setErrors({ email: "An account with this email already exists" });
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-bg-raised rounded-xl shadow-md p-8">
      {/* Sitter conversion context banner */}
      {originTripId && (
        <div className="mb-6 px-4 py-3 bg-primary-subtle rounded-lg text-center">
          <p className="font-body text-sm text-primary">
            {ownerName
              ? `You were ${ownerName}'s sitter — now make your own.`
              : "You were a Vadem sitter — now make your own."}
          </p>
        </div>
      )}

      {/* OAuth sign-up buttons */}
      {hasOAuthProviders && (
        <>
          <OAuthButtons className="flex flex-col gap-3 mb-6" />
          <div className="oauth-divider mb-6">or</div>
        </>
      )}

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {errors.general && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {errors.general}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={!errors.password ? "Minimum 8 characters" : undefined}
          autoComplete="new-password"
          required
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="w-full mt-1"
        >
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}

// Outer component: guards against missing ConvexProvider when CONVEX_URL is unset
export default function SignupForm({ originTripId }: { originTripId?: string | null }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="bg-bg-raised rounded-xl shadow-md p-8 text-center">
        <p className="font-body text-sm text-text-muted">
          Backend service is not configured. Set{" "}
          <code className="font-mono text-xs bg-bg-sunken px-1 py-0.5 rounded">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
          to enable signup.
        </p>
      </div>
    );
  }

  return <SignupFormInner originTripId={originTripId} />;
}
