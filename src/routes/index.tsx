import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ChatApp } from "@/components/ChatApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FlowZint AI — Intelligent Customer Support, Reimagined" },
      {
        name: "description",
        content:
          "Premium AI-powered support suite with specialist agents, streaming replies, and human-handoff. Built for the FlowZint AI Hackathon 2026.",
      },
      { property: "og:title", content: "FlowZint AI Support Suite" },
      {
        property: "og:description",
        content:
          "Four specialist AI agents, one conversation. Streaming, context-aware, and SaaS-grade.",
      },
    ],
  }),
});

function Index() {
  return (
    <>
      <Toaster position="top-center" richColors theme="dark" />
      <ChatApp />
    </>
  );
}
