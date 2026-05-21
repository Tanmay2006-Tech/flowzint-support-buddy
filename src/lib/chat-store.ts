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
};

const KEY = "flowzint.conversations.v1";

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
