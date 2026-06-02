import Groq from "groq-sdk";

const FALLBACK_SYSTEM = `You are NovaHelp — a friendly, knowledgeable customer support representative. Be concise, format answers with markdown, ask one clarifying question if needed, and never invent prices, policies, or personal data.`;

export async function handleChat(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { messages, system } = (await request.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      system?: string;
    };

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return json({ error: "GROQ_API_KEY is not configured in .env" }, 500);
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const responseStream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system || FALLBACK_SYSTEM },
        ...messages,
      ],
      stream: true,
      temperature: 0.6,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
              controller.enqueue(encoder.encode(ssePayload));
            }
          }
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
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("chat route error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
