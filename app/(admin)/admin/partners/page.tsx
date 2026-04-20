import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { listPartners, listPartnerBookings } from "@/lib/services/partnerService";
import { listCabins } from "@/lib/services/cabinService";
import { PartnerBookingForm } from "@/components/admin/partners/PartnerBookingForm";
import { PartnerBookingList } from "@/components/admin/partners/PartnerBookingList";

export default async function AdminPartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [partners, bookings, cabins] = await Promise.all([
    listPartners(),
    listPartnerBookings(),
    listCabins(),
  ]);

  const totalEarned = bookings.reduce(
    (s, b) => s + Number(b.price_per_person) * b.number_of_people,
    0
  );

  return (
    <div className="adp">
      <div className="adp-top">
        <a href="/admin" className="adp-back">← Dashboard</a>
        <h1 className="adp-title">Partneri</h1>
        <p className="adp-sub">Rezervacije partnera — ne ulaze u guest flow, ali zauzimaju jedinice.</p>
      </div>

      <div className="adp-stats">
        <div className="adp-stat">
          <div className="adp-stat-value">{bookings.length}</div>
          <div className="adp-stat-label">Rezervacija partnera</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat-value">{totalEarned.toFixed(0)} €</div>
          <div className="adp-stat-label">Ukupno zarađeno</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat-value">{partners.length}</div>
          <div className="adp-stat-label">Partnera</div>
        </div>
      </div>

      <section className="adp-section">
        <h2 className="adp-section-title">Nova rezervacija</h2>
        <PartnerBookingForm partners={partners} cabins={cabins} />
      </section>

      <section className="adp-section">
        <h2 className="adp-section-title">Sve rezervacije partnera ({bookings.length})</h2>
        <PartnerBookingList bookings={bookings} />
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }

        .adp { max-width: 1000px; margin: 0 auto; padding: 40px 24px; }
        .adp-top { margin-bottom: 28px; }
        .adp-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 10px; }
        .adp-back:hover { color: rgba(168,213,213,0.8); }
        .adp-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: #e8f5f5; }
        .adp-sub { font-size: 13px; color: rgba(168,213,213,0.5); margin-top: 4px; }

        .adp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
        .adp-stat { padding: 18px; background: rgba(76,29,149,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 12px; }
        .adp-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: #e9d5ff; margin-bottom: 4px; }
        .adp-stat-label { font-size: 11px; color: rgba(168,213,213,0.55); text-transform: uppercase; letter-spacing: 0.08em; }
        @media (max-width: 600px) { .adp-stats { grid-template-columns: 1fr; } }

        .adp-section { margin-bottom: 32px; }
        .adp-section-title { font-size: 13px; font-weight: 600; color: rgba(168,213,213,0.6); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
