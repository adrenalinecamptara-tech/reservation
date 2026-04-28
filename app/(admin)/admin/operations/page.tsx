import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/supabase";
import { getWeekOperations } from "@/lib/services/operationsService";
import { OperationsView } from "@/components/operations/OperationsView";

interface Props {
  searchParams: Promise<{ start?: string }>;
}

export default async function AdminOperationsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { start } = await searchParams;
  const startIso = start ?? new Date().toISOString().slice(0, 10);
  const week = await getWeekOperations(startIso, 7);

  return (
    <div className="ao-root">
      <div className="ao-back-wrap">
        <a href="/admin" className="ao-back">
          ← Dashboard
        </a>
      </div>
      <OperationsView week={week} basePath="/admin/operations" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .ao-root { min-height: 100vh; padding: 24px 0 40px; }
        .ao-back-wrap { max-width: 900px; margin: 0 auto; padding: 0 16px 8px; }
        .ao-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; }
        .ao-back:hover { color: rgba(168,213,213,0.8); }
      `}</style>
    </div>
  );
}
