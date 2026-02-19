"use client";

export interface OAuthButtonsProps {
  /** Called when the user clicks an OAuth button; receives the URL to redirect to */
  onInitiate?: (url: string) => void;
  /** Optional CSS class for the container */
  className?: string;
}

function buildGoogleUrl(redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const state = typeof crypto !== "undefined" ? crypto.randomUUID() : "";
  if (typeof sessionStorage !== "undefined" && state) {
    sessionStorage.setItem("oauth_state", state);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function buildAppleUrl(redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "";
  const state = typeof crypto !== "undefined" ? crypto.randomUUID() : "";
  if (typeof sessionStorage !== "undefined" && state) {
    sessionStorage.setItem("oauth_state", state);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      width="17"
      height="20"
      viewBox="0 0 17 20"
      aria-hidden="true"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13.173 10.575c-.02-2.127 1.737-3.155 1.816-3.203C13.946 5.445 12.14 5.208 11.499 5.19c-1.499-.155-2.948.892-3.713.892-.779 0-1.955-.875-3.226-.852C2.97 5.253 1.468 6.098.647 7.467c-1.662 2.876-.424 7.115 1.174 9.44.8 1.14 1.733 2.416 2.96 2.37 1.197-.048 1.644-.766 3.088-.766 1.432 0 1.849.766 3.098.739 1.285-.021 2.09-1.148 2.87-2.297.912-1.312 1.283-2.593 1.3-2.66-.03-.013-2.487-.956-2.514-3.718zM10.586 3.454c.646-.794 1.083-1.887.963-2.98-.93.038-2.075.622-2.745 1.396-.593.683-1.116 1.789-.976 2.843 1.038.08 2.1-.526 2.758-1.259z" />
    </svg>
  );
}

export function OAuthButtons({ className }: OAuthButtonsProps) {
  const handleGoogle = () => {
    if (typeof window === "undefined") return;
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    window.location.href = buildGoogleUrl(redirectUri);
  };

  const handleApple = () => {
    if (typeof window === "undefined") return;
    const redirectUri = `${window.location.origin}/auth/callback/apple`;
    window.location.href = buildAppleUrl(redirectUri);
  };

  const baseBtn =
    "btn flex items-center justify-center gap-[10px] w-full py-[11px] px-5 rounded-md font-body text-sm font-medium leading-none cursor-pointer border-[1.5px] border-solid transition-[translate,box-shadow,background-color,border-color] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className={className}>
      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogle}
        className={`${baseBtn} oauth-google`}
        aria-label="Continue with Google"
      >
        <GoogleLogo />
        <span>Continue with Google</span>
      </button>

      {/* Apple button */}
      <button
        type="button"
        onClick={handleApple}
        className={`${baseBtn} oauth-apple`}
        aria-label="Continue with Apple"
      >
        <AppleLogo />
        <span>Continue with Apple</span>
      </button>
    </div>
  );
}

export type { OAuthButtonsProps as OAuthButtonProps };
