import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/supabase";
import { getWeekOperations } from "@/lib/services/operationsService";
import { OperationsView } from "@/components/operations/OperationsView";
import { WorkerTopBar } from "@/components/operations/WorkerTopBar";

interface Props {
  searchParams: Promise<{ start?: string }>;
}

export default async function WorkerDashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/worker/login");

  const { start } = await searchParams;
  const startIso = start ?? new Date().toISOString().slice(0, 10);
  const week = await getWeekOperations(startIso, 7);

  return (
    <div className="vw-root">
      <WorkerTopBar email={user.email ?? ""} />
      <OperationsView week={week} basePath="/verify" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .vw-root { min-height: 100vh; padding-bottom: 40px; }
      `}</style>
    </div>
  );
}
