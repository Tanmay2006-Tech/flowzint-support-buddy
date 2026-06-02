import { useEffect, useRef, useState } from "react";
import { X, Loader2, Headphones, CheckCircle2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { createTicket } from "@/lib/tickets.functions";

type Priority = "low" | "normal" | "high" | "urgent";

export function HandoffDialog({
  open,
  onClose,
  contextSummary,
}: {
  open: boolean;
  onClose: () => void;
  contextSummary?: string;
}) {
  const { user, isSignedIn } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTicketId(null);
    setName(user?.fullName ?? user?.firstName ?? "");
    setEmail(user?.primaryEmailAddress?.emailAddress ?? "");
    setMessage(contextSummary ?? "");
    setTimeout(() => firstRef.current?.focus(), 50);
  }, [open, user, contextSummary]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createTicket({
        data: {
          requesterId: isSignedIn ? (user?.id ?? null) : null,
          requesterName: name.trim(),
          requesterEmail: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          priority,
        },
      });
      setTicketId(res.id);
      toast.success("A representative will reach out shortly.");
    } catch (err) {
      toast.error((err as Error).message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-[var(--surface-2)] shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Headphones className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Talk to a representative</div>
              <div className="text-[11px] text-muted-foreground">
                A human agent typically replies within a business hour.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-[var(--surface-1)] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {ticketId ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold">Request received</div>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
              We've routed your request to the team. We'll email{" "}
              <span className="font-medium text-foreground">{email}</span> as soon as a
              representative is on it.
            </p>
            <div className="mx-auto mt-4 inline-block rounded-md border border-border bg-[var(--surface-1)] px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              Reference: {ticketId.slice(0, 8).toUpperCase()}
            </div>
            <div className="mt-6">
              <button
                onClick={onClose}
                className="rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your name">
                <input
                  ref={firstRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="you@company.com"
                />
              </Field>
            </div>
            <Field label="Subject">
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none"
                placeholder="Short summary of what you need"
              />
            </Field>
            <Field label="How can we help?">
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none bg-transparent text-sm focus:outline-none"
                placeholder="Share any details, screenshots links, or order numbers."
              />
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-transparent text-sm focus:outline-none"
              >
                <option value="low">Low — general question</option>
                <option value="normal">Normal — standard request</option>
                <option value="high">High — service impacted</option>
                <option value="urgent">Urgent — production down</option>
              </select>
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send to a representative
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="rounded-xl border border-border bg-[var(--surface-1)] px-3.5 py-2.5 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
        {children}
      </div>
    </label>
  );
}
