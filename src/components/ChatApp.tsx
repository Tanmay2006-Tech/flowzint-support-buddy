import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  Zap,
  MessageSquare,
  Check,
  Headphones,
  ShieldCheck,
  Cpu,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  Msg,
  deriveTitle,
  loadAll,
  saveAll,
  uid,
} from "@/lib/chat-store";
import { DEFAULT_PERSONA, PERSONAS, personaById } from "@/lib/personas";
import { UserMenu } from "@/components/UserMenu";
import { exportConversationToPdf } from "@/lib/pdf-export";

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA.id);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ totalMessages: 0, avgLatency: 0, totalConvos: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const list = loadAll();
    setConversations(list);
    if (list.length) setActiveId(list[0].id);
  }, []);

  // Persist
  useEffect(() => {
    if (conversations.length || loadAll().length) saveAll(conversations);
    const totalMessages = conversations.reduce((a, c) => a + c.messages.length, 0);
    setStats((s) => ({ ...s, totalMessages, totalConvos: conversations.length }));
  }, [conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const persona = useMemo(
    () => personaById(active?.personaId ?? personaId),
    [active, personaId],
  );

  // Autoscroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages.length, isLoading]);

  const filteredConvos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, search]);

  function newConversation(pid?: string) {
    const pId = pid ?? personaId;
    const c: Conversation = {
      id: uid(),
      title: "New conversation",
      personaId: pId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setPersonaId(pId);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function updateActive(updater: (c: Conversation) => Conversation) {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? updater(c) : c)),
    );
  }

  function ensureActive(): Conversation {
    if (active) return active;
    const c: Conversation = {
      id: uid(),
      title: "New conversation",
      personaId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    return c;
  }

  async function send(text: string, opts?: { regenerate?: boolean }) {
    const content = text.trim();
    if ((!content && !opts?.regenerate) || isLoading) return;

    const convo = ensureActive();
    const p = personaById(convo.personaId);

    let nextMessages: Msg[];
    if (opts?.regenerate) {
      // drop last assistant if present
      const trimmed = [...convo.messages];
      while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
        trimmed.pop();
      }
      nextMessages = trimmed;
    } else {
      nextMessages = [
        ...convo.messages,
        { role: "user", content, ts: Date.now() },
      ];
    }

    const newTitle =
      convo.messages.length === 0 && !opts?.regenerate
        ? deriveTitle(content)
        : convo.title;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convo.id
          ? { ...c, messages: nextMessages, title: newTitle, updatedAt: Date.now() }
          : c,
      ),
    );
    setInput("");
    setIsLoading(true);
    const t0 = performance.now();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convo.id) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: assistantSoFar };
          } else {
            msgs.push({ role: "assistant", content: assistantSoFar, ts: Date.now() });
          }
          return { ...c, messages: msgs, updatedAt: Date.now() };
        }),
      );
    };

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          system: p.systemPrompt,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({}));
        toast.error(errJson.error || "Failed to reach the assistant");
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
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) upsert(delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      const dt = Math.round(performance.now() - t0);
      setStats((s) => ({
        ...s,
        avgLatency: s.avgLatency ? Math.round((s.avgLatency + dt) / 2) : dt,
      }));
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        console.error(e);
        toast.error("Connection error. Please try again.");
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function stop() {
    abortRef.current?.abort();
    setIsLoading(false);
  }

  const messages = active?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } shrink-0 overflow-hidden border-r border-border bg-[var(--sidebar)] transition-[width] duration-300 ease-out`}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aurora shadow-glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">FlowZint</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Support
              </div>
            </div>
          </div>

          {/* New chat */}
          <div className="px-3">
            <button
              onClick={() => newConversation()}
              className="group flex w-full items-center justify-between rounded-xl bg-gradient-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition hover:brightness-110"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> New conversation
              </span>
              <kbd className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px] font-mono">
                ⌘N
              </kbd>
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface-1)] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history"
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* History */}
          <div className="mt-4 flex-1 overflow-y-auto px-2">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
            </div>
            {filteredConvos.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filteredConvos.map((c) => {
                  const p = personaById(c.personaId);
                  const isActive = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setActiveId(c.id)}
                        className={`group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                          isActive
                            ? "bg-[var(--surface-2)]"
                            : "hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        <span className="mt-0.5 text-base leading-none">
                          {p.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {c.title}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {new Date(c.updatedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {c.messages.length} msgs
                          </span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(c.id);
                          }}
                          className="rounded p-1 opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Stats footer */}
          <div className="border-t border-border px-3 py-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Chats" value={stats.totalConvos} />
              <Stat label="Msgs" value={stats.totalMessages} />
              <Stat
                label="Latency"
                value={stats.avgLatency ? `${stats.avgLatency}ms` : "—"}
              />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-[var(--surface-1)] px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Online
              </span>
              <span className="text-[10px] text-muted-foreground">v1.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="z-10 flex items-center justify-between gap-3 border-b border-border px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-[var(--surface-1)] hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-base leading-none">{persona.emoji}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {active?.title ?? "New conversation"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {persona.name} · {persona.tagline}
                </div>
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <Pill icon={<ShieldCheck className="h-3 w-3" />}>End-to-end secure</Pill>
            <Pill icon={<Globe className="h-3 w-3" />}>24/7</Pill>
            <Pill icon={<Cpu className="h-3 w-3" />}>Gemini 3 Flash</Pill>
          </div>
        </header>

        {/* Scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyState
              personaId={persona.id}
              onPickPersona={(id) => {
                setPersonaId(id);
                if (active) {
                  updateActive((c) => ({ ...c, personaId: id }));
                }
              }}
              onStarter={(t) => send(t)}
            />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
              {messages.map((m, i) => (
                <Bubble
                  key={i}
                  msg={m}
                  isLast={i === messages.length - 1}
                  isStreaming={isLoading && i === messages.length - 1 && m.role === "assistant"}
                  onRegenerate={() => send("", { regenerate: true })}
                  onCopy={() => {
                    navigator.clipboard.writeText(m.content);
                    toast.success("Copied to clipboard");
                  }}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <TypingBubble />
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-[var(--surface-1)]/60 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2"
          >
            <div className="flex flex-1 items-end rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-2.5 shadow-soft transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
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
                placeholder={`Message ${persona.name.split(" — ")[0]}…`}
                className="max-h-44 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/20 text-destructive transition hover:bg-destructive/30"
                aria-label="Stop"
              >
                <StopCircle className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </form>
          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Press <kbd className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono">Enter</kbd> to send ·{" "}
              <kbd className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono">Shift+Enter</kbd> for newline
            </span>
            <span>FlowZint AI may produce inaccurate info. Verify critical actions.</span>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-1)] px-1.5 py-1.5">
      <div className="text-[13px] font-bold leading-none text-gradient">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-1)] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function EmptyState({
  personaId,
  onPickPersona,
  onStarter,
}: {
  personaId: string;
  onPickPersona: (id: string) => void;
  onStarter: (text: string) => void;
}) {
  const persona = personaById(personaId);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-10 sm:py-16">
      {/* Hero */}
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-[var(--surface-1)] px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          Built for FlowZint AI Hackathon 2026
        </div>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          The <span className="text-gradient">customer-support brain</span> for modern teams.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Four specialist agents, one conversation. Streaming answers, deep
          context memory, and human-handoff when it matters.
        </p>
      </div>

      {/* Persona picker */}
      <div className="mt-10 w-full">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Choose your specialist
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PERSONAS.map((p, i) => {
            const isActive = p.id === personaId;
            return (
              <button
                key={p.id}
                onClick={() => onPickPersona(p.id)}
                className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition animate-fade-up ${
                  isActive
                    ? "border-primary/60 bg-[var(--surface-2)] ring-glow"
                    : "border-border bg-[var(--surface-1)] hover:border-primary/40 hover:bg-[var(--surface-2)]"
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-aurora text-lg">
                  {p.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">
                      {p.name}
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        <Check className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.tagline}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Starters */}
      <div className="mt-8 w-full">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Try a prompt
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {persona.starters.map((s, i) => (
            <button
              key={s}
              onClick={() => onStarter(s)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-[var(--surface-1)] px-4 py-3 text-left text-sm transition hover:border-primary/50 hover:bg-[var(--surface-2)] animate-fade-up"
              style={{ animationDelay: `${i * 60 + 200}ms` }}
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
                <span className="text-foreground">{s}</span>
              </span>
              <Send className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Footer features */}
      <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <FeatureBlock
          icon={<Zap className="h-4 w-4" />}
          title="Token-streaming"
          desc="Replies appear as the model thinks — no spinners, no wait."
        />
        <FeatureBlock
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Safe by default"
          desc="Refuses to invent policies or pricing. Escalates gracefully."
        />
        <FeatureBlock
          icon={<Headphones className="h-4 w-4" />}
          title="Context memory"
          desc="Each conversation remembers the full thread, locally."
        />
      </div>
    </div>
  );
}

function FeatureBlock({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--surface-1)]/60 p-4 backdrop-blur">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function Bubble({
  msg,
  isLast,
  isStreaming,
  onRegenerate,
  onCopy,
}: {
  msg: Msg;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex items-start gap-3 animate-fade-up ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-[var(--surface-2)] text-foreground"
            : "bg-gradient-aurora text-white shadow-glow"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-md bg-gradient-primary text-primary-foreground shadow-elegant"
              : "rounded-tl-md bg-[var(--surface-2)] text-foreground border border-border"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="markdown">
              <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
              {isStreaming && (
                <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary animate-blink" />
              )}
            </div>
          )}
        </div>
        {!isUser && !isStreaming && msg.content && (
          <div className="mt-1.5 flex items-center gap-1 px-1">
            <IconButton onClick={onCopy} label="Copy">
              <Copy className="h-3 w-3" />
            </IconButton>
            {isLast && (
              <IconButton onClick={onRegenerate} label="Regenerate">
                <RefreshCw className="h-3 w-3" />
              </IconButton>
            )}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {new Date(msg.ts).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3 animate-fade-up">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-aurora text-white shadow-glow">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-[var(--surface-2)] px-4 py-3.5">
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-primary/70"
      style={{ animationDelay: delay }}
    />
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-[var(--surface-2)] hover:text-foreground"
    >
      {children}
    </button>
  );
}
