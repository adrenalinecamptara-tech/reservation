import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/services/reservationService";
import { ReferralWheel } from "@/components/admin/dashboard/ReferralWheel";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const data = await getDashboardData();
  const {
    arrivalsToday,
    departuresToday,
    inCampNow,
    weekOccupancy,
    pipeline,
    money,
    partners,
    holds,
    pendingList,
    todayLabel,
    referralStats,
  } = data;

  const occPct = Math.round((inCampNow.people / inCampNow.capacity) * 100);

  return (
    <div className="adm-dash">
      <div className="adm-dash-header">
        <div>
          <h1 className="adm-dash-title">Dashboard</h1>
          <p className="adm-dash-date">{todayLabel}</p>
        </div>
        <a href="/admin/links" className="adm-btn-new">
          + Novi link
        </a>
      </div>

      {/* ── DANAS — akciona traka ───────────────────────────────── */}
      <div className="adm-today">
        <TodayCard
          icon="🛬"
          label="Dolasci danas"
          count={arrivalsToday.length}
          color="#4f9bbf"
        >
          {arrivalsToday.length === 0 ? (
            <div className="adm-today-empty">Nema dolazaka</div>
          ) : (
            arrivalsToday.map((a) => (
              <a
                key={a.id}
                href={`/admin/reservations/${a.id}`}
                className="adm-today-item"
              >
                <span className="adm-today-name">{a.name}</span>
                <span className="adm-today-meta">
                  👥 {a.people}
                  {a.cabin ? ` · ${a.cabin}` : ""}
                </span>
              </a>
            ))
          )}
        </TodayCard>

        <TodayCard
          icon="🛫"
          label="Odlasci danas"
          count={departuresToday.length}
          color="#9b6bd9"
        >
          {departuresToday.length === 0 ? (
            <div className="adm-today-empty">Nema odlazaka</div>
          ) : (
            departuresToday.map((d) => (
              <a
                key={d.id}
                href={`/admin/reservations/${d.id}`}
                className="adm-today-item"
              >
                <span className="adm-today-name">{d.name}</span>
                <span className="adm-today-meta">
                  👥 {d.people}
                  {d.cabin ? ` · ${d.cabin}` : ""}
                </span>
              </a>
            ))
          )}
        </TodayCard>

        <TodayCard
          icon="🏠"
          label="U kampu sada"
          count={`${inCampNow.people}/${inCampNow.capacity}`}
          color={
            occPct >= 90 ? "#c44a5a" : occPct >= 60 ? "#e8a030" : "#3aaa70"
          }
        >
          <div className="adm-today-bar">
            <div
              className="adm-today-bar-fill"
              style={{
                width: `${Math.min(100, occPct)}%`,
                background:
                  occPct >= 90
                    ? "#c44a5a"
                    : occPct >= 60
                      ? "#e8a030"
                      : "#3aaa70",
              }}
            />
          </div>
          <div className="adm-today-meta" style={{ marginTop: 8 }}>
            {occPct}% popunjeno · {inCampNow.reservations}{" "}
            {inCampNow.reservations === 1 ? "rezervacija" : "rezervacija"}
          </div>
        </TodayCard>

        <TodayCard
          icon="⏳"
          label="Čeka tvoju akciju"
          count={pipeline.pending}
          color={pipeline.pending > 0 ? "#e8a030" : "rgba(168,213,213,0.4)"}
          accent={pipeline.pending > 0}
        >
          {pipeline.pending === 0 ? (
            <div className="adm-today-empty">Sve rešeno ✓</div>
          ) : (
            <a
              href="/admin/reservations?status=pending"
              className="adm-today-link"
            >
              Pregledaj na čekanju →
            </a>
          )}
        </TodayCard>
      </div>

      {/* ── SEDMODNEVNA TRAKA ───────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Narednih 7 dana</h2>
        <div className="adm-week">
          {weekOccupancy.map((d) => {
            const pct = Math.round((d.people / d.capacity) * 100);
            const color =
              pct >= 90 ? "#c44a5a" : pct >= 60 ? "#e8a030" : "#3aaa70";
            return (
              <a
                key={d.date}
                href={`/admin/calendar`}
                className="adm-week-cell"
                style={{
                  borderColor: pct > 0 ? color : "rgba(62,140,140,0.15)",
                }}
              >
                <div className="adm-week-day">{d.dayLabel}</div>
                <div className="adm-week-value" style={{ color }}>
                  {d.people}
                  <span className="adm-week-cap">/{d.capacity}</span>
                </div>
                <div className="adm-week-bar">
                  <div
                    className="adm-week-bar-fill"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: color,
                    }}
                  />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── PIPELINE ────────────────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Pipeline</h2>
        <div className="adm-stats">
          <StatCard
            label="Na čekanju"
            value={pipeline.pending}
            color="#e8a030"
            accent={pipeline.pending > 0}
          />
          <StatCard
            label="Odobreno (čeka naplatu)"
            value={pipeline.approvedUnpaid}
            color="#4f9bbf"
          />
          <StatCard label="Naplaćeno" value={pipeline.paid} color="#16a34a" />
          <StatCard
            label="Otkazano"
            value={pipeline.cancelled}
            color="#c44a5a"
          />
        </div>
      </div>

      {/* ── PARE ────────────────────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Finansije</h2>
        <div className="adm-stats">
          <StatCard
            label="Ukupni depoziti"
            value={`${money.totalDeposits.toFixed(0)} €`}
            color="#3a9090"
          />
          <StatCard
            label="Naplaćeno"
            value={`${money.totalRevenue.toFixed(0)} €`}
            color="#16a34a"
          />
          <StatCard
            label="Treba naplatiti"
            value={`${money.outstandingRevenue.toFixed(0)} €`}
            color="#e8a030"
            accent={money.outstandingRevenue > 0}
          />
          <StatCard
            label="Prosek po rezervaciji"
            value={`${money.avgPerReservation.toFixed(0)} €`}
            color="#5a70b0"
          />
        </div>
      </div>

      {/* ── KANAL DOLASKA ───────────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Kanal dolaska</h2>
        <div className="adm-card-plain">
          <ReferralWheel stats={referralStats} />
        </div>
      </div>

      {/* ── PARTNERI ────────────────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Partneri</h2>
        <div className="adm-stats">
          <StatCard
            label="Rezervacije partnera"
            value={partners.bookingsCount}
            color="#a78bfa"
          />
          <StatCard
            label="Ljudi (partneri)"
            value={partners.peopleCount}
            color="#a78bfa"
          />
          <StatCard
            label="Zarada od partnera"
            value={`${partners.revenue.toFixed(0)} €`}
            color="#8b5cf6"
          />
          <a href="/admin/partners" className="adm-stat adm-stat-link">
            <div
              className="adm-stat-value"
              style={{ color: "#8b5cf6", fontSize: 16 }}
            >
              Upravljaj →
            </div>
            <div className="adm-stat-label">Dodaj / obriši</div>
          </a>
        </div>
      </div>

      {/* ── HOLD ───────────────────────────────────────────────── */}
      <div className="adm-section">
        <h2 className="adm-section-title">Hold rezervacije</h2>
        <div className="adm-stats">
          <StatCard label="Ukupno hold" value={holds.total} color="#c7922f" />
          <StatCard label="Aktivni hold" value={holds.active} color="#c7922f" />
          <StatCard
            label="Istekli hold"
            value={holds.expired}
            color="#d05b41"
            accent={holds.expired > 0}
          />
          <a
            href="/admin/holds?filter=expired"
            className="adm-stat adm-stat-link"
          >
            <div
              className="adm-stat-value"
              style={{ color: "#d05b41", fontSize: 16 }}
            >
              Kontaktiraj →
            </div>
            <div className="adm-stat-label">Istekli hold</div>
          </a>
        </div>
      </div>

      {/* ── PENDING LISTA ───────────────────────────────────────── */}
      {pendingList.length > 0 && (
        <div className="adm-section">
          <h2 className="adm-section-title">
            ⏳ Na čekanju ({pendingList.length})
          </h2>
          <div className="adm-pending-list">
            {pendingList.map((r) => (
              <a
                key={r.id}
                href={`/admin/reservations/${r.id}`}
                className="adm-pending-row"
              >
                <div className="adm-pending-name">
                  {r.first_name} {r.last_name}
                </div>
                <div className="adm-pending-meta">
                  <span>📅 {r.arrival_date}</span>
                  <span>👥 {r.number_of_people} osoba</span>
                  <span>💶 {r.deposit_amount} €</span>
                </div>
                <div className="adm-pending-action">Pregledaj →</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── NAVIGACIJA ──────────────────────────────────────────── */}
      <div className="adm-dash-links">
        <a href="/admin/reservations" className="adm-dash-link">
          <span>📋</span>
          <span>Sve rezervacije</span>
        </a>
        <a href="/admin/holds" className="adm-dash-link">
          <span>⏳</span>
          <span>Hold rezervacije</span>
        </a>
        <a href="/admin/calendar" className="adm-dash-link">
          <span>📅</span>
          <span>Kalendar</span>
        </a>
        <a href="/admin/operations" className="adm-dash-link">
          <span>🍳</span>
          <span>Operativa</span>
        </a>
        <a href="/admin/services" className="adm-dash-link">
          <span>💶</span>
          <span>Katalog usluga</span>
        </a>
        <a href="/admin/partners" className="adm-dash-link">
          <span>🤝</span>
          <span>Partneri</span>
        </a>
        <a href="/admin/links" className="adm-dash-link">
          <span>🔗</span>
          <span>Generiši link</span>
        </a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }

        .adm-dash { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
        .adm-dash-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .adm-dash-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: #e8f5f5; }
        .adm-dash-date { font-size: 13px; color: rgba(168,213,213,0.4); margin-top: 4px; text-transform: capitalize; }
        .adm-btn-new { padding: 10px 20px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border-radius: 8px; color: #e8f5f5; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; white-space: nowrap; }
        .adm-btn-new:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(30,92,92,0.4); }

        /* Today bar */
        .adm-today { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
        .adm-today-card { padding: 18px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.18); border-radius: 12px; min-height: 150px; display: flex; flex-direction: column; }
        .adm-today-card--accent { border-color: rgba(232,160,48,0.4); background: rgba(232,160,48,0.06); }
        .adm-today-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .adm-today-icon { font-size: 22px; }
        .adm-today-count { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; line-height: 1; }
        .adm-today-label { font-size: 11px; color: rgba(168,213,213,0.55); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .adm-today-item { display: flex; flex-direction: column; padding: 6px 0; border-top: 1px solid rgba(62,140,140,0.1); text-decoration: none; color: #e8f5f5; transition: color 0.15s; }
        .adm-today-item:first-of-type { border-top: none; }
        .adm-today-item:hover { color: #4f9bbf; }
        .adm-today-name { font-size: 13px; font-weight: 600; }
        .adm-today-meta { font-size: 11px; color: rgba(168,213,213,0.55); }
        .adm-today-empty { font-size: 12px; color: rgba(168,213,213,0.4); font-style: italic; }
        .adm-today-link { font-size: 12px; color: #e8a030; text-decoration: none; font-weight: 500; }
        .adm-today-link:hover { text-decoration: underline; }
        .adm-today-bar { height: 6px; background: rgba(62,140,140,0.15); border-radius: 4px; overflow: hidden; }
        .adm-today-bar-fill { height: 100%; transition: width 0.3s; }

        /* Week strip */
        .adm-section { margin-bottom: 32px; }
        .adm-section-title { font-size: 13px; font-weight: 600; color: rgba(168,213,213,0.6); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .adm-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .adm-week-cell { padding: 14px 10px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 10px; text-decoration: none; color: #e8f5f5; transition: transform 0.15s, border-color 0.15s; display: flex; flex-direction: column; gap: 8px; }
        .adm-week-cell:hover { transform: translateY(-2px); }
        .adm-week-day { font-size: 11px; color: rgba(168,213,213,0.55); text-transform: capitalize; }
        .adm-week-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; line-height: 1; }
        .adm-week-cap { font-size: 12px; color: rgba(168,213,213,0.4); font-weight: 400; }
        .adm-week-bar { height: 4px; background: rgba(62,140,140,0.12); border-radius: 2px; overflow: hidden; }
        .adm-week-bar-fill { height: 100%; transition: width 0.3s; }

        /* Stats */
        .adm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .adm-stat { padding: 18px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; transition: border-color 0.2s; }
        .adm-stat:hover { border-color: rgba(62,140,140,0.3); }
        .adm-stat--accent { border-color: rgba(232,160,48,0.3); }
        .adm-stat-value { font-size: 26px; font-weight: 700; font-family: 'Cormorant Garamond', serif; margin-bottom: 4px; line-height: 1.1; }
        .adm-stat-label { font-size: 11px; color: rgba(168,213,213,0.5); text-transform: uppercase; letter-spacing: 0.08em; }

        /* Pending */
        .adm-pending-list { display: flex; flex-direction: column; gap: 8px; }
        .adm-pending-row { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: rgba(232,160,48,0.06); border: 1px solid rgba(232,160,48,0.2); border-radius: 10px; text-decoration: none; transition: all 0.2s; flex-wrap: wrap; }
        .adm-pending-row:hover { background: rgba(232,160,48,0.1); transform: translateX(2px); }
        .adm-pending-name { font-weight: 600; color: #e8f5f5; min-width: 160px; }
        .adm-pending-meta { display: flex; gap: 12px; font-size: 13px; color: rgba(168,213,213,0.6); flex-wrap: wrap; flex: 1; }
        .adm-pending-action { font-size: 13px; color: rgba(168,213,213,0.5); margin-left: auto; white-space: nowrap; }

        .adm-stat-link { text-decoration: none; display: block; }
        .adm-stat-link:hover { border-color: rgba(139,92,246,0.4); }

        .adm-card-plain { padding: 20px 24px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; }

        /* Nav */
        .adm-dash-links { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .adm-dash-link { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; text-decoration: none; color: rgba(168,213,213,0.7); font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .adm-dash-link:hover { border-color: rgba(62,140,140,0.35); color: #e8f5f5; }
        .adm-dash-link span:first-child { font-size: 20px; }

        @media (max-width: 1000px) {
          .adm-today { grid-template-columns: repeat(2, 1fr); }
          .adm-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 700px) {
          .adm-week { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 700px) {
          .adm-dash-links { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .adm-today { grid-template-columns: 1fr; }
          .adm-stats { grid-template-columns: 1fr 1fr; }
          .adm-week { grid-template-columns: repeat(3, 1fr); }
          .adm-dash-links { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function TodayCard({
  icon,
  label,
  count,
  color,
  accent,
  children,
}: {
  icon: string;
  label: string;
  count: string | number;
  color: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`adm-today-card ${accent ? "adm-today-card--accent" : ""}`}>
      <div className="adm-today-head">
        <span className="adm-today-icon">{icon}</span>
        <span className="adm-today-count" style={{ color }}>
          {count}
        </span>
      </div>
      <div className="adm-today-label">{label}</div>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
      >
        {children}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string | number;
  color: string;
  accent?: boolean;
}) {
  return (
    <div className={`adm-stat ${accent ? "adm-stat--accent" : ""}`}>
      <div className="adm-stat-value" style={{ color }}>
        {value}
      </div>
      <div className="adm-stat-label">{label}</div>
    </div>
  );
}
