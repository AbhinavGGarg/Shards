import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="frag-card max-w-md text-center">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--text-ghost)",
            marginBottom: "8px",
          }}
        >
          404 ▸ Off the map
        </p>
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "28px",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          Route not found
        </h2>
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          This part of the network terrain hasn&apos;t been mapped yet.
        </p>
        <Link href="/" className="frag-btn-primary inline-block">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
