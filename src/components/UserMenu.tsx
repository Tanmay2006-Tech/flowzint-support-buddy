import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/tanstack-react-start";

export function UserMenu() {
  return (
    <>
      <SignedOut>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
        >
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-7 w-7 ring-1 ring-border",
            },
          }}
        />
      </SignedIn>
    </>
  );
}
