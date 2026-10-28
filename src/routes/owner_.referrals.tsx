import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ownerSession, signOutOwnerDesk } from "@/lib/owner-auth.functions";
import {
  ownerCommissionPaid,
  ownerReferralBookings,
  ownerReferrals,
  ownerSaveReferral,
  ownerSuggestCode,
  ownerToggleReferral,
  type ReferralBooking,
  type ReferralForm,
  type ReferralSummary,
} from "@/lib/referrals.functions";
import { ROOM_LABELS } from "@/lib/booking-labels";
import { formatInr, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { id?: number };

export const Route = createFileRoute("/owner_/referrals")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const id = Number(s.id);
    return Number.isInteger(id) && id > 0 ? { id } : {};
  },
  beforeLoad: async () => {
    const { email } = await ownerSession();
    if (!email) throw redirect({ to: "/login" });
    return { ownerEmail: email };
  },
  component: ReferralsPage,
  head: () => ({
    meta: [{ title: "Referrals · Owner desk" }, { name: "robots", content: "noindex" }],
  }),
});

const REFRESH_MS = 20_000;
const field = "h-10 w-full border border-ink/20 bg-transparent px-2 text-sm text-ink";
const label = "flex flex-col gap-1 text-[11px] tracking-[0.12em] text-muted uppercase";

function istMonthNow(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);
}

function monthOptions(): string[] {
  const now = istMonthNow();
  const [y, m] = now.split("-").map(Number);
  return Array.from({ length: 18 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

const monthLabel = (m: string) => format(new Date(`${m}-01T00:00:00`), "MMMM yyyy");

type FormState = {
  label: string;
  code: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  guest_discount_percent: string;
  agent_percent: string;
  active: boolean;
  valid_from: string;
  valid_to: string;
  max_uses: string;
  notes: string;
};

const EMPTY: FormState = {
  label: "",
  code: "",
  agent_name: "",
  agent_phone: "",
  agent_email: "",
  guest_discount_percent: "",
  agent_percent: "",
  active: true,
  valid_from: "",
  valid_to: "",
  max_uses: "",
  notes: "",
};

function toForm(c: ReferralSummary): FormState {
  return {
    label: c.label,
    code: c.code,
    agent_name: c.agent_name,
    agent_phone: c.agent_phone,
    agent_email: c.agent_email,
    guest_discount_percent: String(c.guest_discount_percent),
    agent_percent: String(c.agent_percent),
    active: c.active,
    valid_from: c.valid_from ?? "",
    valid_to: c.valid_to ?? "",
    max_uses: c.max_uses === null ? "" : String(c.max_uses),
    notes: c.notes,
  };
}

function ReferralsPage() {
  const { ownerEmail } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [month, setMonth] = useState(istMonthNow());
  const [codes, setCodes] = useState<ReferralSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await ownerReferrals({ data: { month } });
      setCodes(res.codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load referral codes.");
    }
  }, [month]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = codes?.find((c) => c.id === search.id) ?? null;
  const editingCode = editing?.id ? codes?.find((c) => c.id === editing.id) ?? null : null;

  async function toggle(c: ReferralSummary) {
    if (c.active && !window.confirm(`Deactivate ${c.code}? Guests can no longer use it. Past bookings keep it.`)) return;
    try {
      await ownerToggleReferral({ data: { id: c.id, active: !c.active } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-display text-xl leading-tight font-semibold sm:text-2xl">
            Hotel Status Residency
          </Link>
          <div className="flex items-center gap-3 text-right">
            <p className="hidden text-xs text-muted sm:block">{ownerEmail}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await signOutOwnerDesk();
                await navigate({ to: "/login" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          <Link to="/owner" className="border-b-2 border-transparent px-3 py-3 text-xs tracking-[0.14em] whitespace-nowrap text-muted uppercase hover:text-ink">
            ← Desk
          </Link>
          <span className="border-b-2 border-gold px-3 py-3 text-xs tracking-[0.14em] whitespace-nowrap uppercase">Referrals</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold">Referrals</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Codes for agents. The guest discount comes off the booking total before payment. The agent commission is
              what the hotel owes the agent, worked out on the price before the discount. Updates every 20 seconds.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className={label}>
              Month (IST)
              <select className={field} value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthOptions().map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="ink" onClick={() => setEditing({ id: null })}>
              New code
            </Button>
          </div>
        </div>
        {error ? <p className="mt-4 border border-terracotta/40 p-3 text-sm text-terracotta">{error}</p> : null}

        {editing ? (
          <CodeForm
            key={editing.id ?? "new"}
            id={editing.id}
            initial={editingCode ? toForm(editingCode) : EMPTY}
            onDone={async () => {
              setEditing(null);
              await load();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}

        {!codes ? (
          <div className="glass mt-6 h-40" />
        ) : codes.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No referral codes yet. Create one with “New code”.</p>
        ) : (
          <div className="mt-6 overflow-x-auto border border-ink/15">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-cream text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                <tr>
                  <th className="p-2">Code</th>
                  <th className="p-2">Agent</th>
                  <th className="p-2">Guest discount %</th>
                  <th className="p-2">Agent commission %</th>
                  <th className="p-2">Uses</th>
                  <th className="p-2">Revenue</th>
                  <th className="p-2">Agent earnings · {monthLabel(month)}</th>
                  <th className="p-2">Agent earnings · all time</th>
                  <th className="p-2">Paid / unpaid</th>
                  <th className="p-2">Status</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {codes.map((c) => (
                  <tr key={c.id} className={cn(c.id === search.id && "bg-cream")}>
                    <td className="p-2 align-top">
                      <p className="font-mono font-semibold">{c.code}</p>
                      <p className="text-xs text-muted">{c.label}</p>
                    </td>
                    <td className="p-2 align-top">
                      <p>{c.agent_name}</p>
                      {c.agent_phone ? <a className="block text-xs underline" href={`tel:${c.agent_phone}`}>{c.agent_phone}</a> : null}
                      {c.agent_email ? <a className="block text-xs underline" href={`mailto:${c.agent_email}`}>{c.agent_email}</a> : null}
                      {c.notes ? <p className="mt-1 max-w-[16rem] text-xs whitespace-pre-wrap text-ink-soft">{c.notes}</p> : null}
                    </td>
                    <td className="p-2 align-top tabular-nums">{c.guest_discount_percent}%</td>
                    <td className="p-2 align-top tabular-nums">{c.agent_percent}%</td>
                    <td className="p-2 align-top tabular-nums">
                      {c.uses}
                      {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="p-2 align-top tabular-nums">{formatInr(c.revenue)}</td>
                    <td className="p-2 align-top font-semibold tabular-nums">{formatInr(c.earnings_month)}</td>
                    <td className="p-2 align-top tabular-nums">{formatInr(c.earnings_total)}</td>
                    <td className="p-2 align-top text-xs tabular-nums">
                      Paid {formatInr(c.earnings_paid)}
                      <br />
                      Unpaid {formatInr(c.earnings_unpaid)}
                    </td>
                    <td className="p-2 align-top text-xs">
                      <span className={cn("border px-2 py-0.5", c.active ? "border-success/50 text-success" : "border-ink/20 text-muted")}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      {c.valid_from || c.valid_to ? (
                        <p className="mt-1 text-muted">
                          {c.valid_from ? formatShortDate(c.valid_from) : "…"} – {c.valid_to ? formatShortDate(c.valid_to) : "…"}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/owner/referrals", search: { id: c.id } })}>
                          Details
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id })}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggle(c)}>
                          {c.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <CodeDetail
            code={selected}
            onClose={() => navigate({ to: "/owner/referrals", search: {} })}
            onChanged={load}
          />
        ) : null}
      </main>
    </div>
  );
}

function CodeForm({
  id,
  initial,
  onDone,
  onCancel,
}: {
  id: number | null;
  initial: FormState;
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function suggest() {
    try {
      const { code } = await ownerSuggestCode({ data: { seed: f.agent_name || f.label } });
      set("code", code);
    } catch {
      setError("Could not suggest a code.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const g = f.guest_discount_percent.trim() === "" ? NaN : Number(f.guest_discount_percent);
    const a = f.agent_percent.trim() === "" ? NaN : Number(f.agent_percent);
    if (!Number.isFinite(g) || g < 0 || g > 100) return setError("Enter a guest discount % between 0 and 100.");
    if (!Number.isFinite(a) || a < 0 || a > 100) return setError("Enter an agent commission % between 0 and 100.");
    if (g + a > 100) return setError("Guest discount % and agent commission % together cannot exceed 100.");
    const maxUses = f.max_uses.trim() === "" ? null : Number(f.max_uses);
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return setError("Max uses must be a whole number, 1 or more.");
    const form: ReferralForm = {
      label: f.label,
      code: f.code,
      agent_name: f.agent_name,
      agent_phone: f.agent_phone,
      agent_email: f.agent_email,
      guest_discount_percent: g,
      agent_percent: a,
      active: f.active,
      valid_from: f.valid_from || null,
      valid_to: f.valid_to || null,
      max_uses: maxUses,
      notes: f.notes,
    };
    setBusy(true);
    try {
      await ownerSaveReferral({ data: { id, form } });
      await onDone();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border border-ink/15 bg-cream p-4">
      <h2 className="font-display text-2xl font-semibold">{id ? "Edit code" : "New referral code"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>
          Name / label *
          <input required className={field} value={f.label} onChange={(e) => set("label", e.target.value)} />
        </label>
        <label className={label}>
          Code * (not case-sensitive)
          <span className="flex gap-2">
            <input
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_\\-]+"
              className={cn(field, "font-mono uppercase")}
              value={f.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
            <Button type="button" size="sm" variant="outline" className="h-10" onClick={suggest}>
              Suggest
            </Button>
          </span>
        </label>
        <label className={label}>
          Agent name *
          <input required className={field} value={f.agent_name} onChange={(e) => set("agent_name", e.target.value)} />
        </label>
        <label className={label}>
          Agent phone
          <input type="tel" className={field} value={f.agent_phone} onChange={(e) => set("agent_phone", e.target.value)} />
        </label>
        <label className={label}>
          Agent email (optional)
          <input type="email" className={field} value={f.agent_email} onChange={(e) => set("agent_email", e.target.value)} />
        </label>
        <label className={label}>
          Guest discount % *
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={field}
            value={f.guest_discount_percent}
            onChange={(e) => set("guest_discount_percent", e.target.value)}
          />
        </label>
        <label className={label}>
          Agent commission % *
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={field}
            value={f.agent_percent}
            onChange={(e) => set("agent_percent", e.target.value)}
          />
        </label>
        <label className={label}>
          Valid from (optional)
          <input type="date" className={field} value={f.valid_from} onChange={(e) => set("valid_from", e.target.value)} />
        </label>
        <label className={label}>
          Valid to (optional)
          <input type="date" className={field} value={f.valid_to} onChange={(e) => set("valid_to", e.target.value)} />
        </label>
        <label className={label}>
          Max uses (optional)
          <input type="number" min={1} step={1} className={field} value={f.max_uses} onChange={(e) => set("max_uses", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
        <label className={cn(label, "sm:col-span-2 lg:col-span-3")}>
          Notes
          <textarea className={cn(field, "h-20 py-2")} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
      </div>
      {f.guest_discount_percent !== "" && f.agent_percent !== "" ? (
        <p className="mt-3 text-xs text-ink-soft">
          Cost to the hotel per booking: {Number(f.guest_discount_percent) + Number(f.agent_percent)}% of the price before
          discount.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="ink" disabled={busy}>
          {busy ? "Saving…" : id ? "Save changes" : "Create code"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function readableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  try {
    const parsed = JSON.parse(raw) as { message?: string }[];
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed.map((p) => p.message).join(" ");
  } catch {
    /* not a zod payload */
  }
  return raw || "Could not save the code.";
}

function CodeDetail({
  code,
  onClose,
  onChanged,
}: {
  code: ReferralSummary;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [month, setMonth] = useState<string>(istMonthNow());
  const [rows, setRows] = useState<ReferralBooking[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await ownerReferralBookings({ data: { id: code.id, month: month === "all" ? null : month } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    }
  }, [code.id, month]);

  useEffect(() => {
    setRows(null);
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const counted = (rows ?? []).filter((r) => r.status !== "cancelled" && r.status !== "expired");
  const earned = counted.reduce((s, r) => s + r.agent_commission_amount, 0);
  const paid = counted.filter((r) => r.agent_commission_paid_at).reduce((s, r) => s + r.agent_commission_amount, 0);
  const revenue = counted.reduce((s, r) => s + r.total_amount, 0);

  async function mark(r: ReferralBooking) {
    setBusy(r.id);
    try {
      await ownerCommissionPaid({ data: { bookingId: r.id, paid: !r.agent_commission_paid_at } });
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8 border border-ink/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.16em] text-gold uppercase">{code.label}</p>
          <h2 className="font-mono text-3xl font-semibold">{code.code}</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>Agent name: <strong>{code.agent_name}</strong></div>
            <div>Agent phone: {code.agent_phone || "—"}</div>
            <div>Agent email: {code.agent_email || "—"}</div>
            <div>Guest discount: {code.guest_discount_percent}%</div>
            <div>Agent commission: {code.agent_percent}%</div>
            <div>
              Uses: {code.uses}
              {code.max_uses !== null ? ` of ${code.max_uses}` : ""}
            </div>
            <div className="sm:col-span-2 whitespace-pre-wrap">Notes: {code.notes || "—"}</div>
          </dl>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={`Agent earnings · ${month === "all" ? "all time" : monthLabel(month)}`} value={formatInr(earned)} />
        <Tile label="Agent earnings · all time" value={formatInr(code.earnings_total)} />
        <Tile label="Agent commission paid (all time)" value={formatInr(code.earnings_paid)} />
        <Tile label="Agent commission unpaid (all time)" value={formatInr(code.earnings_unpaid)} />
      </dl>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold">Bookings with this code</h3>
        <label className={label}>
          Month (IST, by booking date)
          <select className={field} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All time</option>
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1 text-xs text-muted">
        Tally for this period: {counted.length} booking{counted.length === 1 ? "" : "s"} · revenue {formatInr(revenue)} ·
        agent earnings {formatInr(earned)} (paid {formatInr(paid)}, unpaid {formatInr(earned - paid)}). Cancelled and
        expired bookings are listed but not counted.
      </p>
      {error ? <p className="mt-2 text-sm text-terracotta">{error}</p> : null}
      {!rows ? (
        <div className="glass mt-3 h-24" />
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No bookings with this code in this period.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
              <tr>
                <th className="p-2">Booking</th>
                <th className="p-2">Guest</th>
                <th className="p-2">Stay</th>
                <th className="p-2">Status</th>
                <th className="p-2">Guest paid total</th>
                <th className="p-2">Guest discount</th>
                <th className="p-2">Agent earnings</th>
                <th className="p-2">Agent commission paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((r) => {
                const counts = r.status !== "cancelled" && r.status !== "expired";
                return (
                  <tr key={r.id} className={cn(!counts && "text-muted")}>
                    <td className="p-2 font-mono">{r.id}</td>
                    <td className="p-2">{r.guest_name}</td>
                    <td className="p-2">
                      {ROOM_LABELS[r.room_type] ?? r.room_type} · {formatShortDate(r.check_in)} – {formatShortDate(r.check_out)}
                    </td>
                    <td className="p-2">{r.status.replace("_", " ")}</td>
                    <td className="p-2 tabular-nums">{formatInr(r.total_amount)}</td>
                    <td className="p-2 tabular-nums">{formatInr(r.guest_discount_amount)}</td>
                    <td className="p-2 tabular-nums">{counts ? formatInr(r.agent_commission_amount) : "—"}</td>
                    <td className="p-2">
                      {counts ? (
                        <Button size="sm" variant={r.agent_commission_paid_at ? "outline" : "ink"} disabled={busy === r.id} onClick={() => mark(r)}>
                          {r.agent_commission_paid_at ? "Paid · mark unpaid" : "Unpaid · mark paid"}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Tile({ label: text, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/15 bg-cream p-3">
      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{text}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
