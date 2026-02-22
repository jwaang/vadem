import { NextRequest, NextResponse } from "next/server";

function buildRedirectUrl(request: NextRequest, params: URLSearchParams): string {
  // x-forwarded-* headers can contain comma-separated values from multiple
  // proxies. Take only the first (leftmost = original client-facing) value.
  const rawHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const rawProto = request.headers.get("x-forwarded-proto");

  const host = rawHost?.split(",")[0]?.trim();
  const proto = rawProto?.split(",")[0]?.trim() || "https";

  const origin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const qs = params.toString();
  return `${origin}/auth/callback/apple/complete${qs ? `?${qs}` : ""}`;
}

// Apple Sign In uses response_mode=form_post — it POSTs code/state to this route.
// We convert the POST into a GET redirect to the /complete page, which the
// existing client-side CallbackHandler can process via useSearchParams().
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const code = body.get("code") as string | null;
  const state = body.get("state") as string | null;
  const error = body.get("error") as string | null;

  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (code) params.set("code", code);
  if (state) params.set("state", state);

  return NextResponse.redirect(buildRedirectUrl(request, params), {
    status: 302,
  });
}

// Apple may redirect here with GET on error, or a user may land here directly.
// Redirect to login with an error message instead of returning 405.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  const params = new URLSearchParams();
  params.set("error", error ?? "apple_auth_failed");

  return NextResponse.redirect(buildRedirectUrl(request, params), {
    status: 302,
  });
}
