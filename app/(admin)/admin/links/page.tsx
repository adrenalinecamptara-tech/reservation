import { createClient } from "@/lib/db/supabase";
import { redirect } from "next/navigation";
import { listLinks } from "@/lib/services/linkService";
import { GenerateLinkForm } from "@/components/admin/links/GenerateLinkForm";

export default async function LinksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const links = await listLinks();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="adm-links">
      <a href="/admin" className="adm-back">← Dashboard</a>
      <h1 className="adm-links-title">Generiši link za registraciju</h1>
      <p className="adm-links-desc">
        Kada gost uplati depozit, generiši mu personalizovani link i pošalji na
        WhatsApp ili Instagram. On popuni formu i tebi stigne email sa svim podacima.
      </p>

      <GenerateLinkForm userId={user.id} />

      {/* Links history */}
      {links.length > 0 && (
        <div className="adm-links-history">
          <h2 className="adm-section-title">Istorija linkova</h2>
          <div className="adm-links-list">
            {links.map((l) => (
              <div key={l.id} className={`adm-link-row ${l.used ? "adm-link-row--used" : ""}`}>
                <div className="adm-link-info">
                  <span className="adm-link-url" title={`${appUrl}/register/${l.token}`}>
                    /register/{l.token.slice(0, 12)}...
                  </span>
                  {l.notes && <span className="adm-link-note">{l.notes}</span>}
                </div>
                <div className="adm-link-meta">
                  <span className={`adm-link-status ${l.used ? "adm-link-status--used" : "adm-link-status--active"}`}>
                    {l.used ? "Iskorišćen" : "Aktivan"}
                  </span>
                  <span className="adm-link-date">
                    {new Date(l.created_at).toLocaleDateString("sr-Latn-RS")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f0f; color: #e8f5f5; font-family: 'DM Sans', sans-serif; }
        .adm-links { max-width: 680px; margin: 0 auto; padding: 40px 24px; }
        .adm-back { font-size: 13px; color: rgba(168,213,213,0.4); text-decoration: none; display: block; margin-bottom: 16px; }
        .adm-back:hover { color: rgba(168,213,213,0.8); }
        .adm-links-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #e8f5f5; margin-bottom: 10px; }
        .adm-links-desc { font-size: 14px; color: rgba(168,213,213,0.5); line-height: 1.6; margin-bottom: 32px; max-width: 500px; }
        .adm-section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.4); margin-bottom: 12px; }
        .adm-links-history { margin-top: 40px; }
        .adm-links-list { display: flex; flex-direction: column; gap: 8px; }
        .adm-link-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: rgba(10,25,25,0.8); border: 1px solid rgba(62,140,140,0.12); border-radius: 8px; flex-wrap: wrap; }
        .adm-link-row--used { opacity: 0.5; }
        .adm-link-info { display: flex; flex-direction: column; gap: 3px; }
        .adm-link-url { font-family: monospace; font-size: 12px; color: rgba(168,213,213,0.6); }
        .adm-link-note { font-size: 12px; color: rgba(168,213,213,0.4); }
        .adm-link-meta { display: flex; align-items: center; gap: 12px; }
        .adm-link-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
        .adm-link-status--active { background: rgba(58,144,144,0.15); color: #7dcfcf; border: 1px solid rgba(58,144,144,0.3); }
        .adm-link-status--used { background: rgba(255,255,255,0.05); color: rgba(168,213,213,0.3); border: 1px solid rgba(62,140,140,0.1); }
        .adm-link-date { font-size: 12px; color: rgba(168,213,213,0.3); }
      `}</style>
    </div>
  );
}
