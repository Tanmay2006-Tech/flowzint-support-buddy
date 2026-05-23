import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ChatApp } from "@/components/ChatApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FlowZint Support — Modern customer support, reimagined" },
      {
        name: "description",
        content:
          "A minimal customer support workspace with specialist agents, streaming replies, and one-click PDF export.",
      },
      { property: "og:title", content: "FlowZint Support" },
      {
        property: "og:description",
        content:
          "Specialist agents, instant streaming, and persistent conversation history.",
      },
    ],
  }),
});

function Index() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <ChatApp />
    </>
  );
}
