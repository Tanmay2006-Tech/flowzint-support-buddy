import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { DemoCredentials } from "@/components/DemoCredentials";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · NovaHelp" }],
  }),
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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

        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === "signin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === "signup"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        <div className="flex justify-center">
          {mode === "signin" ? (
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
          ) : (
            <SignUp
              routing="hash"
              signInUrl="/login"
              forceRedirectUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-soft border border-border bg-[var(--surface-1)]",
                },
              }}
            />
          )}
        </div>

        <div className="mt-6">
          <DemoCredentials roles={["user"]} theme="light" />
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
