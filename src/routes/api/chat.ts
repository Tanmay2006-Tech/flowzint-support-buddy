import { createFileRoute } from "@tanstack/react-router";
import Groq from "groq-sdk";

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

          const GROQ_API_KEY = process.env.GROQ_API_KEY;
          if (!GROQ_API_KEY) {
            return new Response(
              JSON.stringify({ error: "GROQ_API_KEY is not configured in .env" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Initialize Groq client
          const groq = new Groq({ apiKey: GROQ_API_KEY });

          // Call Groq's high-speed Llama 3 model
          const responseStream = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", 
            messages: [
              { role: "system", content: system || FALLBACK_SYSTEM },
              ...messages,
            ],
            stream: true,
            temperature: 0.6,
          });

          // Transform Groq's chunk stream into standard SSE for your ChatApp.tsx
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of responseStream) {
                  const content = chunk.choices[0]?.delta?.content || "";
                  if (content) {
                    // Format data exactly how the frontend expects it
                    const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
                    controller.enqueue(encoder.encode(ssePayload));
                  }
                }
                // Signal the end of the stream
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } catch (error) {
                controller.error(error);
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: { 
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            },
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