import { LoginFormWrapper } from "./LoginFormWrapper";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-primary">Vadem</h1>
          <p className="font-body text-sm text-text-secondary mt-2">
            Welcome back. Sign in to your account.
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-bg-raised rounded-2xl p-8"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <LoginFormWrapper />

          {/* Forgot password */}
          <div className="text-center mt-5">
            <a
              href="/forgot-password"
              className="font-body text-sm text-text-secondary hover:text-primary transition-colors duration-150"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-6 font-body text-sm text-text-secondary">
          {"Don't have an account? "}
          <a
            href="/signup"
            className="text-primary font-semibold hover:text-primary-hover transition-colors duration-150"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
