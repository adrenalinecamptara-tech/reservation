export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0d2b2b 0%, #1e4d4d 100%)",
      }}
    >
      <div className="text-center px-8">
        <p className="text-6xl mb-4">🔗</p>
        <h1
          className="text-3xl font-bold mb-3"
          style={{
            color: "#e8f5f5",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Link nije validan
        </h1>
        <p style={{ color: "#a8d5d5" }}>
          Ovaj link je istekao, već iskorišćen ili ne postoji.
          <br />
          Kontaktiraj nas ako misliš da je greška.
        </p>
        <a
          href="https://adrenalinetara.com"
          className="inline-block mt-6 px-6 py-3 rounded-lg text-sm font-semibold"
          style={{ background: "#1e4d4d", color: "#e8f5f5", border: "1px solid #3a8a8a" }}
        >
          adrenalinetara.com
        </a>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=swap');`}</style>
      </div>
    </div>
  );
}
