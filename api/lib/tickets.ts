import { z } from "zod";
import { supabaseAdmin } from "./supabase-admin";

const CreateSchema = z.object({
  requesterId: z.string().max(120).optional().nullable(),
  requesterName: z.string().min(1).max(120),
  requesterEmail: z.string().email().max(200),
  subject: z.string().min(3).max(160),
  message: z.string().min(5).max(4000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

const StaffCheckSchema = z.object({ email: z.string().email() });
const ListSchema = z.object({ email: z.string().email() });
const UpdateSchema = z.object({
  email: z.string().email(),
  ticketId: z.string().uuid(),
  status: z.enum(["open", "assigned", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assign: z.boolean().optional(),
});
const JoinStaffSchema = z.object({ email: z.string().email() });
const AdminEmailSchema = z.object({ email: z.string().email() });
const AddStaffSchema = z.object({
  email: z.string().email(),
  newEmail: z.string().email().max(200),
  role: z.enum(["agent", "admin"]).default("agent"),
});
const UpdateStaffSchema = z.object({
  email: z.string().email(),
  staffId: z.string().uuid(),
  role: z.enum(["agent", "admin"]),
});
const RemoveStaffSchema = z.object({
  email: z.string().email(),
  staffId: z.string().uuid(),
});
const DeleteTicketSchema = z.object({
  email: z.string().email(),
  ticketId: z.string().uuid(),
});

async function requireStaff(email: string) {
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, email, role")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!staff) throw new Error("Forbidden");
  return staff as { id: string; email: string; role: "agent" | "admin" };
}

async function requireAdmin(email: string) {
  const s = await requireStaff(email);
  if (s.role !== "admin") throw new Error("Admin access required");
  return s;
}

const handlers: Record<string, (data: unknown) => Promise<unknown>> = {
  createTicket: async (data) => {
    const parsed = CreateSchema.parse(data);
    const { error, data: row } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        requester_id: parsed.requesterId ?? null,
        requester_name: parsed.requesterName,
        requester_email: parsed.requesterEmail,
        subject: parsed.subject,
        message: parsed.message,
        priority: parsed.priority,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, createdAt: row.created_at as string };
  },

  checkStaff: async (data) => {
    const parsed = StaffCheckSchema.parse(data);
    const { data: row } = await supabaseAdmin
      .from("staff")
      .select("id, role")
      .eq("email", parsed.email.toLowerCase())
      .maybeSingle();
    const role = (row?.role as "agent" | "admin" | undefined) ?? null;
    return { isStaff: !!row, role, isAdmin: role === "admin" };
  },

  listTickets: async (data) => {
    const parsed = ListSchema.parse(data);
    await requireStaff(parsed.email);
    const { data: rows, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { tickets: rows ?? [] };
  },

  updateTicket: async (data) => {
    const parsed = UpdateSchema.parse(data);
    await requireStaff(parsed.email);
    const patch: {
      status?: "open" | "assigned" | "closed";
      priority?: "low" | "normal" | "high" | "urgent";
      assigned_email?: string | null;
    } = {};
    if (parsed.status) patch.status = parsed.status;
    if (parsed.priority) patch.priority = parsed.priority;
    if (parsed.assign) {
      patch.assigned_email = parsed.email.toLowerCase();
      patch.status = "assigned";
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update(patch)
      .eq("id", parsed.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  claimFirstStaffSeat: async (data) => {
    const parsed = JoinStaffSchema.parse(data);
    const { count } = await supabaseAdmin
      .from("staff")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      const { data: existing } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("email", parsed.email.toLowerCase())
        .maybeSingle();
      if (existing) return { ok: true, alreadyStaff: true };
      throw new Error("Staff list is closed. Ask an admin to add you.");
    }
    const { error } = await supabaseAdmin
      .from("staff")
      .insert({ email: parsed.email.toLowerCase(), role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyStaff: false, role: "admin" as const };
  },

  listStaff: async (data) => {
    const parsed = AdminEmailSchema.parse(data);
    await requireAdmin(parsed.email);
    const { data: rows, error } = await supabaseAdmin
      .from("staff")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { staff: rows ?? [] };
  },

  addStaff: async (data) => {
    const parsed = AddStaffSchema.parse(data);
    await requireAdmin(parsed.email);
    const { error } = await supabaseAdmin
      .from("staff")
      .insert({ email: parsed.newEmail.toLowerCase(), role: parsed.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  updateStaffRole: async (data) => {
    const parsed = UpdateStaffSchema.parse(data);
    const admin = await requireAdmin(parsed.email);
    if (parsed.role !== "admin") {
      const { data: target } = await supabaseAdmin
        .from("staff")
        .select("id, email, role")
        .eq("id", parsed.staffId)
        .maybeSingle();
      if (target?.email === admin.email) {
        const { count } = await supabaseAdmin
          .from("staff")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) throw new Error("Cannot demote the only remaining admin.");
      }
    }
    const { error } = await supabaseAdmin
      .from("staff")
      .update({ role: parsed.role })
      .eq("id", parsed.staffId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  removeStaff: async (data) => {
    const parsed = RemoveStaffSchema.parse(data);
    const admin = await requireAdmin(parsed.email);
    const { data: target } = await supabaseAdmin
      .from("staff")
      .select("id, email, role")
      .eq("id", parsed.staffId)
      .maybeSingle();
    if (!target) return { ok: true };
    if (target.email === admin.email) throw new Error("You cannot remove yourself.");
    const { error } = await supabaseAdmin.from("staff").delete().eq("id", parsed.staffId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  deleteTicket: async (data) => {
    const parsed = DeleteTicketSchema.parse(data);
    await requireAdmin(parsed.email);
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .delete()
      .eq("id", parsed.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getAdminStats: async (data) => {
    const parsed = AdminEmailSchema.parse(data);
    await requireAdmin(parsed.email);
    const [
      { count: total },
      { count: open },
      { count: assigned },
      { count: closed },
      { count: staffCount },
    ] = await Promise.all([
      supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
      supabaseAdmin
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "assigned"),
      supabaseAdmin
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "closed"),
      supabaseAdmin.from("staff").select("*", { count: "exact", head: true }),
    ]);
    return {
      totalTickets: total ?? 0,
      openTickets: open ?? 0,
      assignedTickets: assigned ?? 0,
      closedTickets: closed ?? 0,
      staffCount: staffCount ?? 0,
    };
  },
};

export async function handleTickets(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { action, data } = (await request.json()) as {
      action: string;
      data: unknown;
    };

    const handler = handlers[action];
    if (!handler) {
      return json({ error: `Unknown action: ${action}` }, 400);
    }

    const result = await handler(data);
    return json(result);
  } catch (err) {
    console.error("tickets route error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Forbidden" || message.startsWith("Admin access") ? 403 : 500;
    return json({ error: message }, status);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
