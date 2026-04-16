export default function SuccessPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0d2b2b 0%, #1e4d4d 50%, #0d2b2b 100%)",
      }}
    >
      <div
        className="text-center px-8 py-12 max-w-lg mx-auto"
        style={{ animation: "fadeUp 0.6s ease forwards" }}
      >
        <div
          className="text-7xl mb-6"
          style={{ animation: "pop 0.5s 0.2s ease both" }}
        >
          🏄
        </div>
        <h1
          className="text-4xl font-bold mb-4"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            color: "#e8f5f5",
            letterSpacing: "0.02em",
          }}
        >
          Sve je gotovo!
        </h1>
        <p
          className="text-lg mb-2"
          style={{ color: "#a8d5d5", lineHeight: 1.7 }}
        >
          Tvoja prijava je primljena. Naš tim će je pregledati i uskoro ćeš
          dobiti vaučer na email.
        </p>
        <p
          className="text-base mt-6"
          style={{
            color: "#6fb8b8",
            fontStyle: "italic",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.2rem",
          }}
        >
          Vidimo se na reci. 🌊
        </p>
        <p className="mt-8 text-sm" style={{ color: "#4a9090" }}>
          Pitanja? Piši nam na{" "}
          <a
            href="https://instagram.com/adrenaline_tara"
            className="underline"
            style={{ color: "#7dcfcf" }}
          >
            Instagram
          </a>{" "}
          ili pozovi{" "}
          <a
            href="tel:+38163315829"
            className="underline"
            style={{ color: "#7dcfcf" }}
          >
            +381 63 315 829
          </a>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
