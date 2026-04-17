"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteReservationButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Obriši rezervaciju za ${name}?\n\nOva akcija je nepovratna — rezervacija i dokaz o uplati će biti trajno obrisani.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/delete`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Greška pri brisanju. Pokušaj ponovo.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        background: "none",
        border: "none",
        color: "rgba(196,74,90,0.6)",
        fontSize: 12,
        cursor: "pointer",
        padding: "4px 6px",
        borderRadius: 4,
        transition: "color 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#c44a5a")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(196,74,90,0.6)")}
      title="Obriši rezervaciju"
    >
      {loading ? "..." : "Obriši"}
    </button>
  );
}
