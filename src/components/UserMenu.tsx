import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
      >
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </Link>
    );
  }

  const name = profile?.display_name || user.email?.split("@")[0] || "User";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface-1)] px-1 py-1 pr-3 transition hover:bg-[var(--surface-2)]"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
            {initials}
          </span>
        )}
        <span className="hidden text-xs font-medium sm:block">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-[var(--surface-2)] shadow-soft animate-fade-up">
          <div className="border-b border-border px-3 py-2.5">
            <div className="truncate text-xs font-semibold">{name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--surface-1)]"
          >
            <UserIcon className="h-3.5 w-3.5" /> Your profile
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-destructive transition hover:bg-[var(--surface-1)]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
