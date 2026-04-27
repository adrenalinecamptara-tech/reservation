import type { HoldStatus, ReservationHold } from "@/lib/db/types";

export function getEffectiveHoldStatus(
  row: Pick<ReservationHold, "status" | "hold_until_date">,
  todayIso = new Date().toISOString().slice(0, 10),
): HoldStatus {
  if (row.status === "active" && row.hold_until_date < todayIso)
    return "expired";
  return row.status;
}
