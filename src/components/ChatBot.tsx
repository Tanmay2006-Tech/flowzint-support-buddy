import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I reset my password?",
  "My order hasn't arrived yet",
  "How can I upgrade my plan?",
  "I need to contact a human agent",
];

export function ChatBot() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || isLoading) return;

    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({}));
        toast.error(errJson.error || "Failed to reach support assistant");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as
              | string
              | undefined;
            if (delta) upsert(delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col rounded-2xl border border-border bg-card/60 shadow-elegant backdrop-blur">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Bot className="h-5 w-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            FlowZint Support Assistant
          </h2>
          <p className="text-xs text-muted-foreground">
            Online · Replies instantly
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3 w-3" /> AI
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              Hi! How can I help today?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask me anything about your account, orders, billing, or our
              product. I'm here 24/7.
            </p>
            <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-border bg-background/60 px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/50 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/40 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="flex flex-1 items-end rounded-2xl border border-border bg-background px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Type your message..."
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{
                height: "auto",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Powered by FlowZint AI · Submission for FlowZint AI Hackathon 2026
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-primary text-primary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-secondary text-secondary-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 prose-pre:my-2">
            <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/70"
      style={{ animationDelay: delay }}
    />
  );
}
