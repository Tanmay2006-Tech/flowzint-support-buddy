// Lightweight client-side conversation persistence (localStorage)
export type Role = "user" | "assistant";
export type Msg = { role: Role; content: string; ts: number };
export type Conversation = {
  id: string;
  title: string;
  personaId: string;
  messages: Msg[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
};

const KEY = "novahelp.conversations.v1";

export function loadAll(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveAll(list: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function deriveTitle(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? t.slice(0, 42) + "…" : t || "New conversation";
}

export function conversationToMarkdown(c: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${c.title}`);
  lines.push("");
  lines.push(`_Exported ${new Date().toLocaleString()} · ${c.messages.length} messages_`);
  lines.push("");
  lines.push("---");
  lines.push("");
  for (const m of c.messages) {
    const who = m.role === "user" ? "**You**" : "**Reply**";
    const when = new Date(m.ts).toLocaleString();
    lines.push(`### ${who} · ${when}`);
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
