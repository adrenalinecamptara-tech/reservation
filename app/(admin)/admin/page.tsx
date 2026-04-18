import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { getStats } from "@/lib/services/reservationService";
import { listReservations } from "@/lib/services/reservationService";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [stats, recent] = await Promise.all([
    getStats(),
    listReservations({ status: "pending" }),
  ]);

  const today = new Date().toLocaleDateString("sr-Latn-RS", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="adm-dash">
      <div className="adm-dash-header">
        <div>
          <h1 className="adm-dash-title">Dashboard</h1>
          <p className="adm-dash-date">{today}</p>
        </div>
        <a href="/admin/links" className="adm-btn-new">+ Novi link</a>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <StatCard label="Ukupno rezervacija" value={stats.total} color="#3a9090" />
        <StatCard label="Na čekanju" value={stats.pending} color="#e8a030" accent />
        <StatCard label="Odobreno" value={stats.approved} color="#3a9060" />
        <StatCard label="Ukupno gostiju" value={stats.totalPeople} color="#5a70b0" />
        <StatCard
          label="Ukupni depoziti"
          value={`${stats.totalDeposits.toFixed(0)} €`}
          color="#3a9090"
        />
        <StatCard
          label={`Naplaćeno (${stats.paid})`}
          value={`${stats.totalRevenue.toFixed(0)} €`}
          color="#3aaa70"
        />
        <StatCard
          label="Kapacitet (40 ležaja)"
          value={`${stats.totalPeople}/40`}
          color={stats.totalPeople >= 36 ? "#c41e3a" : "#3a9090"}
        />
      </div>

      {/* Pending reservations */}
      {recent.length > 0 && (
        <div className="adm-pending">
          <h2 className="adm-section-title">
            ⏳ Na čekanju ({recent.length})
          </h2>
          <div className="adm-pending-list">
            {recent.map((r) => (
              <a key={r.id} href={`/admin/reservations/${r.id}`} className="adm-pending-row">
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

      <div className="adm-dash-links">
        <a href="/admin/reservations" className="adm-dash-link">
          <span>📋</span>
          <span>Sve rezervacije</span>
        </a>
        <a href="/admin/calendar" className="adm-dash-link">
          <span>📅</span>
          <span>Kalendar</span>
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

        .adm-dash { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
        .adm-dash-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; flex-wrap: wrap; gap: 16px; }
        .adm-dash-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: #e8f5f5; }
        .adm-dash-date { font-size: 13px; color: rgba(168,213,213,0.4); margin-top: 4px; text-transform: capitalize; }
        .adm-btn-new { padding: 10px 20px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border-radius: 8px; color: #e8f5f5; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; white-space: nowrap; }
        .adm-btn-new:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(30,92,92,0.4); }

        .adm-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 40px; }
        .adm-stat { padding: 20px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; transition: border-color 0.2s; }
        .adm-stat:hover { border-color: rgba(62,140,140,0.3); }
        .adm-stat--accent { border-color: rgba(232,160,48,0.3); }
        .adm-stat-value { font-size: 28px; font-weight: 700; font-family: 'Cormorant Garamond', serif; margin-bottom: 4px; }
        .adm-stat-label { font-size: 11px; color: rgba(168,213,213,0.5); text-transform: uppercase; letter-spacing: 0.08em; }

        .adm-section-title { font-size: 14px; font-weight: 600; color: rgba(168,213,213,0.6); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }

        .adm-pending { margin-bottom: 40px; }
        .adm-pending-list { display: flex; flex-direction: column; gap: 8px; }
        .adm-pending-row { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: rgba(232,160,48,0.06); border: 1px solid rgba(232,160,48,0.2); border-radius: 10px; text-decoration: none; transition: all 0.2s; flex-wrap: wrap; }
        .adm-pending-row:hover { background: rgba(232,160,48,0.1); transform: translateX(2px); }
        .adm-pending-name { font-weight: 600; color: #e8f5f5; min-width: 160px; }
        .adm-pending-meta { display: flex; gap: 12px; font-size: 13px; color: rgba(168,213,213,0.6); flex-wrap: wrap; flex: 1; }
        .adm-pending-action { font-size: 13px; color: rgba(168,213,213,0.5); margin-left: auto; white-space: nowrap; }

        .adm-dash-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .adm-dash-link { display: flex; align-items: center; gap: 12px; padding: 18px 20px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; text-decoration: none; color: rgba(168,213,213,0.7); font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .adm-dash-link:hover { border-color: rgba(62,140,140,0.35); color: #e8f5f5; }
        .adm-dash-link span:first-child { font-size: 20px; }

        @media (max-width: 600px) { .adm-dash-links { grid-template-columns: 1fr; } }
        @media (max-width: 800px) and (min-width: 601px) { .adm-dash-links { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color, accent }: { label: string; value: string | number; color: string; accent?: boolean }) {
  return (
    <div className={`adm-stat ${accent ? "adm-stat--accent" : ""}`}>
      <div className="adm-stat-value" style={{ color }}>{value}</div>
      <div className="adm-stat-label">{label}</div>
    </div>
  );
}
