import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn, useUser } from "@clerk/tanstack-react-start";
import { ShieldCheck, Headphones, Activity, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { checkStaff } from "@/lib/tickets.functions";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/agent-login")({
  component: AgentLoginPage,
  head: () => ({ meta: [{ title: "Agent Portal · NovaHelp" }] }),
});

function AgentLoginPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) return;
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      setChecking(true);
      try {
        const r = await checkStaff({ data: { email } });
        if (r.isStaff) {
          navigate({ to: "/staff" });
        } else {
          setDenied(true);
        }
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [isLoaded, isSignedIn, user, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a]">
      {/* Dark grid background */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
              N
            </div>
            <span className="text-sm font-medium">NovaHelp</span>
          </Link>

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
              <Lock className="h-3 w-3" /> Restricted Access
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white">
              Agent Console
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/70">
              Secure portal for NovaHelp support agents and admins. Manage tickets,
              respond to customers, and monitor live queues.
            </p>

            <div className="mt-10 space-y-4">
              <Feature icon={<Headphones className="h-4 w-4" />} title="Live ticket queue" desc="Triage and respond in realtime." />
              <Feature icon={<Activity className="h-4 w-4" />} title="Customer context" desc="Full history at a glance." />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Role-based access" desc="Only verified agents allowed in." />
            </div>
          </div>

          <p className="text-[11px] text-white/50">© NovaHelp · Internal Use Only</p>
        </div>

        {/* Right auth panel */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#161b2e] p-8 shadow-2xl shadow-black/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Sign in to console</h2>
                <p className="mt-1 text-xs text-white/70">Agent credentials required.</p>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>

            {denied ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-center">
                <Lock className="mx-auto h-6 w-6 text-rose-400" />
                <p className="mt-3 text-sm font-medium text-white">Access denied</p>
                <p className="mt-1 text-xs text-white/70">
                  {user?.primaryEmailAddress?.emailAddress} isn't an authorized agent.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Return to NovaHelp →
                </Link>
              </div>
            ) : checking ? (
              <div className="py-12 text-center text-sm text-white/70">Verifying credentials…</div>
            ) : (
              <SignIn
                routing="hash"
                signUpUrl="/agent-login"
                forceRedirectUrl="/staff"
                appearance={{
                  variables: {
                    colorPrimary: "#10b981",
                    colorBackground: "#111827",
                    colorText: "#ffffff",
                    colorInputBackground: "rgba(255,255,255,1)",
                    colorInputText: "#111827",
                  },
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none border border-white/15 p-4 rounded-xl",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    footer: "hidden",
                    socialButtonsBlockButton: "bg-[#1a1f2e] border border-white/15 text-white hover:bg-[#252b3d]",
                    formFieldInput: "bg-[#1a1f2e] border border-white/15 text-white placeholder-white/50",
                    formButtonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold",
                    dividerLine: "bg-white/15",
                    dividerText: "text-white/60",
                  },
                }}
              />
            )}

            <div className="mt-6 border-t border-white/15 pt-4 text-center">
              <Link to="/" className="text-[11px] text-white/60 hover:text-white">
                Not an agent? Go to customer portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-white/60">{desc}</div>
      </div>
    </div>
  );
}
