import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { HOTEL } from "@/lib/hotels";
import { setOwnerPassword } from "@/lib/owner-reset.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { reset?: string; done?: string } => ({
    reset: typeof search.reset === "string" && search.reset.length > 0 ? search.reset : undefined,
    done: search.done === "1" ? "1" : undefined,
  }),
  component: OwnerLogin,
  head: () => ({
    meta: [{ title: "Owner desk · Hotel Status Residency" }],
  }),
});

const field =
  "h-11 w-full border-0 border-b border-ink/20 bg-transparent px-0 text-sm text-ink outline-none focus:border-ink";

function OwnerLogin() {
  const navigate = useNavigate();
  const { reset, done } = Route.useSearch();
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState(HOTEL.email);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReset(event: FormEvent) {
    event.preventDefault();
    if (!reset) return;
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      await setOwnerPassword({ data: { token: reset, password } });
      setPassword("");
      await navigate({ to: "/login", search: { done: "1" } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset the password.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const address = email.trim().toLowerCase();
    if (address !== HOTEL.email.toLowerCase()) {
      setError(`The owner desk uses ${HOTEL.email}.`);
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const result =
        mode === "create"
          ? await authClient.signUp.email({ email: address, password, name: HOTEL.name })
          : await authClient.signIn.email({ email: address, password });
      if (result.error) {
        setError(result.error.message ?? "Could not open the owner desk.");
        return;
      }
      await navigate({ to: "/owner" });
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
          Guests book without an account. This desk is only for the hotel, so you can see who booked, which room, and the dates.
        </p>

        {authEnabled && reset ? (
          <form onSubmit={onReset} className="mt-10 grid gap-6">
            <p className="text-sm leading-relaxed text-ink-soft">
              Set a new password for {HOTEL.email}. This link works once.
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">New password</span>
              <input
                id="owner-new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={field}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <Button type="submit" variant="ink" disabled={pending} className="rounded-none tracking-[0.16em] uppercase">
              {pending ? "Please wait…" : "Save new password"}
            </Button>
          </form>
        ) : authEnabled ? (
          <form onSubmit={onSubmit} className="mt-10 grid gap-6">
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">Email</span>
              <input
                id="owner-email"
                type="email"
                required
                autoComplete="username"
                className={field}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">Password</span>
              <input
                id="owner-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                className={field}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {done === "1" ? <p className="text-sm text-success">Password updated. Sign in with the new one.</p> : null}
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <Button type="submit" variant="ink" disabled={pending} className="rounded-none tracking-[0.16em] uppercase">
              {pending ? "Please wait…" : mode === "create" ? "Create owner sign-in" : "Open the desk"}
            </Button>
            <button
              type="button"
              className="text-left text-sm text-ink-soft underline decoration-ink/30 underline-offset-4"
              onClick={() => {
                setMode(mode === "create" ? "sign-in" : "create");
                setError(null);
              }}
            >
              {mode === "create" ? "Already created? Sign in" : "First time on this desk? Create the sign-in"}
            </button>
            <div className="border-t border-ink/10 pt-6">
              <p className="text-xs tracking-[0.18em] text-muted uppercase">Or</p>
              <div className="mt-4 grid gap-3">
                {GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    type="button"
                    variant="outline"
                    className="rounded-none tracking-[0.14em] uppercase"
                    onClick={() => void signIn(provider.providerId, { callbackURL: "/owner" })}
                  >
                    Continue with {provider.label}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          <p className="mt-8 text-sm text-muted">Sign-in is turned off.</p>
        )}
      </main>
    </div>
  );
}
