export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div
        className="w-10 h-10 rounded-full"
        style={{
          border: "2px solid color-mix(in srgb, var(--bg-border) 50%, transparent)",
          borderTopColor: "var(--orange)",
          animation: "frag-spin 800ms linear infinite",
        }}
      />
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--text-ghost)",
        }}
      >
        Loading
      </p>
      <style>{`@keyframes frag-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
