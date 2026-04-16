import { createClient } from "@/lib/db/supabase";
import { redirect, notFound } from "next/navigation";
import { getReservation } from "@/lib/services/reservationService";
import { listCabins } from "@/lib/services/cabinService";
import { getSignedDownloadUrl } from "@/lib/services/storageService";
import { ReservationActions } from "@/components/admin/reservations/ReservationActions";

interface Props {
  params: { id: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Na čekanju", color: "#e8a030" },
  approved:  { label: "Odobreno",   color: "#3aaa70" },
  cancelled: { label: "Otkazano",   color: "#c44a5a" },
  modified:  { label: "Izmenjeno",  color: "#5a70c0" },
};

export default async function ReservationDetailPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { id } = await Promise.resolve(params);

  let reservation, cabins, proofUrl: string | null = null;
  try {
    [reservation, cabins] = await Promise.all([getReservation(id), listCabins()]);
    if (reservation.payment_proof_path) {
      proofUrl = await getSignedDownloadUrl(reservation.payment_proof_path).catch(() => null);
    }
  } catch {
    notFound();
  }

  const s = STATUS_LABELS[reservation.status] ?? { label: reservation.status, color: "#666" };

  return (
    <div className="adm-det">
      <div className="adm-det-top">
        <a href="/admin/reservations" className="adm-back">← Sve rezervacije</a>
        <div className="adm-det-title-row">
          <h1 className="adm-det-title">
            {reservation.first_name} {reservation.last_name}
          </h1>
          <span className="adm-badge" style={{ color: s.color, borderColor: s.color }}>
            {s.label}
          </span>
          {reservation.voucher_number && (
            <span className="adm-voucher-chip">{reservation.voucher_number}</span>
          )}
        </div>
      </div>

      <div className="adm-det-grid">
        {/* Left: Guest data */}
        <div className="adm-det-col">
          <section className="adm-card">
            <h2 className="adm-card-title">Lični podaci</h2>
            <DataRow label="Email" value={reservation.email} />
            <DataRow label="Telefon" value={reservation.phone} />
            <DataRow label="Broj lične karte" value={reservation.id_card_number} />
          </section>

          <section className="adm-card">
            <h2 className="adm-card-title">Rezervacija</h2>
            <DataRow label="Datum dolaska" value={reservation.arrival_date} />
            <DataRow label="Broj osoba" value={String(reservation.number_of_people)} />
            {reservation.package_type && (
              <DataRow label="Paket" value={reservation.package_type} />
            )}
            <DataRow label="Prijavljen" value={new Date(reservation.created_at).toLocaleDateString("sr-Latn-RS")} />
          </section>

          <section className="adm-card">
            <h2 className="adm-card-title">Finansije</h2>
            <DataRow
              label="Depozit plaćen"
              value={`${reservation.deposit_amount} ${reservation.currency}`}
            />
            {reservation.remaining_amount != null && (
              <DataRow
                label="Ostatak"
                value={`${reservation.remaining_amount} ${reservation.currency}`}
              />
            )}
            {proofUrl && (
              <div className="adm-proof-link">
                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="adm-link">
                  📎 Pogledaj potvrdu o uplati
                </a>
              </div>
            )}
          </section>
        </div>

        {/* Right: Actions */}
        <div className="adm-det-col">
          <ReservationActions
            reservation={reservation}
            cabins={cabins}
          />

          {reservation.approved_at && (
            <section className="adm-card">
              <h2 className="adm-card-title">Istorija</h2>
              <DataRow label="Odobreno" value={new Date(reservation.approved_at).toLocaleString("sr-Latn-RS")} />
              {reservation.voucher_sent_at && (
                <DataRow label="Vaučer poslat" value={new Date(reservation.voucher_sent_at).toLocaleString("sr-Latn-RS")} />
              )}
            </section>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }

        .adm-det { max-width: 1000px; margin: 0 auto; padding: 40px 24px; }
        .adm-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 12px; }
        .adm-back:hover { color: rgba(168,213,213,0.8); }
        .adm-det-top { margin-bottom: 28px; }
        .adm-det-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .adm-det-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; }

        .adm-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 5px; border: 1px solid; }
        .adm-voucher-chip { font-size: 12px; padding: 4px 10px; border-radius: 5px; background: rgba(58,144,144,0.12); border: 1px solid rgba(58,144,144,0.25); color: rgba(168,213,213,0.6); font-family: monospace; }

        .adm-det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 700px) { .adm-det-grid { grid-template-columns: 1fr; } }
        .adm-det-col { display: flex; flex-direction: column; gap: 16px; }

        .adm-card { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 20px; }
        .adm-card-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.4); margin-bottom: 14px; }
        .adm-data-row { margin-bottom: 10px; }
        .adm-data-label { font-size: 11px; color: rgba(168,213,213,0.4); margin-bottom: 2px; }
        .adm-data-value { font-size: 14px; color: rgba(232,245,245,0.9); font-weight: 500; }

        .adm-proof-link { margin-top: 12px; }
        .adm-link { color: rgba(168,213,213,0.7); font-size: 13px; text-decoration: none; }
        .adm-link:hover { color: #e8f5f5; }
      `}</style>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="adm-data-row">
      <div className="adm-data-label">{label}</div>
      <div className="adm-data-value">{value}</div>
    </div>
  );
}
