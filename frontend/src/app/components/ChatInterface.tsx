"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SUGGESTIONS = [
  { icon: "warning", text: "What's the biggest risk on my network?" },
  { icon: "bug_report", text: "Which devices have critical vulnerabilities?" },
  { icon: "devices", text: "Show me all IoT devices" },
  { icon: "shield", text: "Summarize compliance gaps" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(prefill?: string) {
    const question = (prefill ?? input).trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const result = await api.queryChat(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response, sources: result.sources },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `◆ Failed to get a response: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl accent-gradient mb-4">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>
                smart_toy
              </span>
            </div>
            <p
              className="mb-1"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "32px",
                color: "var(--text-primary)",
              }}
            >
              Fragments AI
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask questions about your network security posture.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                  }}
                >
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{ color: "var(--orange-light)", fontSize: 20 }}
                  >
                    {s.icon}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end gap-4">
              <div
                className="max-w-[75%] p-4 rounded-2xl rounded-tr-none text-sm"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
                }}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  person
                </span>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start gap-4">
              <div className="w-10 h-10 rounded-xl accent-gradient flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>
                  smart_toy
                </span>
              </div>
              <div
                className="max-w-[80%] p-6 rounded-2xl rounded-tl-none"
                style={{
                  background: "var(--bg-card)",
                  borderLeft: "4px solid var(--orange)",
                  border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                  borderLeftWidth: "4px",
                  borderLeftColor: "var(--orange)",
                }}
              >
                <div className="frag-md text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div
                    className="mt-4 pt-3 border-t flex flex-wrap gap-1.5"
                    style={{
                      borderColor: "color-mix(in srgb, var(--bg-border) 40%, transparent)",
                    }}
                  >
                    <span
                      className="mr-1 self-center"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-ghost)",
                      }}
                    >
                      Sources
                    </span>
                    {msg.sources.map((src, j) => (
                      <span
                        key={j}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                        style={{
                          background: "var(--bg-deep)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          database
                        </span>
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start gap-4">
            <div className="w-10 h-10 rounded-xl accent-gradient flex-shrink-0 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white animate-spin"
                style={{ fontSize: 20 }}
              >
                progress_activity
              </span>
            </div>
            <div
              className="p-4 rounded-2xl rounded-tl-none"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-ghost)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
              }}
            >
              analyzing network data…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        className="pt-4 relative"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)" }}
      >
        <div
          className="flex items-center gap-2 p-2 rounded-2xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
          }}
        >
          <span
            className="material-symbols-outlined ml-2"
            style={{ color: "var(--text-ghost)", fontSize: 20 }}
          >
            chat
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your network…"
            disabled={loading}
            className="flex-1 bg-transparent outline-none text-sm py-2"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="accent-gradient w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>
              send
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
