import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are FlowZint Support — a friendly, knowledgeable AI customer-support assistant.

Your job:
- Answer customer questions accurately and warmly.
- Help users troubleshoot product issues with clear step-by-step guidance.
- When you don't know something, say so and offer to escalate to a human agent.
- Use a calm, professional, empathetic tone. Keep responses concise and well-formatted with markdown (lists, bold, short paragraphs).
- Ask one clarifying question when the user's request is ambiguous.
- Never invent policies, prices, or personal data. Stick to general best-practice support guidance.

Always end longer answers with: "Is there anything else I can help you with?"`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
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
                  { role: "system", content: SYSTEM_PROMPT },
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
                  error: "Rate limit reached. Please try again in a moment.",
                }),
                {
                  status: 429,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
            if (response.status === 402) {
              return new Response(
                JSON.stringify({
                  error:
                    "AI credits exhausted. Please add credits in Lovable Cloud.",
                }),
                {
                  status: 402,
                  headers: { "Content-Type": "application/json" },
                },
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
