"use client";

import { useState } from "react";

interface Props {
  userId: string;
}

export function GenerateLinkForm({ userId }: Props) {
  const [notes, setNotes] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedUrl("");

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || undefined,
          expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedUrl(data.url);
    } catch (err: any) {
      alert(err.message ?? "Greška pri generisanju linka");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Zdravo! 👋\n\nHvala na depozitu. Molim te klikni na link ispod i popuni svoje podatke kako bismo potvrdili tvoju rezervaciju u Adrenaline Camp Tara:\n\n${generatedUrl}\n\nLink važi 72 sata. Vidimo se na reci! 🌊`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="glf-root">
      <form onSubmit={handleGenerate} className="glf-form">
        <div className="glf-field">
          <label className="glf-label" htmlFor="notes">
            Napomena (ko je gost — za tvoj pregled)
          </label>
          <input
            id="notes"
            className="glf-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="npr. Ana Petrović, 4 osobe, vikend 15.5."
          />
        </div>
        <div className="glf-field">
          <label className="glf-label" htmlFor="expires">
            Link ističe za (sati)
          </label>
          <select
            id="expires"
            className="glf-input glf-select"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
          >
            <option value="24">24 sata</option>
            <option value="48">48 sati</option>
            <option value="72">72 sata (preporučeno)</option>
            <option value="168">7 dana</option>
            <option value="">Bez ograničenja</option>
          </select>
        </div>
        <button type="submit" className="glf-btn" disabled={loading}>
          {loading ? "Generišem..." : "🔗 Generiši link"}
        </button>
      </form>

      {generatedUrl && (
        <div className="glf-result">
          <p className="glf-result-label">Link je spreman — pošalji gostu:</p>
          <div className="glf-url-row">
            <code className="glf-url">{generatedUrl}</code>
            <button className="glf-copy-btn" onClick={handleCopy}>
              {copied ? "✓ Kopirano!" : "Kopiraj"}
            </button>
          </div>
          <div className="glf-share-row">
            <button className="glf-share-btn glf-share-btn--wa" onClick={handleWhatsApp}>
              📱 Pošalji WhatsApp poruku
            </button>
          </div>
        </div>
      )}

      <style>{`
        .glf-root { max-width: 540px; }
        .glf-form { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .glf-field { margin-bottom: 18px; }
        .glf-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.5); margin-bottom: 7px; }
        .glf-input { width: 100%; padding: 11px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .glf-input:focus { border-color: rgba(58,144,144,0.5); }
        .glf-input::placeholder { color: rgba(168,213,213,0.2); }
        .glf-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233a9090' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; cursor: pointer; }
        .glf-select option { background: #0f2020; }
        .glf-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border: none; border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .glf-btn:hover:not(:disabled) { background: linear-gradient(135deg, #246868, #339090); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(30,92,92,0.4); }
        .glf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .glf-result { background: rgba(58,144,144,0.08); border: 1px solid rgba(58,144,144,0.3); border-radius: 12px; padding: 20px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .glf-result-label { font-size: 13px; color: rgba(168,213,213,0.6); margin-bottom: 12px; }
        .glf-url-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
        .glf-url { font-family: monospace; font-size: 12px; color: #7dcfcf; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; flex: 1; word-break: break-all; min-width: 0; }
        .glf-copy-btn { padding: 8px 14px; background: rgba(58,144,144,0.2); border: 1px solid rgba(58,144,144,0.3); border-radius: 6px; color: #7dcfcf; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .glf-copy-btn:hover { background: rgba(58,144,144,0.35); }
        .glf-share-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .glf-share-btn { padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
        .glf-share-btn--wa { background: rgba(37,211,102,0.15); color: #25d366; border: 1px solid rgba(37,211,102,0.3); }
        .glf-share-btn--wa:hover { background: rgba(37,211,102,0.25); }
      `}</style>
    </div>
  );
}
