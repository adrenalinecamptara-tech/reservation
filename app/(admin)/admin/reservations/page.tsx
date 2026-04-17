import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { listReservations } from "@/lib/services/reservationService";
import { DeleteReservationButton } from "@/components/admin/reservations/DeleteReservationButton";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Na čekanju", color: "#e8a030" },
  approved:  { label: "Odobreno",   color: "#3aaa70" },
  cancelled: { label: "Otkazano",   color: "#c44a5a" },
  modified:  { label: "Izmenjeno",  color: "#5a70c0" },
};

interface Props {
  searchParams: { status?: string; search?: string };
}

export default async function ReservationsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const params = await Promise.resolve(searchParams);
  const reservations = await listReservations({
    status: params.status || undefined,
    search: params.search || undefined,
  });

  return (
    <div className="adm-res">
      <div className="adm-res-header">
        <div>
          <a href="/admin" className="adm-back">← Dashboard</a>
          <h1 className="adm-res-title">Rezervacije</h1>
        </div>
        <a href="/admin/links" className="adm-btn-new">+ Novi link</a>
      </div>

      {/* Filter bar */}
      <form className="adm-filters" method="GET">
        <div className="adm-filter-status">
          {["", "pending", "approved", "cancelled"].map((s) => (
            <a
              key={s}
              href={`/admin/reservations?status=${s}${params.search ? `&search=${params.search}` : ""}`}
              className={`adm-filter-tab ${params.status === s || (!params.status && s === "") ? "adm-filter-tab--active" : ""}`}
            >
              {s === "" ? "Sve" : STATUS_LABELS[s]?.label ?? s}
            </a>
          ))}
        </div>
        <input
          name="search"
          className="adm-search"
          placeholder="Pretraži ime, email..."
          defaultValue={params.search ?? ""}
        />
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <button type="submit" className="adm-search-btn">Traži</button>
      </form>

      {/* Table */}
      {reservations.length === 0 ? (
        <div className="adm-empty">Nema rezervacija za odabrane filtere.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Gost</th>
                <th>Datum</th>
                <th>Osoba</th>
                <th>Depozit</th>
                <th>Status</th>
                <th>Vaučer #</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const s = STATUS_LABELS[r.status] ?? { label: r.status, color: "#666" };
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="adm-guest-name">{r.first_name} {r.last_name}</div>
                      <div className="adm-guest-email">{r.email}</div>
                    </td>
                    <td>{r.arrival_date}</td>
                    <td>{r.number_of_people}</td>
                    <td>{r.deposit_amount} €</td>
                    <td>
                      <span className="adm-badge" style={{ color: s.color, borderColor: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="adm-voucher-num">{r.voucher_number ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <a href={`/admin/reservations/${r.id}`} className="adm-row-link">
                          Otvori →
                        </a>
                        <DeleteReservationButton id={r.id} name={`${r.first_name} ${r.last_name}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }

        .adm-res { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
        .adm-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 8px; }
        .adm-back:hover { color: rgba(168,213,213,0.8); }
        .adm-res-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
        .adm-res-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; }
        .adm-btn-new { padding: 10px 20px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border-radius: 8px; color: #e8f5f5; font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }

        .adm-filters { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .adm-filter-status { display: flex; gap: 4px; }
        .adm-filter-tab { padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; text-decoration: none; color: rgba(168,213,213,0.5); border: 1px solid rgba(62,140,140,0.15); transition: all 0.2s; }
        .adm-filter-tab:hover, .adm-filter-tab--active { color: #e8f5f5; background: rgba(58,144,144,0.12); border-color: rgba(58,144,144,0.3); }
        .adm-search { flex: 1; min-width: 200px; padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; }
        .adm-search::placeholder { color: rgba(168,213,213,0.25); }
        .adm-search-btn { padding: 8px 16px; background: rgba(58,144,144,0.15); border: 1px solid rgba(58,144,144,0.3); border-radius: 8px; color: rgba(168,213,213,0.8); font-size: 13px; cursor: pointer; }

        .adm-empty { padding: 48px; text-align: center; color: rgba(168,213,213,0.3); font-size: 14px; }

        .adm-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(62,140,140,0.15); }
        .adm-table { width: 100%; border-collapse: collapse; }
        .adm-table thead tr { border-bottom: 1px solid rgba(62,140,140,0.15); }
        .adm-table th { padding: 12px 16px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.4); text-align: left; white-space: nowrap; background: rgba(10,25,25,0.5); }
        .adm-table td { padding: 14px 16px; border-bottom: 1px solid rgba(62,140,140,0.08); vertical-align: middle; font-size: 14px; color: rgba(232,245,245,0.85); }
        .adm-table tbody tr:hover td { background: rgba(58,144,144,0.04); }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        .adm-guest-name { font-weight: 500; color: #e8f5f5; }
        .adm-guest-email { font-size: 12px; color: rgba(168,213,213,0.4); margin-top: 2px; }
        .adm-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; border: 1px solid; background: transparent; letter-spacing: 0.03em; }
        .adm-voucher-num { font-size: 12px; color: rgba(168,213,213,0.4); font-family: monospace; }
        .adm-row-link { font-size: 12px; color: rgba(168,213,213,0.5); text-decoration: none; white-space: nowrap; }
        .adm-row-link:hover { color: #e8f5f5; }
      `}</style>
    </div>
  );
}
