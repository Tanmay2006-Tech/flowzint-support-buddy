import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ChatBot } from "@/components/ChatBot";
import { Headphones, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FlowZint Support AI — 24/7 Customer Support Chatbot" },
      {
        name: "description",
        content:
          "An AI-powered customer support chatbot built for the FlowZint AI Hackathon 2026. Instant, empathetic, and intelligent help — anytime.",
      },
      { property: "og:title", content: "FlowZint Support AI" },
      {
        property: "og:description",
        content:
          "AI-powered 24/7 customer support chatbot — FlowZint AI Hackathon 2026 submission.",
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      <Toaster position="top-center" richColors />
      <header className="border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Headphones className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                FlowZint Support AI
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Hackathon 2026 · Support Chat Bot
              </p>
            </div>
          </div>
          <a
            href="https://flowzint.in/2026/ai/hackothon"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-accent sm:inline-block"
          >
            View Hackathon
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <aside className="hidden lg:flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-elegant backdrop-blur">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Zap className="h-3 w-3" /> AI-Powered
            </span>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground">
              Smarter customer support, around the clock.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An intelligent assistant that understands intent, resolves issues
              instantly, and escalates gracefully when humans are needed.
            </p>
          </div>

          <Feature
            icon={<Zap className="h-4 w-4" />}
            title="Instant streaming replies"
            desc="Token-by-token responses so users never wait."
          />
          <Feature
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Safe & on-brand"
            desc="Refuses to invent prices or policies — escalates to humans when unsure."
          />
          <Feature
            icon={<Headphones className="h-4 w-4" />}
            title="24/7 availability"
            desc="Always-on support across timezones and channels."
          />

          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Try asking:</strong> billing
            questions, order tracking, password resets, plan upgrades, or
            "connect me to a human."
          </div>
        </aside>

        <section>
          <ChatBot />
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4 backdrop-blur">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
