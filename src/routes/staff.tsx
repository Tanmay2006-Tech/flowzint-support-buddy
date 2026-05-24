import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useUser, UserButton } from "@clerk/tanstack-react-start";
import {
  Loader2,
  RefreshCw,
  Inbox,
  ShieldCheck,
  UserCheck,
  Search,
  CircleDot,
  CheckCircle2,
  Clock,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { checkStaff, claimFirstStaffSeat, listTickets, updateTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Agent Console · NovaHelp" }] }),
});

type Ticket = {
  id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  message: string;
  status: "open" | "assigned" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_email: string | null;
  created_at: string;
};

function StaffPage() {
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: "/agent-login" });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d14]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }
  return <StaffInner />;
}

function StaffInner() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "assigned" | "closed">("open");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reply, setReply] = useState("");

  const refresh = async () => {
    if (!email) return;
    try {
      const check = await checkStaff({ data: { email } });
      setIsStaff(check.isStaff);
      if (check.isStaff) {
        const res = await listTickets({ data: { email } });
        setTickets(res.tickets as Ticket[]);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) refresh();
  }, [email]);

  const claim = async () => {
    setClaiming(true);
    try {
      await claimFirstStaffSeat({ data: { email } });
      toast.success("You're now a NovaHelp agent.");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  const filtered = useMemo(() => {
    let list = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.requester_name.toLowerCase().includes(q) ||
          t.requester_email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tickets, filter, search]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? filtered[0] ?? null,
    [tickets, selectedId, filtered],
  );

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    all: tickets.length,
  };

  const handleUpdate = async (id: string, patch: { status?: Ticket["status"]; assign?: boolean }) => {
    try {
      await updateTicket({ data: { email, ticketId: id, ...patch } });
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const sendReply = (t: Ticket) => {
    if (!reply.trim()) return;
    window.location.href = `mailto:${t.requester_email}?subject=${encodeURIComponent("Re: " + t.subject)}&body=${encodeURIComponent(reply)}`;
    setReply("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d14]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d14] px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Inbox className="mx-auto h-10 w-10 text-white/40" />
          <h1 className="mt-4 text-lg font-semibold text-white">No agent access</h1>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/60">
            Your account ({email}) isn't on the agent list. Claim the first seat if this is a fresh install.
          </p>
          <button
            onClick={claim}
            disabled={claiming}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
            <UserCheck className="h-4 w-4" /> Claim agent seat
          </button>
          <Link to="/" className="mt-6 block text-xs text-white/40 hover:text-white">
            ← Back to NovaHelp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0d14] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0d1119] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-black">
              N
            </div>
            <span className="text-sm font-semibold">NovaHelp</span>
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              Agent
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Online
          </div>
          <button
            onClick={refresh}
            className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <UserButton />
        </div>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — ticket list */}
        <aside className="flex w-[340px] flex-col border-r border-white/10 bg-[#0d1119]">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-md border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex gap-1">
              {(["open", "assigned", "closed", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
                    filter === f
                      ? "bg-emerald-500 text-black"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {f} <span className="opacity-60">{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">
                <Inbox className="mx-auto mb-2 h-6 w-6" /> No conversations
              </div>
            ) : (
              <ul>
                {filtered.map((t) => {
                  const active = selected?.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full border-b border-white/5 px-3 py-3 text-left transition ${
                          active ? "bg-emerald-500/10" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={t.requester_name} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-semibold text-white">
                                {t.requester_name}
                              </p>
                              <span className="shrink-0 text-[10px] text-white/40">
                                {timeAgo(t.created_at)}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-white/60">{t.subject}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <PriorityDot priority={t.priority} />
                              <StatusChip status={t.status} />
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Conversation pane */}
        <main className="flex flex-1 flex-col bg-[#0a0d14]">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-white/40">
              Select a conversation
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0d1119] px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={selected.requester_name} size="lg" />
                  <div>
                    <div className="text-sm font-semibold">{selected.requester_name}</div>
                    <div className="text-[11px] text-white/50">{selected.requester_email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === "open" && (
                    <button
                      onClick={() => handleUpdate(selected.id, { assign: true })}
                      className="rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-400"
                    >
                      Assign to me
                    </button>
                  )}
                  {selected.status !== "closed" ? (
                    <button
                      onClick={() => handleUpdate(selected.id, { status: "closed" })}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <CheckCircle2 className="mr-1 inline h-3 w-3" /> Close
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdate(selected.id, { status: "open" })}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      Re-open
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-white/30">
                    <span className="h-px flex-1 bg-white/10" />
                    {new Date(selected.created_at).toLocaleString()}
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="flex gap-3">
                    <Avatar name={selected.requester_name} />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold">{selected.requester_name}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(selected.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-1 text-xs font-semibold text-white/90">{selected.subject}</div>
                        <p className="whitespace-pre-wrap text-sm text-white/80">{selected.message}</p>
                      </div>
                    </div>
                  </div>

                  {selected.assigned_email && (
                    <div className="flex items-center justify-center text-[11px] text-white/40">
                      <UserCheck className="mr-1 h-3 w-3" /> Assigned to {selected.assigned_email}
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="border-t border-white/10 bg-[#0d1119] p-4">
                <div className="mx-auto max-w-3xl">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-emerald-500/50">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={`Reply to ${selected.requester_name}…`}
                      rows={3}
                      className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <div className="flex items-center justify-between border-t border-white/5 px-3 py-2">
                      <span className="text-[10px] text-white/40">
                        Sends via your email client
                      </span>
                      <button
                        onClick={() => sendReply(selected)}
                        disabled={!reply.trim()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                      >
                        <Send className="h-3 w-3" /> Send reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right context panel */}
        {selected && (
          <aside className="hidden w-[280px] flex-col border-l border-white/10 bg-[#0d1119] p-5 xl:flex">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Customer
            </div>
            <div className="mt-3 flex flex-col items-center text-center">
              <Avatar name={selected.requester_name} size="xl" />
              <div className="mt-3 text-sm font-semibold">{selected.requester_name}</div>
              <a
                href={`mailto:${selected.requester_email}`}
                className="mt-0.5 flex items-center gap-1 text-[11px] text-white/50 hover:text-emerald-400"
              >
                <Mail className="h-3 w-3" /> {selected.requester_email}
              </a>
            </div>

            <div className="mt-6 space-y-3 text-xs">
              <Row label="Status" value={<StatusChip status={selected.status} />} />
              <Row label="Priority" value={<PriorityChip priority={selected.priority} />} />
              <Row
                label="Created"
                value={<span className="text-white/70">{new Date(selected.created_at).toLocaleDateString()}</span>}
              />
              <Row
                label="Assignee"
                value={
                  <span className="text-white/70">
                    {selected.assigned_email ?? "Unassigned"}
                  </span>
                }
              />
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Quick actions
            </div>
            <div className="mt-3 space-y-1.5">
              <QuickAction icon={<Clock className="h-3 w-3" />} label="Snooze 1h" />
              <QuickAction icon={<CircleDot className="h-3 w-3" />} label="Mark as priority" onClick={() => toast("Set priority from filters")} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---------- bits ---------- */

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" | "xl" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = size === "xl" ? "h-14 w-14 text-base" : size === "lg" ? "h-9 w-9 text-xs" : "h-8 w-8 text-[10px]";
  const hue = Math.abs(hash(name)) % 360;
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 40%), hsl(${(hue + 40) % 360} 60% 30%))` }}
    >
      {initials || "?"}
    </div>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function PriorityDot({ priority }: { priority: Ticket["priority"] }) {
  const color = { low: "bg-white/30", normal: "bg-blue-400", high: "bg-amber-400", urgent: "bg-rose-500" }[priority];
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}

function StatusChip({ status }: { status: Ticket["status"] }) {
  const map = {
    open: "bg-emerald-500/15 text-emerald-400",
    assigned: "bg-blue-500/15 text-blue-400",
    closed: "bg-white/10 text-white/50",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}

function PriorityChip({ priority }: { priority: Ticket["priority"] }) {
  const map = {
    low: "bg-white/10 text-white/60",
    normal: "bg-blue-500/15 text-blue-400",
    high: "bg-amber-500/15 text-amber-400",
    urgent: "bg-rose-500/15 text-rose-400",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${map[priority]}`}>
      {priority}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      {value}
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-white/70 hover:bg-white/5 hover:text-white"
    >
      {icon} {label}
    </button>
  );
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
