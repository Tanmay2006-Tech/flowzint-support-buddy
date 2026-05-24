import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { ArrowLeft, Loader2, RefreshCw, Inbox, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { checkStaff, claimFirstStaffSeat, listTickets, updateTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Agent inbox · NovaHelp" }] }),
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
  return (
    <div className="min-h-screen bg-background">
      {!isLoaded ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isSignedIn ? (
        <StaffInner />
      ) : (
        <NotSignedIn />
      )}
    </div>
  );
}

function NotSignedIn() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <ShieldCheck className="h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Agent area</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Sign in to access the agent inbox and respond to customer requests.
      </p>
      <Link
        to="/login"
        className="mt-5 rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant"
      >
        Sign in
      </Link>
    </div>
  );
}

function StaffInner() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "assigned" | "closed">("open");
  const [claiming, setClaiming] = useState(false);

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
    if (!email) return;
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">No agent access</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Your account ({email}) isn't on the agent list yet. If you're setting up NovaHelp
          for the first time, claim the first agent seat below.
        </p>
        <button
          onClick={claim}
          disabled={claiming}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant disabled:opacity-50"
        >
          {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
          <UserCheck className="h-4 w-4" /> Claim agent seat
        </button>
        <div className="mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to NovaHelp
          </Link>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  const handleUpdate = async (
    id: string,
    patch: { status?: Ticket["status"]; assign?: boolean },
  ) => {
    try {
      await updateTicket({ data: { email, ticketId: id, ...patch } });
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Agent inbox</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{email}</span>
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-1)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["open", "assigned", "closed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"
            }`}
          >
            {f}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-[var(--surface-1)] p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nothing here. Inbox zero!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-border bg-[var(--surface-1)] p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{t.subject}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    From {t.requester_name} · {t.requester_email}
                    {t.assigned_email && ` · Assigned to ${t.assigned_email}`}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                    {t.message}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {t.status === "open" && (
                    <button
                      onClick={() => handleUpdate(t.id, { assign: true })}
                      className="rounded-lg bg-gradient-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
                    >
                      Assign to me
                    </button>
                  )}
                  {t.status !== "closed" && (
                    <button
                      onClick={() => handleUpdate(t.id, { status: "closed" })}
                      className="rounded-lg border border-border bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      Close
                    </button>
                  )}
                  {t.status === "closed" && (
                    <button
                      onClick={() => handleUpdate(t.id, { status: "open" })}
                      className="rounded-lg border border-border bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      Re-open
                    </button>
                  )}
                  <a
                    href={`mailto:${t.requester_email}?subject=Re:%20${encodeURIComponent(t.subject)}`}
                    className="rounded-lg border border-border bg-[var(--surface-2)] px-3 py-1.5 text-center text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    Reply via email
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  const map: Record<Ticket["priority"], string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-blue-500/15 text-blue-400",
    high: "bg-amber-500/15 text-amber-400",
    urgent: "bg-rose-500/15 text-rose-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[priority]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const map: Record<Ticket["status"], string> = {
    open: "bg-emerald-500/15 text-emerald-400",
    assigned: "bg-indigo-500/15 text-indigo-400",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}
