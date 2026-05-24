import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · NovaHelp" }],
  }),
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to NovaHelp
        </Link>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-bold text-primary-foreground shadow-glow">
            N
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to NovaHelp</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to sync conversations and contact a representative.
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="hash"
            signUpUrl="/login"
            forceRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-soft border border-border bg-[var(--surface-1)]",
              },
            }}
          />
        </div>

        <div className="mt-6 text-center">
          <Link to="/agent-login" className="text-[11px] text-muted-foreground hover:text-foreground">
            Are you a support agent? <span className="underline">Sign in here →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
