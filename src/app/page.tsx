import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-6 text-center">
      <h1 className="font-display text-5xl text-text-primary mb-3">Vadem</h1>
      <p className="font-body text-lg text-text-secondary mb-8">
        The care manual for your pets and home.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="font-body text-sm font-semibold bg-primary text-text-on-primary px-5 py-2.5 rounded-md hover:bg-primary-hover transition-colors duration-150"
        >
          Get started
        </Link>
        <Link
          href="/dashboard"
          className="font-body text-sm font-semibold bg-bg-raised border border-border-default text-text-primary px-5 py-2.5 rounded-md hover:bg-bg-sunken transition-colors duration-150"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
