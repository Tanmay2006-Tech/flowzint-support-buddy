# NovaHelp

A modern, full-stack customer support workspace built for a hackathon. NovaHelp blends an AI-powered chatbot, live human handoff, a ticketing system, and separate consoles for support agents and admins — all in one polished app.

## ✨ Features

- **AI chat assistant** — Specialist agents for billing, technical, and general questions, powered by a multi-model AI gateway (Gemini / GPT models).
- **Live human handoff** — Customers can request a real representative; conversations get persisted as tickets.
- **PDF transcripts** — Export any conversation as a clean PDF.
- **Authentication** — Clerk-powered sign-in / sign-up with Google OAuth.
- **Three role-based consoles**
  - **Customer portal** (`/`) — Chat, view tickets, talk to a rep.
  - **Agent console** (`/staff`) — Triage and respond to assigned tickets.
  - **Admin dashboard** (`/admin`) — Manage all tickets, agents, and assignments.
- **Demo accounts** — One-click copy credentials for examiners (user / agent / admin).
- **Realtime updates** — Live ticket and message sync via Postgres realtime.

## 🚀 Demo Accounts

Examiners can sign in instantly without registering. Credentials are visible on each login page.

| Role  | Email                          | Password         |
| ----- | ------------------------------ | ---------------- |
| User  | `demo.user@novahelp.app`       | `DemoPass!2026`  |
| Agent | `demo.agent@novahelp.app`      | `DemoPass!2026`  |
| Admin | `demo.admin@novahelp.app`      | `DemoPass!2026`  |

- Customer login → `/login`
- Agent / Admin login → `/agent-login`

## 🧱 Tech Stack

- **Framework**: TanStack Start (React 19, Vite 7, SSR)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth**: Clerk
- **Backend**: Managed Postgres (with RLS) + server functions (`createServerFn`)
- **AI**: Multi-model gateway (Gemini 2.5, GPT-5, etc.)
- **Deployment**: Cloudflare Workers (edge)
- **Language**: TypeScript

## 📁 Project Structure

```
src/
├── routes/              # File-based routes
│   ├── index.tsx        # Landing + customer chat
│   ├── login.tsx        # Customer sign-in
│   ├── agent-login.tsx  # Staff sign-in (agents + admins)
│   ├── staff.tsx        # Agent console
│   ├── admin.tsx        # Admin dashboard
│   └── api/chat.ts      # Streaming AI endpoint
├── components/          # UI components
├── lib/
│   ├── tickets.functions.ts  # Server functions
│   ├── personas.ts           # AI agent personas
│   └── pdf-export.ts         # PDF transcripts
└── integrations/        # Auto-generated clients
supabase/migrations/     # Database schema
```

## 🛠️ Local Development

```bash
bun install
bun run dev
```

### Environment

The app uses managed cloud services — the required env vars are auto-provisioned in the development environment. For a manual setup you'd need:

- `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` (AI model gateway)

## 🔐 Security Notes

- All staff/admin checks happen server-side via a security-definer SQL function.
- Roles are stored in a separate `staff` table — never on user profiles.
- RLS is enabled on every public table.
- Webhook routes verify signatures before processing.

## 📜 License

Built for hackathon submission. Free to fork and adapt.
