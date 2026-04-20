import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { listCabins } from "@/lib/services/cabinService";
import { listReservationHolds } from "@/lib/services/holdService";
import { HoldBookingForm } from "@/components/admin/holds/HoldBookingForm";
import { HoldBookingList } from "@/components/admin/holds/HoldBookingList";

interface Props {
  searchParams: {
    filter?: "all" | "active" | "expired" | "converted" | "cancelled";
  };
}

export default async function AdminHoldsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const params = await Promise.resolve(searchParams);
  const [cabins, holds] = await Promise.all([
    listCabins(),
    listReservationHolds(),
  ]);
  const initialFilter = params.filter ?? "all";

  const today = new Date().toISOString().slice(0, 10);
  const active = holds.filter(
    (h) => h.status === "active" && h.hold_until_date >= today,
  ).length;
  const expired = holds.filter(
    (h) =>
      (h.status === "active" && h.hold_until_date < today) ||
      h.status === "expired",
  ).length;

  return (
    <div className="adh">
      <div className="adh-top">
        <a href="/admin" className="adh-back">
          ← Dashboard
        </a>
        <h1 className="adh-title">Hold rezervacije</h1>
        <p className="adh-sub">
          Interna lista za čuvanje mesta do roka uplate.
        </p>
      </div>

      <div className="adh-stats">
        <div className="adh-stat">
          <div className="adh-stat-value">{holds.length}</div>
          <div className="adh-stat-label">Ukupno hold</div>
        </div>
        <div className="adh-stat">
          <div className="adh-stat-value">{active}</div>
          <div className="adh-stat-label">Aktivni</div>
        </div>
        <div className="adh-stat">
          <div className="adh-stat-value">{expired}</div>
          <div className="adh-stat-label">Istekli</div>
        </div>
      </div>

      <section className="adh-section">
        <h2 className="adh-section-title">Novi hold</h2>
        <HoldBookingForm cabins={cabins} />
      </section>

      <section className="adh-section">
        <h2 className="adh-section-title">
          Lista hold rezervacija ({holds.length})
        </h2>
        <HoldBookingList holds={holds} initialFilter={initialFilter} />
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }

        .adh { max-width: 1020px; margin: 0 auto; padding: 40px 24px; }
        .adh-top { margin-bottom: 26px; }
        .adh-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 10px; }
        .adh-back:hover { color: rgba(168,213,213,0.8); }
        .adh-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: #e8f5f5; }
        .adh-sub { font-size: 13px; color: rgba(168,213,213,0.52); margin-top: 4px; }

        .adh-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
        .adh-stat { padding: 18px; background: rgba(122,87,30,0.08); border: 1px solid rgba(199,146,47,0.25); border-radius: 12px; }
        .adh-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: #ffe1a8; margin-bottom: 4px; }
        .adh-stat-label { font-size: 11px; color: rgba(168,213,213,0.55); text-transform: uppercase; letter-spacing: 0.08em; }

        .adh-section { margin-bottom: 30px; }
        .adh-section-title { font-size: 13px; font-weight: 600; color: rgba(168,213,213,0.6); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }

        @media (max-width: 680px) {
          .adh-stats { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
