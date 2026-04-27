"use client";

import { useEffect, useMemo, useState } from "react";
import type { Floor } from "@/lib/db/types";

export interface AvailabilityUnit {
  cabin_id: string;
  cabin_name: string;
  floor: Floor;
  available: boolean;
  conflict?: { first_name: string; last_name: string };
}

interface UseUnitAvailabilityArgs {
  arrival: string;
  departure: string;
  excludeReservationId?: string;
  excludeHoldId?: string;
}

/**
 * Fetches unit availability for [arrival, departure) od strane klijenta.
 * Vraća sirovu listu, cabinAvail mapu (indeksirana po cabin_id → floor) i flag-ove stanja.
 */
export function useUnitAvailability({
  arrival,
  departure,
  excludeReservationId,
  excludeHoldId,
}: UseUnitAvailabilityArgs) {
  const [availability, setAvailability] = useState<AvailabilityUnit[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!arrival || !departure || arrival >= departure) {
      setAvailability([]);
      return;
    }
    const ctrl = new AbortController();
    setChecking(true);
    const params = new URLSearchParams({ arrival, departure });
    if (excludeReservationId) params.set("exclude", excludeReservationId);
    if (excludeHoldId) params.set("excludeHold", excludeHoldId);
    fetch(`/api/availability?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAvailability(data);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    return () => ctrl.abort();
  }, [arrival, departure, excludeReservationId, excludeHoldId]);

  const cabinAvail = useMemo(() => {
    const map: Record<
      string,
      { ground?: AvailabilityUnit; upper?: AvailabilityUnit }
    > = {};
    for (const u of availability) {
      map[u.cabin_id] = map[u.cabin_id] ?? {};
      map[u.cabin_id][u.floor] = u;
    }
    return map;
  }, [availability]);

  const loaded = availability.length > 0;

  return { availability, cabinAvail, checking, loaded };
}

/**
 * Sufiks za cabin <option>: " - slobodno" / " - delimicno" / " - zauzeto".
 * Prazno ako availability još nije učitano.
 */
export function cabinStatusSuffix(
  cabinId: string,
  cabinAvail: ReturnType<typeof useUnitAvailability>["cabinAvail"],
  loaded: boolean,
): { suffix: string; bothBusy: boolean } {
  if (!loaded) return { suffix: "", bothBusy: false };
  const a = cabinAvail[cabinId];
  if (!a) return { suffix: " - slobodno", bothBusy: false };
  const groundFree = a.ground?.available !== false;
  const upperFree = a.upper?.available !== false;
  if (!groundFree && !upperFree)
    return { suffix: " - zauzeto", bothBusy: true };
  if (!groundFree || !upperFree)
    return { suffix: " - delimicno", bothBusy: false };
  return { suffix: " - slobodno", bothBusy: false };
}
