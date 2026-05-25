import { useState } from "react";
import { Copy, Check, User, Headphones, Shield } from "lucide-react";

export type DemoRole = "user" | "agent" | "admin";

export const DEMO_PASSWORD = "DemoPass!2026";

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; label: string; desc: string }> = {
  user: {
    email: "demo-user@novahelp.test",
    label: "Customer",
    desc: "Browse the chat support experience as a regular user.",
  },
  agent: {
    email: "demo-agent@novahelp.test",
    label: "Support Agent",
    desc: "Access the agent console and respond to tickets.",
  },
  admin: {
    email: "demo-admin@novahelp.test",
    label: "Administrator",
    desc: "Full access: team management, stats, ticket admin.",
  },
};

const icons: Record<DemoRole, React.ComponentType<{ className?: string }>> = {
  user: User,
  agent: Headphones,
  admin: Shield,
};

interface Props {
  roles?: DemoRole[];
  theme?: "light" | "dark";
}

export function DemoCredentials({ roles = ["user", "agent", "admin"], theme = "light" }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {/* noop */}
  };

  const isDark = theme === "dark";
  const wrap = isDark
    ? "rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
    : "rounded-xl border border-slate-200 bg-slate-50 p-4";
  const heading = isDark ? "text-white/90" : "text-slate-900";
  const sub = isDark ? "text-white/60" : "text-slate-500";
  const card = isDark
    ? "rounded-lg border border-white/10 bg-[#0f172a]/60 p-3"
    : "rounded-lg border border-slate-200 bg-white p-3";
  const labelCls = isDark ? "text-white/80" : "text-slate-700";
  const valueCls = isDark ? "text-white" : "text-slate-900";
  const btn = isDark
    ? "inline-flex h-7 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-white/80 hover:bg-white/10"
    : "inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div className={wrap}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className={`text-sm font-semibold ${heading}`}>Demo accounts</div>
          <div className={`text-[11px] ${sub}`}>For examiners — no signup required after first use.</div>
        </div>
        <button
          onClick={() => copy("pw", DEMO_PASSWORD)}
          className={btn}
          title="Copy shared demo password"
        >
          {copied === "pw" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          Password
        </button>
      </div>

      <div className="space-y-2">
        {roles.map((r) => {
          const acc = DEMO_ACCOUNTS[r];
          const Icon = icons[r];
          return (
            <div key={r} className={`flex items-center justify-between gap-3 ${card}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-50 text-indigo-600"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${labelCls}`}>{acc.label}</div>
                  <div className={`truncate font-mono text-[11px] ${valueCls}`}>{acc.email}</div>
                </div>
              </div>
              <button
                onClick={() => copy(r, acc.email)}
                className={btn}
                title="Copy email"
              >
                {copied === r ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === r ? "Copied" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>

      <div className={`mt-3 rounded-md px-3 py-2 text-[11px] ${
        isDark ? "bg-amber-500/10 text-amber-200/90" : "bg-amber-50 text-amber-800"
      }`}>
        Shared password: <span className="font-mono font-semibold">{DEMO_PASSWORD}</span>
        <div className="mt-1 opacity-80">
          First-time use: switch to "Sign up" in the form and register the demo email with this password. Subsequent logins work directly.
        </div>
      </div>
    </div>
  );
}
