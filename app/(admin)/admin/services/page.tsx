import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/supabase";
import { listCatalog } from "@/lib/services/catalogService";
import { ServiceCatalogClient } from "@/components/admin/services/ServiceCatalogClient";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const items = await listCatalog(false);

  return (
    <div className="asv">
      <div className="asv-top">
        <a href="/admin" className="asv-back">
          ← Dashboard
        </a>
        <h1 className="asv-title">Katalog usluga</h1>
        <p className="asv-sub">
          Cenovnik svih obroka i aktivnosti. Koristi se za addon naplatu i
          custom paket.
        </p>
      </div>

      <ServiceCatalogClient initial={items} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .asv { max-width: 1000px; margin: 0 auto; padding: 40px 24px; }
        .asv-top { margin-bottom: 28px; }
        .asv-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 10px; }
        .asv-back:hover { color: rgba(168,213,213,0.8); }
        .asv-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; }
        .asv-sub { font-size: 13px; color: rgba(168,213,213,0.5); margin-top: 4px; }
      `}</style>
    </div>
  );
}
