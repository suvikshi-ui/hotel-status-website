import type { HotelStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: HotelStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium tracking-wide",
        status.kind === "open" && "bg-success/12 text-success",
        status.kind === "filling" && "bg-warn/12 text-warn",
        status.kind === "last" && "bg-terracotta/12 text-terracotta",
        status.kind === "full" && "bg-paper-2 text-muted",
      )}
    >
      {status.label}
    </span>
  );
}
