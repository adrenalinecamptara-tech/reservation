"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabaseClient";

/**
 * Auth callback — Supabase recovery / magic link redirect lands here.
 * Hash format posle uspešne verifikacije:
 *   #access_token=...&refresh_token=...&expires_in=3600&type=recovery
 * Ili pri grešci:
 *   #error=access_denied&error_code=otp_expired&error_description=...
 *
 * Mi:
 *  - postavimo session-u iz access_token + refresh_token
 *  - preusmerimo na /auth/reset-password ako je tip recovery
 *  - prikazujemo grešku ako je expired/invalid
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const errorCode = params.get("error_code") ?? params.get("error");
    if (errorCode) {
      const desc = params.get("error_description")?.replace(/\+/g, " ");
      setError(
        desc ?? "Link je istekao ili je nevažeći. Zatraži novi link za reset lozinke.",
      );
      setWorking(false);
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token || !refresh_token) {
      setError("Nedostaje token u linku. Zatraži novi link za reset lozinke.");
      setWorking(false);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: setErr }) => {
        if (setErr) {
          setError(setErr.message);
          setWorking(false);
          return;
        }
        if (type === "recovery") {
          router.replace("/auth/reset-password");
        } else {
          router.replace("/admin");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Greška");
        setWorking(false);
      });
  }, [router]);

  return (
    <div className="cb-root">
      <div className="cb-card">
        <div className="cb-logo">
          <span>〰</span>
          <span>ACT</span>
          <span>〰</span>
        </div>
        {working && !error ? (
          <>
            <h1 className="cb-title">Verifikacija…</h1>
            <p className="cb-sub">Trenutak, postavljamo sesiju.</p>
          </>
        ) : (
          <>
            <h1 className="cb-title">Greška</h1>
            <p className="cb-error">{error}</p>
            <a href="/admin/login" className="cb-link">
              ← Nazad na login
            </a>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .cb-root { min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #080f0f 0%, #0f2020 40%, #080f0f 100%);
          font-family: 'DM Sans', sans-serif; padding: 20px; }
        .cb-card { width: 100%; max-width: 420px; padding: 40px;
          background: rgba(10,25,25,0.9); border: 1px solid rgba(62,140,140,0.2);
          border-radius: 16px; text-align: center; color: #e8f5f5; }
        .cb-logo { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; color: rgba(62,140,140,0.5); font-size: 14px; letter-spacing: -2px; }
        .cb-logo span:nth-child(2) { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; letter-spacing: 0.15em; color: rgba(168,213,213,0.7); }
        .cb-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; margin-bottom: 8px; }
        .cb-sub { font-size: 13px; color: rgba(168,213,213,0.55); }
        .cb-error { font-size: 13px; color: #ffb4c0; padding: 12px; background: rgba(196,30,58,0.1); border-radius: 8px; margin: 14px 0; }
        .cb-link { font-size: 13px; color: rgba(168,213,213,0.7); text-decoration: none; }
        .cb-link:hover { color: #e8f5f5; }
      `}</style>
    </div>
  );
}
