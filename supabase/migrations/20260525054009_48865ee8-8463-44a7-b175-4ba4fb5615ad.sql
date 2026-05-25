
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'agent';

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check CHECK (role IN ('agent', 'admin'));
