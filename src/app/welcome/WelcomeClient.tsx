"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

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
    emoji: "✨",
    emojiBg: "bg-secondary-subtle",
    heading: "Ready to set up your home?",
    body: "It takes about 10 minutes. You can always come back and edit later.",
  },
] as const;

function WelcomeClientInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLeavingRef = useRef(false);

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const markOnboarding = useMutation(api.auth.markOnboardingComplete);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

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
    // Mark that we're navigating away so the useEffect doesn't
    // race us to /dashboard when the mutation updates sessionData.
    isLeavingRef.current = true;
    router.push(destination);
    if (user?.token) {
      void markOnboarding({ token: user.token });
    }
  };

  if (!user || sessionData === undefined) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading...</p>
      </main>
    );
  }

  if (sessionData?.hasCompletedOnboarding) return null;

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <main className="min-h-dvh bg-bg flex flex-col items-center px-4 pt-8 pb-12">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8 flex-1">
        {/* Wordmark */}
        <p className="font-display text-2xl text-primary italic">Vadem</p>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
          <div
            key={currentSlide}
            className="flex flex-col items-center gap-5 text-center"
            style={{
              animation: "onboarding-slide-in 300ms ease-out",
            }}
          >
            {/* Emoji illustration */}
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

            {/* CTA on last slide */}
            {isLastSlide && (
              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => completeOnboarding("/setup/home")}
                >
                  Let&rsquo;s get started
                </Button>
                <button
                  type="button"
                  onClick={() => completeOnboarding("/dashboard")}
                  className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
                >
                  I&rsquo;ll do this later
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-round transition-all duration-250 ${
                index === currentSlide
                  ? "bg-primary w-5"
                  : "bg-border-strong hover:bg-text-muted"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : undefined}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between w-full">
          {!isLastSlide ? (
            <>
              <button
                type="button"
                onClick={() => completeOnboarding("/setup/home")}
                className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
              >
                Skip
              </button>
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
            </>
          ) : (
            <div />
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
