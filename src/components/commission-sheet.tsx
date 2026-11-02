import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ROOM_LABELS } from "@/lib/booking-labels";
import { formatInr, formatShortDate } from "@/lib/format";
import {
  ownerCommissionPaid,
  ownerCommissionPaidMany,
  ownerCommissionSheet,
  type CommissionAgent,
  type CommissionStay,
} from "@/lib/referrals.functions";
import { cn } from "@/lib/utils";

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

function listPrice(stay: CommissionStay): number {
  return stay.list_amount ?? stay.total_amount + stay.guest_discount_amount;
}

function paysThisMonth(stay: CommissionStay, month: string): boolean {
  return stay.status === "confirmed" && stay.check_in.slice(0, 7) === month;
}

function money(stays: CommissionStay[], month: string) {
  const counted = stays.filter((stay) => paysThisMonth(stay, month));
  const earned = counted.reduce((sum, stay) => sum + stay.agent_commission_amount, 0);
  const paid = counted.filter((stay) => stay.agent_commission_paid_at).reduce((sum, stay) => sum + stay.agent_commission_amount, 0);
  return { earned, paid, toPay: earned - paid, guests: stays.length, bookings: counted.length };
}

export function CommissionSheet() {
  const [month, setMonth] = useState(istMonthNow());
  const [agents, setAgents] = useState<CommissionAgent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAgents(await ownerCommissionSheet({ data: { month } }));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the commission sheet.");
    }
  }, [month]);

  useEffect(() => {
    setAgents(null);
    void load();
  }, [load]);

  const all = agents?.flatMap((agent) => agent.stays) ?? [];
  const totals = money(all, month);

  async function markOne(stay: CommissionStay) {
    setBusy(stay.id);
    setError(null);
    try {
      await ownerCommissionPaid({ data: { bookingId: stay.id, paid: !stay.agent_commission_paid_at } });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update payment.");
    } finally {
      setBusy(null);
    }
  }

  async function markAgent(agent: CommissionAgent, paid: boolean) {
    const ids = agent.stays
      .filter((stay) => paysThisMonth(stay, month) && Boolean(stay.agent_commission_paid_at) !== paid)
      .map((stay) => stay.id);
    if (!ids.length) return;
    setBusy(agent.code);
    setError(null);
    try {
      await ownerCommissionPaidMany({ data: { bookingIds: ids, paid } });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update payment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1b2a6b]">Agent commission</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5c6570]">
            Every booking made or checking in this month is listed by guest name. Commission is the list price × the agent percent.
            The list price is the room rent before the guest discount. A booking is payable in its check-in month, and only after it is confirmed.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-[#6b7280]">
          Month
          <select
            className="h-10 rounded-md border border-[#d5dbe3] bg-white px-2 text-sm text-[#1c2434]"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            {monthOptions().map((item) => (
              <option key={item} value={item}>
                {monthLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="mt-4 border border-terracotta/40 p-3 text-sm text-terracotta">{error}</p> : null}
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Guests this month", String(totals.guests)],
          ["Commission earned", formatInr(totals.earned)],
          ["Already paid", formatInr(totals.paid)],
          ["Still to pay", formatInr(totals.toPay)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 overflow-hidden rounded-lg border border-[#e4e8ee] bg-white p-3 shadow-sm">
            <dt className="text-xs font-medium text-[#6b7280]">{label}</dt>
            <dd className="mt-1 text-base font-semibold leading-tight text-[#1b2a6b] tabular-nums sm:text-lg">{value}</dd>
          </div>
        ))}
      </dl>
      {!agents ? (
        <div className="glass mt-6 h-40" />
      ) : agents.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No bookings were made or check in during {monthLabel(month)}.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {agents.map((agent) => {
            const agentMoney = money(agent.stays, month);
            return (
              <section key={agent.id}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#1b2a6b]">
                      {agent.code ? `${agent.code} · ` : ""}
                      {agent.agent_percent}% of list price
                    </p>
                    <h2 className="text-lg font-semibold text-[#1b2a6b]">{agent.agent_name}</h2>
                    <p className="mt-1 text-sm text-[#5c6570]">
                      {agent.agent_phone || "No phone"}
                      {agent.agent_email ? ` · ${agent.agent_email}` : ""}
                      {agent.label ? ` · ${agent.label}` : ""}
                    </p>
                    <p className="mt-1 text-sm tabular-nums">
                      This month {formatInr(agentMoney.earned)} · Paid {formatInr(agentMoney.paid)} · To pay {formatInr(agentMoney.toPay)}
                    </p>
                  </div>
                  {agentMoney.toPay > 0 ? (
                    <Button size="sm" variant="ink" disabled={busy === agent.code} onClick={() => markAgent(agent, true)}>
                      Mark month paid
                    </Button>
                  ) : agentMoney.paid > 0 ? (
                    <Button size="sm" variant="outline" disabled={busy === agent.code} onClick={() => markAgent(agent, false)}>
                      Mark month unpaid
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#e4e8ee] bg-white">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-[#1b2a6b] text-left text-[11px] font-medium text-white">
                      <tr>
                        <th className="p-2">Guest</th>
                        <th className="p-2">Booking</th>
                        <th className="p-2">Phone</th>
                        <th className="p-2">Room</th>
                        <th className="p-2">Check-in</th>
                        <th className="p-2">Check-out</th>
                        <th className="p-2">Nights</th>
                        <th className="p-2">List price</th>
                        <th className="p-2">Calculation</th>
                        <th className="p-2">Commission</th>
                        <th className="p-2">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {agent.stays.map((stay) => {
                        const counts = paysThisMonth(stay, month);
                        const list = listPrice(stay);
                        return (
                          <tr key={stay.id} className={cn(!counts && "text-[#6b7280]")}>
                            <td className="p-2 font-semibold text-[#1c2434]">{stay.guest_name}</td>
                            <td className="p-2 font-mono">{stay.id}</td>
                            <td className="p-2 tabular-nums">
                              <a href={`tel:+91${stay.phone}`}>{stay.phone}</a>
                            </td>
                            <td className="p-2">
                              {stay.rooms} × {ROOM_LABELS[stay.room_type] ?? stay.room_type}
                            </td>
                            <td className="p-2">{formatShortDate(stay.check_in)}</td>
                            <td className="p-2">{formatShortDate(stay.check_out)}</td>
                            <td className="p-2 tabular-nums">{stay.nights}</td>
                            <td className="p-2 tabular-nums">{formatInr(list)}</td>
                            <td className="p-2 tabular-nums">
                              {formatInr(list)} × {agent.agent_percent}%
                            </td>
                            <td className="p-2 font-medium tabular-nums">{formatInr(stay.agent_commission_amount)}</td>
                            <td className="p-2">
                              {counts && agent.agent_percent > 0 ? (
                                <Button
                                  size="sm"
                                  variant={stay.agent_commission_paid_at ? "outline" : "ink"}
                                  disabled={busy === stay.id}
                                  onClick={() => markOne(stay)}
                                >
                                  {stay.agent_commission_paid_at ? "Paid" : "Unpaid"}
                                </Button>
                              ) : stay.status !== "confirmed" ? (
                                "Not confirmed"
                              ) : (
                                `Pays in ${monthLabel(stay.check_in.slice(0, 7))}`
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
