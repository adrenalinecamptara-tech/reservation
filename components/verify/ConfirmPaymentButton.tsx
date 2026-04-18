"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
  amount: number | null;
  currency: string;
  guestName: string;
}

export function ConfirmPaymentButton({ reservationId, amount, currency, guestName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const amountLabel = amount != null ? `${amount} ${currency}` : "preostali iznos";
    if (!confirm(`Potvrđuješ da je ${guestName} platio ${amountLabel}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/confirm-payment`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Greška pri potvrdi plaćanja");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          width: "100%",
          padding: "18px 24px",
          background: loading ? "#6b7280" : "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: loading ? "wait" : "pointer",
          boxShadow: "0 4px 16px rgba(22,163,74,0.25)",
        }}
      >
        {loading ? "Potvrđujem…" : "✓ Potvrdi plaćanje"}
      </button>
      {error && (
        <div style={{
          marginTop: 12,
          padding: "12px 16px",
          background: "#fee2e2",
          color: "#b91c1c",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
