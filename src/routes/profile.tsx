import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile · FlowZint Support" }] }),
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setAvatar(profile?.avatar_url ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name || null,
      bio: bio || null,
      avatar_url: avatar || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile updated");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials =
    (name || user.email || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
      </Link>

      <div className="rounded-2xl border border-border bg-[var(--surface-1)]/80 p-7 shadow-soft backdrop-blur">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{name || user.email}</div>
            <div className="truncate text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <form onSubmit={save} className="mt-7 space-y-4">
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </Field>
          <Field label="Avatar URL">
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </Field>
          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A short bio"
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </form>
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
      <div className="rounded-xl border border-border bg-[var(--surface-2)] px-3.5 py-2.5 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
        {children}
      </div>
    </label>
  );
}
