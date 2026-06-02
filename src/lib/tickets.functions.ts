async function callTicketsApi<T>(action: string, data: unknown): Promise<T> {
  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string };

  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }

  return json as T;
}

export const createTicket = (payload: { data: Parameters<typeof callTicketsApi>[1] }) =>
  callTicketsApi<{ id: string; createdAt: string }>("createTicket", payload.data);

export const checkStaff = (payload: { data: { email: string } }) =>
  callTicketsApi<{ isStaff: boolean; role: "agent" | "admin" | null; isAdmin: boolean }>(
    "checkStaff",
    payload.data,
  );

export const listTickets = (payload: { data: { email: string } }) =>
  callTicketsApi<{ tickets: unknown[] }>("listTickets", payload.data);

export const updateTicket = (payload: {
  data: {
    email: string;
    ticketId: string;
    status?: "open" | "assigned" | "closed";
    priority?: "low" | "normal" | "high" | "urgent";
    assign?: boolean;
  };
}) => callTicketsApi<{ ok: boolean }>("updateTicket", payload.data);

export const claimFirstStaffSeat = (payload: { data: { email: string } }) =>
  callTicketsApi<{ ok: boolean; alreadyStaff?: boolean; role?: "admin" }>(
    "claimFirstStaffSeat",
    payload.data,
  );

export const listStaff = (payload: { data: { email: string } }) =>
  callTicketsApi<{ staff: unknown[] }>("listStaff", payload.data);

export const addStaff = (payload: {
  data: { email: string; newEmail: string; role?: "agent" | "admin" };
}) => callTicketsApi<{ ok: boolean }>("addStaff", payload.data);

export const updateStaffRole = (payload: {
  data: { email: string; staffId: string; role: "agent" | "admin" };
}) => callTicketsApi<{ ok: boolean }>("updateStaffRole", payload.data);

export const removeStaff = (payload: { data: { email: string; staffId: string } }) =>
  callTicketsApi<{ ok: boolean }>("removeStaff", payload.data);

export const deleteTicket = (payload: { data: { email: string; ticketId: string } }) =>
  callTicketsApi<{ ok: boolean }>("deleteTicket", payload.data);

export const getAdminStats = (payload: { data: { email: string } }) =>
  callTicketsApi<{
    totalTickets: number;
    openTickets: number;
    assignedTickets: number;
    closedTickets: number;
    staffCount: number;
  }>("getAdminStats", payload.data);
