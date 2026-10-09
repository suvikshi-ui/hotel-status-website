import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { authClient, authEnabled } from "@/lib/auth/client";
import { HOTEL } from "@/lib/hotels";
import { saveOwnerPassword } from "@/lib/owner-login.functions";
import { OWNER_USER_ID } from "@/lib/owner-login";

export const Route = createFileRoute("/login")({
  component: OwnerLogin,
  head: () => ({
    meta: [{ title: "Owner desk · Hotel Status Residency" }],
  }),
});

const field =
  "h-11 w-full border-0 border-b border-ink/20 bg-transparent px-0 text-sm text-ink outline-none focus:border-ink";

function acceptsUserId(value: string): boolean {
  const id = value.trim().toLowerCase();
  return id === OWNER_USER_ID || id === HOTEL.email.toLowerCase();
}

function OwnerLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "save">("sign-in");
  const [userId, setUserId] = useState(OWNER_USER_ID);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", "/login");
  }, []);

  async function signInWithPassword() {
    const result = await authClient.signIn.email({ email: HOTEL.email, password });
    if (result.error) {
      setError(result.error.message ?? "That user ID or password is wrong.");
      return false;
    }
    await navigate({ to: "/owner" });
    return true;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!acceptsUserId(userId)) {
      setError("User ID is owner.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (mode === "save" && password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    try {
      if (mode === "save") {
        await saveOwnerPassword({ data: { password } });
      }
      await signInWithPassword();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the owner desk.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-semibold">
            Hotel Status Residency
          </Link>
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Owner desk</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <h1 className="font-display text-5xl font-semibold">Owner sign-in</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Guests book without an account. This desk is only for the hotel. Sign in with the user ID and password below.
        </p>

        {authEnabled ? (
          <form onSubmit={onSubmit} className="mt-10 grid gap-6">
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">User ID</span>
              <input
                id="owner-user-id"
                required
                autoComplete="username"
                className={field}
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">Password</span>
              <input
                id="owner-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "save" ? "new-password" : "current-password"}
                className={field}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "save" ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Confirm password</span>
                <input
                  id="owner-confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={field}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </label>
            ) : null}
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <Button type="submit" variant="ink" disabled={pending} className="rounded-none tracking-[0.16em] uppercase">
              {pending ? "Please wait…" : mode === "save" ? "Save and sign in" : "Sign in"}
            </Button>
            <button
              type="button"
              className="text-left text-sm text-ink-soft underline decoration-ink/30 underline-offset-4"
              onClick={() => {
                setMode(mode === "save" ? "sign-in" : "save");
                setError(null);
                setConfirm("");
              }}
            >
              {mode === "save" ? "Back to sign in" : "Set user ID and password"}
            </button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-muted">Sign-in is turned off.</p>
        )}
      </main>
    </div>
  );
}
