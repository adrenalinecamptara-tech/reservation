"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Pogrešan email ili lozinka.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="adm-login-root">
      <div className="adm-login-card">
        <div className="adm-login-logo">
          <span>〰</span>
          <span>ACT</span>
          <span>〰</span>
        </div>
        <h1 className="adm-login-title">Admin Portal</h1>
        <p className="adm-login-sub">Adrenaline Camp Tara</p>

        <form onSubmit={handleLogin} className="adm-login-form">
          <div className="adm-login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="milan@adrenalinetara.com"
              required
              autoFocus
            />
          </div>
          <div className="adm-login-field">
            <label htmlFor="password">Lozinka</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="adm-login-error">{error}</p>}
          <button type="submit" className="adm-login-btn" disabled={loading}>
            {loading ? "Prijavljujem..." : "Prijavi se"}
          </button>
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .adm-login-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #080f0f 0%, #0f2020 40%, #080f0f 100%);
          font-family: 'DM Sans', sans-serif;
        }
        .adm-login-card {
          width: 100%; max-width: 380px; padding: 48px 40px;
          background: rgba(10,25,25,0.9);
          border: 1px solid rgba(62,140,140,0.2);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          text-align: center;
          animation: fadeUp 0.4s ease;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .adm-login-logo { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; color: rgba(62,140,140,0.5); font-size: 14px; letter-spacing: -2px; }
        .adm-login-logo span:nth-child(2) { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; letter-spacing: 0.15em; color: rgba(168,213,213,0.7); }
        .adm-login-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: #e8f5f5; margin-bottom: 4px; }
        .adm-login-sub { font-size: 12px; color: rgba(168,213,213,0.4); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 32px; }
        .adm-login-form { text-align: left; }
        .adm-login-field { margin-bottom: 16px; }
        .adm-login-field label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.5); margin-bottom: 6px; }
        .adm-login-field input {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px;
          color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .adm-login-field input::placeholder { color: rgba(168,213,213,0.2); }
        .adm-login-field input:focus { border-color: rgba(58,144,144,0.5); box-shadow: 0 0 0 3px rgba(58,144,144,0.1); }
        .adm-login-error { font-size: 13px; color: #e87a8a; margin-bottom: 12px; padding: 8px 12px; background: rgba(196,30,58,0.1); border-radius: 6px; }
        .adm-login-btn {
          width: 100%; padding: 13px; margin-top: 8px;
          background: linear-gradient(135deg, #1e5c5c, #2a8080);
          border: none; border-radius: 8px;
          color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .adm-login-btn:hover:not(:disabled) { background: linear-gradient(135deg, #246868, #339090); transform: translateY(-1px); }
        .adm-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
