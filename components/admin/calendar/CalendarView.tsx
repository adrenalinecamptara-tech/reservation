"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OccupiedReservation } from "@/lib/services/calendarService";
import type { Cabin, Floor } from "@/lib/db/types";

interface Props {
  year: number;
  month: number;
  reservations: OccupiedReservation[];
  cabins: Cabin[];
}

const MONTH_NAMES = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const DAY_SHORT = ["N", "P", "U", "S", "Č", "P", "S"];

interface UnitRow {
  cabin_id: string;
  cabin_name: string;
  floor: Floor;
  label: string;
  beds: number;
}

interface Bar {
  reservation: OccupiedReservation;
  startIdx: number;
  span: number;
  leftPct: number;
  widthPct: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysLocal(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, toExclusive: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(toExclusive + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

function weekdayIndex(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

function isWeekend(iso: string): boolean {
  const w = weekdayIndex(iso);
  return w === 0 || w === 6;
}

function formatDateRange(arrival: string, departure: string): string {
  const a = new Date(arrival + "T00:00:00Z");
  const d = new Date(departure + "T00:00:00Z");
  const fmt = (dt: Date) => `${dt.getUTCDate()}.${dt.getUTCMonth() + 1}.`;
  return `${fmt(a)} → ${fmt(d)}`;
}

function statusMeta(r: OccupiedReservation) {
  if (r.kind === "partner") return { label: "Partner", bg: "#4c1d95", text: "#e9d5ff", border: "#8b5cf6" };
  if (r.status === "pending") return { label: "Na čekanju", bg: "#6b4a18", text: "#ffd89a", border: "#a47324" };
  if (r.status === "modified") return { label: "Izmenjeno", bg: "#1e4c6c", text: "#bfddff", border: "#3b78a8" };
  if (r.status === "paid") return { label: "Naplaćeno", bg: "#0f5132", text: "#a7f3c4", border: "#16a34a" };
  return { label: "Odobreno", bg: "#164e63", text: "#bee5f0", border: "#0e7490" };
}

function displayName(r: OccupiedReservation): string {
  if (r.kind === "partner") return r.partner_name ?? r.first_name;
  return `${r.first_name} ${r.last_name}`.trim();
}

export function CalendarView({ year, month, reservations, cabins }: Props) {
  const router = useRouter();

  const monthStart = `${year}-${pad(month)}-01`;
  const totalDays = new Date(year, month, 0).getDate();
  const monthEndExclusive = addDaysLocal(monthStart, totalDays);

  const days: string[] = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < totalDays; i++) out.push(addDaysLocal(monthStart, i));
    return out;
  }, [monthStart, totalDays]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const units: UnitRow[] = useMemo(() => {
    const rows: UnitRow[] = [];
    for (const c of cabins) {
      rows.push({
        cabin_id: c.id,
        cabin_name: c.name,
        floor: "ground",
        label: `${c.name} – Prizemlje`,
        beds: c.ground_beds,
      });
      rows.push({
        cabin_id: c.id,
        cabin_name: c.name,
        floor: "upper",
        label: `${c.name} – Sprat`,
        beds: c.upper_beds,
      });
    }
    return rows;
  }, [cabins]);

  const barsByUnit: Map<string, Bar[]> = useMemo(() => {
    const map = new Map<string, Bar[]>();
    for (const r of reservations) {
      const start = r.arrival < monthStart ? monthStart : r.arrival;
      const endExcl = r.departure > monthEndExclusive ? monthEndExclusive : r.departure;
      if (start >= endExcl) continue;
      const startIdx = daysBetween(monthStart, start);
      const span = daysBetween(start, endExcl);
      const bar: Bar = {
        reservation: r,
        startIdx,
        span,
        leftPct: (startIdx / totalDays) * 100,
        widthPct: (span / totalDays) * 100,
        clippedLeft: r.arrival < monthStart,
        clippedRight: r.departure > monthEndExclusive,
      };
      const key = `${r.cabin_id}:${r.floor}`;
      const list = map.get(key) ?? [];
      list.push(bar);
      map.set(key, list);
    }
    return map;
  }, [reservations, monthStart, monthEndExclusive, totalDays]);

  const prevHref = (() => {
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    return `/admin/calendar?year=${prev.y}&month=${prev.m}`;
  })();
  const nextHref = (() => {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    return `/admin/calendar?year=${next.y}&month=${next.m}`;
  })();
  const todayHref = `/admin/calendar?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`;

  // ── Mobile: selected day ──
  const defaultMobileDay =
    days.find((d) => d === todayIso) ?? days[0];
  const [mobileDay, setMobileDay] = useState(defaultMobileDay);

  const unitsForDay = (dayIso: string) => {
    return units.map((u) => {
      const key = `${u.cabin_id}:${u.floor}`;
      const bars = barsByUnit.get(key) ?? [];
      const bar = bars.find(
        (b) =>
          b.reservation.arrival <= dayIso && b.reservation.departure > dayIso
      );
      return { unit: u, reservation: bar?.reservation ?? null };
    });
  };

  return (
    <div className="cal-root">
      {/* Month navigator */}
      <div className="cal-nav">
        <a href={prevHref} className="cal-nav-btn" aria-label="Prethodni mesec">←</a>
        <div className="cal-nav-title">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <a href={todayHref} className="cal-nav-today">Danas</a>
        <a href={nextHref} className="cal-nav-btn" aria-label="Sledeći mesec">→</a>
      </div>

      {/* ── Desktop Gantt ── */}
      <div className="cal-gantt">
        <div className="cal-gantt-wrap">
          {/* Header row: day numbers */}
          <div className="cal-gantt-row cal-gantt-header-row">
            <div className="cal-gantt-label cal-gantt-header-label">Jedinica</div>
            <div className="cal-gantt-track" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(30px, 1fr))` }}>
              {days.map((d) => {
                const dNum = d.slice(8, 10);
                const w = weekdayIndex(d);
                const wk = isWeekend(d);
                const today = d === todayIso;
                return (
                  <div
                    key={d}
                    className={`cal-gantt-cell-hd ${wk ? "cal-hd-wknd" : ""} ${today ? "cal-hd-today" : ""}`}
                  >
                    <div className="cal-hd-dnum">{dNum}</div>
                    <div className="cal-hd-dname">{DAY_SHORT[w]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unit rows */}
          {units.map((u) => {
            const key = `${u.cabin_id}:${u.floor}`;
            const bars = barsByUnit.get(key) ?? [];
            return (
              <div className="cal-gantt-row" key={key}>
                <div className="cal-gantt-label" title={u.label}>
                  <div className="cal-gantt-label-name">{u.cabin_name}</div>
                  <div className="cal-gantt-label-floor">
                    {u.floor === "ground" ? "Prizemlje" : "Sprat"}
                    <span className="cal-gantt-label-beds"> · {u.beds} mesta</span>
                  </div>
                </div>
                <div
                  className="cal-gantt-track"
                  style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(30px, 1fr))` }}
                >
                  {days.map((d) => (
                    <div
                      key={d}
                      className={`cal-gantt-cell ${isWeekend(d) ? "cal-cell-wknd" : ""} ${d === todayIso ? "cal-cell-today" : ""}`}
                    />
                  ))}
                  {bars.map((bar) => {
                    const meta = statusMeta(bar.reservation);
                    return (
                      <button
                        key={`${bar.reservation.kind}-${bar.reservation.id}`}
                        className="cal-bar"
                        style={{
                          left: `${bar.leftPct}%`,
                          width: `calc(${bar.widthPct}% - 4px)`,
                          background: meta.bg,
                          color: meta.text,
                          borderColor: meta.border,
                          borderLeftWidth: bar.clippedLeft ? 0 : 1,
                          borderRightWidth: bar.clippedRight ? 0 : 1,
                          borderTopLeftRadius: bar.clippedLeft ? 0 : 4,
                          borderBottomLeftRadius: bar.clippedLeft ? 0 : 4,
                          borderTopRightRadius: bar.clippedRight ? 0 : 4,
                          borderBottomRightRadius: bar.clippedRight ? 0 : 4,
                        }}
                        onClick={() => {
                          if (bar.reservation.kind === "partner") router.push(`/admin/partners`);
                          else router.push(`/admin/reservations/${bar.reservation.id}`);
                        }}
                        onMouseEnter={(e) => showTip(e.currentTarget, bar.reservation)}
                        onMouseLeave={hideTip}
                      >
                        <span className="cal-bar-text">
                          {displayName(bar.reservation)}
                          <span className="cal-bar-meta"> · {bar.reservation.number_of_people}p</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip (singleton) */}
      <div id="cal-tip" className="cal-tip" />

      {/* ── Mobile day view ── */}
      <div className="cal-mobile">
        <div className="cal-mobile-strip">
          {days.map((d) => {
            const dNum = d.slice(8, 10);
            const w = weekdayIndex(d);
            const wk = isWeekend(d);
            const today = d === todayIso;
            const selected = d === mobileDay;
            const occupiedCount = units.filter((u) => {
              const key = `${u.cabin_id}:${u.floor}`;
              return (barsByUnit.get(key) ?? []).some(
                (b) => b.reservation.arrival <= d && b.reservation.departure > d
              );
            }).length;
            return (
              <button
                key={d}
                onClick={() => setMobileDay(d)}
                className={`cal-mday ${wk ? "cal-mday-wknd" : ""} ${today ? "cal-mday-today" : ""} ${selected ? "cal-mday-sel" : ""}`}
              >
                <div className="cal-mday-name">{DAY_SHORT[w]}</div>
                <div className="cal-mday-num">{dNum}</div>
                <div className="cal-mday-dots">
                  {Array.from({ length: Math.min(occupiedCount, units.length) }).map((_, i) => (
                    <span key={i} className="cal-mday-dot" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="cal-mobile-panel">
          <div className="cal-mobile-panel-title">
            {mobileDay.slice(8, 10)}. {MONTH_NAMES[month - 1]} {year}
          </div>
          <div className="cal-mobile-units">
            {unitsForDay(mobileDay).map(({ unit, reservation }) => {
              const key = `${unit.cabin_id}:${unit.floor}`;
              if (!reservation) {
                return (
                  <div key={key} className="cal-munit cal-munit-free">
                    <div className="cal-munit-label">{unit.label}</div>
                    <div className="cal-munit-status cal-status-free">Slobodno</div>
                  </div>
                );
              }
              const meta = statusMeta(reservation);
              const href = reservation.kind === "partner" ? `/admin/partners` : `/admin/reservations/${reservation.id}`;
              return (
                <a
                  key={key}
                  href={href}
                  className="cal-munit cal-munit-booked"
                  style={{ borderColor: meta.border }}
                >
                  <div className="cal-munit-label">{unit.label}</div>
                  <div className="cal-munit-guest">
                    {displayName(reservation)}
                  </div>
                  <div className="cal-munit-meta">
                    {reservation.number_of_people} osoba · {formatDateRange(reservation.arrival, reservation.departure)}
                  </div>
                  <div
                    className="cal-munit-badge"
                    style={{ background: meta.bg, color: meta.text }}
                  >
                    {meta.label}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <div className="cal-legend-item"><span className="cal-sw" style={{ background: "#164e63" }} /> Odobreno</div>
        <div className="cal-legend-item"><span className="cal-sw" style={{ background: "#0f5132" }} /> Naplaćeno</div>
        <div className="cal-legend-item"><span className="cal-sw" style={{ background: "#1e4c6c" }} /> Izmenjeno</div>
        <div className="cal-legend-item"><span className="cal-sw" style={{ background: "#6b4a18" }} /> Na čekanju</div>
        <div className="cal-legend-item"><span className="cal-sw" style={{ background: "#4c1d95" }} /> Partner</div>
      </div>

      <style>{`
        .cal-root { width: 100%; min-width: 0; max-width: 100%; overflow-x: hidden; }

        .cal-nav { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 18px; }
        .cal-nav-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 700; color: #e8f5f5; min-width: 200px; text-align: center; }
        .cal-nav-btn { width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(62,140,140,0.2); color: rgba(168,213,213,0.8); font-size: 16px; text-decoration: none; transition: all 0.15s; }
        .cal-nav-btn:hover { background: rgba(58,144,144,0.15); color: #e8f5f5; }
        .cal-nav-today { padding: 7px 14px; background: rgba(58,144,144,0.15); border: 1px solid rgba(58,144,144,0.3); border-radius: 8px; color: rgba(168,213,213,0.9); font-size: 12px; font-weight: 600; text-decoration: none; }
        .cal-nav-today:hover { background: rgba(58,144,144,0.25); color: #e8f5f5; }

        /* ── Desktop Gantt ── */
        .cal-gantt { display: block; background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 8px; overflow-x: auto; }
        .cal-gantt-wrap { min-width: 900px; }
        .cal-gantt-row { display: grid; grid-template-columns: 180px 1fr; min-height: 42px; }
        .cal-gantt-header-row { min-height: 44px; border-bottom: 1px solid rgba(62,140,140,0.2); margin-bottom: 4px; }
        .cal-gantt-label { display: flex; flex-direction: column; justify-content: center; padding: 6px 10px; font-size: 12px; color: #e8f5f5; border-right: 1px solid rgba(62,140,140,0.12); }
        .cal-gantt-header-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.4); }
        .cal-gantt-label-name { font-weight: 600; font-size: 13px; }
        .cal-gantt-label-floor { font-size: 11px; color: rgba(168,213,213,0.5); margin-top: 2px; }
        .cal-gantt-label-beds { color: rgba(168,213,213,0.35); }

        .cal-gantt-track { position: relative; display: grid; padding: 4px 0; }
        .cal-gantt-cell { border-left: 1px solid rgba(62,140,140,0.06); min-height: 34px; }
        .cal-gantt-cell:first-child { border-left: none; }
        .cal-cell-wknd { background: rgba(58,144,144,0.04); }
        .cal-cell-today { background: rgba(232,160,48,0.08); }

        .cal-gantt-cell-hd { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; color: rgba(168,213,213,0.6); border-left: 1px solid rgba(62,140,140,0.06); padding: 6px 0; }
        .cal-gantt-cell-hd:first-child { border-left: none; }
        .cal-hd-wknd { color: rgba(232,160,48,0.7); }
        .cal-hd-today { background: rgba(232,160,48,0.12); border-radius: 4px; color: #ffd89a; font-weight: 700; }
        .cal-hd-dnum { font-size: 13px; font-weight: 600; color: inherit; }
        .cal-hd-dname { font-size: 9px; opacity: 0.7; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.05em; }

        .cal-bar { position: absolute; top: 5px; height: 32px; border-radius: 4px; border-style: solid; padding: 0 8px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; line-height: 32px; overflow: hidden; white-space: nowrap; text-align: left; cursor: pointer; transition: filter 0.15s, transform 0.15s; }
        .cal-bar:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .cal-bar-text { pointer-events: none; }
        .cal-bar-meta { opacity: 0.75; font-weight: 500; margin-left: 2px; }

        /* Tooltip */
        .cal-tip { position: fixed; pointer-events: none; display: none; background: rgba(8,16,16,0.96); border: 1px solid rgba(58,144,144,0.3); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #e8f5f5; box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 1000; max-width: 260px; line-height: 1.5; }

        /* ── Mobile ── */
        .cal-mobile { display: none; margin-top: 0; width: 100%; max-width: 100%; min-width: 0; }
        .cal-mobile-strip { display: flex; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 4px 2px 12px; scrollbar-width: none; width: 100%; max-width: 100%; min-width: 0; }
        .cal-mobile-strip::-webkit-scrollbar { display: none; }
        .cal-mday { flex: 0 0 auto; min-width: 48px; padding: 6px 4px 8px; background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 10px; color: rgba(168,213,213,0.8); font-family: 'DM Sans', sans-serif; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .cal-mday-wknd { border-color: rgba(232,160,48,0.2); }
        .cal-mday-today { background: rgba(232,160,48,0.1); }
        .cal-mday-sel { background: rgba(58,144,144,0.2); border-color: rgba(58,144,144,0.5); color: #e8f5f5; }
        .cal-mday-name { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
        .cal-mday-num { font-size: 16px; font-weight: 700; }
        .cal-mday-dots { display: flex; gap: 2px; height: 6px; margin-top: 2px; }
        .cal-mday-dot { width: 4px; height: 4px; background: #3aaa70; border-radius: 50%; }

        .cal-mobile-panel { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 14px; margin-top: 10px; }
        .cal-mobile-panel-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 700; color: #e8f5f5; margin-bottom: 10px; text-transform: capitalize; }
        .cal-mobile-units { display: flex; flex-direction: column; gap: 8px; }
        .cal-munit { padding: 10px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(62,140,140,0.12); border-radius: 8px; text-decoration: none; color: #e8f5f5; position: relative; display: block; }
        .cal-munit-free { opacity: 0.6; }
        .cal-munit-booked { display: block; }
        .cal-munit-label { font-size: 12px; color: rgba(168,213,213,0.6); margin-bottom: 2px; }
        .cal-munit-guest { font-size: 14px; font-weight: 600; color: #e8f5f5; }
        .cal-munit-meta { font-size: 11px; color: rgba(168,213,213,0.5); margin-top: 3px; }
        .cal-munit-status { font-size: 13px; color: rgba(168,213,213,0.5); }
        .cal-status-free { color: rgba(168,213,213,0.4); font-style: italic; }
        .cal-munit-badge { position: absolute; top: 10px; right: 10px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }

        /* Legend */
        .cal-legend { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; padding: 0 4px; }
        .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(168,213,213,0.5); }
        .cal-sw { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }

        /* Responsive switch */
        @media (max-width: 900px) {
          .cal-gantt { display: none; }
          .cal-mobile { display: block; }
          .cal-legend { display: none; }
        }
      `}</style>
    </div>
  );
}

// ── Tooltip logic (singleton DOM node) ──
function showTip(anchor: HTMLElement, r: OccupiedReservation) {
  if (typeof document === "undefined") return;
  const tip = document.getElementById("cal-tip");
  if (!tip) return;
  const meta = statusMeta(r);
  const name = r.kind === "partner" ? (r.partner_name ?? r.first_name) : `${r.first_name} ${r.last_name}`;
  tip.innerHTML = `
    <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${escape(name)}</div>
    <div style="color:rgba(168,213,213,0.7);margin-bottom:2px;">${formatDateRange(r.arrival, r.departure)}</div>
    <div style="color:rgba(168,213,213,0.7);margin-bottom:2px;">${r.number_of_people} osoba${r.package_type ? " · " + escape(r.package_type) : ""}</div>
    <div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:4px;background:${meta.bg};color:${meta.text};font-size:10px;font-weight:700;">${meta.label}</div>
    ${r.voucher_number ? `<div style="margin-top:6px;font-size:10px;color:rgba(168,213,213,0.4);font-family:monospace;">${escape(r.voucher_number)}</div>` : ""}
  `;
  const rect = anchor.getBoundingClientRect();
  tip.style.display = "block";
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  const top = rect.top - tipRect.height - 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${top < 8 ? rect.bottom + 8 : top}px`;
}

function hideTip() {
  if (typeof document === "undefined") return;
  const tip = document.getElementById("cal-tip");
  if (tip) tip.style.display = "none";
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] ?? c));
}
