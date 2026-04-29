"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error: err }) => {
      if (err || !data.user) {
        setError(
          "Sesija nije aktivna. Zatraži novi link za reset lozinke.",
        );
      }
      setAuthChecked(true);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Lozinka mora imati bar 6 karaktera.");
      return;
    }
    if (password !== confirm) {
      setError("Lozinke se ne poklapaju.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message);
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setSubmitting(false);
    // Posle 2s redirect — middleware će preusmeriti workera/admina prema roli
    setTimeout(() => {
      router.replace("/admin");
    }, 2000);
  };

  return (
    <div className="rp-root">
      <div className="rp-card">
        <div className="rp-logo">
          <span>〰</span>
          <span>ACT</span>
          <span>〰</span>
        </div>
        <h1 className="rp-title">Postavi novu lozinku</h1>
        <p className="rp-sub">Adrenaline Camp Tara</p>

        {!authChecked ? (
          <p className="rp-sub" style={{ marginTop: 20 }}>
            Provera sesije…
          </p>
        ) : success ? (
          <div className="rp-success">
            ✓ Lozinka je promenjena. Preusmeravanje…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rp-form">
            <div className="rp-field">
              <label htmlFor="pwd">Nova lozinka</label>
              <input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
                placeholder="••••••••"
              />
            </div>
            <div className="rp-field">
              <label htmlFor="pwd2">Ponovi lozinku</label>
              <input
                id="pwd2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
              />
            </div>
            {error && <p className="rp-error">{error}</p>}
            <button type="submit" disabled={submitting} className="rp-btn">
              {submitting ? "Čuvam…" : "Sačuvaj novu lozinku"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .rp-root { min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #080f0f 0%, #0f2020 40%, #080f0f 100%);
          font-family: 'DM Sans', sans-serif; padding: 20px; }
        .rp-card { width: 100%; max-width: 380px; padding: 40px;
          background: rgba(10,25,25,0.9); border: 1px solid rgba(62,140,140,0.2);
          border-radius: 16px; backdrop-filter: blur(20px); text-align: center; color: #e8f5f5; }
        .rp-logo { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; color: rgba(62,140,140,0.5); font-size: 14px; letter-spacing: -2px; }
        .rp-logo span:nth-child(2) { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; letter-spacing: 0.15em; color: rgba(168,213,213,0.7); }
        .rp-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; margin-bottom: 4px; }
        .rp-sub { font-size: 12px; color: rgba(168,213,213,0.5); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 28px; }
        .rp-form { text-align: left; }
        .rp-field { margin-bottom: 16px; }
        .rp-field label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.55); margin-bottom: 6px; }
        .rp-field input { width: 100%; padding: 11px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; }
        .rp-field input:focus { border-color: rgba(58,144,144,0.5); box-shadow: 0 0 0 3px rgba(58,144,144,0.1); }
        .rp-error { font-size: 13px; color: #ffb4c0; margin-bottom: 12px; padding: 8px 12px; background: rgba(196,30,58,0.1); border-radius: 6px; }
        .rp-success { padding: 16px; background: rgba(58,170,112,0.12); border: 1px solid rgba(58,170,112,0.4); border-radius: 8px; color: #a7e8c5; font-size: 14px; margin-top: 12px; }
        .rp-btn { width: 100%; padding: 13px; margin-top: 8px;
          background: linear-gradient(135deg, #1e5c5c, #2a8080); border: none; border-radius: 8px;
          color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; }
        .rp-btn:hover:not(:disabled) { background: linear-gradient(135deg, #246868, #339090); transform: translateY(-1px); }
        .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
