import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { getMonthReservations } from "@/lib/services/calendarService";
import { listCabins } from "@/lib/services/cabinService";
import { CalendarView } from "@/components/admin/calendar/CalendarView";

interface Props {
  searchParams: { year?: string; month?: string };
}

export default async function CalendarPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const params = await Promise.resolve(searchParams);
  const now = new Date();
  const year = parseInt(params.year ?? String(now.getFullYear()), 10);
  const month = parseInt(params.month ?? String(now.getMonth() + 1), 10);

  const [reservations, cabins] = await Promise.all([
    getMonthReservations(year, month),
    listCabins(),
  ]);

  return (
    <div className="adm-cal-page">
      <div className="adm-cal-top">
        <a href="/admin" className="adm-back">← Dashboard</a>
        <h1 className="adm-cal-title">Kalendar</h1>
      </div>

      <CalendarView
        year={year}
        month={month}
        reservations={reservations}
        cabins={cabins}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100%; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .adm-cal-page { max-width: 1400px; margin: 0 auto; padding: 40px 24px; width: 100%; }
        .adm-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 8px; }
        .adm-back:hover { color: rgba(168,213,213,0.8); }
        .adm-cal-top { margin-bottom: 20px; }
        .adm-cal-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; }
        @media (max-width: 700px) { .adm-cal-page { padding: 24px 12px; } }
      `}</style>
    </div>
  );
}
