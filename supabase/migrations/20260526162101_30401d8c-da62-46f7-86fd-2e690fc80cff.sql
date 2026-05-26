UPDATE public.staff SET email = 'demo.agent@novahelp.app' WHERE email = 'demo-agent@novahelp.test';
UPDATE public.staff SET email = 'demo.admin@novahelp.app' WHERE email = 'demo-admin@novahelp.test';
INSERT INTO public.staff (email, role) VALUES ('demo.agent@novahelp.app', 'agent'), ('demo.admin@novahelp.app', 'admin') ON CONFLICT (email) DO NOTHING;