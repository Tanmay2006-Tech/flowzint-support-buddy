import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_SYSTEM = `You are NovaHelp — a friendly, knowledgeable customer support representative. Be concise, format answers with markdown, ask one clarifying question if needed, and never invent prices, policies, or personal data.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, system } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
            system?: string;
          };

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: system || FALLBACK_SYSTEM },
                  ...messages,
                ],
                stream: true,
              }),
            },
          );

          if (!response.ok) {
            if (response.status === 429) {
              return new Response(
                JSON.stringify({
                  error: "Rate limit reached. Please wait a moment and try again.",
                }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (response.status === 402) {
              return new Response(
                JSON.stringify({
                  error: "AI credits exhausted. Please top up your Lovable Cloud workspace.",
                }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const text = await response.text();
            console.error("AI gateway error:", response.status, text);
            return new Response(
              JSON.stringify({ error: "AI gateway error" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (err) {
          console.error("chat route error:", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
