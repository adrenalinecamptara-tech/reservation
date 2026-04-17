export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a1a 0%, #0f2a2a 50%, #0a1a1a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "24px",
      textAlign: "center",
    }}>
      {/* Logo / Brand */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.35em",
          color: "rgba(168,213,213,0.5)",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          Adrenaline Camp Tara
        </div>
        <div style={{
          fontSize: 42,
          fontWeight: 800,
          color: "#e8f5f5",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}>
          Vidimo se na reci.
        </div>
        <div style={{
          width: 48,
          height: 2,
          background: "linear-gradient(90deg, transparent, #3a9090, transparent)",
          margin: "20px auto 0",
        }} />
      </div>

      {/* Message */}
      <div style={{
        maxWidth: 480,
        marginBottom: 48,
      }}>
        <p style={{
          fontSize: 17,
          color: "rgba(168,213,213,0.75)",
          lineHeight: 1.7,
          margin: 0,
        }}>
          Online rezervacije su u pripremi. Za sada nas kontaktiraj direktno
          — odgovaramo brzo.
        </p>
      </div>

      {/* Contact cards */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 360,
        marginBottom: 56,
      }}>
        <a
          href="https://instagram.com/adrenalinetara"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(62,140,140,0.2)",
            borderRadius: 12,
            color: "#e8f5f5",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 22 }}>📸</span>
          <span>@adrenalinetara</span>
          <span style={{ marginLeft: "auto", color: "rgba(168,213,213,0.35)", fontSize: 13 }}>Instagram</span>
        </a>

        <a
          href="tel:+38163315829"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(62,140,140,0.2)",
            borderRadius: 12,
            color: "#e8f5f5",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 22 }}>📞</span>
          <span>+381 63 315 829</span>
          <span style={{ marginLeft: "auto", color: "rgba(168,213,213,0.35)", fontSize: 13 }}>Poziv / WhatsApp</span>
        </a>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: 12,
        color: "rgba(168,213,213,0.25)",
        letterSpacing: "0.05em",
      }}>
        Bastasi, Bosna i Hercegovina · Reka Drina
      </div>
    </div>
  );
}
