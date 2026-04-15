"use client";

import ChatInterface from "../components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--text-ghost)",
          marginBottom: "6px",
        }}
      >
        AI Analyst
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
          marginBottom: "24px",
        }}
      >
        Security Analyst Chat
      </h2>
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
