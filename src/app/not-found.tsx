import Link from "next/link";
import { HomeIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div
      className="min-h-dvh bg-bg flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ animation: "fadeInUp 600ms ease-out both" }}
    >
      {/* Entrance animation — server component compatible via inline style */}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Background: scattered card silhouettes ── */}
      <div
        className="absolute rounded-lg bg-bg-raised shadow-sm border border-border-default"
        style={{
          width: 140,
          height: 175,
          top: "10%",
          left: "5%",
          rotate: "-12deg",
          opacity: 0.6,
        }}
      >
        <div className="m-1.5 rounded bg-primary-light h-[55%]" />
        <div className="mx-3 mt-2.5 h-[3px] w-[60%] rounded-full bg-text-muted/10" />
      </div>
      <div
        className="absolute rounded-lg bg-bg-raised shadow-sm border border-border-default"
        style={{
          width: 120,
          height: 150,
          top: "14%",
          right: "7%",
          rotate: "9deg",
          opacity: 0.55,
        }}
      >
        <div className="m-1.5 rounded bg-accent-light h-[55%]" />
        <div className="mx-3 mt-2.5 h-[3px] w-[55%] rounded-full bg-text-muted/10" />
      </div>
      <div
        className="absolute rounded-lg bg-bg-raised shadow-sm border border-border-default hidden md:block"
        style={{
          width: 110,
          height: 138,
          bottom: "16%",
          left: "10%",
          rotate: "7deg",
          opacity: 0.5,
        }}
      >
        <div className="m-1.5 rounded bg-secondary-light h-[55%]" />
        <div className="mx-3 mt-2.5 h-[3px] w-[50%] rounded-full bg-text-muted/10" />
      </div>
      <div
        className="absolute rounded-lg bg-bg-raised shadow-sm border border-border-default hidden md:block"
        style={{
          width: 130,
          height: 162,
          bottom: "12%",
          right: "8%",
          rotate: "-7deg",
          opacity: 0.6,
        }}
      >
        <div className="m-1.5 rounded bg-primary-light h-[55%]" />
        <div className="mx-3 mt-2.5 h-[3px] w-[65%] rounded-full bg-text-muted/10" />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center max-w-sm">
        {/* The "lost" location card — Vadem's signature element */}
        <div
          className="bg-bg-raised rounded-lg p-2 shadow-polaroid w-60 mb-12"
          style={{ rotate: "-2deg" }}
        >
          {/* Photo area with warm gradient + house outline */}
          <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-primary-light via-accent-light to-secondary-light/60 flex items-center justify-center relative overflow-hidden">
            {/* Stroke-based house outline — subtle sketch feel */}
            <svg
              viewBox="0 0 80 80"
              className="w-16 h-16 text-primary/10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M40 12L10 36V68H30V50H50V68H70V36L40 12Z" />
              <rect x="35" y="43" width="10" height="13" rx="1" />
            </svg>
            {/* "404" watermark */}
            <span className="absolute bottom-2 right-3 font-display text-sm text-primary/25 select-none tracking-wide">
              404
            </span>
          </div>
          {/* Caption */}
          <p className="font-handwritten text-xl text-text-primary px-1.5 pt-2.5 pb-0.5">
            Hmm, not here either...
          </p>
          <div className="px-1.5 pb-1.5">
            <span className="inline-block font-body text-xs font-semibold text-text-muted bg-bg-sunken border border-border-default px-2.5 py-0.5 rounded-pill">
              Somewhere
            </span>
          </div>
        </div>

        {/* Heading + body */}
        <h1 className="font-display text-3xl md:text-4xl text-text-primary mb-3 text-center leading-tight">
          This page wandered off
        </h1>
        <p className="font-body text-base text-text-secondary leading-relaxed mb-8 text-center">
          We couldn&apos;t find what you&apos;re looking for. It may have been
          moved, or the link might be outdated.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold bg-primary text-text-on-primary px-6 py-3 rounded-md btn btn-primary transition-[translate,box-shadow,background-color] duration-150 hover:bg-primary-hover"
        >
          <HomeIcon size={16} />
          Back to home
        </Link>
      </div>
    </div>
  );
}
