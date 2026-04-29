"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WeekOperations, GuestRef } from "@/lib/services/operationsService";
import {
  ACTIVITY_LABELS,
  MEAL_LABELS,
  type ActivityType,
  type MealType,
} from "@/lib/constants/activities";

interface Props {
  week: WeekOperations;
  basePath: string; // "/verify" or "/admin/operations"
}

function shiftIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtRange(startIso: string, endExcl: string): string {
  const a = new Date(startIso + "T00:00:00Z");
  const e = new Date(endExcl + "T00:00:00Z");
  e.setUTCDate(e.getUTCDate() - 1);
  const f = (d: Date) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
  return `${f(a)} → ${f(e)}`;
}

export function OperationsView({ week, basePath }: Props) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openActivity, setOpenActivity] = useState<{
    date: string;
    activity: ActivityType;
  } | null>(null);

  const navigate = (newStart: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("start", newStart);
    router.push(url.pathname + url.search);
  };

  return (
    <div className="ops">
      <div className="ops-header">
        <button
          className="ops-nav"
          onClick={() => navigate(shiftIso(week.startIso, -7))}
          aria-label="Prethodna nedelja"
        >
          ←
        </button>
        <div className="ops-title">
          <div className="ops-title-main">Operativa</div>
          <div className="ops-title-sub">
            {fmtRange(week.startIso, week.endIsoExclusive)}
          </div>
        </div>
        <button
          className="ops-nav"
          onClick={() =>
            navigate(new Date().toISOString().slice(0, 10))
          }
        >
          Danas
        </button>
        <button
          className="ops-nav"
          onClick={() => navigate(shiftIso(week.startIso, 7))}
          aria-label="Sledeća nedelja"
        >
          →
        </button>
      </div>

      <div className="ops-days">
        {week.days.map((d) => {
          const totalActivities = Object.entries(d.activities).filter(
            ([, list]) => list && list.length > 0,
          );
          const isOpen = openDay === d.date;
          const dayPeopleArrival = d.arrivals.reduce(
            (s, g) => s + g.people,
            0,
          );
          const dayPeopleDeparture = d.departures.reduce(
            (s, g) => s + g.people,
            0,
          );
          return (
            <div key={d.date} className="ops-day">
              <button
                className="ops-day-head"
                onClick={() => setOpenDay(isOpen ? null : d.date)}
              >
                <span className="ops-day-label">{d.dayLabel}</span>
                <span className="ops-day-summary">
                  <span className="ops-pill ops-pill-arr">
                    ⬆ {dayPeopleArrival}
                  </span>
                  <span className="ops-pill ops-pill-dep">
                    ⬇ {dayPeopleDeparture}
                  </span>
                  <span className="ops-pill ops-pill-cap">
                    🏠 {d.inCampPeople}
                  </span>
                </span>
                <span className="ops-day-toggle">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="ops-day-body">
                  {d.tents.count > 0 && (
                    <div className="ops-tents">
                      <div className="ops-tents-head">
                        ⛺ Šatori — pripremi {d.tents.count}{" "}
                        {d.tents.count === 1 ? "šator" : "šatora"} ({d.tents.people}{" "}
                        {d.tents.people === 1 ? "osoba" : "osoba"})
                      </div>
                      <ul className="ops-tents-list">
                        {d.tents.groups.map((g, i) => (
                          <li key={i}>
                            <strong>{g.guestName}</strong> — {g.people}{" "}
                            {g.people === 1 ? "osoba" : "osoba"} · {g.tents}{" "}
                            {g.tents === 1 ? "šator" : "šatora"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.extraBeds.length > 0 && (
                    <div className="ops-extra-beds">
                      <div className="ops-extra-beds-head">
                        🛏 Dodatni kreveti potrebni
                      </div>
                      <ul className="ops-extra-beds-list">
                        {d.extraBeds.map((eb, i) => (
                          <li key={i}>
                            <strong>
                              {eb.cabinName} ·{" "}
                              {eb.floor === "ground" ? "Prizemlje" : "Sprat"}
                            </strong>{" "}
                            — {eb.occupancy} osoba u sobi sa {eb.capacity}{" "}
                            kreveta. Doneti{" "}
                            <strong>+{eb.occupancy - eb.capacity}</strong>{" "}
                            {eb.occupancy - eb.capacity === 1
                              ? "krevet"
                              : "kreveta"}{" "}
                            ({eb.guestName})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(d.arrivals.length > 0 || d.departures.length > 0) && (
                    <div className="ops-section">
                      {d.arrivals.length > 0 && (
                        <div>
                          <div className="ops-h">
                            ⬆ Dolasci ({dayPeopleArrival})
                          </div>
                          <ul className="ops-list">
                            {d.arrivals.map((g) => (
                              <GuestItem key={g.id} guest={g} />
                            ))}
                          </ul>
                        </div>
                      )}
                      {d.departures.length > 0 && (
                        <div>
                          <div className="ops-h">
                            ⬇ Odlasci ({dayPeopleDeparture})
                          </div>
                          <ul className="ops-list">
                            {d.departures.map((g) => (
                              <GuestItem key={g.id} guest={g} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="ops-meals">
                    {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
                      <div key={m} className="ops-meal">
                        <span className="ops-meal-emoji">
                          {MEAL_LABELS[m].emoji}
                        </span>
                        <span className="ops-meal-label">
                          {MEAL_LABELS[m].label}
                        </span>
                        <span className="ops-meal-count">{d.meals[m]}</span>
                      </div>
                    ))}
                  </div>

                  {totalActivities.length > 0 && (
                    <div className="ops-acts">
                      {totalActivities.map(([act, list]) => {
                        const a = act as ActivityType;
                        const total = (list ?? []).reduce(
                          (s, g) => s + g.people,
                          0,
                        );
                        const isExp =
                          openActivity?.date === d.date &&
                          openActivity?.activity === a;
                        return (
                          <div key={a} className="ops-act-wrap">
                            <button
                              className="ops-act"
                              onClick={() =>
                                setOpenActivity(
                                  isExp ? null : { date: d.date, activity: a },
                                )
                              }
                            >
                              <span>{ACTIVITY_LABELS[a].emoji}</span>
                              <span>{ACTIVITY_LABELS[a].label}</span>
                              <span className="ops-act-count">{total}</span>
                            </button>
                            {isExp && (
                              <ul className="ops-list ops-list-expanded">
                                {(list ?? []).map((g) => (
                                  <GuestItem
                                    key={g.id}
                                    guest={g}
                                    basePath={basePath}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {d.arrivals.length === 0 &&
                    d.departures.length === 0 &&
                    d.inCampPeople === 0 && (
                      <div className="ops-empty">Nema gostiju ovog dana.</div>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .ops { max-width: 900px; margin: 0 auto; padding: 16px; }
        .ops-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 12px 14px; background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.2); border-radius: 12px; }
        .ops-title { flex: 1; text-align: center; }
        .ops-title-main { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #e8f5f5; }
        .ops-title-sub { font-size: 12px; color: rgba(168,213,213,0.5); margin-top: 2px; letter-spacing: 0.05em; }
        .ops-nav { padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-size: 13px; cursor: pointer; }
        .ops-nav:hover { background: rgba(58,144,144,0.12); }

        .ops-days { display: flex; flex-direction: column; gap: 10px; }
        .ops-day { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.18); border-radius: 12px; overflow: hidden; }
        .ops-day-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: transparent; border: none; color: #e8f5f5; font-family: inherit; cursor: pointer; }
        .ops-day-head:hover { background: rgba(58,144,144,0.06); }
        .ops-day-label { flex-shrink: 0; font-size: 14px; font-weight: 600; min-width: 90px; text-align: left; text-transform: capitalize; }
        .ops-day-summary { flex: 1; display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .ops-day-toggle { width: 22px; text-align: center; font-size: 18px; color: rgba(168,213,213,0.55); }

        .ops-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .ops-pill-arr { background: rgba(79,155,191,0.15); color: #9ec9e2; border: 1px solid rgba(79,155,191,0.3); }
        .ops-pill-dep { background: rgba(155,107,217,0.15); color: #c8a9f0; border: 1px solid rgba(155,107,217,0.3); }
        .ops-pill-cap { background: rgba(58,170,112,0.15); color: #a7e8c5; border: 1px solid rgba(58,170,112,0.3); }

        .ops-day-body { padding: 12px 16px 16px; border-top: 1px solid rgba(62,140,140,0.15); display: flex; flex-direction: column; gap: 14px; }
        .ops-section { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .ops-section { grid-template-columns: 1fr; } }
        .ops-h { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.55); margin-bottom: 6px; }

        .ops-list { list-style: none; display: flex; flex-direction: column; gap: 4px; padding: 0; }
        .ops-list-expanded { margin-top: 8px; padding: 8px 10px; background: rgba(0,0,0,0.25); border-radius: 6px; }
        .ops-guest { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: rgba(232,245,245,0.85); padding: 6px 8px; border-radius: 6px; }
        .ops-guest:hover { background: rgba(58,144,144,0.08); }
        .ops-guest-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .ops-guest-line { display: flex; align-items: center; gap: 8px; }
        .ops-guest-acc { font-size: 11px; color: rgba(168,213,213,0.55); padding-left: 22px; }
        .ops-guest-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 700; letter-spacing: 0.05em; }
        .ops-guest-tag-partner { background: rgba(139,92,246,0.18); color: #c8a9f0; }
        .ops-guest-link { color: inherit; text-decoration: none; flex: 1; display: block; }
        .ops-guest-people { color: rgba(168,213,213,0.55); font-size: 12px; }

        .ops-meals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ops-meal { display: flex; flex-direction: column; align-items: center; padding: 12px 10px; background: rgba(58,144,144,0.06); border: 1px solid rgba(62,140,140,0.18); border-radius: 10px; }
        .ops-meal-emoji { font-size: 22px; }
        .ops-meal-label { font-size: 11px; color: rgba(168,213,213,0.55); margin-top: 4px; }
        .ops-meal-count { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 700; color: #e8f5f5; margin-top: 2px; }

        .ops-acts { display: flex; flex-wrap: wrap; gap: 6px; }
        .ops-act-wrap { width: 100%; }
        .ops-act { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(232,160,48,0.1); border: 1px solid rgba(232,160,48,0.3); border-radius: 999px; color: #f0c87a; font-size: 13px; font-family: inherit; cursor: pointer; }
        .ops-act:hover { background: rgba(232,160,48,0.18); }
        .ops-act-count { background: rgba(232,160,48,0.25); padding: 1px 7px; border-radius: 999px; font-weight: 700; font-size: 12px; }

        .ops-empty { font-size: 13px; color: rgba(168,213,213,0.45); font-style: italic; padding: 8px; }

        .ops-extra-beds { padding: 12px 14px; background: rgba(232,160,48,0.12); border: 1px solid rgba(232,160,48,0.45); border-radius: 10px; }
        .ops-extra-beds-head { font-size: 12px; font-weight: 700; color: #f0c87a; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
        .ops-extra-beds-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: rgba(232,245,245,0.9); }
        .ops-extra-beds-list strong { color: #ffd89a; }

        .ops-tents { padding: 12px 14px; background: rgba(58,170,112,0.1); border: 1px solid rgba(58,170,112,0.4); border-radius: 10px; }
        .ops-tents-head { font-size: 12px; font-weight: 700; color: #a7e8c5; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
        .ops-tents-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: rgba(232,245,245,0.9); }
        .ops-tents-list strong { color: #c8f5dc; }
      `}</style>
    </div>
  );
}

function GuestItem({
  guest,
  basePath,
}: {
  guest: GuestRef;
  basePath?: string;
}) {
  const inner = (
    <div className="ops-guest-body">
      <div className="ops-guest-line">
        <span className="ops-guest-people">👥 {guest.people}</span>
        <span>{guest.name}</span>
        {guest.kind === "partner" && (
          <span className="ops-guest-tag ops-guest-tag-partner">PARTNER</span>
        )}
      </div>
      {guest.accommodation && (
        <div className="ops-guest-acc">{guest.accommodation}</div>
      )}
    </div>
  );
  // Worker dashboard ne treba da linkuje na admin, samo prikazuje. Admin link
  // ka rezervacijama je samo iz /admin/operations.
  if (basePath === "/admin/operations" && guest.kind === "guest") {
    return (
      <li className="ops-guest">
        <a
          href={`/admin/reservations/${guest.id}`}
          className="ops-guest-link"
        >
          {inner}
        </a>
      </li>
    );
  }
  return <li className="ops-guest">{inner}</li>;
}
