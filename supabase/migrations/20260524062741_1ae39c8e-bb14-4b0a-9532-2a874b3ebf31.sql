
-- Staff allow-list (managed manually for now)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff readable by anyone" ON public.staff FOR SELECT USING (true);

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT,           -- Clerk user id (nullable for anon)
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone may create a ticket (form is public)
CREATE POLICY "anyone can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

-- Reading/updating restricted to server-side (service role bypasses RLS).
-- No public SELECT/UPDATE/DELETE policies on purpose.

CREATE TRIGGER tg_support_tickets_touch
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_tickets_status_created ON public.support_tickets (status, created_at DESC);
