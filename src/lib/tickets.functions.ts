import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateSchema = z.object({
  requesterId: z.string().max(120).optional().nullable(),
  requesterName: z.string().min(1).max(120),
  requesterEmail: z.string().email().max(200),
  subject: z.string().min(3).max(160),
  message: z.string().min(5).max(4000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data }) => {
    const { error, data: row } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        requester_id: data.requesterId ?? null,
        requester_name: data.requesterName,
        requester_email: data.requesterEmail,
        subject: data.subject,
        message: data.message,
        priority: data.priority,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, createdAt: row.created_at as string };
  });

const StaffCheckSchema = z.object({ email: z.string().email() });

export const checkStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StaffCheckSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("staff")
      .select("id, role")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    const role = (row?.role as "agent" | "admin" | undefined) ?? null;
    return { isStaff: !!row, role, isAdmin: role === "admin" };
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

const ListSchema = z.object({ email: z.string().email() });

export const listTickets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data }) => {
    await requireStaff(data.email);
    const { data: rows, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { tickets: rows ?? [] };
  });

const UpdateSchema = z.object({
  email: z.string().email(),
  ticketId: z.string().uuid(),
  status: z.enum(["open", "assigned", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assign: z.boolean().optional(),
});

export const updateTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data }) => {
    await requireStaff(data.email);
    const patch: {
      status?: "open" | "assigned" | "closed";
      priority?: "low" | "normal" | "high" | "urgent";
      assigned_email?: string | null;
    } = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (data.assign) {
      patch.assigned_email = data.email.toLowerCase();
      patch.status = "assigned";
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update(patch)
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const JoinStaffSchema = z.object({ email: z.string().email() });

// First user to claim becomes the founding admin. After that, the staff list is closed.
export const claimFirstStaffSeat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => JoinStaffSchema.parse(d))
  .handler(async ({ data }) => {
    const { count } = await supabaseAdmin
      .from("staff")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      const { data: existing } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("email", data.email.toLowerCase())
        .maybeSingle();
      if (existing) return { ok: true, alreadyStaff: true };
      throw new Error("Staff list is closed. Ask an admin to add you.");
    }
    const { error } = await supabaseAdmin
      .from("staff")
      .insert({ email: data.email.toLowerCase(), role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyStaff: false, role: "admin" as const };
  });

// ===================== Admin-only operations =====================

const AdminEmailSchema = z.object({ email: z.string().email() });

export const listStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminEmailSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.email);
    const { data: rows, error } = await supabaseAdmin
      .from("staff")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { staff: rows ?? [] };
  });

const AddStaffSchema = z.object({
  email: z.string().email(),
  newEmail: z.string().email().max(200),
  role: z.enum(["agent", "admin"]).default("agent"),
});

export const addStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AddStaffSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.email);
    const { error } = await supabaseAdmin
      .from("staff")
      .insert({ email: data.newEmail.toLowerCase(), role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateStaffSchema = z.object({
  email: z.string().email(),
  staffId: z.string().uuid(),
  role: z.enum(["agent", "admin"]),
});

export const updateStaffRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateStaffSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.email);
    // Prevent demoting yourself if you're the only admin
    if (data.role !== "admin") {
      const { data: target } = await supabaseAdmin
        .from("staff").select("id, email, role").eq("id", data.staffId).maybeSingle();
      if (target?.email === admin.email) {
        const { count } = await supabaseAdmin
          .from("staff").select("*", { count: "exact", head: true }).eq("role", "admin");
        if ((count ?? 0) <= 1) throw new Error("Cannot demote the only remaining admin.");
      }
    }
    const { error } = await supabaseAdmin
      .from("staff").update({ role: data.role }).eq("id", data.staffId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RemoveStaffSchema = z.object({
  email: z.string().email(),
  staffId: z.string().uuid(),
});

export const removeStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RemoveStaffSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.email);
    const { data: target } = await supabaseAdmin
      .from("staff").select("id, email, role").eq("id", data.staffId).maybeSingle();
    if (!target) return { ok: true };
    if (target.email === admin.email) throw new Error("You cannot remove yourself.");
    const { error } = await supabaseAdmin.from("staff").delete().eq("id", data.staffId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteTicketSchema = z.object({
  email: z.string().email(),
  ticketId: z.string().uuid(),
});

export const deleteTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteTicketSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.email);
    const { error } = await supabaseAdmin
      .from("support_tickets").delete().eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminEmailSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.email);
    const [{ count: total }, { count: open }, { count: assigned }, { count: closed }, { count: staffCount }] =
      await Promise.all([
        supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "assigned"),
        supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "closed"),
        supabaseAdmin.from("staff").select("*", { count: "exact", head: true }),
      ]);
    return {
      totalTickets: total ?? 0,
      openTickets: open ?? 0,
      assignedTickets: assigned ?? 0,
      closedTickets: closed ?? 0,
      staffCount: staffCount ?? 0,
    };
  });
