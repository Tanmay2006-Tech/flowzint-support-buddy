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
      .select("id")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    return { isStaff: !!row };
  });

const ListSchema = z.object({ email: z.string().email() });

export const listTickets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!staff) throw new Error("Forbidden");
    const { data: rows, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
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
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, email")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!staff) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
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

// Allow any signed-in user to claim the FIRST staff seat (bootstrap).
// After at least one staff row exists, additional rows must be added manually.
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
      throw new Error("Staff list is closed. Contact an existing agent to be added.");
    }
    const { error } = await supabaseAdmin
      .from("staff")
      .insert({ email: data.email.toLowerCase() });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyStaff: false };
  });
