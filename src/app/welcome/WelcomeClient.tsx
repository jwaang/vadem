"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { trackOnboardingCompleted } from "@/lib/analytics";

const SLIDES = [
  {
    emoji: "🏠",
    emojiBg: "bg-primary-subtle",
    heading: "Create your home\u2019s care manual",
    body: "Vadem helps you organize everything your house sitter needs \u2014 pets, access codes, instructions, and contacts \u2014 in one shareable guide.",
  },
  {
    emoji: null,
    emojiGrid: [
      { emoji: "🐾", bg: "bg-primary-subtle" },
      { emoji: "🔑", bg: "bg-accent-subtle" },
      { emoji: "📋", bg: "bg-secondary-subtle" },
      { emoji: "📞", bg: "bg-vault-subtle" },
    ],
    emojiBg: "",
    heading: "Everything in one place",
    body: "Add your pets, access codes, house instructions, and emergency contacts. Each section is guided step-by-step.",
  },
  {
    emoji: "🔗",
    emojiBg: "bg-accent-subtle",
    heading: "Share with one link",
    body: "Generate a private link for each trip. Your sitter gets a daily task view, and sensitive codes stay protected behind phone verification.",
  },
  {
    emoji: "👋",
    emojiBg: "bg-primary-subtle",
    heading: "What should we call you?",
    body: "So we can make things a bit more personal.",
  },
] as const;

function WelcomeClientInner() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLeavingRef = useRef(false);
  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const markOnboarding = useMutation(api.auth.markOnboardingComplete);
  const updateProfile = useMutation(api.auth.updateProfile);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const namePreFilledRef = useRef(false);

  // Pre-fill name from session data (e.g. Google OAuth users) — one-time init
  useEffect(() => {
    if (namePreFilledRef.current || !sessionData) return;
    namePreFilledRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from external query
    if (sessionData.firstName) setFirstName(sessionData.firstName);
    if (sessionData.lastName) setLastName(sessionData.lastName);
  }, [sessionData]);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  // Redirect unverified email users to check-email
  useEffect(() => {
    if (sessionData && !sessionData.emailVerified) {
      router.replace("/check-email");
    }
  }, [sessionData, router]);

  // Redirect if already onboarded (but not if the user just clicked a CTA)
  useEffect(() => {
    if (sessionData?.hasCompletedOnboarding && !isLeavingRef.current) {
      router.replace("/dashboard");
    }
  }, [sessionData, router]);

  const goToSlide = (index: number) => {
    if (index === currentSlide) return;
    setCurrentSlide(index);
  };

  const completeOnboarding = (destination: string) => {
    isLeavingRef.current = true;
    trackOnboardingCompleted();
    router.push(destination);
    if (user?.token) {
      void markOnboarding({ token: user.token });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !user?.token) return;
    setIsSaving(true);
    try {
      await updateProfile({
        token: user.token,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      setUser({ ...user, firstName: firstName.trim() });
      completeOnboarding("/setup/home");
    } catch {
      setIsSaving(false);
    }
  };

  if (!user || sessionData === undefined) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </main>
    );
  }

  if (sessionData?.hasCompletedOnboarding) return null;

  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  return (
    <main className="h-dvh bg-bg flex flex-col items-center px-6 overflow-hidden">
      <div className="w-full max-w-md mx-auto flex flex-col items-center flex-1 min-h-0 pt-8 pb-8">
        {/* Wordmark */}
        <p className="font-display text-2xl text-primary italic shrink-0">Vadem</p>

        {/* Slide content — fills the middle, vertically centers */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full py-6">
          <div
            key={currentSlide}
            className="flex flex-col items-center gap-5 text-center"
            style={{
              animation: "onboarding-slide-in 300ms ease-out",
            }}
          >
            {/* Emoji illustration (all slides including last) */}
            {"emojiGrid" in slide && slide.emojiGrid ? (
              <div className="grid grid-cols-2 gap-3">
                {slide.emojiGrid.map(({ emoji, bg }) => (
                  <div
                    key={emoji}
                    className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center`}
                  >
                    <span className="text-3xl" role="img" aria-hidden="true">
                      {emoji}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`w-24 h-24 rounded-full ${slide.emojiBg} flex items-center justify-center`}
              >
                <span className="text-5xl" role="img" aria-hidden="true">
                  {slide.emoji}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 max-w-xs">
              <h1 className="font-display text-2xl text-text-primary leading-snug">
                {slide.heading}
              </h1>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                {slide.body}
              </p>
            </div>

            {/* Profile form on last slide */}
            {isLastSlide && (
              <form
                onSubmit={handleProfileSubmit}
                className="flex flex-col gap-4 w-full max-w-xs text-left"
              >
                <Input
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                />
                <Input
                  label="Last name"
                  hint="Optional"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={!firstName.trim() || isSaving}
                >
                  {isSaving ? "Saving..." : "Let\u2019s get started"}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom section — always visible, pinned to bottom of viewport */}
        <div className="flex flex-col items-center gap-4 shrink-0 w-full">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-round transition-all duration-250 ${index === currentSlide
                  ? "bg-primary w-5"
                  : "bg-border-strong hover:bg-text-muted"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide ? "true" : undefined}
              />
            ))}
          </div>

          {/* Navigation (not shown on last slide — form has its own CTA) */}
          {!isLastSlide && (
            <div className="flex items-center gap-2">
              {currentSlide > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToSlide(currentSlide - 1)}
                >
                  <ChevronLeftIcon size={14} />
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => goToSlide(currentSlide + 1)}
              >
                Next
                <ChevronRightIcon size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export function WelcomeClient() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="font-body text-sm text-text-muted">
            Backend not configured.
          </p>
        </div>
      </main>
    );
  }
  return <WelcomeClientInner />;
}
