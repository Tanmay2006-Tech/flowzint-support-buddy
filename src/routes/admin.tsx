import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import {
  Loader2, Shield, Users, Inbox, CheckCircle2, Clock, Trash2,
  UserPlus, ArrowUpRight, ArrowDownRight, Headphones, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import {
  checkStaff, getAdminStats, listStaff, addStaff,
  updateStaffRole, removeStaff, listTickets, deleteTicket,
} from "@/lib/tickets.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Dashboard · NovaHelp" }] }),
});

type StaffRow = { id: string; email: string; role: "agent" | "admin"; created_at: string };
type Ticket = {
  id: string; requester_name: string; requester_email: string;
  subject: string; status: string; priority: string;
  assigned_email: string | null; created_at: string;
};
type Stats = {
  totalTickets: number; openTickets: number; assignedTickets: number;
  closedTickets: number; staffCount: number;
};

function AdminPage() {
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: "/agent-login" });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  return <AdminInner />;
}

function AdminInner() {
  const { user } = useUser();
  const navigate = useNavigate();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"overview" | "staff" | "tickets">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!email) return;
    try {
      const check = await checkStaff({ data: { email } });
      if (!check.isAdmin) {
        setAuthorized(false);
        if (check.isStaff) navigate({ to: "/staff" });
        return;
      }
      setAuthorized(true);
      const [s, st, t] = await Promise.all([
        getAdminStats({ data: { email } }),
        listStaff({ data: { email } }),
        listTickets({ data: { email } }),
      ]);
      setStats(s);
      setStaff(st.staff as StaffRow[]);
      setTickets(t.tickets as Ticket[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [email, navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account doesn't have admin privileges. Contact an existing admin to be promoted.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/staff" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Agent Console</Link>
            <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">N</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">NovaHelp</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  <Shield className="h-2.5 w-2.5" /> Admin
                </span>
              </div>
              <div className="text-xs text-slate-500">Administration console</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/staff" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Headphones className="h-3.5 w-3.5" /> Agent View
            </Link>
            <UserButton />
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-7xl gap-1 px-4">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "staff", label: "Team", icon: Users },
            { id: "tickets", label: "All Tickets", icon: Inbox },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === "overview" && stats && <Overview stats={stats} tickets={tickets} />}
        {tab === "staff" && <StaffPanel email={email} staff={staff} onChange={refresh} />}
        {tab === "tickets" && <TicketsPanel email={email} tickets={tickets} onChange={refresh} />}
      </main>
    </div>
  );
}

function Overview({ stats, tickets }: { stats: Stats; tickets: Ticket[] }) {
  const cards = [
    { label: "Total tickets", value: stats.totalTickets, icon: Inbox, accent: "bg-indigo-50 text-indigo-600" },
    { label: "Open", value: stats.openTickets, icon: ArrowUpRight, accent: "bg-amber-50 text-amber-600" },
    { label: "Assigned", value: stats.assignedTickets, icon: Clock, accent: "bg-blue-50 text-blue-600" },
    { label: "Closed", value: stats.closedTickets, icon: CheckCircle2, accent: "bg-emerald-50 text-emerald-600" },
    { label: "Team members", value: stats.staffCount, icon: Users, accent: "bg-purple-50 text-purple-600" },
  ];
  const recent = tickets.slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.accent}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent tickets</h2>
          <Link to="/staff" className="text-xs font-medium text-indigo-600 hover:underline">Open agent view →</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length === 0 && <div className="px-5 py-8 text-center text-sm text-slate-500">No tickets yet.</div>}
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <div className="font-medium text-slate-900">{t.subject}</div>
                <div className="text-xs text-slate-500">{t.requester_name} · {t.requester_email}</div>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-amber-50 text-amber-700 ring-amber-200",
    assigned: "bg-blue-50 text-blue-700 ring-blue-200",
    closed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${map[status] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}>
      {status}
    </span>
  );
}

function StaffPanel({ email, staff, onChange }: { email: string; staff: StaffRow[]; onChange: () => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setBusy(true);
    try {
      await addStaff({ data: { email, newEmail, role } });
      toast.success("Team member added");
      setNewEmail(""); setRole("agent"); onChange();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  const toggleRole = async (s: StaffRow) => {
    try {
      await updateStaffRole({ data: { email, staffId: s.id, role: s.role === "admin" ? "agent" : "admin" } });
      toast.success(`Updated ${s.email}`);
      onChange();
    } catch (err) { toast.error((err as Error).message); }
  };

  const remove = async (s: StaffRow) => {
    if (!confirm(`Remove ${s.email} from the team?`)) return;
    try {
      await removeStaff({ data: { email, staffId: s.id } });
      toast.success("Removed");
      onChange();
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserPlus className="h-4 w-4 text-indigo-600" /> Invite team member
        </h2>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="agent@company.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as "agent" | "admin")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit" disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">Team ({staff.length})</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-2.5 text-left">Email</th>
              <th className="px-5 py-2.5 text-left">Role</th>
              <th className="px-5 py-2.5 text-left">Joined</th>
              <th className="px-5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium text-slate-900">{s.email}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                    s.role === "admin"
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => toggleRole(s)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {s.role === "admin" ? <><ArrowDownRight className="h-3 w-3" /> Make agent</> : <><ArrowUpRight className="h-3 w-3" /> Make admin</>}
                    </button>
                    <button onClick={() => remove(s)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketsPanel({ email, tickets, onChange }: { email: string; tickets: Ticket[]; onChange: () => void }) {
  const del = async (id: string) => {
    if (!confirm("Permanently delete this ticket?")) return;
    try {
      await deleteTicket({ data: { email, ticketId: id } });
      toast.success("Ticket deleted");
      onChange();
    } catch (err) { toast.error((err as Error).message); }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
        All tickets ({tickets.length})
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-2.5 text-left">Subject</th>
            <th className="px-5 py-2.5 text-left">Requester</th>
            <th className="px-5 py-2.5 text-left">Status</th>
            <th className="px-5 py-2.5 text-left">Priority</th>
            <th className="px-5 py-2.5 text-left">Assigned</th>
            <th className="px-5 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.length === 0 && (
            <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No tickets yet.</td></tr>
          )}
          {tickets.map((t) => (
            <tr key={t.id}>
              <td className="px-5 py-3 font-medium text-slate-900">{t.subject}</td>
              <td className="px-5 py-3 text-slate-600">{t.requester_name}<div className="text-xs text-slate-400">{t.requester_email}</div></td>
              <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
              <td className="px-5 py-3 text-slate-600">{t.priority}</td>
              <td className="px-5 py-3 text-slate-600">{t.assigned_email ?? "—"}</td>
              <td className="px-5 py-3 text-right">
                <button onClick={() => del(t.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
