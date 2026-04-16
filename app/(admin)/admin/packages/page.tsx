import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { listPackages } from "@/lib/services/packageService";
import { PackagesClient } from "@/components/admin/packages/PackagesClient";

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const packages = await listPackages();

  return (
    <div className="adm-pkg">
      <div className="adm-pkg-top">
        <div>
          <a href="/admin" className="adm-back">← Dashboard</a>
          <h1 className="adm-pkg-title">Paketi</h1>
        </div>
      </div>

      <PackagesClient initialPackages={packages} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .adm-pkg { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
        .adm-pkg-top { margin-bottom: 28px; }
        .adm-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 12px; }
        .adm-back:hover { color: rgba(168,213,213,0.8); }
        .adm-pkg-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; }
      `}</style>
    </div>
  );
}
