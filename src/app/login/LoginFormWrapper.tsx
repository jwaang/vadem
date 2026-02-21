"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr: false must live in a Client Component
function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-12 rounded bg-bg-sunken animate-pulse" />
        <div className="h-11 w-full rounded-md bg-bg-sunken animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 rounded bg-bg-sunken animate-pulse" />
        <div className="h-11 w-full rounded-md bg-bg-sunken animate-pulse" />
      </div>
      <div className="h-11 w-full rounded-md bg-bg-sunken animate-pulse" />
    </div>
  );
}

const LoginFormDynamic = dynamic(
  () => import("./LoginForm").then((m) => ({ default: m.LoginForm })),
  { ssr: false, loading: LoginFormSkeleton },
);

export function LoginFormWrapper() {
  return <LoginFormDynamic />;
}
