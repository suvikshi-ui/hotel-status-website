import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SENT_MESSAGE, sendOwnerLoginCode, verifyOwnerLoginCode } from "@/lib/owner-auth.functions";

export const Route = createFileRoute("/login")({
  component: OwnerLogin,
  head: () => ({
    meta: [{ title: "Owner desk sign-in · Hotel Status Residency" }, { name: "robots", content: "noindex" }],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" },
    ],
  }),
});

const field =
  "h-11 w-full rounded-md border border-[#d5dbe3] bg-white px-3 text-sm text-[#1c2434] outline-none focus:border-[#12263d]";

function OwnerLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setPending(true);
    try {
      await sendOwnerLoginCode({ data: { email } });
    } catch {
      // Same message either way so the page never reveals which emails exist.
    } finally {
      setNotice(SENT_MESSAGE);
      setStep("code");
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await verifyOwnerLoginCode({ data: { email, code } });
      if (!result.ok) {
        setError("That code is wrong or has expired. Check the latest email, or send a new code.");
        return;
      }
      await navigate({ to: "/owner" });
    } catch {
      setError("Could not check the code. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#f3f5f8] text-[#1c2434]"
      style={{ fontFamily: "Rubik, Figtree, sans-serif" }}
    >
      <header className="border-b border-[#e4e8ee] bg-white">
        <div className="mx-auto flex min-h-[4.5rem] max-w-3xl items-center px-4 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/hotels/logo-digital.png?v=blue3d" alt="" className="size-12 shrink-0 sm:size-14" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[11px] font-medium tracking-wide text-[#5b7194] uppercase">Owner desk</span>
              <span className="block text-xl font-semibold text-[#12263d] sm:text-2xl">Hotel Status Residency</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold text-[#12263d]">Owner sign-in</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#5c6570]">
          Guests book without an account. This desk is only for the hotel. Enter the owner email and we will email a
          6-digit sign-in code. No password needed.
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-10 grid gap-6">
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">Email</span>
              <input
                id="owner-email"
                type="email"
                required
                autoComplete="email"
                className={field}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button type="submit" variant="ink" disabled={pending} className="rounded-none tracking-[0.16em] uppercase">
              {pending ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-10 grid gap-6">
            {notice ? <p className="rounded-md border border-[#d5dbe3] bg-white p-3 text-sm">{notice}</p> : null}
            <label className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.18em] text-muted uppercase">6-digit code</span>
              <input
                id="owner-code"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                className={`${field} text-2xl tracking-[0.5em] tabular-nums`}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <Button type="submit" variant="ink" disabled={pending || code.length !== 6} className="rounded-none tracking-[0.16em] uppercase">
              {pending ? "Checking…" : "Sign in"}
            </Button>
            <div className="flex justify-between text-sm text-ink-soft">
              <button type="button" className="underline underline-offset-4" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
                Change email
              </button>
              <button type="button" className="underline underline-offset-4" disabled={pending} onClick={() => void sendCode()}>
                Send a new code
              </button>
            </div>
            <p className="text-xs text-muted">Codes expire after 10 minutes. You can request one code per minute.</p>
          </form>
        )}
      </main>
    </div>
  );
}
