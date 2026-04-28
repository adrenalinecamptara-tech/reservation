"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabaseClient";

interface Props {
  email: string;
}

export function WorkerTopBar({ email }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/verify/${trimmed}`);
  };

  const onLogout = async () => {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/worker/login");
    router.refresh();
  };

  return (
    <div className="wtb">
      <div className="wtb-top">
        <div className="wtb-brand">
          <span>〰</span>
          <span className="wtb-brand-text">ACT</span>
          <span>〰</span>
        </div>
        <div className="wtb-user">
          <span className="wtb-email">{email}</span>
          <button onClick={onLogout} disabled={busy} className="wtb-logout">
            {busy ? "…" : "Odjavi se"}
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="wtb-form">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Skeniraj ili upiši broj vaučera"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="wtb-input"
        />
        <button type="submit" className="wtb-btn">
          Provjeri
        </button>
      </form>

      <style>{`
        .wtb { padding: 16px; max-width: 900px; margin: 0 auto; }
        .wtb-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .wtb-brand { display: flex; align-items: center; gap: 6px; color: rgba(62,140,140,0.5); font-size: 12px; letter-spacing: -2px; }
        .wtb-brand-text { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 700; letter-spacing: 0.15em; color: rgba(168,213,213,0.7); }
        .wtb-user { display: flex; align-items: center; gap: 10px; font-size: 12px; }
        .wtb-email { color: rgba(168,213,213,0.5); }
        .wtb-logout { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; color: rgba(168,213,213,0.7); font-size: 12px; cursor: pointer; }
        .wtb-logout:hover:not(:disabled) { background: rgba(196,74,90,0.12); border-color: rgba(196,74,90,0.3); color: #ffb4c0; }
        .wtb-form { display: flex; gap: 8px; }
        .wtb-input { flex: 1; padding: 11px 14px; background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.25); border-radius: 8px; color: #e8f5f5; font-size: 14px; font-family: inherit; }
        .wtb-input:focus { outline: none; border-color: rgba(58,144,144,0.5); }
        .wtb-btn { padding: 11px 20px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border: none; border-radius: 8px; color: #e8f5f5; font-weight: 600; font-size: 14px; cursor: pointer; }
        .wtb-btn:hover { background: linear-gradient(135deg, #246868, #339090); }
      `}</style>
    </div>
  );
}
